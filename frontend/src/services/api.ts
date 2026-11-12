import axios, { type AxiosError } from 'axios'
import type {
  ApiResponse,
  CompanyInfo,
  Advantage,
  Product,
  QuoteRequestPayload,
  QuoteRequestResult,
  ApiErrorResponse
} from '@/types/api'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
})

// Unwraps response data supporting both { success: true, data: T } and direct T
function unwrapData<T>(res: { data: any }): T {
  if (res.data && typeof res.data === 'object' && 'data' in res.data && 'success' in res.data) {
    return (res.data as ApiResponse<T>).data
  }
  return res.data as T
}

export const apiService = {
  async getCompanyInfo(): Promise<CompanyInfo> {
    try {
      const res = await apiClient.get<ApiResponse<CompanyInfo> | CompanyInfo>('/company')
      return unwrapData<CompanyInfo>(res)
    } catch (err) {
      // Fallback try /site if backend routes company info at /site
      try {
        const resSite = await apiClient.get<ApiResponse<CompanyInfo> | CompanyInfo>('/site')
        return unwrapData<CompanyInfo>(resSite)
      } catch {
        throw normalizeApiError(err)
      }
    }
  },

  async getAdvantages(): Promise<Advantage[]> {
    try {
      const res = await apiClient.get<ApiResponse<Advantage[]> | Advantage[]>('/site/advantages')
      return unwrapData<Advantage[]>(res)
    } catch (err) {
      throw normalizeApiError(err)
    }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const res = await apiClient.get<ApiResponse<Product[]> | Product[]>('/products')
      return unwrapData<Product[]>(res)
    } catch (err) {
      throw normalizeApiError(err)
    }
  },

  async submitQuoteRequest(payload: QuoteRequestPayload): Promise<QuoteRequestResult> {
    try {
      const res = await apiClient.post<ApiResponse<QuoteRequestResult> | QuoteRequestResult>('/quote-requests', payload)
      return unwrapData<QuoteRequestResult>(res)
    } catch (err) {
      throw normalizeApiError(err)
    }
  },
}

export function normalizeApiError(error: unknown): ApiErrorResponse {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>
    if (axiosError.response?.data) {
      const data = axiosError.response.data
      if (typeof data === 'object') {
        return {
          success: false,
          code: data.code || `HTTP_${axiosError.response.status}`,
          message: data.message || axiosError.message,
          errors: data.errors || [],
          timestamp: data.timestamp,
        }
      }
    }
    return {
      success: false,
      code: `HTTP_${axiosError.response?.status || 'NETWORK_ERROR'}`,
      message: axiosError.message || 'Không thể kết nối tới máy chủ',
    }
  }
  return {
    success: false,
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Đã có lỗi xảy ra',
  }
}
