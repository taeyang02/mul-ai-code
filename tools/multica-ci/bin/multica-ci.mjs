#!/usr/bin/env node
/**
 * multica-ci — read-only retrieval + local review packet for shared CI artifacts.
 * Entrypoint: tools/multica-ci/bin/multica-ci.mjs
 * Does not replace the Multica platform CLI.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getWorkflowRun, downloadResults } from '../lib/github.mjs'
import { parseManifest, assertShaMatch, assertRepoMatch, reviewPacket } from '../lib/manifest.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_RESULTS = path.join(process.cwd(), '.multica-ci-results')

function usage(code = 1) {
  const msg = `Usage:
  multica-ci status  RUN_ID [--repo OWNER/NAME] [--sha SHA]
  multica-ci results RUN_ID [--repo OWNER/NAME] [--sha SHA] [--results-dir DIR]
  multica-ci download RUN_ID [--repo OWNER/NAME] [--sha SHA] [--results-dir DIR]
  multica-ci review  RUN_ID [--repo OWNER/NAME] [--sha SHA] [--results-dir DIR]

Environment (read-only):
  GH_TOKEN / GITHUB_TOKEN   optional GitHub token for private repos / artifact download
`
  console.error(msg)
  process.exit(code)
}

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--repo') out.repo = argv[++i]
    else if (a === '--sha') out.sha = argv[++i]
    else if (a === '--results-dir') out.resultsDir = argv[++i]
    else if (a === '-h' || a === '--help') out.help = true
    else out._.push(a)
  }
  return out
}

function findManifest(dir) {
  const direct = path.join(dir, 'manifest.json')
  if (fs.existsSync(direct)) return direct
  // search one level deep
  if (!fs.existsSync(dir)) return null
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    const p = path.join(dir, ent.name, 'manifest.json')
    if (fs.existsSync(p)) return p
  }
  // recursive shallow walk max depth 4
  const stack = [{ d: dir, depth: 0 }]
  while (stack.length) {
    const { d, depth } = stack.pop()
    if (depth > 4) continue
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, ent.name)
      if (ent.isFile() && ent.name === 'manifest.json') return abs
      if (ent.isDirectory()) stack.push({ d: abs, depth: depth + 1 })
    }
  }
  return null
}

async function cmdStatus(runId, opts) {
  const repo = opts.repo || 'taeyang02/mul-ai-code'
  if (runId === 'fixture-run') {
    console.log(JSON.stringify({ run_id: runId, status: 'fixture', conclusion: 'success', head_sha: opts.sha || 'abc123def456', repository: repo }, null, 2))
    return
  }
  const res = await getWorkflowRun(repo, runId)
  const d = res.data
  if (opts.sha) {
    const a = String(d.head_sha).toLowerCase()
    const b = String(opts.sha).toLowerCase()
    if (!(a === b || a.startsWith(b) || b.startsWith(a))) {
      throw new Error(`commit mismatch: run head_sha=${d.head_sha} --sha=${opts.sha}`)
    }
  }
  console.log(
    JSON.stringify(
      {
        run_id: d.id,
        status: d.status,
        conclusion: d.conclusion,
        head_sha: d.head_sha,
        html_url: d.html_url,
        repository: repo,
        run_attempt: d.run_attempt,
      },
      null,
      2
    )
  )
}

async function cmdDownload(runId, opts) {
  const repo = opts.repo || 'taeyang02/mul-ai-code'
  const resultsDir = opts.resultsDir || DEFAULT_RESULTS
  if (runId === 'fixture-run') {
    const src = path.join(__dirname, '../fixtures/sample-run')
    const dest = path.join(resultsDir, 'taeyang02_mul-ai-code', 'run-fixture-run', 'attempt-1', String(opts.sha || 'abc123def456').slice(0, 12))
    fs.mkdirSync(dest, { recursive: true })
    for (const f of fs.readdirSync(src)) {
      fs.copyFileSync(path.join(src, f), path.join(dest, f))
    }
    console.log(JSON.stringify({ downloaded: dest, mode: 'fixture' }, null, 2))
    return dest
  }
  const { home, run, artifact } = await downloadResults(repo, runId, {
    sha: opts.sha,
    resultsDir,
  })
  console.log(
    JSON.stringify(
      {
        downloaded: home,
        run_id: run.id,
        head_sha: run.head_sha,
        artifact: artifact.name,
      },
      null,
      2
    )
  )
  return home
}

async function cmdResults(runId, opts) {
  const repo = opts.repo || 'taeyang02/mul-ai-code'
  const resultsDir = opts.resultsDir || DEFAULT_RESULTS
  let home
  if (runId === 'fixture-run') {
    home = await cmdDownload(runId, opts)
  } else {
    // Prefer existing download; else download
    const guess = path.join(
      resultsDir,
      String(repo).replace(/[^a-zA-Z0-9._-]+/g, '_'),
      `run-${runId}`
    )
    const man = findManifest(guess)
    if (man) home = path.dirname(man)
    else home = await cmdDownload(runId, opts)
  }
  const manPath = findManifest(home)
  if (!manPath) throw new Error(`manifest.json missing under ${home}`)
  const manifest = parseManifest(fs.readFileSync(manPath, 'utf8'))
  assertRepoMatch(manifest, repo)
  assertShaMatch(manifest, opts.sha)
  console.log(JSON.stringify({ manifest_path: manPath, manifest }, null, 2))
}

async function cmdReview(runId, opts) {
  const repo = opts.repo || 'taeyang02/mul-ai-code'
  const resultsDir = opts.resultsDir || DEFAULT_RESULTS
  if (runId === 'fixture-run' && opts.resultsDir) {
    // allow reviewing a local fixture dir directly
  }
  let home
  if (runId === 'fixture-run') {
    // If results-dir points at fixture itself
    if (opts.resultsDir && fs.existsSync(path.join(opts.resultsDir, 'manifest.json'))) {
      home = opts.resultsDir
    } else {
      home = await cmdDownload(runId, { ...opts, resultsDir })
    }
  } else {
    const guess = path.join(
      resultsDir,
      String(repo).replace(/[^a-zA-Z0-9._-]+/g, '_'),
      `run-${runId}`
    )
    const man = findManifest(guess)
    if (man) home = path.dirname(man)
    else home = await cmdDownload(runId, opts)
  }
  const manPath = findManifest(home)
  if (!manPath) throw new Error(`manifest.json missing under ${home}`)
  const manifest = parseManifest(fs.readFileSync(manPath, 'utf8'))
  assertRepoMatch(manifest, repo)
  assertShaMatch(manifest, opts.sha)
  process.stdout.write(reviewPacket(manifest))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help || opts._.length === 0) usage(opts.help ? 0 : 1)
  const [cmd, runId] = opts._
  if (!runId) usage(1)
  try {
    if (cmd === 'status') await cmdStatus(runId, opts)
    else if (cmd === 'download') await cmdDownload(runId, opts)
    else if (cmd === 'results') await cmdResults(runId, opts)
    else if (cmd === 'review') await cmdReview(runId, opts)
    else usage(1)
  } catch (e) {
    // Never print tokens
    const msg = String(e && e.message ? e.message : e)
    console.error(`multica-ci error: ${msg}`)
    if (e && e.body) console.error(String(e.body).slice(0, 300))
    process.exit(1)
  }
}

main()
