import { test as baseTest, expect, type Page, type TestInfo } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface HttpErrorRecord {
  status: number
  method: string
  url: string
}

export interface BrowserDiagnostics {
  pageErrors: string[]
  consoleErrors: string[]
  failedRequests: string[]
  httpErrors: HttpErrorRecord[]
  assertCleanHappyPath(): void
  assertCleanResilience(expectedFailedUrlPattern: RegExp | string): void
}

export const test = baseTest.extend<{
  diagnostics: BrowserDiagnostics
}>({
  diagnostics: [
    async ({ page }: { page: Page }, use: (d: BrowserDiagnostics) => Promise<void>, testInfo: TestInfo) => {
      const pageErrors: string[] = []
      const consoleErrors: string[] = []
      const failedRequests: string[] = []
      const httpErrors: HttpErrorRecord[] = []

      const consoleHandler = (msg: any) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      }
      const pageErrorHandler = (err: any) => {
        pageErrors.push(err.message || String(err))
      }
      const requestFailedHandler = (req: any) => {
        failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText || 'failed'}`)
      }
      const responseHandler = (res: any) => {
        if (res.status() >= 400) {
          httpErrors.push({
            status: res.status(),
            method: res.request().method(),
            url: res.url(),
          })
        }
      }

      page.on('console', consoleHandler)
      page.on('pageerror', pageErrorHandler)
      page.on('requestfailed', requestFailedHandler)
      page.on('response', responseHandler)

      const diagnostics: BrowserDiagnostics = {
        pageErrors,
        consoleErrors,
        failedRequests,
        httpErrors,
        assertCleanHappyPath() {
          expect(pageErrors, 'Uncaught browser page errors detected').toEqual([])
          expect(consoleErrors, 'Browser console errors detected').toEqual([])
          expect(failedRequests, 'Failed network requests detected').toEqual([])
          expect(httpErrors, 'HTTP error responses (>=400) detected').toEqual([])
        },
        assertCleanResilience(expectedFailedUrlPattern: RegExp | string) {
          expect(pageErrors, 'Uncaught browser page errors in resilience test').toEqual([])
          const pattern =
            typeof expectedFailedUrlPattern === 'string'
              ? new RegExp(expectedFailedUrlPattern)
              : expectedFailedUrlPattern
          const unexpectedHttp = httpErrors.filter(
            (e) => !(pattern.test(e.url) && e.status === 500)
          )
          expect(unexpectedHttp, 'Unexpected HTTP errors in resilience test').toEqual([])
        },
      }

      try {
        await use(diagnostics)
      } finally {
        page.off('console', consoleHandler)
        page.off('pageerror', pageErrorHandler)
        page.off('requestfailed', requestFailedHandler)
        page.off('response', responseHandler)

        const diagnosticPayload = {
          test: testInfo.title,
          status: testInfo.status,
          durationMs: testInfo.duration,
          pageErrors,
          consoleErrors,
          failedRequests,
          httpErrors,
        }

        await testInfo.attach('browser-diagnostics.json', {
          body: Buffer.from(JSON.stringify(diagnosticPayload, null, 2)),
          contentType: 'application/json',
        })

        const artifactDir = process.env.CI_ARTIFACT_DIR || 'ci-artifacts'
        const diagDir = path.join(artifactDir, 'e2e', 'diagnostics')
        try {
          fs.mkdirSync(diagDir, { recursive: true })
          const safeName = testInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_')
          fs.writeFileSync(
            path.join(diagDir, `${safeName}.json`),
            JSON.stringify(diagnosticPayload, null, 2)
          )
        } catch {
          // ignore local write errors
        }
      }
    },
    { auto: true },
  ],
})

export { expect }
