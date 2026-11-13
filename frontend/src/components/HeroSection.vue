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
  <section id="home" class="relative bg-industrial bg-cover bg-center overflow-hidden border-b-2 border-slate-800 text-white">
    <div class="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent pointer-events-none"></div>
    
    <div class="container mx-auto px-5 md:px-8 py-16 md:py-20 lg:py-24 relative z-10">
      <!-- Section Error State with Retry Button -->
      <div v-if="error" class="mb-8 max-w-3xl">
        <StatusAlert
          type="error"
          title="Lỗi tải thông tin trang chủ"
          :message="error.message || 'Không thể lấy thông tin trang chủ từ máy chủ.'"
          retry-text="Thử tải lại"
          @retry="emit('retry')"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        <!-- Hero Left Column (Information & CTAs) -->
        <div class="lg:col-span-7">
          <!-- Tagline badge from Site API -->
          <span
            v-if="site?.tagline"
            class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#B45309]/20 text-[#FDE68A] rounded text-xs md:text-sm font-bold uppercase tracking-wider mb-5 border border-[#B45309]"
          >
            <i class="fas fa-industry text-xs" aria-hidden="true"></i>
            <span>{{ site.tagline }}</span>
          </span>

          <!-- Hero Heading from Site API -->
          <h1 v-if="site?.heroTitle" class="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white mb-6">
            {{ site.heroTitle }}
          </h1>
          <div v-else-if="loading" class="h-14 bg-slate-700/60 rounded-lg animate-pulse w-3/4 mb-6"></div>

          <!-- Slogan Description from Site API -->
          <p
            v-if="site?.heroSubtitle"
            class="text-base sm:text-lg text-slate-300 leading-relaxed border-l-4 border-[#B45309] pl-4 max-w-2xl mb-8"
          >
            {{ site.heroSubtitle }}
          </p>

          <!-- CTAs: High Contrast Industrial Actions -->
          <div class="flex flex-wrap gap-4 mb-8">
            <button
              type="button"
              @click="emit('openQuote')"
              class="btn-primary text-white px-7 py-3.5 rounded font-bold shadow-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
            >
              <i class="fas fa-file-invoice-dollar" aria-hidden="true"></i> {{ site?.heroCtaLabel || 'Yêu cầu báo giá' }}
            </button>

            <a
              href="#products"
              class="btn-secondary-steel px-7 py-3.5 rounded font-bold shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <i class="fas fa-arrow-right" aria-hidden="true"></i> Xem sản phẩm
            </a>
          </div>

          <!-- Badges (verified by Site API) -->
          <div
            v-if="site?.heroBadgePrimary || site?.heroBadgeSecondary"
            class="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-medium text-slate-300"
          >
            <div
              v-if="site.heroBadgePrimary"
              class="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700"
            >
              <i class="fas fa-check-circle text-[#B45309]" aria-hidden="true"></i>
              <span>{{ site.heroBadgePrimary }}</span>
            </div>

            <div
              v-if="site.heroBadgeSecondary"
              class="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700"
            >
              <i class="fas fa-truck-fast text-[#B45309]" aria-hidden="true"></i>
              <span>{{ site.heroBadgeSecondary }}</span>
            </div>
          </div>
        </div>

        <!-- Hero Right Column: Quick Specs Widget -->
        <div class="lg:col-span-5">
          <div class="bg-[#0F2438]/90 border border-slate-700 border-t-4 border-t-[#B45309] rounded-md p-6 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
              <h2 class="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <i class="fas fa-layer-group text-[#B45309]" aria-hidden="true"></i>
                Năng lực danh mục sản phẩm
              </h2>
              <span class="text-[11px] font-bold text-[#FDE68A] bg-[#B45309]/30 px-2 py-0.5 rounded border border-[#B45309]/40">
                DANH MỤC THỰC TẾ
              </span>
            </div>

            <ul class="space-y-3 text-xs sm:text-sm">
              <li class="flex items-center justify-between p-2.5 bg-slate-800/60 rounded border border-slate-700/60">
                <span class="font-bold text-slate-200">Thép xây dựng (Hòa Phát)</span>
                <span class="font-mono text-[#FDE68A] text-xs">D6 - D32 / JIS, ASTM</span>
              </li>
              <li class="flex items-center justify-between p-2.5 bg-slate-800/60 rounded border border-slate-700/60">
                <span class="font-bold text-slate-200">Xi măng (Pomihua)</span>
                <span class="font-mono text-[#FDE68A] text-xs">PCB30 - PCB40 / Bao 50kg</span>
              </li>
            </ul>

            <div class="mt-4 pt-3 border-t border-slate-800 text-right">
              <span class="text-[11px] text-slate-400">
                * Hiển thị theo danh mục và specsSummary từ API
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
