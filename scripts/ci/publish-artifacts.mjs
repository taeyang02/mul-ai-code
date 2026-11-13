#!/usr/bin/env node
/**
 * Aggregate CI outputs into the schema-v1 artifact set + manifest.json.
 * Runs even when prior jobs failed (caller should use if: always()).
 * Never invents PASS — missing evidence → skipped / NOT_RUN / failure.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUT = process.env.CI_ARTIFACT_DIR || path.join(ROOT, 'ci-artifacts')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function walkFiles(dir, base = dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) walkFiles(abs, base, acc)
    else if (ent.isFile()) acc.push(path.relative(base, abs).split(path.sep).join('/'))
  }
  return acc
}

function readJobStatus(name) {
  const p = path.join(OUT, 'job-status', `${name}.txt`)
  if (!fs.existsSync(p)) {
    return { status: 'unknown', conclusion: 'NOT_RUN', note: 'missing job-status file' }
  }
  const raw = fs.readFileSync(p, 'utf8').trim()
  const lines = Object.fromEntries(
    raw
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf('=')
        return i === -1 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)]
      })
  )
  return {
    status: lines.status || 'unknown',
    conclusion: lines.conclusion || lines.status || 'unknown',
    note: lines.note || '',
  }
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false
  ensureDir(path.dirname(dest))
  const st = fs.statSync(src)
  if (st.isDirectory()) {
    ensureDir(dest)
    for (const f of walkFiles(src)) {
      const from = path.join(src, f)
      const to = path.join(dest, f)
      ensureDir(path.dirname(to))
      fs.copyFileSync(from, to)
    }
  } else {
    fs.copyFileSync(src, dest)
  }
  return true
}

ensureDir(OUT)
ensureDir(path.join(OUT, 'backend-test-results'))
ensureDir(path.join(OUT, 'db-proof'))
ensureDir(path.join(OUT, 'test-results'))
ensureDir(path.join(OUT, 'playwright-report'))

const jobs = {
  backend: readJobStatus('backend'),
  frontend: readJobStatus('frontend'),
  e2e: readJobStatus('e2e'),
  artifacts: { status: 'in_progress', conclusion: 'in_progress', note: 'publishing' },
}

// Collect surefire if present
copyIfExists(path.join(ROOT, 'backend/target/surefire-reports'), path.join(OUT, 'backend-test-results/surefire-reports'))

const testResults = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  jobs,
  suites: [],
}

for (const [id, j] of Object.entries(jobs)) {
  if (id === 'artifacts') continue
  testResults.suites.push({
    id,
    conclusion: j.conclusion,
    status: j.status,
    note: j.note,
  })
}

fs.writeFileSync(path.join(OUT, 'test-results.json'), JSON.stringify(testResults, null, 2) + '\n')

// Minimal JUnit mirroring job conclusions (not a fake unit-test PASS)
const junitCases = Object.entries(jobs)
  .filter(([id]) => id !== 'artifacts')
  .map(([id, j]) => {
    const conc = String(j.conclusion).toLowerCase()
    if (conc === 'success' || conc === 'pass') {
      return `  <testcase classname="ci.${id}" name="${id}" time="0"/>`
    }
    if (conc === 'skipped' || conc === 'not_run' || conc === 'not-run') {
      return `  <testcase classname="ci.${id}" name="${id}" time="0"><skipped message="${escapeXml(j.note || conc)}"/></testcase>`
    }
    return `  <testcase classname="ci.${id}" name="${id}" time="0"><failure message="${escapeXml(j.conclusion)}">${escapeXml(j.note || '')}</failure></testcase>`
  })
  .join('\n')

fs.writeFileSync(
  path.join(OUT, 'junit.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="multica-ci" tests="${Object.keys(jobs).length - 1}">\n${junitCases}\n</testsuite>\n`
)

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const commitSha =
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  (() => {
    try {
      return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
    } catch {
      return 'unknown'
    }
  })()

const summaryLines = [
  '# Multica CI build summary',
  '',
  `- repository: ${process.env.GITHUB_REPOSITORY || 'taeyang02/mul-ai-code'}`,
  `- branch: ${process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || 'unknown'}`,
  `- commit_sha: ${commitSha}`,
  `- run_id: ${process.env.GITHUB_RUN_ID || 'local'}`,
  `- run_attempt: ${process.env.GITHUB_RUN_ATTEMPT || '1'}`,
  `- timestamp: ${new Date().toISOString()}`,
  '',
  '## Jobs',
  '',
]
for (const [id, j] of Object.entries(jobs)) {
  if (id === 'artifacts') continue
  summaryLines.push(`- **${id}**: \`${j.conclusion}\`${j.note ? ` — ${j.note}` : ''}`)
}
summaryLines.push('')
fs.writeFileSync(path.join(OUT, 'build-summary.md'), summaryLines.join('\n'))

jobs.artifacts = { status: 'completed', conclusion: 'success', note: 'manifest written' }

const files = walkFiles(OUT).filter((f) => f !== 'manifest.json')
const inventory = files.map((rel) => ({
  path: rel,
  sha256: sha256File(path.join(OUT, rel)),
  size_bytes: fs.statSync(path.join(OUT, rel)).size,
}))

const manifest = {
  schema_version: 1,
  repository: process.env.GITHUB_REPOSITORY || 'taeyang02/mul-ai-code',
  branch: process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || 'unknown',
  commit_sha: commitSha,
  run_id: String(process.env.GITHUB_RUN_ID || 'local'),
  run_attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  timestamp: new Date().toISOString(),
  jobs,
  files: inventory,
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`published artifacts to ${OUT} (${inventory.length} files, commit=${commitSha})`)
