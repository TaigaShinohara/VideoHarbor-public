// Local stand-in for a YouTube tab. Chrome is told to resolve the host to
// 127.0.0.1, and only this process answers. The test fails if the page is not
// the synthetic document served here.
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:https';
import {mkdtemp, mkdir, readFile, writeFile, cp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
export const BLOCKED_PAGE_TITLE = 'Synthetic blocked page';

export function blockedHostArgs() {
  const hosts = ['www.youtube.com','youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtube-nocookie.com','www.youtubekids.com','googlevideo.com'];
  return [
    `--host-resolver-rules=${hosts.map(host => `MAP ${host} 127.0.0.1`).join(', ')}`,
    '--ignore-certificate-errors',
    '--allow-insecure-localhost',
  ];
}

export async function startBlockedSite({title = BLOCKED_PAGE_TITLE} = {}) {
  const scratch = await mkdtemp(join(tmpdir(), 'videoharbor-blocked-site-'));
  const cert = join(scratch, 'cert.pem'), key = join(scratch, 'key.pem');
  const generated = spawnSync('openssl', ['req','-x509','-newkey','rsa:2048','-keyout',key,'-out',cert,'-days','1','-nodes','-subj','/CN=www.youtube.com'], {encoding:'utf8'});
  if (generated.status !== 0) throw new Error(generated.stderr || 'certificate generation failed');
  const requests = [];
  const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${title}</title><body><h1>${title}</h1><video id="clip" title="Synthetic clip" src="/synthetic.mp4" width="640" height="360"></video></body></html>`;
  const server = createServer({key: await readFile(key), cert: await readFile(cert)}, (request, response) => {
    requests.push(request.url || '');
    if ((request.url || '').startsWith('/synthetic.mp4')) {
      response.writeHead(200, {'content-type':'video/mp4','x-fixture':'videoharbor-synthetic'});
      response.end(Buffer.alloc(16));
      return;
    }
    response.writeHead(200, {'content-type':'text/html; charset=utf-8','x-fixture':'videoharbor-synthetic'});
    response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return {
    scratch, requests, port,
    url: `https://www.youtube.com:${port}/watch?v=synthetic-local`,
    async close() { await new Promise(resolve => server.close(resolve)); await rm(scratch, {recursive:true, force:true}); },
  };
}

export async function copyExtension(scratch, hostPermissions) {
  const extension = join(scratch, 'extension');
  await cp(join(repo, 'extension'), extension, {recursive:true});
  const worker = join(extension, 'background.js');
  await writeFile(worker, `${await readFile(worker, 'utf8')}
globalThis.__scriptCalls=0;
globalThis.__tabCaptureStarts=0;
globalThis.__downloadStarts=0;
globalThis.__openWorkspace=openWorkspace;
globalThis.__armCounters=function(){
  if(globalThis.__countersArmed) return;
  globalThis.__countersArmed=true;
  const scripting=chrome.scripting, exec=scripting.executeScript.bind(scripting);
  scripting.executeScript=async function(...args){globalThis.__scriptCalls++;return exec(...args);};
  const capture=chrome.tabCapture.getMediaStreamId.bind(chrome.tabCapture);
  chrome.tabCapture.getMediaStreamId=async function(...args){globalThis.__tabCaptureStarts++;return capture(...args);};
  const download=chrome.downloads.download.bind(chrome.downloads);
  chrome.downloads.download=async function(...args){globalThis.__downloadStarts++;return download(...args);};
};
`);
  const manifestPath = join(extension, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.host_permissions = hostPermissions;
  await writeFile(manifestPath, JSON.stringify(manifest));
  await mkdir(join(scratch, 'profile'), {recursive:true});
  return extension;
}
