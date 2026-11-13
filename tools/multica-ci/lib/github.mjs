/**
 * Read-only GitHub API helpers for Actions runs + artifacts.
 * Uses GH_TOKEN / GITHUB_TOKEN if present; never prints the token.
 */
import fs from 'fs'
import path from 'path'
import https from 'https'
import { extractZipSafe } from './safe-zip.mjs'

function token() {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
}

function api(method, urlPath, accept = 'application/vnd.github+json') {
  const tok = token()
  const headers = {
    Accept: accept,
    'User-Agent': 'multica-ci-retrieval',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (tok) headers.Authorization = `Bearer ${tok}`

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: urlPath,
        method,
        headers,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          const text = buf.toString('utf8')
          if (res.statusCode >= 400) {
            const err = new Error(`GitHub API ${method} ${urlPath} -> ${res.statusCode}`)
            err.status = res.statusCode
            err.body = text.slice(0, 500)
            reject(err)
            return
          }
          if (accept.includes('json')) {
            try {
              resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(text || 'null') })
            } catch (e) {
              reject(e)
            }
          } else {
            resolve({ status: res.statusCode, headers: res.headers, data: buf })
          }
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

export async function getWorkflowRun(repo, runId) {
  return api('GET', `/repos/${repo}/actions/runs/${runId}`)
}

export async function listRunArtifacts(repo, runId) {
  return api('GET', `/repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`)
}

export async function downloadArtifactZip(repo, artifactId, destZip) {
  // API returns redirect to short-lived URL; follow manually without leaking auth to other hosts if needed.
  const tok = token()
  const urlPath = `/repos/${repo}/actions/artifacts/${artifactId}/zip`
  return new Promise((resolve, reject) => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'multica-ci-retrieval',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (tok) headers.Authorization = `Bearer ${tok}`
    https
      .get({ hostname: 'api.github.com', path: urlPath, headers }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const loc = res.headers.location
          if (!loc) return reject(new Error('missing redirect location'))
          https
            .get(loc, (res2) => {
              if (res2.statusCode >= 400) {
                reject(new Error(`artifact download failed: ${res2.statusCode}`))
                return
              }
              const out = fs.createWriteStream(destZip)
              res2.pipe(out)
              out.on('finish', () => resolve(destZip))
              out.on('error', reject)
            })
            .on('error', reject)
          return
        }
        if (res.statusCode >= 400) {
          reject(new Error(`artifact API ${res.statusCode}`))
          return
        }
        const out = fs.createWriteStream(destZip)
        res.pipe(out)
        out.on('finish', () => resolve(destZip))
        out.on('error', reject)
      })
      .on('error', reject)
  })
}

export function resultsHome(base, repo, runId, attempt, sha) {
  const safeRepo = String(repo).replace(/[^a-zA-Z0-9._-]+/g, '_')
  return path.join(base, safeRepo, `run-${runId}`, `attempt-${attempt || 1}`, String(sha || 'unknown').slice(0, 12))
}

export async function downloadResults(repo, runId, opts) {
  const run = await getWorkflowRun(repo, runId)
  const data = run.data
  const sha = opts.sha || data.head_sha
  if (opts.sha) {
    const a = String(data.head_sha).toLowerCase()
    const b = String(opts.sha).toLowerCase()
    if (!(a === b || a.startsWith(b) || b.startsWith(a))) {
      throw new Error(`run head_sha mismatch: run=${data.head_sha} expected=${opts.sha}`)
    }
  }
  const arts = await listRunArtifacts(repo, runId)
  const wanted =
    (arts.data.artifacts || []).find((a) => a.name === 'multica-ci-results') ||
    (arts.data.artifacts || [])[0]
  if (!wanted) throw new Error('no artifacts on run')

  const home = resultsHome(opts.resultsDir, repo, runId, data.run_attempt, sha)
  const tmp = `${home}.tmp-${process.pid}`
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(tmp, { recursive: true })
  const zipPath = path.join(tmp, 'artifact.zip')
  await downloadArtifactZip(repo, wanted.id, zipPath)
  extractZipSafe(zipPath, path.join(tmp, 'unpack'))
  fs.rmSync(zipPath, { force: true })
  // atomic publish
  fs.rmSync(home, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(home), { recursive: true })
  fs.renameSync(path.join(tmp, 'unpack'), home)
  fs.rmSync(tmp, { recursive: true, force: true })
  return { home, run: data, artifact: wanted }
}
