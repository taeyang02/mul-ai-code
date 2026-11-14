/**
 * Thanh An Bắc Giang OpenAPI 3.0.3 Contract TypeScript definitions
 * Aligned with docs/api-contract.yaml (Agent Cursor cb1fda34a39edd05f3bf42578be7f060276a7043)
 */

export interface NavItem {
  label: string
  href: string
}

export interface SiteResponse {
  brandName: string
  tagline?: string | null
  heroTitle: string
  heroSubtitle?: string | null
  heroCtaLabel?: string | null
  heroBadgePrimary?: string | null
  heroBadgeSecondary?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  navItems: NavItem[]
}

export interface CompanyResponse {
  legalName: string
  tradeName?: string | null
  foundedOn?: string | null // format: date YYYY-MM-DD
  industry?: string | null
  serviceArea?: string | null
  statusLabel?: string | null
  mission?: string | null
  highlightTitle?: string | null
  highlightBody?: string | null
  projectsCompletedLabel?: string | null
  partnersLabel?: string | null
  taxCode?: string | null
}

export interface CategorySummary {
  id: string
  slug: string
  name: string
}

export interface CategoryResponse {
  id: string
  slug: string
  name: string
  description?: string | null
  sortOrder: number
}

export interface ProductResponse {
  id: string
  slug: string
  name: string
  shortDescription?: string | null
  description?: string | null
  brand?: string | null
  specsSummary?: string | null
  features: string[]
  imageUrl?: string | null
  featured: boolean
  sortOrder: number
  category: CategorySummary
}

export interface ProductPageResponse {
  items: ProductResponse[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface AdvantageResponse {
  id: string
  title: string
  description: string
  iconKey?: string | null
  sortOrder: number
}

export interface ContactResponse {
  addressOld?: string | null
  addressNew?: string | null
  addressNote?: string | null
  hotlineDisplay: string
  hotlineE164: string
  hotlineContactName?: string | null
  email?: string | null
  zaloUrl?: string | null
  facebookUrl?: string | null
  businessHoursWeekday?: string | null
  businessHoursWeekend?: string | null
  mapEmbedUrl?: string | null
}

export interface QuoteRequestCreate {
  fullName: string
  phone: string
  email?: string | null
  companyName?: string | null
  productInterest?: string | null
  message: string
  sourcePage?: string | null
  website?: string | null // Honeypot — must be omitted or empty
}

export interface QuoteRequestResponse {
  id: string
  status: 'NEW' | 'CONTACTED' | 'CLOSED'
  createdAt: string
}

export interface FieldError {
  field: string
  message: string
}

export interface ErrorResponse {
  timestamp: string
  status: number
  error: string
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'BAD_REQUEST' | 'INTERNAL_ERROR' | string
  message: string
  path: string
  details?: FieldError[]
}
