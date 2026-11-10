import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {pixel,readPng,rgbaPixels} from './png.mjs';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('extension/manifest.json',root),'utf8'));
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.background.type,'module');
assert.ok(!manifest.host_permissions && !manifest.content_scripts && !manifest.externally_connectable);
assert.ok(!manifest.permissions.some(x=>['debugger','webRequest','history','cookies','tabs'].includes(x)));
assert.deepEqual(manifest.optional_host_permissions,['https://*/*','http://*/*'],'Site access must remain optional, never a required grant');
for(const icons of [manifest.icons,manifest.action.default_icon]) {
  for(const [size,path] of Object.entries(icons)) {
    const png=await readFile(new URL('extension/'+path,root));
    assert.ok(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`${path}: expected PNG`);
    assert.equal(png.readUInt32BE(16),Number(size),`${path}: icon width`);
    assert.equal(png.readUInt32BE(20),Number(size),`${path}: icon height`);
  }
}
const html=await readFile(new URL('extension/workspace.html',root),'utf8');
assert.ok(!/<script[^>]*>\s*[^<\s]/i.test(html),'Inline scripts are forbidden');
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  assert.ok(!/^https?:/i.test(m[1]),'No remote executable UI assets');
  await readFile(new URL('extension/'+m[1],root));
}
for(const name of await readdir(new URL('extension/',root))) {
  if(!name.endsWith('.js'))continue;
  const path=new URL(`extension/${name}`,root);
  const result=spawnSync(process.execPath,['--check',path.pathname],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const source=await readFile(path,'utf8');
  for(const m of source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)) await readFile(new URL(m[1],path));
  for(const m of source.matchAll(/new URL\(['"](\.\/[^'"]+)['"],\s*import\.meta\.url\)/g)) await readFile(new URL(m[1],path));
}
for(const path of ['workspace.html','workspace.css',manifest.background.service_worker]) await readFile(new URL('extension/'+path,root));
assert.equal(manifest.default_locale,'ja');
for(const locale of ['ja','en']) {
  const messages=JSON.parse(await readFile(new URL(`extension/_locales/${locale}/messages.json`,root),'utf8'));
  for(const key of ['extDescription','actionTitle']) assert.equal(typeof messages[key]?.message,'string',`${locale} ${key}`);
  assert.ok(messages.extDescription.message.length<=132,`${locale} description length`);
}
const messageTokens=[...JSON.stringify(manifest).matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map(match=>match[1]);
const ja=JSON.parse(await readFile(new URL('extension/_locales/ja/messages.json',root),'utf8'));
for(const token of messageTokens) assert.equal(typeof ja[token]?.message,'string',`missing ${token}`);
const storeImages=[
  ['store/screenshots/01-save.png',1280,800],
  ['store/screenshots/02-record.png',1280,800],
  ['store/screenshots/03-unsupported-site.png',1280,800],
  ['store/promo-tile-440x280.png',440,280],
  ['store/icon-128.png',128,128],
];
for(const [path,width,height] of storeImages) {
  const png=readPng(await readFile(new URL(path,root)));
  assert.equal(png.width,width,path);
  assert.equal(png.height,height,path);
}
const storeIcon=readPng(await readFile(new URL('store/icon-128.png',root)));
const iconPixels=rgbaPixels(storeIcon);
for(const [x,y] of [[0,0],[127,0],[0,127],[127,127]]) assert.equal(pixel(storeIcon,iconPixels,x,y).a,0,`store icon padding (${x},${y})`);
assert.ok(pixel(storeIcon,iconPixels,64,64).a>0,'store icon keeps the centered artwork');
console.log(`${manifest.name}: manifest, permissions, PNG icons, local UI/module references and JavaScript syntax OK`);
