<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HeaderNav from '@/components/HeaderNav.vue'
import HeroSection from '@/components/HeroSection.vue'
import AboutSection from '@/components/AboutSection.vue'
import ProductsSection from '@/components/ProductsSection.vue'
import AdvantagesSection from '@/components/AdvantagesSection.vue'
import ContactSection from '@/components/ContactSection.vue'
import FooterSection from '@/components/FooterSection.vue'
import QuoteModal from '@/components/QuoteModal.vue'
import StatusAlert from '@/components/StatusAlert.vue'
import { apiService, parseApiError } from '@/services/api'
import type {
  SiteResponse,
  CompanyResponse,
  CategoryResponse,
  ProductResponse,
  AdvantageResponse,
  ContactResponse,
  ErrorResponse
} from '@/types/api'

// Data models
const site = ref<SiteResponse | null>(null)
const company = ref<CompanyResponse | null>(null)
const categories = ref<CategoryResponse[]>([])
const products = ref<ProductResponse[]>([])
const advantages = ref<AdvantageResponse[]>([])
const contact = ref<ContactResponse | null>(null)

// Granular loading states
const loadingSite = ref(true)
const loadingCompany = ref(true)
const loadingCategories = ref(true)
const loadingProducts = ref(true)
const loadingAdvantages = ref(true)
const loadingContact = ref(true)

// Granular error states (per-section/per-API)
const errorSite = ref<ErrorResponse | null>(null)
const errorCompany = ref<ErrorResponse | null>(null)
const errorCategories = ref<ErrorResponse | null>(null)
const errorProducts = ref<ErrorResponse | null>(null)
const errorAdvantages = ref<ErrorResponse | null>(null)
const errorContact = ref<ErrorResponse | null>(null)

// Overall state
const isQuoteModalOpen = ref(false)
const selectedProduct = ref<string>('')
const toastMessage = ref<string | null>(null)

// True only when all critical APIs fail (complete backend outage)
const allApisFailed = computed(() => {
  return (
    !loadingSite.value &&
    !loadingProducts.value &&
    !loadingCompany.value &&
    !loadingContact.value &&
    !site.value &&
    !company.value &&
    products.value.length === 0 &&
    !contact.value
  )
})

function openQuoteModal(productName: string = '') {
  selectedProduct.value = productName
  isQuoteModalOpen.value = true
}

function closeQuoteModal() {
  isQuoteModalOpen.value = false
}

function handleQuoteSubmitted() {
  showToast('Yêu cầu báo giá đã được ghi nhận vào hệ thống thành công!')
}

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 4000)
}

// Granular fetchers allowing isolated retries
async function fetchSite() {
  loadingSite.value = true
  errorSite.value = null
  try {
    site.value = await apiService.getSite()
  } catch (err) {
    errorSite.value = parseApiError(err)
  } finally {
    loadingSite.value = false
  }
}

async function fetchCompany() {
  loadingCompany.value = true
  errorCompany.value = null
  try {
    company.value = await apiService.getCompany()
  } catch (err) {
    errorCompany.value = parseApiError(err)
  } finally {
    loadingCompany.value = false
  }
}

async function fetchCategories() {
  loadingCategories.value = true
  errorCategories.value = null
  try {
    categories.value = await apiService.getCategories()
  } catch (err) {
    errorCategories.value = parseApiError(err)
  } finally {
    loadingCategories.value = false
  }
}

async function fetchProducts() {
  loadingProducts.value = true
  errorProducts.value = null
  try {
    const page = await apiService.getProducts()
    products.value = page.items || []
  } catch (err) {
    errorProducts.value = parseApiError(err)
  } finally {
    loadingProducts.value = false
  }
}

async function fetchAdvantages() {
  loadingAdvantages.value = true
  errorAdvantages.value = null
  try {
    advantages.value = await apiService.getAdvantages()
  } catch (err) {
    errorAdvantages.value = parseApiError(err)
  } finally {
    loadingAdvantages.value = false
  }
}

async function fetchContact() {
  loadingContact.value = true
  errorContact.value = null
  try {
    contact.value = await apiService.getContact()
  } catch (err) {
    errorContact.value = parseApiError(err)
  } finally {
    loadingContact.value = false
  }
}

function loadAll() {
  fetchSite()
  fetchCompany()
  fetchCategories()
  fetchProducts()
  fetchAdvantages()
  fetchContact()
}

onMounted(() => {
  loadAll()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">
    <!-- Header -->
    <HeaderNav
      :site="site"
      :contact="contact"
      @open-quote="openQuoteModal('')"
    />

    <!-- Global Outage Notice (Only when entire Backend fails) -->
    <div v-if="allApisFailed" class="container mx-auto px-5 md:px-8 mt-4">
      <StatusAlert
        type="error"
        title="Lỗi kết nối toàn bộ hệ thống Backend"
        message="Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra dịch vụ và thử lại."
        retry-text="Thử tải lại toàn bộ"
        @retry="loadAll"
      />
    </div>

    <!-- Main Content -->
    <main class="flex-grow">
      <!-- Hero (With isolated error & retry) -->
      <HeroSection
        :site="site"
        :loading="loadingSite"
        :error="errorSite"
        @open-quote="openQuoteModal('')"
        @retry="fetchSite"
      />

      <!-- Giới thiệu (With isolated error & retry) -->
      <AboutSection
        :company="company"
        :loading="loadingCompany"
        :error="errorCompany"
        @retry="fetchCompany"
      />

      <!-- Sản phẩm (With isolated error & retry: preserves other sections when failed) -->
      <ProductsSection
        :products="products"
        :categories="categories"
        :loading="loadingProducts"
        :error="errorProducts"
        :error-categories="errorCategories"
        @select-product="openQuoteModal"
        @retry="fetchProducts"
        @retry-categories="fetchCategories"
      />

      <!-- Lợi thế cạnh tranh (With isolated error & retry) -->
      <AdvantagesSection
        :advantages="advantages"
        :loading="loadingAdvantages"
        :error="errorAdvantages"
        @retry="fetchAdvantages"
      />

      <!-- Liên hệ & Bản đồ (With isolated error & retry) -->
      <ContactSection
        :contact="contact"
        :loading="loadingContact"
        :error="errorContact"
        @open-quote="openQuoteModal('')"
        @retry="fetchContact"
      />
    </main>

    <!-- Footer -->
    <FooterSection
      :site="site"
      :company="company"
      :contact="contact"
    />

    <!-- Quote Modal -->
    <QuoteModal
      :is-open="isQuoteModalOpen"
      :default-product="selectedProduct"
      :products="products"
      @close="closeQuoteModal"
      @submitted="handleQuoteSubmitted"
    />

    <!-- Global Toast Notification -->
    <transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700 text-sm"
      >
        <i class="fas fa-check-circle text-emerald-400 text-lg"></i>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
