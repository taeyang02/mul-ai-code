<script setup lang="ts">
import type { SiteResponse, ErrorResponse } from '@/types/api'
import StatusAlert from '@/components/StatusAlert.vue'

defineProps<{
  site: SiteResponse | null
  loading?: boolean
  error?: ErrorResponse | null
}>()

const emit = defineEmits<{
  (e: 'openQuote'): void
  (e: 'retry'): void
}>()
</script>

<template>
  <section id="home" class="relative bg-industrial bg-cover bg-center overflow-hidden border-b border-gray-200">
    <div class="absolute inset-0 bg-gradient-to-r from-gray-900/10 via-gray-800/5 to-transparent pointer-events-none"></div>
    
    <div class="container mx-auto px-5 md:px-8 py-16 md:py-24 lg:py-28 relative z-10">
      <div class="max-w-3xl">
        <!-- Section Error State with Retry Button -->
        <div v-if="error" class="mb-8">
          <StatusAlert
            type="error"
            title="Lỗi tải thông tin trang chủ"
            :message="error.message || 'Không thể lấy thông tin trang chủ từ máy chủ.'"
            retry-text="Thử tải lại"
            @retry="emit('retry')"
          />
        </div>

        <!-- Tagline badge from Site API -->
        <span
          v-if="site?.tagline"
          class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#1e5a6b]/10 text-[#1e5a6b] rounded-full text-sm font-semibold mb-5 border border-[#1e5a6b]/20"
        >
          <i class="fas fa-industry text-xs" aria-hidden="true"></i>
          <span>{{ site.tagline }}</span>
        </span>

        <!-- Hero Heading from Site API -->
        <h1 v-if="site?.heroTitle" class="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-gray-900">
          {{ site.heroTitle }}
        </h1>
        <div v-else-if="loading" class="h-14 bg-gray-200/60 rounded-xl animate-pulse w-3/4 mb-4"></div>

        <!-- Slogan Description from Site API -->
        <p
          v-if="site?.heroSubtitle"
          class="text-lg md:text-xl text-gray-700 mt-6 leading-relaxed border-l-4 border-[#2c7a5e] pl-5 max-w-2xl"
        >
          {{ site.heroSubtitle }}
        </p>

        <!-- CTAs: Distinct actions without duplicate quote buttons -->
        <div class="flex flex-wrap gap-4 mt-8">
          <a
            href="#products"
            class="btn-primary text-white px-7 py-3.5 rounded-lg font-semibold shadow-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b]"
          >
            <i class="fas fa-arrow-right" aria-hidden="true"></i> Xem sản phẩm
          </a>

          <button
            type="button"
            @click="emit('openQuote')"
            class="border-2 border-[#1e5a6b] text-[#1e5a6b] bg-white/80 hover:bg-[#1e5a6b] hover:text-white px-7 py-3.5 rounded-lg font-semibold transition-all shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b]"
          >
            <i class="fas fa-file-invoice-dollar" aria-hidden="true"></i> {{ site?.heroCtaLabel || 'Yêu cầu báo giá' }}
          </button>
        </div>

        <!-- Badges (only rendered when verified by Site API) -->
        <div
          v-if="site?.heroBadgePrimary || site?.heroBadgeSecondary"
          class="flex flex-wrap items-center gap-6 mt-10 text-sm font-medium text-gray-700"
        >
          <div
            v-if="site.heroBadgePrimary"
            class="flex items-center gap-1.5 bg-white/70 backdrop-blur px-3 py-1.5 rounded-md border border-gray-200 shadow-xs"
          >
            <i class="fas fa-check-circle text-[#2c7a5e]" aria-hidden="true"></i>
            <span>{{ site.heroBadgePrimary }}</span>
          </div>

          <div
            v-if="site.heroBadgeSecondary"
            class="flex items-center gap-1.5 bg-white/70 backdrop-blur px-3 py-1.5 rounded-md border border-gray-200 shadow-xs"
          >
            <i class="fas fa-truck-fast text-[#2c7a5e]" aria-hidden="true"></i>
            <span>{{ site.heroBadgeSecondary }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
