<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
  ContactResponse
} from '@/types/api'

const site = ref<SiteResponse | null>(null)
const company = ref<CompanyResponse | null>(null)
const categories = ref<CategoryResponse[]>([])
const products = ref<ProductResponse[]>([])
const advantages = ref<AdvantageResponse[]>([])
const contact = ref<ContactResponse | null>(null)

const loading = ref(true)
const apiError = ref<string | null>(null)

const isQuoteModalOpen = ref(false)
const selectedProduct = ref<string>('')
const toastMessage = ref<string | null>(null)

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

async function loadData() {
  loading.value = true
  apiError.value = null

  try {
    const results = await Promise.allSettled([
      apiService.getSite(),
      apiService.getCompany(),
      apiService.getCategories(),
      apiService.getProducts(),
      apiService.getAdvantages(),
      apiService.getContact(),
    ])

    if (results[0].status === 'fulfilled') site.value = results[0].value
    if (results[1].status === 'fulfilled') company.value = results[1].value
    if (results[2].status === 'fulfilled') categories.value = results[2].value
    if (results[3].status === 'fulfilled') products.value = results[3].value.items || []
    if (results[4].status === 'fulfilled') advantages.value = results[4].value
    if (results[5].status === 'fulfilled') contact.value = results[5].value

    // Check if all failed
    const allFailed = results.every(r => r.status === 'rejected')
    if (allFailed) {
      const firstError = (results[0] as PromiseRejectedResult).reason
      const parsed = parseApiError(firstError)
      apiError.value = `${parsed.message} (${parsed.code}). Đang kết nối tới ${import.meta.env.VITE_API_BASE_URL || '/api/v1'}.`
    }
  } catch (err) {
    const parsed = parseApiError(err)
    apiError.value = parsed.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
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

    <!-- Global API Error Notice if server connection fails -->
    <div v-if="apiError" class="container mx-auto px-5 md:px-8 mt-4">
      <StatusAlert
        type="warning"
        title="Thông báo kết nối API Backend"
        :message="apiError"
        retry-text="Thử tải lại"
        @retry="loadData"
      />
    </div>

    <!-- Main Content -->
    <main class="flex-grow">
      <!-- Hero -->
      <HeroSection
        :site="site"
        :loading="loading"
        @open-quote="openQuoteModal('')"
      />

      <!-- Giới thiệu -->
      <AboutSection
        :company="company"
        :loading="loading"
      />

      <!-- Sản phẩm -->
      <ProductsSection
        :products="products"
        :categories="categories"
        :loading="loading"
        @select-product="openQuoteModal"
      />

      <!-- Lợi thế cạnh tranh -->
      <AdvantagesSection
        :advantages="advantages"
        :loading="loading"
      />

      <!-- Liên hệ & Bản đồ -->
      <ContactSection
        :contact="contact"
        :loading="loading"
        @open-quote="openQuoteModal('')"
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
