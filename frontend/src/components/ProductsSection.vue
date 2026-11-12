<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProductResponse, CategoryResponse } from '@/types/api'

const props = defineProps<{
  products: ProductResponse[]
  categories?: CategoryResponse[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'selectProduct', productName: string): void
}>()

const selectedCategory = ref<string>('all')

const filteredProducts = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.products
  }
  return props.products.filter(p => p.category?.slug === selectedCategory.value)
})
</script>

<template>
  <section id="products" class="py-16 md:py-24 bg-gray-50 border-b border-gray-200">
    <div class="container mx-auto px-5 md:px-8">
      <!-- Section Header -->
      <div class="text-center max-w-2xl mx-auto mb-12">
        <span class="bg-white text-[#1e5a6b] px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold shadow-sm border border-gray-200 inline-block">
          Dòng sản phẩm chủ lực
        </span>
        <h2 class="text-3xl md:text-4xl font-extrabold mt-4 text-gray-800">
          Vật tư xây dựng <span class="text-[#2c7a5e]">chính hãng</span>
        </h2>
        <p class="text-gray-600 mt-3 text-sm md:text-base">
          Chúng tôi cung cấp đa dạng chủng loại phục vụ mọi công trình từ dân dụng đến dự án công nghiệp.
        </p>
      </div>

      <!-- Category Filter Tabs (if categories exist) -->
      <div v-if="categories && categories.length > 0" class="flex flex-wrap justify-center gap-2.5 mb-10">
        <button
          type="button"
          @click="selectedCategory = 'all'"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition"
          :class="selectedCategory === 'all' ? 'bg-[#1e5a6b] text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'"
        >
          Tất cả sản phẩm
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          @click="selectedCategory = cat.slug"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition"
          :class="selectedCategory === cat.slug ? 'bg-[#1e5a6b] text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="loading && products.length === 0" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div v-for="i in 2" :key="i" class="bg-white rounded-2xl p-6 card-shadow animate-pulse">
          <div class="h-48 bg-gray-200 rounded-xl mb-4"></div>
          <div class="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div class="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProducts.length === 0" class="text-center py-12 bg-white rounded-2xl border border-gray-200 p-8 card-shadow max-w-lg mx-auto">
        <i class="fas fa-box-open text-4xl text-gray-400 mb-3"></i>
        <p class="text-gray-600 font-medium">Hiện không có sản phẩm nào thuộc danh mục này.</p>
      </div>

      <!-- Products Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="group bg-white rounded-2xl card-shadow hover-lift transition-smooth overflow-hidden border border-gray-200/80 flex flex-col justify-between"
        >
          <!-- Product Visual Header -->
          <div class="h-48 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center relative text-white transition-all overflow-hidden">
            <i
              :class="product.slug.includes('thep') ? 'fas fa-industry' : 'fas fa-cubes'"
              class="text-7xl opacity-80 group-hover:scale-110 transition-transform duration-300"
            ></i>
            <!-- Specs Summary / Badge -->
            <div
              v-if="product.specsSummary"
              class="absolute bottom-3 left-4 bg-black/50 backdrop-blur-sm px-3.5 py-1 rounded-full text-white text-xs font-semibold border border-white/20"
            >
              {{ product.specsSummary }}
            </div>
            <div
              v-else-if="product.brand"
              class="absolute bottom-3 left-4 bg-black/50 backdrop-blur-sm px-3.5 py-1 rounded-full text-white text-xs font-semibold border border-white/20"
            >
              {{ product.brand }}
            </div>
          </div>

          <!-- Product Details -->
          <div class="p-6 md:p-8 flex flex-col flex-grow justify-between">
            <div>
              <div class="flex justify-between items-start gap-4">
                <div>
                  <h3 class="text-2xl font-bold text-gray-800 group-hover:text-[#1e5a6b] transition">
                    {{ product.name }}
                  </h3>
                  <p v-if="product.shortDescription" class="text-sm text-[#1e5a6b] font-medium mt-0.5">
                    {{ product.shortDescription }}
                  </p>
                </div>
                <span
                  v-if="product.category?.name"
                  class="text-xs bg-emerald-50 text-[#2c7a5e] border border-emerald-200 px-2.5 py-1 rounded font-semibold"
                >
                  {{ product.category.name }}
                </span>
              </div>

              <p v-if="product.description" class="text-gray-600 mt-4 leading-relaxed text-sm md:text-base">
                {{ product.description }}
              </p>

              <!-- Features / Specifications list (strictly from API) -->
              <ul v-if="product.features && product.features.length" class="mt-4 space-y-2 text-gray-600 text-sm">
                <li
                  v-for="(f, idx) in product.features"
                  :key="idx"
                  class="flex items-center gap-2"
                >
                  <i class="fas fa-check-circle text-[#2c7a5e]"></i>
                  <span>{{ f }}</span>
                </li>
              </ul>
            </div>

            <div class="pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                @click="emit('selectProduct', product.name)"
                class="w-full border-2 border-[#1e5a6b] text-[#1e5a6b] font-bold py-3 rounded-lg hover:bg-[#1e5a6b] hover:text-white transition flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Báo giá {{ product.name }}</span>
                <i class="fas fa-arrow-right text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
