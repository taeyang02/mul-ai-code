import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { parseApiError } from '../api'

describe('API Service Unit Tests', () => {
  describe('parseApiError', () => {
    it('returns custom ErrorResponse directly if already shaped as ErrorResponse', () => {
      const customErr = {
        code: 'VALIDATION_FAILED',
        message: 'Dữ liệu không hợp lệ',
        status: 400,
        timestamp: '2026-11-13T00:00:00Z',
      }
      const parsed = parseApiError(customErr)
      expect(parsed).toEqual(customErr)
    })

    it('extracts structured data from AxiosError response', () => {
      const fakeAxiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 404',
        name: 'AxiosError',
        response: {
          status: 404,
          data: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Không tìm thấy sản phẩm',
            details: ['Product ID does not exist'],
          },
        },
      }
      const parsed = parseApiError(fakeAxiosError)
      expect(parsed.status).toBe(404)
      expect(parsed.code).toBe('PRODUCT_NOT_FOUND')
      expect(parsed.message).toBe('Không tìm thấy sản phẩm')
      expect(parsed.details).toEqual(['Product ID does not exist'])
    })

    it('prefers API body.message over Axios top-level status/code/message (axios 1.x shape)', () => {
      // Real AxiosError instances expose top-level code + message + status, which previously
      // matched the ErrorResponse duck-type and skipped response.data entirely.
      const axiosErr = new axios.AxiosError(
        'Request failed with status code 500',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as never,
          data: {
            status: 500,
            code: 'HTTP_500',
            message: 'Simulated products catalog failure',
            error: 'Server Error',
            details: [],
          },
        }
      )
      // Mirror axios 1.x runtime: top-level status is set from response.status
      ;(axiosErr as { status?: number }).status = 500

      expect(axios.isAxiosError(axiosErr)).toBe(true)
      expect('status' in axiosErr && 'code' in axiosErr && 'message' in axiosErr).toBe(true)

      const parsed = parseApiError(axiosErr)
      expect(parsed.message).toBe('Simulated products catalog failure')
      expect(parsed.code).toBe('HTTP_500')
      expect(parsed.status).toBe(500)
    })

    it('parses JSON string response bodies from AxiosError', () => {
      const fakeAxiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 500',
        name: 'AxiosError',
        response: {
          status: 500,
          data: JSON.stringify({
            status: 500,
            code: 'HTTP_500',
            message: 'Simulated products catalog failure',
            error: 'Server Error',
            details: [],
          }),
        },
      }
      const parsed = parseApiError(fakeAxiosError)
      expect(parsed.message).toBe('Simulated products catalog failure')
      expect(parsed.code).toBe('HTTP_500')
    })

    it('handles unexpected unknown errors with safe fallback', () => {
      const genericError = new Error('Unexpected catastrophic crash')
      const parsed = parseApiError(genericError)
      expect(parsed.status).toBe(500)
      expect(parsed.error).toBe('Internal Error')
      expect(parsed.message).toBe('Unexpected catastrophic crash')
    })
  })
})
