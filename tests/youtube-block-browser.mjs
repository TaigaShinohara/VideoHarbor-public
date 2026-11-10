// Proves a synthetic YouTube tab does not scan, save, or start tab/video recording.
// The hostname is mapped to a local certificate so no third-party site is contacted.
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {launchTestExtension} from './chrome-runtime.mjs';
import {BLOCKED_PAGE_TITLE, blockedHostArgs, copyExtension, startBlockedSite} from './blocked-site.mjs';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const scratch = await mkdtemp(join(tmpdir(), 'videoharbor-youtube-block-'));
const site = await startBlockedSite();
let context;
try {
  const extension = await copyExtension(scratch, [
    'https://www.youtube.com/*',
    'https://*.youtube.com/*',
    'https://youtu.be/*',
    'https://*.googlevideo.com/*',
    'https://*.youtube-nocookie.com/*',
    'https://*.youtubekids.com/*',
  ]);
  const runtime = await launchTestExtension(chromium, join(scratch, 'profile'), extension, {
    viewport:{width:1280, height:800},
    deviceScaleFactor:1,
    ignoreHTTPSErrors:true,
    ignoreDefaultArgs:['--disable-extensions'],
    args:[...blockedHostArgs(), '--no-first-run'],
  });
  context = runtime.context;
  const page = await context.newPage();
  const response = await page.goto(site.url, {waitUntil:'domcontentloaded', timeout:20000});
  assert.equal(response.headers()['x-fixture'], 'videoharbor-synthetic', 'the tab was not served by the local fixture');
  assert.equal(await page.locator('h1').textContent(), BLOCKED_PAGE_TITLE);
  assert.ok(site.requests.some(url => url.startsWith('/watch')), 'Chrome did not reach the loopback fixture');
  await runtime.worker.evaluate(() => globalThis.__armCounters());
  const tab = await runtime.worker.evaluate(async origin => (await chrome.tabs.query({})).find(item => item.url?.startsWith(origin)), 'https://www.youtube.com');
  assert.ok(tab?.url?.includes('youtube.com'), 'the source tab URL is not a YouTube host');
  const [manager] = await Promise.all([
    context.waitForEvent('page'),
    runtime.worker.evaluate(source => globalThis.__openWorkspace(source), tab),
  ]);
  await manager.waitForLoadState();
  await manager.waitForFunction(title => {
    const message = document.querySelector('#message')?.textContent || '';
    return message.includes('このサイトには対応していません') && message.includes('This site is not supported') && document.querySelector('#scan') && !document.querySelector('#scan').disabled;
  }, BLOCKED_PAGE_TITLE);
  assert.equal(await manager.locator('.direct-save, .media-save, .video-card').count(), 0);
  assert.match(await manager.locator('#empty h3').textContent(), /このサイトには対応していません/);
  await manager.locator('#record-tab').click();
  assert.equal(await manager.locator('input[name="record-mode"][value="video"]').isDisabled(), true);
  assert.equal(await manager.locator('input[name="record-mode"][value="tab"]').isDisabled(), true);
  assert.equal(await manager.locator('input[name="record-mode"][value="display"]').isEnabled(), true);
  assert.equal(await manager.locator('input[name="record-mode"][value="display"]').isChecked(), true);
  assert.match(await manager.locator('#target-hint').textContent(), /このサイトには対応していません/);
  const result = await manager.evaluate(async () => {
    const sessionId = new URL(location.href).searchParams.get('id');
    const send = (message) => chrome.runtime.sendMessage({sessionId, instance:'blocked-site-check', ...message});
    const tabCapture = await send({type:'capture', mode:'tab'});
    const video = await send({type:'video-control', command:'prepare', token:'00000000-0000-4000-8000-000000000009', reference:{elementToken:'clip', frameToken:'frame', documentURL:document.referrer || 'https://www.youtube.com/watch?v=synthetic-local'}});
    const save = await send({type:'save', urls:['https://www.youtube.com/synthetic.mp4']});
    const display = await send({type:'capture', mode:'display'});
    await send({type:'release'});
    return {tabCapture, video, save, display};
  });
  assert.equal(result.tabCapture.ok, false);
  assert.match(result.tabCapture.error, /対応していません/);
  assert.equal(result.video.ok, false);
  assert.match(result.video.error, /対応していません/);
  assert.equal(result.save.ok, false);
  assert.match(result.save.error, /対応していません/);
  assert.equal(result.display.ok, true, result.display.error);
  const counts = await runtime.worker.evaluate(() => ({
    scripts: globalThis.__scriptCalls,
    tabs: globalThis.__tabCaptureStarts,
    downloads: globalThis.__downloadStarts,
  }));
  assert.equal(counts.scripts, 0, 'scanning or recording injected into the YouTube tab');
  assert.equal(counts.tabs, 0, 'tab capture started');
  assert.equal(counts.downloads, 0, 'a download started');
  console.log('YouTube block browser check PASS (local fixture mapped to a YouTube hostname).');
} finally {
  if (context) await context.close();
  await site.close();
  await rm(scratch, {recursive:true, force:true});
}
