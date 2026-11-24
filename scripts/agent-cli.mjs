#!/usr/bin/env node
// VideoHarbor agent CLI — the machine path to the same core the GUI uses.
// Contract: docs/AGENT_GUIDE.md. Catalog: docs/AGENT_OPERATIONS.md.
// Read commands never change app state. plan-save only plans a save with the
// extension's own policy modules; the save itself stays in the browser UI.
import {appendFile, mkdir, readFile, access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isUnsupportedSiteURL, allowedURL, downloadName, UNSUPPORTED_SITE_MESSAGE} from '../extension/utils.js';
import {outputOptions, validateOutputFormat} from '../extension/output-format.js';

const SCHEMA_VERSION = 1;
const AGENT_LEVEL = 2;
const root = fileURLToPath(new URL('..', import.meta.url));
const stateDir = process.env.VIDEOHARBOR_AGENT_STATE_DIR || join(root, '.agent-state');
const historyFile = join(stateDir, 'history.jsonl');
const FORBIDDEN_PERMISSIONS = ['debugger', 'webRequest', 'cookies', 'history', 'tabs'];

export const EXIT = {ok: 0, input: 1, app: 2, policy: 3, notFound: 4};

class AgentError extends Error {
  constructor(code, exit, message, {retryable = false, details = {}} = {}) {
    super(message);
    this.code = code;
    this.exit = exit;
    this.retryable = retryable;
    this.details = details;
  }
}

const COMMANDS = {
  status: {kind: 'read', summary: 'App version, permissions, state locations, history size.'},
  doctor: {kind: 'read', summary: 'Precondition checks with a fix hint for each failure.'},
  list: {kind: 'read', summary: 'Operations and commands from the machine-readable manifest.'},
  get: {kind: 'read', summary: 'One operation, one command, or one history entry by id.'},
  history: {kind: 'read', summary: 'Past CLI executions with success and failure reasons.'},
  'plan-save': {kind: 'plan', summary: 'Dry-run a save: support, format options, output filename. Never downloads.'},
  verify: {kind: 'read', summary: 'Repo check plus guide/manifest/CLI consistency and plan smoke tests.'},
};

const HELP = {
  top: `VideoHarbor agent CLI

Usage: node scripts/agent-cli.mjs <command> [options]
       npm run agent -- <command> [options]

Commands:
  status       App version, permissions, state locations, history size
  doctor       Precondition checks with a fix hint for each failure
  list         Operations and commands from docs/agent-manifest.json
  get <id>     One operation, command, or history entry (by request_id)
  history      Past CLI executions with success and failure reasons
  plan-save    Dry-run a save using the extension's own policy modules
  verify       Repo check + docs/CLI consistency + plan smoke tests

Common flags (every command):
  --json                 JSON envelope output (default)
  --human                Human-readable output instead of JSON
  --dry-run              Do not record this run in history
  --yes                  Accepted; no destructive commands exist, so unused
  --idempotency-key <k>  plan-save: replay the first result for the same key
  --timeout <sec>        verify: timeout for the repo check subprocess
  --help                 Show help (per command: <command> --help)

Exit codes: 0 ok / 1 input error / 2 app failure / 3 policy refusal / 4 not found
Schema version: ${SCHEMA_VERSION}. Guide: docs/AGENT_GUIDE.md`,
  status: `status — read app state (no side effects besides history recording).

Example: node scripts/agent-cli.mjs status --json
Returns app/package versions, manifest permissions (names only), the
onboarding state key (value is never read), state dir, and history size.`,
  doctor: `doctor — check preconditions (no side effects besides history recording).

Example: node scripts/agent-cli.mjs doctor --json
Checks Node version, manifest/package version match, the permission policy
(no debugger/webRequest/cookies/history/tabs, no required host access),
required extension files, locales, agent docs, and state dir writability.
Exit 0 when every check passes, 2 otherwise.`,
  list: `list — operations and commands from docs/agent-manifest.json.

Example: node scripts/agent-cli.mjs list --json
The manifest is the machine-readable source; docs/AGENT_OPERATIONS.md is
the human-readable catalog of the same operations.`,
  get: `get <id> — one operation, one command, or one history entry.

Examples:
  node scripts/agent-cli.mjs get plan-save --json
  node scripts/agent-cli.mjs get save-video --json
  node scripts/agent-cli.mjs get <request_id> --json
Exit 4 when the id matches nothing.`,
  history: `history — past CLI executions, oldest first.

Example: node scripts/agent-cli.mjs history --json --limit 20
Each entry: request_id, ISO 8601 timestamp, command, ok, error code.
--limit <n> caps the returned entries (default 20).`,
  'plan-save': `plan-save — dry-run a save with the extension's own policy modules.

Required: --url <video page or file URL>
Options:
  --page-url <url>   Page the video was found on (blocked-site check target)
  --type <t>         direct | hls | dash | blob (default: inferred from URL)
  --mime <mime>      Known MIME type of the item, if any
  --format <f>       auto | mp4 (default auto)
  --title <text>     Page title (accepted for parity with the GUI naming)
  --now <ISO 8601>   Fix the clock for a deterministic output filename
  --idempotency-key <k>  Same key replays the first plan instead of replanning

The plan reports support, format options (with refusal reasons), and the
output filename the GUI would use. It never downloads anything; executing
the save is a human step in the browser (see docs/AGENT_OPERATIONS.md).
Exit 3 when the site or URL is refused by policy.`,
  verify: `verify — integrity and consistency checks.

Example: node scripts/agent-cli.mjs verify --json --timeout 120
Runs scripts/check.mjs, cross-checks that the manifest, guide, catalog and
this CLI agree on commands and operations, and smoke-tests plan-save on a
blocked host (must refuse) and a plain MP4 URL (must plan). Exit 0/2.`,
};

function parseArgs(argv) {
  const flags = {json: true, human: false, dryRun: false, yes: false, idempotencyKey: null, timeout: null, help: false, limit: null, options: {}};
  const positional = [];
  const valueFlags = {'--idempotency-key': 'idempotencyKey', '--timeout': 'timeout', '--limit': 'limit'};
  const optionFlags = {'--url': 'url', '--page-url': 'pageUrl', '--type': 'type', '--mime': 'mime', '--format': 'format', '--title': 'title', '--now': 'now'};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') flags.json = true;
    else if (arg === '--human') { flags.human = true; flags.json = false; }
    else if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--yes') flags.yes = true;
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else if (valueFlags[arg] || optionFlags[arg]) {
      const value = argv[++i];
      if (value === undefined) throw new AgentError('invalid_input', EXIT.input, `${arg} needs a value`);
      if (valueFlags[arg]) flags[valueFlags[arg]] = value;
      else flags.options[optionFlags[arg]] = value;
    } else if (arg.startsWith('--')) throw new AgentError('invalid_input', EXIT.input, `Unknown flag: ${arg}`);
    else positional.push(arg);
  }
  if (flags.timeout !== null) {
    flags.timeout = Number(flags.timeout);
    if (!Number.isFinite(flags.timeout) || flags.timeout <= 0) throw new AgentError('invalid_input', EXIT.input, '--timeout must be a positive number of seconds');
  }
  if (flags.limit !== null) {
    flags.limit = Number(flags.limit);
    if (!Number.isInteger(flags.limit) || flags.limit <= 0) throw new AgentError('invalid_input', EXIT.input, '--limit must be a positive integer');
  }
  return {flags, positional};
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readHistory() {
  try {
    const text = await readFile(historyFile, 'utf8');
    return text.split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

async function record(entry, flags) {
  if (flags.dryRun) return;
  try {
    await mkdir(stateDir, {recursive: true});
    await appendFile(historyFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch { /* history is best-effort; a read must not fail because of it */ }
}

async function loadManifest() {
  return readJson(join(root, 'extension/manifest.json'));
}

async function loadAgentManifest() {
  return readJson(join(root, 'docs/agent-manifest.json'));
}

async function cmdStatus() {
  const manifest = await loadManifest();
  const pkg = await readJson(join(root, 'package.json'));
  const history = await readHistory();
  return {
    app: 'VideoHarbor',
    app_version: pkg.version,
    manifest_version: manifest.manifest_version,
    schema_version: SCHEMA_VERSION,
    agent_level: AGENT_LEVEL,
    agent_level_scope: 'read, plan and verify; in-browser execution is human-only (docs/AGENT_OPERATIONS.md)',
    permissions: manifest.permissions,
    optional_host_permissions: manifest.optional_host_permissions || [],
    secrets: {values_returned: false},
    onboarding_state: {storage: 'localStorage', key: 'videoharbor.onboarding.v1', value_read_by_cli: false},
    state_dir: stateDir,
    history_entries: history.length,
    node: process.version,
  };
}

async function cmdDoctor() {
  const checks = [];
  const add = (name, ok, detail, fix) => checks.push({name, ok, detail, ...(ok ? {} : {fix})});
  const major = Number(process.versions.node.split('.')[0]);
  add('node_version', major >= 18, `Node ${process.version}`, 'Use Node 18 or newer.');
  let manifest = null, pkg = null;
  try { manifest = await loadManifest(); pkg = await readJson(join(root, 'package.json')); add('manifest_parses', true, 'extension/manifest.json is valid JSON'); }
  catch (error) { add('manifest_parses', false, String(error.message || error), 'Fix extension/manifest.json or package.json.'); }
  if (manifest && pkg) {
    add('version_match', manifest.version === pkg.version, `manifest ${manifest.version} / package ${pkg.version}`, 'Set the same version in extension/manifest.json and package.json.');
    const bad = (manifest.permissions || []).filter(p => FORBIDDEN_PERMISSIONS.includes(p));
    add('permission_policy', bad.length === 0 && !manifest.host_permissions, bad.length ? `forbidden: ${bad.join(', ')}` : 'no forbidden permissions, no required host access', 'Remove debugger/webRequest/cookies/history/tabs and required host_permissions.');
  }
  for (const file of ['extension/workspace.html', 'extension/background.js', 'extension/workspace.js']) {
    try { await access(join(root, file)); add(`file:${file}`, true, 'present'); }
    catch { add(`file:${file}`, false, 'missing', `Restore ${file}.`); }
  }
  for (const locale of ['ja', 'en']) {
    try { await readJson(join(root, `extension/_locales/${locale}/messages.json`)); add(`locale:${locale}`, true, 'present'); }
    catch { add(`locale:${locale}`, false, 'missing or invalid', `Restore extension/_locales/${locale}/messages.json.`); }
  }
  for (const doc of ['docs/AGENT_GUIDE.md', 'docs/agent-manifest.json', 'docs/AGENT_OPERATIONS.md']) {
    try { await access(join(root, doc)); add(`doc:${doc}`, true, 'present'); }
    catch { add(`doc:${doc}`, false, 'missing', `Restore ${doc}; guide and implementation must not drift.`); }
  }
  try {
    await mkdir(stateDir, {recursive: true});
    await access(stateDir);
    add('state_dir', true, stateDir);
  } catch (error) { add('state_dir', false, String(error.message || error), 'Make the state dir writable or set VIDEOHARBOR_AGENT_STATE_DIR.'); }
  const ok = checks.every(c => c.ok);
  if (!ok) throw new AgentError('doctor_failed', EXIT.app, 'One or more precondition checks failed', {details: {checks}});
  return {checks};
}

async function cmdList() {
  const agentManifest = await loadAgentManifest();
  return {
    operations: agentManifest.operations,
    commands: Object.entries(COMMANDS).map(([name, c]) => ({name, kind: c.kind, summary: c.summary})),
  };
}

async function cmdGet(id) {
  if (!id) throw new AgentError('invalid_input', EXIT.input, 'get needs an id: an operation name, a command name, or a history request_id');
  const agentManifest = await loadAgentManifest();
  const operation = (agentManifest.operations || []).find(o => o.name === id);
  if (operation) return {type: 'operation', ...operation};
  if (COMMANDS[id]) return {type: 'command', name: id, ...COMMANDS[id]};
  const history = await readHistory();
  const entry = history.find(e => e.request_id === id);
  if (entry) return {type: 'history_entry', ...entry};
  throw new AgentError('not_found', EXIT.notFound, `Nothing matches id: ${id}`);
}

async function cmdHistory(flags) {
  const history = await readHistory();
  const limit = flags.limit ?? 20;
  return {entries: history.slice(-limit), total: history.length};
}

function inferType(url) {
  const path = url.pathname.toLowerCase();
  if (path.endsWith('.m3u8')) return 'hls';
  if (path.endsWith('.mpd')) return 'dash';
  return 'direct';
}

export function planSave(options, {now = new Date()} = {}) {
  if (!options.url) throw new AgentError('invalid_input', EXIT.input, 'plan-save needs --url');
  let url;
  try { url = new URL(options.url); } catch { throw new AgentError('invalid_input', EXIT.input, `--url is not a URL: ${options.url}`); }
  const pageUrl = options.pageUrl || options.url;
  if (isUnsupportedSiteURL(pageUrl) || isUnsupportedSiteURL(options.url)) {
    throw new AgentError('site_not_supported', EXIT.policy, UNSUPPORTED_SITE_MESSAGE, {details: {page_url: pageUrl}});
  }
  const type = options.type || inferType(url);
  if (!['direct', 'hls', 'dash', 'blob'].includes(type)) throw new AgentError('invalid_input', EXIT.input, `--type must be direct, hls, dash or blob (got: ${type})`);
  const format = options.format || 'auto';
  const item = {url: options.url, type, ...(options.mime ? {mime: options.mime} : {})};
  const warnings = [];
  if (type !== 'blob' && !allowedURL(options.url, 'videos')) {
    throw new AgentError('url_not_allowed', EXIT.policy, 'Only http(s) video URLs can be planned', {details: {url: options.url}});
  }
  if (type === 'blob') warnings.push('blob items live in the page context; the CLI cannot confirm the data exists. The plan applies the same format policy the GUI uses.');
  try { validateOutputFormat(item, format); }
  catch (error) { throw new AgentError('format_not_allowed', EXIT.input, String(error.message || error), {details: {format}}); }
  const when = options.now ? new Date(options.now) : now;
  if (options.now && Number.isNaN(when.getTime())) throw new AgentError('invalid_input', EXIT.input, `--now is not an ISO 8601 date: ${options.now}`);
  return {
    supported: true,
    item: {url: options.url, page_url: pageUrl, type, mime: options.mime || null},
    format: {requested: format, options: outputOptions(item)},
    output: {filename: downloadName(item, options.title || '', 0, 'videos', format, when)},
    warnings,
    execution: 'human_only',
    next_step: 'Open VideoHarbor on the page and press Save for this item; the GUI runs this same plan.',
  };
}

async function cmdPlanSave(flags) {
  if (flags.idempotencyKey) {
    const history = await readHistory();
    const prior = history.find(e => e.command === 'plan-save' && e.idempotency_key === flags.idempotencyKey && e.ok && e.result);
    if (prior) return {data: prior.result, replay: true};
  }
  return {data: planSave(flags.options), replay: false};
}

async function cmdVerify(flags) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({name, ok, detail});
  const timeoutMs = (flags.timeout ?? 120) * 1000;
  const checkRun = spawnSync(process.execPath, [join(root, 'scripts/check.mjs')], {encoding: 'utf8', timeout: timeoutMs});
  add('repo_check', checkRun.status === 0, checkRun.status === 0 ? 'scripts/check.mjs passed' : (checkRun.stderr || checkRun.stdout || 'check failed').slice(0, 500));
  const agentManifest = await loadAgentManifest();
  const manifestCommands = (agentManifest.commands || []).map(c => c.name).sort();
  const cliCommands = Object.keys(COMMANDS).sort();
  add('manifest_matches_cli', JSON.stringify(manifestCommands) === JSON.stringify(cliCommands), `manifest: ${manifestCommands.join(',')} / cli: ${cliCommands.join(',')}`);
  const guide = await readFile(join(root, 'docs/AGENT_GUIDE.md'), 'utf8');
  add('guide_lists_all_commands', cliCommands.every(name => guide.includes(name)), 'every CLI command appears in docs/AGENT_GUIDE.md');
  const catalog = await readFile(join(root, 'docs/AGENT_OPERATIONS.md'), 'utf8');
  const operationNames = (agentManifest.operations || []).map(o => o.name);
  add('catalog_lists_all_operations', operationNames.every(name => catalog.includes(name)), 'every manifest operation appears in docs/AGENT_OPERATIONS.md');
  try { planSave({url: 'https://www.youtube.com/watch?v=fixture'}); add('smoke_blocked_site', false, 'plan-save accepted a blocked host'); }
  catch (error) { add('smoke_blocked_site', error.code === 'site_not_supported', `blocked host refused with code ${error.code}`); }
  try {
    const plan = planSave({url: 'https://example.com/movie.mp4', now: '2026-11-24T00:00:00Z'});
    add('smoke_mp4_plan', plan.supported === true && plan.output.filename.endsWith('.mp4'), `planned ${plan.output.filename}`);
  } catch (error) { add('smoke_mp4_plan', false, String(error.message || error)); }
  const ok = checks.every(c => c.ok);
  if (!ok) throw new AgentError('verify_failed', EXIT.app, 'Verification failed', {details: {checks}});
  return {checks};
}

const RUNNERS = {status: f => cmdStatus(f), doctor: f => cmdDoctor(f), list: f => cmdList(f), get: (f, p) => cmdGet(p[0]), history: f => cmdHistory(f), 'plan-save': f => cmdPlanSave(f), verify: f => cmdVerify(f)};

function humanText(data) {
  return JSON.stringify(data, null, 2);
}

async function main(argv) {
  const requestId = randomUUID();
  let command = null;
  let flags = {json: true, human: false, dryRun: false};
  let result = null;
  let error = null;
  try {
    const parsed = parseArgs(argv);
    flags = parsed.flags;
    command = parsed.positional[0];
    if (flags.help || !command) {
      const text = command && HELP[command] ? HELP[command] : HELP.top;
      console.log(flags.json && !flags.help ? JSON.stringify({ok: true, data: {help: text}, meta: {schema_version: SCHEMA_VERSION, request_id: requestId}}, null, 2) : text);
      return flags.help ? EXIT.ok : EXIT.input;
    }
    if (!RUNNERS[command]) throw new AgentError('invalid_input', EXIT.input, `Unknown command: ${command}. Run with --help.`);
    const out = await RUNNERS[command](flags, parsed.positional.slice(1));
    result = out && out.data !== undefined && command === 'plan-save' ? out.data : out;
    const replay = out && out.replay === true;
    const envelope = {ok: true, data: result, meta: {schema_version: SCHEMA_VERSION, request_id: requestId, ...(replay ? {idempotent_replay: true} : {}), ...(flags.dryRun ? {dry_run: true} : {})}};
    console.log(flags.human ? humanText(result) : JSON.stringify(envelope, null, 2));
    await record({request_id: requestId, ts: new Date().toISOString(), command, ok: true, error_code: null, idempotency_key: flags.idempotencyKey, ...(command === 'plan-save' ? {result} : {})}, flags);
    return EXIT.ok;
  } catch (caught) {
    error = caught instanceof AgentError ? caught : new AgentError('internal_error', EXIT.app, String(caught?.message || caught), {retryable: false});
    const envelope = {ok: false, error: {code: error.code, message: error.message, retryable: error.retryable, details: error.details}, meta: {schema_version: SCHEMA_VERSION, request_id: requestId}};
    console.log(flags.human ? `Error ${error.code}: ${error.message}` : JSON.stringify(envelope, null, 2));
    if (command) await record({request_id: requestId, ts: new Date().toISOString(), command, ok: false, error_code: error.code, idempotency_key: flags.idempotencyKey || null}, flags);
    return error.exit;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main(process.argv.slice(2));
}
