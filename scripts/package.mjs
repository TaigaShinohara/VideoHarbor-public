// Zip the contents of extension/ at the archive root. No extra dependencies.
import {spawnSync} from 'node:child_process';
import {mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {crc32, deflateRawSync} from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const extensionDir = join(root, 'extension');
const forbidden = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  /taiga|shinohara/i,
  /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/,
];

function dosDate(date) {
  const time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const day = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return {time, day};
}

async function filesIn(directory) {
  const found = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (entry.name === '.DS_Store') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await filesIn(path));
    else if (entry.isFile()) found.push(path);
  }
  return found.sort();
}

function zipFiles(entries) {
  const stamp = dosDate(new Date('2026-11-10T00:00:00Z'));
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const compressed = deflateRawSync(data);
    const checksum = crc32(data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.day, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(Buffer.concat([local, name, compressed]));
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.day, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, name]));
    offset += local.length + name.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}

function referencedFiles(manifest, html, sources) {
  const wanted = new Set(['manifest.json', 'workspace.html', 'workspace.css', manifest.background.service_worker]);
  if (manifest.default_locale) wanted.add(`_locales/${manifest.default_locale}/messages.json`);
  for (const icons of [manifest.icons, manifest.action?.default_icon]) {
    for (const path of Object.values(icons || {})) wanted.add(path);
  }
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) wanted.add(match[1]);
  for (const source of sources) {
    for (const match of source.text.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)) wanted.add(relativePosix(source.name, match[1]));
    for (const match of source.text.matchAll(/new URL\(['"](\.\/[^'"]+)['"],\s*import\.meta\.url\)/g)) wanted.add(relativePosix(source.name, match[1]));
  }
  return [...wanted];
}

function relativePosix(from, specifier) {
  const base = dirname(from);
  const parts = `${base}/${specifier}`.split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

export async function packageExtension() {
  const manifest = JSON.parse(await readFile(join(extensionDir, 'manifest.json'), 'utf8'));
  const version = manifest.version;
  const paths = await filesIn(extensionDir);
  const entries = [];
  for (const path of paths) {
    const name = relative(extensionDir, path).split('\\').join('/');
    if (name.startsWith('..') || name.includes('/../')) throw new Error(`unsafe package path ${name}`);
    entries.push({name, data: await readFile(path)});
  }
  const zip = zipFiles(entries);
  const dist = join(root, 'dist');
  await mkdir(dist, {recursive: true});
  const zipPath = join(dist, `videoharbor-${version}.zip`);
  await writeFile(zipPath, zip);
  const extract = await mkdtemp(join(tmpdir(), 'videoharbor-package-'));
  try {
    const listed = spawnSync('unzip', ['-Z1', zipPath], {encoding: 'utf8'});
    if (listed.status !== 0) throw new Error(listed.stderr || 'unzip failed');
    const names = listed.stdout.split('\n').filter(Boolean);
    if (names.some(name => name.startsWith('extension/') || name.includes('..') || name.endsWith('/'))) {
      throw new Error('package must contain extension files at the archive root');
    }
    const extracted = spawnSync('unzip', ['-q', zipPath, '-d', extract], {encoding: 'utf8'});
    if (extracted.status !== 0) throw new Error(extracted.stderr || 'extract failed');
    const packedManifest = JSON.parse(await readFile(join(extract, 'manifest.json'), 'utf8'));
    const html = await readFile(join(extract, 'workspace.html'), 'utf8');
    const sources = [];
    for (const name of names.filter(name => name.endsWith('.js'))) sources.push({name, text: await readFile(join(extract, name), 'utf8')});
    for (const relativePath of referencedFiles(packedManifest, html, sources)) {
      await stat(join(extract, relativePath));
    }
    for (const name of names) {
      if (!/\.(?:js|json|html|css|svg|md|txt)$/i.test(name)) continue;
      const text = await readFile(join(extract, name), 'utf8');
      for (const pattern of forbidden) {
        if (pattern.test(text)) throw new Error(`package file ${name} matched a forbidden pattern`);
      }
    }
  } finally {
    await rm(extract, {recursive: true, force: true});
  }
  return {zipPath, count: entries.length, version};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await packageExtension();
  console.log(`packaged ${result.count} files as ${result.zipPath}`);
}
