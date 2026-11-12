<script setup lang="ts">
import type { CompanyInfo } from '@/types/api'

defineProps<{
  companyInfo: CompanyInfo | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'openQuote'): void
}>()
</script>

<template>
  <section id="home" class="relative bg-industrial bg-cover bg-center overflow-hidden border-b border-gray-200">
    <div class="absolute inset-0 bg-gradient-to-r from-gray-900/10 via-gray-800/5 to-transparent pointer-events-none"></div>
    
    <div class="container mx-auto px-5 md:px-8 py-16 md:py-24 lg:py-28 relative z-10">
      <div class="max-w-3xl">
        <!-- Tagline badge -->
        <span class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#1e5a6b]/10 text-[#1e5a6b] rounded-full text-sm font-semibold mb-5 border border-[#1e5a6b]/20">
          <span>🏗️</span> {{ companyInfo?.tagline || 'Đối tác chiến lược toàn miền Bắc' }}
        </span>

        <!-- Hero Heading -->
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-gray-900">
          Vật liệu xây dựng <br>
          <span class="text-gradient-brand">Chất lượng vượt trội</span>
        </h1>

        <!-- Slogan Description -->
        <p class="text-lg md:text-xl text-gray-700 mt-6 leading-relaxed border-l-4 border-[#2c7a5e] pl-5 max-w-2xl">
          {{ companyInfo?.slogan || 'Chuyên phân phối Thép Hòa Phát, Xi măng Pomihua hàng đầu Bắc Giang. Uy tín - Giá cạnh tranh - Giao hàng tận công trình.' }}
        </p>

        <!-- CTAs -->
        <div class="flex flex-wrap gap-4 mt-8">
          <a
            href="#products"
            class="btn-primary text-white px-7 py-3.5 rounded-lg font-semibold shadow-md flex items-center gap-2"
          >
            <i class="fas fa-arrow-right"></i> Xem sản phẩm
          </a>

          <button
            type="button"
            @click="emit('openQuote')"
            class="border-2 border-[#1e5a6b] text-[#1e5a6b] bg-white/80 hover:bg-[#1e5a6b] hover:text-white px-7 py-3.5 rounded-lg font-semibold transition-all shadow-sm flex items-center gap-2"
          >
            <i class="fas fa-phone-alt"></i> Nhận báo giá
          </button>
        </div>

        <!-- Badges -->
        <div class="flex flex-wrap items-center gap-6 mt-10 text-sm font-medium text-gray-700">
          <div class="flex items-center gap-1.5 bg-white/70 backdrop-blur px-3 py-1.5 rounded-md border border-gray-200 shadow-xs">
            <i class="fas fa-check-circle text-[#2c7a5e]"></i>
            <span>{{ companyInfo?.stats?.activeSince || 'Hoạt động từ 2015' }}</span>
          </div>
          <div class="flex items-center gap-1.5 bg-white/70 backdrop-blur px-3 py-1.5 rounded-md border border-gray-200 shadow-xs">
            <i class="fas fa-truck-fast text-[#2c7a5e]"></i>
            <span>{{ companyInfo?.stats?.supportTime || 'Giao nhanh 24/7' }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
