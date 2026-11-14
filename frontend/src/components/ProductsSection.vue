<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProductResponse, CategoryResponse, ErrorResponse } from '@/types/api'
import StatusAlert from '@/components/StatusAlert.vue'

const props = defineProps<{
  products: ProductResponse[]
  categories?: CategoryResponse[]
  loading?: boolean
  error?: ErrorResponse | null
  errorCategories?: ErrorResponse | null
}>()

const emit = defineEmits<{
  (e: 'selectProduct', productName: string): void
  (e: 'retry'): void
  (e: 'retryCategories'): void
}>()

const selectedCategory = ref<string>('all')

const filteredProducts = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.products
  }
  return props.products.filter(p => p.category?.slug === selectedCategory.value)
})

function getCategoryIcon(catSlug?: string): string {
  const slug = (catSlug || '').toLowerCase()
  if (slug.includes('thep') || slug.includes('steel')) {
    return 'fas fa-industry'
  }
  if (slug.includes('xi-mang') || slug.includes('cement')) {
    return 'fas fa-cubes'
  }
  return 'fas fa-layer-group'
}
</script>

<template>
  <section id="products" class="py-16 md:py-24 bg-cool-surface border-b border-gray-200">
    <div class="container mx-auto px-5 md:px-8">
      <!-- Section Header (Neutral UI chrome) -->
      <div class="text-center max-w-2xl mx-auto mb-10">
        <span class="bg-white text-[#0F2438] px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-sm border border-slate-200 inline-block uppercase tracking-wider">
          Sản phẩm
        </span>
        <h2 class="text-3xl md:text-4xl font-extrabold mt-4 text-[#0F2438]">
          Danh mục sản phẩm
        </h2>
        <div class="w-16 h-1 bg-[#B45309] mx-auto mt-3.5 mb-2 rounded-full"></div>
      </div>

      <!-- Section Error State with Retry Button (Specifically addresses partial API failure) -->
      <div v-if="error" class="max-w-2xl mx-auto my-6">
        <StatusAlert
          type="error"
          title="Không thể tải danh mục sản phẩm"
          :message="error.message || 'Đã xảy ra lỗi khi kết nối với máy chủ lấy danh sách sản phẩm.'"
          retry-text="Thử tải lại sản phẩm"
          @retry="emit('retry')"
        />
      </div>

      <!-- Category Filter Loading Error with Retry Button -->
      <div v-if="errorCategories && !error" class="max-w-xl mx-auto mb-6">
        <StatusAlert
          type="warning"
          title="Lỗi tải danh mục phân loại"
          :message="errorCategories.message || 'Không thể kết nối máy chủ để lấy bộ lọc danh mục.'"
          retry-text="Thử tải lại danh mục"
          @retry="emit('retryCategories')"
        />
      </div>

      <!-- Category Filter Tabs (if categories exist and no error) -->
      <div v-else-if="categories && categories.length > 0 && products.length > 0 && !error" class="flex flex-wrap justify-center gap-2.5 mb-10">
        <button
          type="button"
          @click="selectedCategory = 'all'"
          class="px-4 py-2 rounded-md text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#0F2438]"
          :class="selectedCategory === 'all' ? 'bg-[#0F2438] text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
        >
          Tất cả sản phẩm
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          @click="selectedCategory = cat.slug"
          class="px-4 py-2 rounded-md text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#0F2438]"
          :class="selectedCategory === cat.slug ? 'bg-[#0F2438] text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="loading && products.length === 0 && !error" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div v-for="i in 2" :key="i" class="bg-white rounded-2xl p-6 card-shadow animate-pulse">
          <div class="h-48 bg-gray-200 rounded-xl mb-4"></div>
          <div class="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div class="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>

      <!-- Empty State (When successfully fetched but 0 products) -->
      <div v-else-if="!loading && !error && filteredProducts.length === 0" class="text-center py-12 bg-white rounded-2xl border border-gray-200 p-8 card-shadow max-w-lg mx-auto">
        <i class="fas fa-box-open text-4xl text-gray-400 mb-3" aria-hidden="true"></i>
        <p class="text-gray-600 font-medium">Hiện không có sản phẩm nào thuộc danh mục này.</p>
      </div>

      <!-- Products Grid -->
      <div v-else-if="!error && filteredProducts.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="group bg-white rounded-xl card-shadow hover-lift transition-smooth overflow-hidden border border-slate-200 flex flex-col justify-between"
        >
          <!-- Product Visual Header: Prioritizes product.imageUrl when present; otherwise uses category-driven icon -->
          <div class="h-48 bg-gradient-to-br from-slate-900 to-[#0F2438] flex items-center justify-center relative text-white transition-all overflow-hidden border-b border-slate-200">
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <i
              v-else
              :class="getCategoryIcon(product.category?.slug)"
              class="text-7xl opacity-80 group-hover:scale-110 transition-transform duration-300"
              aria-hidden="true"
            ></i>
            <!-- Specs Summary / Badge -->
            <div
              v-if="product.specsSummary"
              class="absolute bottom-3 left-4 bg-[#0F2438]/90 backdrop-blur-sm px-3.5 py-1 rounded text-[#FDE68A] text-xs font-mono font-bold border border-[#B45309]/40 shadow-sm"
            >
              {{ product.specsSummary }}
            </div>
            <div
              v-else-if="product.brand"
              class="absolute bottom-3 left-4 bg-[#0F2438]/90 backdrop-blur-sm px-3.5 py-1 rounded text-[#FDE68A] text-xs font-mono font-bold border border-[#B45309]/40 shadow-sm"
            >
              {{ product.brand }}
            </div>
          </div>

          <!-- Product Details -->
          <div class="p-6 md:p-8 flex flex-col flex-grow justify-between">
            <div>
              <div class="flex justify-between items-start gap-4">
                <div>
                  <h3 class="text-2xl font-bold text-[#0F2438] group-hover:text-[#B45309] transition">
                    {{ product.name }}
                  </h3>
                  <p v-if="product.shortDescription" class="text-sm text-[#B45309] font-semibold mt-0.5">
                    {{ product.shortDescription }}
                  </p>
                </div>
                <span
                  v-if="product.category?.name"
                  class="text-xs bg-slate-100 text-[#0F2438] border border-slate-200 px-2.5 py-1 rounded font-bold"
                >
                  {{ product.category.name }}
                </span>
              </div>

              <p v-if="product.description" class="text-slate-600 mt-4 leading-relaxed text-sm md:text-base">
                {{ product.description }}
              </p>

              <!-- Features / Specifications list (strictly from API) -->
              <ul v-if="product.features && product.features.length" class="mt-4 space-y-2 text-slate-600 text-sm">
                <li
                  v-for="(feat, fIdx) in product.features"
                  :key="fIdx"
                  class="flex items-center gap-2"
                >
                  <i class="fas fa-check text-[#B45309] text-xs" aria-hidden="true"></i>
                  <span>{{ feat }}</span>
                </li>
              </ul>
            </div>

            <!-- Action Button -->
            <div class="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
              <span v-if="product.brand" class="text-xs text-slate-500 font-medium">
                Thương hiệu: <strong class="text-[#0F2438] font-bold">{{ product.brand }}</strong>
              </span>
              <span v-else></span>
              
              <button
                type="button"
                @click="emit('selectProduct', product.name)"
                class="btn-primary text-white px-5 py-2.5 rounded-md text-sm font-bold shadow hover:shadow-md transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
              >
                <i class="fas fa-file-invoice-dollar" aria-hidden="true"></i> Nhận báo giá
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
