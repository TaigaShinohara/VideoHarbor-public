import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const cli = fileURLToPath(new URL('../scripts/agent-cli.mjs', import.meta.url));

function run(args, stateDir) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: {...process.env, VIDEOHARBOR_AGENT_STATE_DIR: stateDir},
  });
  let body = null;
  try { body = JSON.parse(result.stdout); } catch { /* help text is not JSON */ }
  return {status: result.status, body, stdout: result.stdout};
}

function isolated() {
  return mkdtempSync(join(tmpdir(), 'videoharbor-agent-test-'));
}

test('status returns the unified envelope with names only, never secret values', () => {
  const dir = isolated();
  try {
    const {status, body} = run(['status'], dir);
    assert.equal(status, 0);
    assert.equal(body.ok, true);
    assert.equal(body.meta.schema_version, 1);
    assert.ok(body.meta.request_id);
    assert.equal(body.data.app, 'VideoHarbor');
    assert.deepEqual(body.data.permissions, ['activeTab', 'scripting', 'downloads', 'storage', 'tabCapture']);
    assert.equal(body.data.secrets.values_returned, false);
    assert.equal(body.data.onboarding_state.value_read_by_cli, false);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('unknown command and missing arguments are input errors (exit 1)', () => {
  const dir = isolated();
  try {
    const unknown = run(['frobnicate'], dir);
    assert.equal(unknown.status, 1);
    assert.equal(unknown.body.error.code, 'invalid_input');
    const missing = run(['plan-save'], dir);
    assert.equal(missing.status, 1);
    assert.equal(missing.body.error.code, 'invalid_input');
    const badFlag = run(['status', '--nope'], dir);
    assert.equal(badFlag.status, 1);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('get resolves operations, commands and history entries; unknown id is exit 4', () => {
  const dir = isolated();
  try {
    const operation = run(['get', 'save-video'], dir);
    assert.equal(operation.status, 0);
    assert.equal(operation.body.data.type, 'operation');
    assert.equal(operation.body.data.human_only, true);
    const planned = run(['get', 'plan-save'], dir);
    assert.equal(planned.body.data.type, 'operation');
    assert.equal(planned.body.data.machine_path, 'plan-save');
    const command = run(['get', 'verify'], dir);
    assert.equal(command.body.data.type, 'command');
    const missing = run(['get', 'does-not-exist'], dir);
    assert.equal(missing.status, 4);
    assert.equal(missing.body.error.code, 'not_found');
    const saved = run(['plan-save', '--url', 'https://example.com/a.mp4', '--now', '2026-11-24T00:00:00Z'], dir);
    const entry = run(['get', saved.body.meta.request_id], dir);
    assert.equal(entry.status, 0);
    assert.equal(entry.body.data.type, 'history_entry');
    assert.equal(entry.body.data.command, 'plan-save');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('plan-save plans an MP4 with a deterministic filename under --now', () => {
  const dir = isolated();
  try {
    const args = ['plan-save', '--url', 'https://example.com/movie.mp4', '--now', '2026-11-24T00:00:00Z', '--dry-run'];
    const first = run(args, dir);
    const second = run(args, dir);
    assert.equal(first.status, 0);
    assert.equal(first.body.data.supported, true);
    assert.match(first.body.data.output.filename, /^VideoHarbor\/2026-11-24\/video-\d+-\d+\.mp4$/);
    assert.equal(first.body.data.output.filename, second.body.data.output.filename);
    assert.equal(first.body.data.execution, 'human_only');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('plan-save refuses blocked sites with exit 3 and format mismatches with exit 1', () => {
  const dir = isolated();
  try {
    const blocked = run(['plan-save', '--url', 'https://www.youtube.com/watch?v=x', '--dry-run'], dir);
    assert.equal(blocked.status, 3);
    assert.equal(blocked.body.error.code, 'site_not_supported');
    const format = run(['plan-save', '--url', 'https://example.com/movie.webm', '--format', 'mp4', '--dry-run'], dir);
    assert.equal(format.status, 1);
    assert.equal(format.body.error.code, 'format_not_allowed');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('plan-save replays the first result for the same idempotency key', () => {
  const dir = isolated();
  try {
    const args = ['plan-save', '--url', 'https://example.com/movie.mp4', '--now', '2026-11-24T00:00:00Z', '--idempotency-key', 'op-42'];
    const first = run(args, dir);
    const second = run(args, dir);
    assert.equal(first.status, 0);
    assert.equal(second.status, 0);
    assert.equal(second.body.meta.idempotent_replay, true);
    assert.equal(second.body.data.output.filename, first.body.data.output.filename);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('--dry-run records no history', () => {
  const dir = isolated();
  try {
    run(['status', '--dry-run'], dir);
    const history = run(['history', '--dry-run'], dir);
    assert.equal(history.body.data.total, 0);
    run(['status'], dir);
    const after = run(['history', '--dry-run'], dir);
    assert.equal(after.body.data.total, 1);
    assert.equal(after.body.data.entries[0].command, 'status');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('doctor passes on the repository as committed', () => {
  const dir = isolated();
  try {
    const {status, body} = run(['doctor', '--dry-run'], dir);
    assert.equal(status, 0, JSON.stringify(body));
    assert.ok(body.data.checks.length >= 10);
    assert.ok(body.data.checks.every(c => c.ok));
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('list exposes the catalog operations including the human-only declarations', () => {
  const dir = isolated();
  try {
    const {status, body} = run(['list', '--dry-run'], dir);
    assert.equal(status, 0);
    const names = body.data.operations.map(o => o.name);
    for (const name of ['plan-save', 'save-video', 'record-screen', 'grant-frame-access', 'verify-integrity']) assert.ok(names.includes(name), name);
    const record = body.data.operations.find(o => o.name === 'record-screen');
    assert.equal(record.human_only, true);
    assert.ok(record.reason.length > 0);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('verify passes: repo check, docs consistency and plan smoke tests', () => {
  const dir = isolated();
  try {
    const {status, body} = run(['verify', '--dry-run', '--timeout', '120'], dir);
    assert.equal(status, 0, JSON.stringify(body));
    assert.ok(body.data.checks.every(c => c.ok));
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('every command answers --help', () => {
  const dir = isolated();
  try {
    for (const command of ['status', 'doctor', 'list', 'get', 'history', 'plan-save', 'verify']) {
      const {status, stdout} = run([command, '--help'], dir);
      assert.equal(status, 0, command);
      assert.ok(stdout.length > 40, command);
    }
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
