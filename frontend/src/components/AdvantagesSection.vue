<script setup lang="ts">
import type { AdvantageResponse, ErrorResponse } from '@/types/api'
import StatusAlert from '@/components/StatusAlert.vue'

defineProps<{
  advantages: AdvantageResponse[]
  loading?: boolean
  error?: ErrorResponse | null
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

function getIconClass(iconKey?: string | null): string {
  if (!iconKey) return 'fas fa-award'
  switch (iconKey.toLowerCase()) {
    case 'handshake':
    case 'trust':
      return 'fas fa-handshake'
    case 'tags':
    case 'price':
    case 'discount':
      return 'fas fa-tags'
    case 'truck':
    case 'delivery':
    case 'fast':
      return 'fas fa-truck-ramp-box'
    case 'warehouse':
    case 'stock':
    case 'factory':
      return 'fas fa-warehouse'
    default:
      return 'fas fa-check-circle'
  }
}
</script>

<template>
  <section id="advantages" class="py-16 md:py-24 bg-white border-b border-gray-200">
    <div class="container mx-auto px-5 md:px-8">
      <!-- Title -->
      <div class="text-center max-w-2xl mx-auto mb-14">
        <span class="text-[#0F2438] font-bold text-xs md:text-sm bg-slate-100 px-4 py-1.5 rounded-full inline-block border border-slate-200 uppercase tracking-wider">
          CAM KẾT CHẤT LƯỢNG
        </span>
        <h2 class="text-3xl md:text-4xl font-extrabold mt-3 text-[#0F2438]">
          Lợi thế cạnh tranh <br> vượt trội
        </h2>
        <div class="w-16 h-1 bg-[#B45309] mx-auto mt-4 rounded-full"></div>
      </div>

      <!-- Section Error State with Retry Button -->
      <div v-if="error" class="max-w-2xl mx-auto my-6">
        <StatusAlert
          type="error"
          title="Lỗi tải lợi thế cạnh tranh"
          :message="error.message || 'Không thể lấy thông tin lợi thế cạnh tranh từ máy chủ.'"
          retry-text="Thử tải lại"
          @retry="emit('retry')"
        />
      </div>

      <!-- Loading State -->
      <div v-else-if="loading && advantages.length === 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="i in 4" :key="i" class="bg-gray-50 p-6 rounded-xl animate-pulse">
          <div class="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div class="h-5 bg-gray-200 rounded w-2/3 mx-auto mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>

      <!-- Grid Cards -->
      <div v-else-if="advantages.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
        <div
          v-for="(adv, index) in advantages"
          :key="adv.id"
          class="bg-slate-50 p-6 rounded-xl card-shadow text-left transition-all hover:shadow-xl hover:-translate-y-1 duration-300 border border-slate-200 border-b-4 border-b-[#B45309] flex flex-col justify-start"
        >
          <div class="flex items-center justify-between mb-4">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded border border-[#CBD5E1] bg-[#F1F5F9] text-[#0F2438] text-xs font-mono font-bold">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div class="w-12 h-12 bg-[#0F2438]/10 rounded-full flex items-center justify-center text-[#0F2438]">
              <i :class="getIconClass(adv.iconKey)" class="text-xl" aria-hidden="true"></i>
            </div>
          </div>
          <h3 class="text-lg md:text-xl font-bold text-[#0F2438]">
            {{ adv.title }}
          </h3>
          <p class="text-slate-600 mt-2.5 text-sm leading-relaxed">
            {{ adv.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
