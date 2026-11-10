// Store images from local synthetic pages. YouTube hostnames are mapped to loopback.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchTestExtension} from '../tests/chrome-runtime.mjs';
import {blockedHostArgs, copyExtension, startBlockedSite} from '../tests/blocked-site.mjs';
import {readPng} from './png.mjs';

const repo = fileURLToPath(new URL('..', import.meta.url));
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = join(repo, 'store');
await mkdir(join(out, 'screenshots'), {recursive:true});

async function pngFromCanvas(page, draw) {
  const bytes = await page.evaluate(async drawSource => {
    const draw = new Function(`return (${drawSource})(document)`);
    const canvas = await draw();
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, draw);
  return Buffer.from(bytes);
}

const browser = await chromium.launch({channel: process.env.CHROME_CHANNEL || 'chrome', headless:true});
try {
  const page = await browser.newPage({viewport:{width:1280, height:800}, deviceScaleFactor:1});
  const icon = (await readFile(join(repo, 'extension/icons/icon-128.png'))).toString('base64');
  await page.setContent('<!doctype html><title>store assets</title>');
  const storeIcon = await pngFromCanvas(page, `async function draw(){
    const canvas=document.createElement('canvas'); canvas.width=128; canvas.height=128;
    const ctx=canvas.getContext('2d');
    const image=new Image(); image.src='data:image/png;base64,${icon}'; await image.decode();
    ctx.clearRect(0,0,128,128); ctx.drawImage(image,16,16,96,96);
    const corner=ctx.getImageData(0,0,1,1).data; const center=ctx.getImageData(64,64,1,1).data;
    if(corner[3]!==0 || center[3]===0) throw new Error('store icon padding or artwork is wrong');
    return canvas;
  }`);
  const promo = await pngFromCanvas(page, `async function draw(){
    const canvas=document.createElement('canvas'); canvas.width=440; canvas.height=280;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f6f8f7'; ctx.fillRect(0,0,440,280);
    ctx.fillStyle='#0e7a68'; ctx.fillRect(0,0,12,280);
    const image=new Image(); image.src='data:image/png;base64,${icon}'; await image.decode();
    ctx.drawImage(image,36,92,96,96);
    ctx.fillStyle='#1e332e'; ctx.font='700 42px sans-serif'; ctx.fillText('VideoHarbor',156,128);
    ctx.fillStyle='#0e7a68'; ctx.font='600 22px sans-serif'; ctx.fillText('見ている動画を保存・録画',156,168);
    ctx.fillStyle='#586c64'; ctx.font='20px sans-serif'; ctx.fillText('Save or record what you watch',156,202);
    return canvas;
  }`);
  await writeFile(join(out, 'icon-128.png'), storeIcon);
  await writeFile(join(out, 'promo-tile-440x280.png'), promo);
} finally {
  await browser.close();
}

const scratch = await mkdtemp(join(tmpdir(), 'videoharbor-store-assets-'));
let clip = Buffer.alloc(0);
const server = createServer((request, response) => {
  if ((request.url || '').startsWith('/clip.webm')) {
    response.writeHead(200, {'content-type':'video/webm'});
    response.end(clip);
    return;
  }
  response.writeHead(200, {'content-type':'text/html; charset=utf-8'});
  response.end(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>サンプル動画</title><body style="font-family:sans-serif;background:#f6f8f7;color:#1e332e"><h1>港のサンプル</h1><video id="clip" title="港のサンプル" controls src="/clip.webm" width="640" height="360"></video></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const site = await startBlockedSite({title:'対応していないページ'});
let context;
try {
  const extension = await copyExtension(scratch, ['http://127.0.0.1/*','https://www.youtube.com/*']);
  const runtime = await launchTestExtension(chromium, join(scratch, 'profile'), extension, {
    viewport:{width:1280, height:800},
    deviceScaleFactor:1,
    ignoreHTTPSErrors:true,
    ignoreDefaultArgs:['--disable-extensions'],
    args:[...blockedHostArgs(), '--no-first-run'],
  });
  context = runtime.context;
  const page = await context.newPage();
  await page.goto(origin);
  clip = Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
    const ctx = canvas.getContext('2d'); const stream = canvas.captureStream(12); const chunks = [];
    const recorder = new MediaRecorder(stream, {mimeType:'video/webm'});
    const ready = new Promise(resolve => { recorder.ondataavailable = event => chunks.push(event.data); recorder.onstop = async () => resolve([...new Uint8Array(await new Blob(chunks).arrayBuffer())]); });
    recorder.start(100);
    ctx.fillStyle = '#0e7a68'; ctx.fillRect(0,0,640,360); ctx.fillStyle = '#ffffff'; ctx.font = '48px sans-serif'; ctx.fillText('Sample', 40, 180);
    await new Promise(resolve => setTimeout(resolve, 400));
    recorder.stop(); stream.getTracks().forEach(track => track.stop());
    return ready;
  }));
  await page.reload();
  const tab = await runtime.worker.evaluate(async pageOrigin => (await chrome.tabs.query({})).find(item => item.url?.startsWith(pageOrigin)), origin);
  const [manager] = await Promise.all([context.waitForEvent('page'), runtime.worker.evaluate(source => globalThis.__openWorkspace(source), tab)]);
  await manager.waitForLoadState();
  await manager.setViewportSize({width:1280, height:800});
  await manager.waitForFunction(() => document.querySelector('.direct-save') && !document.querySelector('#scan').disabled);
  await manager.screenshot({path:join(out, 'screenshots/01-save.png'), animations:'disabled'});
  await manager.locator('#record-tab').click();
  await manager.waitForFunction(() => document.querySelector('#record-view') && !document.querySelector('#record-view').hidden);
  await manager.screenshot({path:join(out, 'screenshots/02-record.png'), animations:'disabled'});

  const blocked = await context.newPage();
  const response = await blocked.goto(site.url, {waitUntil:'domcontentloaded', timeout:20000});
  if (response.headers()['x-fixture'] !== 'videoharbor-synthetic') throw new Error('blocked-site screenshot was not served locally');
  const blockedTab = await runtime.worker.evaluate(async () => (await chrome.tabs.query({})).find(item => item.url?.includes('www.youtube.com') && item.url.includes('synthetic-local')));
  const [blockedManager] = await Promise.all([
    context.waitForEvent('page'),
    runtime.worker.evaluate(source => globalThis.__openWorkspace(source), blockedTab),
  ]);
  await blockedManager.waitForLoadState();
  await blockedManager.setViewportSize({width:1280, height:800});
  await blockedManager.waitForFunction(() => (document.querySelector('#message')?.textContent || '').includes('このサイトには対応していません'));
  await blockedManager.screenshot({path:join(out, 'screenshots/03-unsupported-site.png'), animations:'disabled'});
} finally {
  if (context) await context.close();
  await new Promise(resolve => server.close(resolve));
  await site.close();
  await rm(scratch, {recursive:true, force:true});
}

for (const [path, width, height] of [
  ['screenshots/01-save.png',1280,800],
  ['screenshots/02-record.png',1280,800],
  ['screenshots/03-unsupported-site.png',1280,800],
  ['promo-tile-440x280.png',440,280],
  ['icon-128.png',128,128],
]) {
  const png = readPng(await readFile(join(out, path)));
  if (png.width !== width || png.height !== height) throw new Error(`${path} is ${png.width}x${png.height}`);
}
console.log('store images written');
