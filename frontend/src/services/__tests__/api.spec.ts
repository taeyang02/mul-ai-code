import { describe, it, expect } from 'vitest'
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

    it('handles unexpected unknown errors with safe fallback', () => {
      const genericError = new Error('Unexpected catastrophic crash')
      const parsed = parseApiError(genericError)
      expect(parsed.status).toBe(500)
      expect(parsed.error).toBe('Internal Error')
      expect(parsed.message).toBe('Unexpected catastrophic crash')
    })
  })
})
