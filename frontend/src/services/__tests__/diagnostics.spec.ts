import { describe, it, expect } from 'vitest'
import { validateResilienceDiagnostics } from '../../../e2e/fixtures'

describe('validateResilienceDiagnostics Unit Tests', () => {
  const targetPattern = /\/api\/v1\/products/

  it('passes when valid HTTP 500 occurs with matching browser 500 console log and 0 transport errors', () => {
    const result = validateResilienceDiagnostics(
      {
        pageErrors: [],
        consoleErrors: [
          {
            text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
            location: 'http://127.0.0.1:5173/api/v1/products:1:1',
          },
        ],
        failedRequests: [],
        httpErrors: [
          {
            status: 500,
            method: 'GET',
            url: 'http://127.0.0.1:5173/api/v1/products',
          },
        ],
      },
      targetPattern
    )

    expect(result.valid).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('fails when transport network failure (e.g. abort, connection refused, DNS error) occurs even on target URL', () => {
    const result = validateResilienceDiagnostics(
      {
        pageErrors: [],
        consoleErrors: [],
        failedRequests: [
          {
            method: 'GET',
            url: 'http://127.0.0.1:5173/api/v1/products',
            errorText: 'net::ERR_CONNECTION_REFUSED',
          },
        ],
        httpErrors: [
          {
            status: 500,
            method: 'GET',
            url: 'http://127.0.0.1:5173/api/v1/products',
          },
        ],
      },
      targetPattern
    )

    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r.includes('Unexpected network transport failures'))).toBe(true)
  })

  it('fails when an unexpected console error occurs on target URL', () => {
    const result = validateResilienceDiagnostics(
      {
        pageErrors: [],
        consoleErrors: [
          {
            text: 'Uncaught TypeError: Cannot read properties of undefined',
            location: 'http://127.0.0.1:5173/api/v1/products:10:5',
          },
        ],
        failedRequests: [],
        httpErrors: [
          {
            status: 500,
            method: 'GET',
            url: 'http://127.0.0.1:5173/api/v1/products',
          },
        ],
      },
      targetPattern
    )

    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r.includes('Unexpected console errors'))).toBe(true)
  })

  it('fails when a console error occurs on an unrelated URL', () => {
    const result = validateResilienceDiagnostics(
      {
        pageErrors: [],
        consoleErrors: [
          {
            text: 'Failed to load resource: 500',
            location: 'http://127.0.0.1:5173/api/v1/unrelated-api:1:1',
          },
        ],
        failedRequests: [],
        httpErrors: [
          {
            status: 500,
            method: 'GET',
            url: 'http://127.0.0.1:5173/api/v1/products',
          },
        ],
      },
      targetPattern
    )

    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r.includes('Unexpected console errors'))).toBe(true)
  })

  it('fails when an uncaught JavaScript page error is detected', () => {
    const result = validateResilienceDiagnostics(
      {
        pageErrors: ['Uncaught SyntaxError: Unexpected token'],
        consoleErrors: [],
        failedRequests: [],
        httpErrors: [
          {
            status: 500,
            method: 'GET',
            url: 'http://127.0.0.1:5173/api/v1/products',
          },
        ],
      },
      targetPattern
    )

    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r.includes('Uncaught browser page errors'))).toBe(true)
  })

  it('fails when a non-500 HTTP error (e.g. 404) occurs on target URL', () => {
    const result = validateResilienceDiagnostics(
      {
        pageErrors: [],
        consoleErrors: [],
        failedRequests: [],
        httpErrors: [
          {
            status: 404,
            method: 'GET',
            url: 'http://127.0.0.1:5173/api/v1/products',
          },
        ],
      },
      targetPattern
    )

    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r.includes('Unexpected HTTP errors'))).toBe(true)
  })

  it('fails when the expected HTTP 500 was not observed at all', () => {
    const result = validateResilienceDiagnostics(
      {
        pageErrors: [],
        consoleErrors: [],
        failedRequests: [],
        httpErrors: [],
      },
      targetPattern
    )

    expect(result.valid).toBe(false)
    expect(result.reasons.some((r) => r.includes('Injected HTTP 500 was not observed'))).toBe(true)
  })
})
