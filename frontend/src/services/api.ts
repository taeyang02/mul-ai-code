import axios, { type AxiosError } from 'axios'
import type {
  SiteResponse,
  CompanyResponse,
  CategoryResponse,
  ProductResponse,
  ProductPageResponse,
  AdvantageResponse,
  ContactResponse,
  QuoteRequestCreate,
  QuoteRequestResponse,
  ErrorResponse
} from '@/types/api'

// Format baseURL ensuring /api/v1 prefix per OpenAPI spec
const rawBase = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const baseURL = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api/v1`

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
})

export const apiService = {
  async getSite(): Promise<SiteResponse> {
    const res = await apiClient.get<SiteResponse>('/site')
    return res.data
  },

  async getCompany(): Promise<CompanyResponse> {
    const res = await apiClient.get<CompanyResponse>('/company')
    return res.data
  },

  async getCategories(): Promise<CategoryResponse[]> {
    const res = await apiClient.get<CategoryResponse[]>('/categories')
    return res.data
  },

  async getProducts(params?: {
    page?: number
    size?: number
    category?: string
    featured?: boolean
    q?: string
  }): Promise<ProductPageResponse> {
    const res = await apiClient.get<ProductPageResponse>('/products', { params })
    return res.data
  },

  async getProduct(id: string): Promise<ProductResponse> {
    const res = await apiClient.get<ProductResponse>(`/products/${id}`)
    return res.data
  },

  async getAdvantages(): Promise<AdvantageResponse[]> {
    const res = await apiClient.get<AdvantageResponse[]>('/site/advantages')
    return res.data
  },

  async getContact(): Promise<ContactResponse> {
    const res = await apiClient.get<ContactResponse>('/contact')
    return res.data
  },

  async createQuoteRequest(payload: QuoteRequestCreate): Promise<QuoteRequestResponse> {
    const res = await apiClient.post<QuoteRequestResponse>('/quote-requests', payload)
    return res.data
  },
}

export function parseApiError(error: unknown): ErrorResponse {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error && 'status' in error) {
    return error as ErrorResponse
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>
    if (axiosError.response?.data) {
      const data = axiosError.response.data
      if (typeof data === 'object') {
        return {
          timestamp: data.timestamp || new Date().toISOString(),
          status: data.status || axiosError.response.status,
          error: data.error || axiosError.message,
          code: data.code || `HTTP_${axiosError.response.status}`,
          message: data.message || axiosError.message,
          path: data.path || '',
          details: data.details || [],
        }
      }
    }
    return {
      timestamp: new Date().toISOString(),
      status: axiosError.response?.status || 500,
      error: 'Network / Client Error',
      code: `HTTP_${axiosError.response?.status || 'NETWORK_ERROR'}`,
      message: axiosError.message || 'Không thể kết nối tới Backend API',
      path: axiosError.config?.url || '',
      details: [],
    }
  }

  return {
    timestamp: new Date().toISOString(),
    status: 500,
    error: 'Internal Error',
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Đã có lỗi không xác định xảy ra',
    path: '',
    details: [],
  }
}
