/**
 * Untrusted artifact extraction helpers.
 * Rejects path traversal, absolute paths, symlinks, duplicates, and oversize archives.
 */
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

const MAX_BYTES = 200 * 1024 * 1024 // 200 MiB uncompressed budget

export function assertSafeEntryName(name, seen) {
  if (!name || typeof name !== 'string') throw new Error('invalid entry name')
  const n = name.replace(/\\/g, '/')
  if (n.startsWith('/') || /^[A-Za-z]:\//.test(n)) {
    throw new Error(`absolute path rejected: ${name}`)
  }
  if (n.split('/').some((p) => p === '..')) {
    throw new Error(`path traversal rejected: ${name}`)
  }
  if (seen.has(n)) throw new Error(`duplicate entry rejected: ${name}`)
  seen.add(n)
  return n
}

/**
 * Extract a zip with `unzip -l` inspection then `unzip` into dest.
 * Uses system unzip (available on ubuntu-latest / most agent images).
 */
export function extractZipSafe(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  const listing = execFileSync('unzip', ['-Z', '-1', zipPath], { encoding: 'utf8' })
  const seen = new Set()
  let total = 0
  for (const line of listing.split('\n')) {
    const name = line.trim()
    if (!name) continue
    assertSafeEntryName(name, seen)
  }
  // Size gate via unzip -Z -v is awkward; enforce after extract with walk.
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', destDir], { stdio: 'inherit' })
  total = du(destDir)
  if (total > MAX_BYTES) {
    fs.rmSync(destDir, { recursive: true, force: true })
    throw new Error(`extracted size ${total} exceeds limit ${MAX_BYTES}`)
  }
  // Reject symlinks after extract
  walk(destDir, (abs, st) => {
    if (st.isSymbolicLink()) {
      throw new Error(`symlink rejected: ${abs}`)
    }
  })
  return destDir
}

function du(dir) {
  let n = 0
  walk(dir, (abs, st) => {
    if (st.isFile()) n += st.size
  })
  return n
}

function walk(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    const st = fs.lstatSync(abs)
    fn(abs, st)
    if (st.isDirectory()) walk(abs, fn)
  }
}
