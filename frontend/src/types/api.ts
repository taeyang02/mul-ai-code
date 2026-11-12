export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp?: string
}

export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  code?: string
  message: string
  errors?: ApiFieldError[]
  timestamp?: string
}

export interface CompanyStats {
  completedProjects: string
  trustedPartners: string
  supportTime: string
  activeSince: string
}

export interface SocialLinks {
  facebook?: string
  zalo?: string
  tiktok?: string
}

export interface CompanyInfo {
  name: string
  shortName: string
  locationBadge: string
  slogan: string
  tagline: string
  description: string
  mission: string
  foundedDate: string
  experienceYears: number
  businessStatus: string
  industry: string
  area: string
  taxCode: string
  oldAddress: string
  newAddress: string
  registrationNote?: string
  hotline: string
  hotlineConsultant: string
  email: string
  workingHours: string
  weekendHours: string
  mapEmbedUrl: string
  stats: CompanyStats
  socialLinks: SocialLinks
}

export interface Advantage {
  id: number | string
  icon: string
  title: string
  description: string
}

export interface Product {
  id: number | string
  name: string
  subTitle: string
  category: string
  badge: string
  iconClass: string
  gradientClass: string
  description: string
  highlights: string[]
  actionText: string
}

export interface QuoteRequestPayload {
  fullName: string
  phone: string
  email?: string
  productName?: string
  quantity?: string
  note?: string
}

export interface QuoteRequestResult {
  id: number | string
  status: string
  receivedAt?: string
  message: string
}
