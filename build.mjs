#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

function git(args, fallback) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
}

const sha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  git(['rev-parse', 'HEAD'], 'unknown');
const branch =
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_REF_NAME ||
  git(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown');
const shortSha = sha.slice(0, 7);

const remote = git(['config', '--get', 'remote.origin.url'], '');
let repoUrl = remote
  .replace(/^git@github\.com:/, 'https://github.com/')
  .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
  .replace(/\.git$/, '');
if (!repoUrl && process.env.GITHUB_REPOSITORY) {
  repoUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}`;
}

const commitUrl =
  repoUrl && /^[0-9a-f]{7,40}$/i.test(sha) ? `${repoUrl}/commit/${sha}` : repoUrl || '#';

const pagesUrl = process.env.CF_PAGES_URL || 'https://tycookbook.pages.dev';
const pagesHost = pagesUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

const built = new Date();
const dateTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
  .format(built)
  .replaceAll('/', '-');
const dateOnly = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
  .format(built)
  .replaceAll('/', '-');

function buildBarcode(value) {
  const hex = /^[0-9a-f]{40}$/i.test(value)
    ? value.toLowerCase()
    : value.replace(/[^0-9a-f]/gi, '').padEnd(40, '0').slice(0, 40);
  let x = 0;
  const bars = [];
  for (const ch of hex) {
    const n = Number.parseInt(ch, 16) || 0;
    const width = 1 + (n % 4);
    bars.push(`<rect x="${x}" y="0" width="${width}" height="44"/>`);
    x += width + 1 + ((n >> 2) % 3);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 44" preserveAspectRatio="none" role="presentation">${bars.join('')}</svg>`;
}

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]),
  );

const template = await readFile(join(root, 'src', 'index.html'), 'utf8');
const html = template
  .replaceAll('{{SHORT_SHA}}', esc(shortSha))
  .replaceAll('{{FULL_SHA}}', esc(sha))
  .replaceAll('{{BRANCH}}', esc(branch))
  .replaceAll('{{BUILT_LOCAL}}', esc(dateTime))
  .replaceAll('{{BUILT_DATE}}', esc(dateOnly))
  .replaceAll('{{REPO_URL}}', esc(repoUrl || '#'))
  .replaceAll('{{COMMIT_URL}}', esc(commitUrl))
  .replaceAll('{{PAGES_URL}}', esc(pagesUrl))
  .replaceAll('{{PAGES_HOST}}', esc(pagesHost))
  .replaceAll('{{BARCODE_SVG}}', buildBarcode(sha));

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist', 'index.html'), html);

console.log(`built dist/index.html: ${shortSha} on ${branch} at ${built.toISOString()}`);
