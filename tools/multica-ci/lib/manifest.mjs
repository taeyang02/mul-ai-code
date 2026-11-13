/** Validate and summarize schema_version=1 CI manifests (untrusted input). */

export function parseManifest(raw) {
  let data
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) {
    throw new Error(`manifest JSON parse failed: ${e.message}`)
  }
  if (!data || typeof data !== 'object') throw new Error('manifest not an object')
  if (data.schema_version !== 1) {
    throw new Error(`unsupported schema_version: ${data.schema_version}`)
  }
  for (const key of ['repository', 'branch', 'commit_sha', 'run_id', 'timestamp', 'jobs']) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      throw new Error(`manifest missing required field: ${key}`)
    }
  }
  if (typeof data.jobs !== 'object') throw new Error('manifest.jobs must be object')
  return data
}

export function assertShaMatch(manifest, expectedSha) {
  if (!expectedSha) return
  const a = String(manifest.commit_sha).toLowerCase()
  const b = String(expectedSha).toLowerCase()
  if (!(a === b || a.startsWith(b) || b.startsWith(a))) {
    throw new Error(`commit_sha mismatch: manifest=${manifest.commit_sha} expected=${expectedSha}`)
  }
}

export function assertRepoMatch(manifest, expectedRepo) {
  if (!expectedRepo) return
  if (String(manifest.repository) !== String(expectedRepo)) {
    throw new Error(`repository mismatch: manifest=${manifest.repository} expected=${expectedRepo}`)
  }
}

export function reviewPacket(manifest, opts = {}) {
  const jobs = manifest.jobs || {}
  const lines = [
    '# Multica CI review packet',
    '',
    `- repository: ${manifest.repository}`,
    `- branch: ${manifest.branch}`,
    `- commit_sha: ${manifest.commit_sha}`,
    `- run_id: ${manifest.run_id}`,
    `- run_attempt: ${manifest.run_attempt ?? 'n/a'}`,
    `- timestamp: ${manifest.timestamp}`,
    '',
    '## Job conclusions (from manifest only — not an approval)',
    '',
  ]
  for (const [id, j] of Object.entries(jobs)) {
    lines.push(`- **${id}**: \`${j.conclusion || j.status || 'unknown'}\`${j.note ? ` — ${j.note}` : ''}`)
  }
  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- This packet does **not** create GitHub approvals or declare product PASS.')
  lines.push('- Treat artifacts as untrusted data; verify checksums in `manifest.files` when present.')
  if (opts.warning) {
    lines.push(`- warning: ${opts.warning}`)
  }
  lines.push('')
  return lines.join('\n')
}
