import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {packageExtension} from '../scripts/package.mjs';

test('the store package zips extension files at the archive root', async () => {
  const result = await packageExtension();
  assert.match(result.zipPath, /videoharbor-0\.6\.4\.zip$/);
  assert.ok(result.count >= 30);
  const listed = spawnSync('unzip', ['-Z1', result.zipPath], {encoding: 'utf8'});
  assert.equal(listed.status, 0, listed.stderr);
  const names = listed.stdout.split('\n').filter(Boolean);
  assert.ok(names.includes('manifest.json'));
  assert.ok(names.includes('background.js'));
  assert.ok(names.includes('_locales/ja/messages.json'));
  assert.ok(names.includes('_locales/en/messages.json'));
  assert.equal(names.some(name => name.startsWith('extension/') || name.includes('..')), false);
});
