#!/usr/bin/env node
/**
 * Aggregate CI outputs into the schema-v1 artifact set + manifest.json.
 * Runs even when prior jobs failed (caller should use if: always()).
 * Never invents PASS — missing evidence → skipped / NOT_RUN / failure.
 *
 * C4:
 *  - Never overwrite raw Playwright test-results.json / junit.xml.
 *  - Job conclusions prefer MULTICA_NEEDS_*_RESULT (GHA needs.*.result).
 *  - Summaries land under ci-summary/.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUT = process.env.CI_ARTIFACT_DIR || path.join(ROOT, 'ci-artifacts')
const SUMMARY_DIR = path.join(OUT, 'ci-summary')

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

function readKeyValueFile(p) {
  if (!fs.existsSync(p)) return null
  const raw = fs.readFileSync(p, 'utf8').trim()
  return Object.fromEntries(
    raw
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf('=')
        return i === -1 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)]
      })
  )
}

function readJobStatus(name) {
  const lines = readKeyValueFile(path.join(OUT, 'job-status', `${name}.txt`))
  if (!lines) {
    return { status: 'unknown', conclusion: 'NOT_RUN', note: 'missing job-status file' }
  }
  return {
    status: lines.status || 'unknown',
    conclusion: lines.conclusion || lines.status || 'unknown',
    note: lines.note || '',
  }
}

function readDbProof() {
  const lines = readKeyValueFile(path.join(OUT, 'db-proof', 'result.txt'))
  if (!lines) {
    return { status: 'NOT_RUN', migration_status: 'NOT_RUN', api_quote_status: 'NOT_RUN', ui_quote_status: 'NOT_RUN', note: 'missing db-proof/result.txt' }
  }
  return {
    status: lines.status || 'NOT_RUN',
    migration_status: lines.migration_status || 'NOT_RUN',
    api_quote_status: lines.api_quote_status || lines.quote_status || 'NOT_RUN',
    ui_quote_status: lines.ui_quote_status || 'NOT_RUN',
    note: lines.note || '',
  }
}

function mapNeedsResult(result) {
  const r = String(result || '').toLowerCase()
  if (r === 'success') return 'success'
  if (r === 'failure') return 'failure'
  if (r === 'cancelled') return 'cancelled'
  if (r === 'skipped') return 'skipped'
  return r || 'unknown'
}

/**
 * Authoritative conclusion: MULTICA_NEEDS_<JOB>_RESULT (from needs.*.result)
 * beats step-level job-status/*.txt (e.g. browser success written before DB proof).
 */
function resolveJob(name) {
  const step = readJobStatus(name)
  const envKey = `MULTICA_NEEDS_${name.toUpperCase()}_RESULT`
  const needsRaw = process.env[envKey]
  if (needsRaw) {
    const conclusion = mapNeedsResult(needsRaw)
    const notes = []
    if (step.note) notes.push(step.note)
    notes.push(`needs.result=${needsRaw}`)
    if (step.conclusion && String(step.conclusion).toLowerCase() !== conclusion) {
      notes.push(`step_status=${step.conclusion}`)
    }
    return {
      status: conclusion === 'NOT_RUN' || conclusion === 'skipped' ? step.status || 'unknown' : 'completed',
      conclusion,
      note: notes.join('; '),
      step_conclusion: step.conclusion,
      authoritative: 'needs.result',
    }
  }
  return { ...step, step_conclusion: step.conclusion, authoritative: 'job-status-file' }
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

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

ensureDir(OUT)
ensureDir(SUMMARY_DIR)
ensureDir(path.join(OUT, 'backend-test-results'))
ensureDir(path.join(OUT, 'db-proof'))
ensureDir(path.join(OUT, 'test-results'))
ensureDir(path.join(OUT, 'playwright-report'))

// Snapshot raw Playwright reports BEFORE any publisher writes (must remain byte-identical).
const RAW_JSON = path.join(OUT, 'test-results.json')
const RAW_JUNIT = path.join(OUT, 'junit.xml')
const rawReports = {
  'test-results.json': fs.existsSync(RAW_JSON)
    ? { present: true, sha256: sha256File(RAW_JSON), size_bytes: fs.statSync(RAW_JSON).size }
    : { present: false, sha256: null, size_bytes: 0, note: 'missing raw Playwright JSON — not fabricated' },
  'junit.xml': fs.existsSync(RAW_JUNIT)
    ? { present: true, sha256: sha256File(RAW_JUNIT), size_bytes: fs.statSync(RAW_JUNIT).size }
    : { present: false, sha256: null, size_bytes: 0, note: 'missing raw Playwright JUnit — not fabricated' },
}

copyIfExists(path.join(ROOT, 'backend/target/surefire-reports'), path.join(OUT, 'backend-test-results/surefire-reports'))

const dbProof = readDbProof()
const jobs = {
  backend: resolveJob('backend'),
  frontend: resolveJob('frontend'),
  e2e: resolveJob('e2e'),
  artifacts: { status: 'in_progress', conclusion: 'in_progress', note: 'publishing' },
}

const analysis = {
  e2e_browser_step: readJobStatus('e2e'),
  db_proof: dbProof,
  raw_playwright: rawReports,
  authoritative_source: {
    backend: jobs.backend.authoritative,
    frontend: jobs.frontend.authoritative,
    e2e: jobs.e2e.authoritative,
  },
}

const jobResults = {
  schema_version: 1,
  kind: 'ci-job-summary',
  generated_at: new Date().toISOString(),
  jobs,
  analysis,
  suites: Object.entries(jobs)
    .filter(([id]) => id !== 'artifacts')
    .map(([id, j]) => ({
      id,
      conclusion: j.conclusion,
      status: j.status,
      note: j.note,
      step_conclusion: j.step_conclusion,
      authoritative: j.authoritative,
    })),
}

fs.writeFileSync(path.join(SUMMARY_DIR, 'job-results.json'), JSON.stringify(jobResults, null, 2) + '\n')
fs.writeFileSync(path.join(SUMMARY_DIR, 'analysis.json'), JSON.stringify(analysis, null, 2) + '\n')
fs.writeFileSync(path.join(SUMMARY_DIR, 'raw-reports.json'), JSON.stringify(rawReports, null, 2) + '\n')

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
  path.join(SUMMARY_DIR, 'job-junit.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="multica-ci-jobs" tests="${Object.keys(jobs).length - 1}">\n${junitCases}\n</testsuite>\n`
)

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
  '## Jobs (authoritative)',
  '',
]
for (const [id, j] of Object.entries(jobs)) {
  if (id === 'artifacts') continue
  summaryLines.push(`- **${id}**: \`${j.conclusion}\` (${j.authoritative})${j.note ? ` — ${j.note}` : ''}`)
}
summaryLines.push('')
summaryLines.push('## DB proof')
summaryLines.push('')
summaryLines.push(`- status: \`${dbProof.status}\``)
summaryLines.push(`- migration: \`${dbProof.migration_status}\``)
summaryLines.push(`- api_quote: \`${dbProof.api_quote_status}\``)
summaryLines.push(`- ui_quote: \`${dbProof.ui_quote_status}\``)
summaryLines.push('')
summaryLines.push('## Raw Playwright reports')
summaryLines.push('')
for (const [name, meta] of Object.entries(rawReports)) {
  summaryLines.push(
    meta.present
      ? `- **${name}**: present sha256=\`${meta.sha256}\``
      : `- **${name}**: MISSING (not fabricated)`
  )
}
summaryLines.push('')
fs.writeFileSync(path.join(OUT, 'build-summary.md'), summaryLines.join('\n'))

// Verify raw files were not mutated by publisher writes above.
for (const [name, before] of Object.entries(rawReports)) {
  if (!before.present) continue
  const after = sha256File(path.join(OUT, name))
  if (after !== before.sha256) {
    throw new Error(`C4 violation: publisher mutated raw Playwright report ${name}`)
  }
}

jobs.artifacts = { status: 'completed', conclusion: 'success', note: 'manifest written; raw Playwright preserved' }

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
  analysis,
  files: inventory,
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(
  `published artifacts to ${OUT} (${inventory.length} files, commit=${commitSha}, raw_json=${rawReports['test-results.json'].present}, raw_junit=${rawReports['junit.xml'].present})`
)
