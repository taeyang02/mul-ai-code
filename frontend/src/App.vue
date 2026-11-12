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
import { apiService, normalizeApiError } from '@/services/api'
import type { CompanyInfo, Advantage, Product } from '@/types/api'

const companyInfo = ref<CompanyInfo | null>(null)
const advantages = ref<Advantage[]>([])
const products = ref<Product[]>([])

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
  showToast('Yêu cầu báo giá đã được ghi nhận thành công!')
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
    const [infoData, advData, prodData] = await Promise.all([
      apiService.getCompanyInfo().catch((err) => {
        console.warn('Failed to load company info from backend:', err)
        return null
      }),
      apiService.getAdvantages().catch((err) => {
        console.warn('Failed to load advantages from backend:', err)
        return []
      }),
      apiService.getProducts().catch((err) => {
        console.warn('Failed to load products from backend:', err)
        return []
      }),
    ])

    companyInfo.value = infoData
    advantages.value = advData
    products.value = prodData

    if (!infoData && advData.length === 0 && prodData.length === 0) {
      apiError.value = 'Chưa thể kết nối tới Backend API. Vui lòng kiểm tra trạng thái máy chủ Backend hoặc thử lại.'
    }
  } catch (err) {
    const errorDetails = normalizeApiError(err)
    apiError.value = errorDetails.message
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
      :company-info="companyInfo"
      @open-quote="openQuoteModal('')"
    />

    <!-- Global API Error Notice if server connection fails -->
    <div v-if="apiError" class="container mx-auto px-5 md:px-8 mt-4">
      <StatusAlert
        type="warning"
        title="Thông báo kết nối API"
        :message="apiError"
        retry-text="Thử tải lại"
        @retry="loadData"
      />
    </div>

    <!-- Main Content -->
    <main class="flex-grow">
      <!-- Hero -->
      <HeroSection
        :company-info="companyInfo"
        :loading="loading"
        @open-quote="openQuoteModal('')"
      />

      <!-- Giới thiệu -->
      <AboutSection
        :company-info="companyInfo"
        :loading="loading"
      />

      <!-- Sản phẩm -->
      <ProductsSection
        :products="products"
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
        :company-info="companyInfo"
        :loading="loading"
        @open-quote="openQuoteModal('')"
      />
    </main>

    <!-- Footer -->
    <FooterSection
      :company-info="companyInfo"
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
