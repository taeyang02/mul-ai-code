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
  <section id="contact" class="py-16 md:py-24 bg-gray-50 border-b border-gray-200">
    <div class="container mx-auto px-5 md:px-8">
      <!-- Section Title -->
      <div class="text-center max-w-2xl mx-auto mb-14">
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-800">
          Liên hệ ngay hôm nay
        </h2>
        <div class="w-20 h-1 bg-[#2c7a5e] mx-auto mt-4 mb-3 rounded-full"></div>
        <p class="text-gray-600 text-sm md:text-base">
          Đội ngũ tư vấn luôn sẵn sàng hỗ trợ báo giá tốt nhất cho công trình của bạn.
        </p>
      </div>

      <!-- Main Contact Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <!-- Contact Information Card -->
        <div class="bg-white rounded-2xl card-shadow p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <i class="fas fa-address-card text-3xl text-[#1e5a6b]"></i>
              <h3 class="text-2xl font-bold text-gray-800">Thông tin công ty</h3>
            </div>

            <div class="space-y-5">
              <!-- Old Address (only rendered if verified and provided) -->
              <div v-if="companyInfo?.oldAddress" class="flex items-start gap-4">
                <i class="fas fa-map-marker-alt text-xl text-[#1e5a6b] mt-1"></i>
                <div>
                  <span class="font-bold text-gray-800 text-sm block">Địa chỉ kinh doanh (cũ):</span>
                  <span class="text-gray-700 text-sm">
                    {{ companyInfo.oldAddress }}
                  </span>
                </div>
              </div>

              <!-- New Address (only rendered if verified and provided) -->
              <div v-if="companyInfo?.newAddress" class="flex items-start gap-4">
                <i class="fas fa-file-invoice-dollar text-xl text-[#1e5a6b] mt-1"></i>
                <div>
                  <span class="font-bold text-gray-800 text-sm block">Địa chỉ kinh doanh (mới):</span>
                  <span class="text-gray-700 text-sm">
                    {{ companyInfo.newAddress }}
                  </span>
                  <span v-if="companyInfo.registrationNote" class="text-xs text-gray-500 block mt-0.5">
                    ({{ companyInfo.registrationNote }})
                  </span>
                </div>
              </div>

              <!-- Hotline (only rendered if verified and provided) -->
              <div v-if="companyInfo?.hotline" class="flex items-start gap-4">
                <i class="fas fa-phone-alt text-xl text-[#1e5a6b] mt-1"></i>
                <div>
                  <span class="font-bold text-gray-800 text-sm block">Hotline tư vấn 24/7:</span>
                  <a
                    :href="'tel:' + companyInfo.hotline"
                    class="text-[#1e5a6b] font-bold text-lg hover:underline"
                  >
                    {{ companyInfo.hotline }}
                  </a>
                  <span v-if="companyInfo.hotlineConsultant" class="text-gray-600 text-sm ml-1">
                    ({{ companyInfo.hotlineConsultant }})
                  </span>
                </div>
              </div>

              <!-- Email (only rendered if verified and provided) -->
              <div v-if="companyInfo?.email" class="flex items-start gap-4">
                <i class="fas fa-envelope text-xl text-[#1e5a6b] mt-1"></i>
                <div>
                  <span class="font-bold text-gray-800 text-sm block">Email:</span>
                  <a
                    :href="'mailto:' + companyInfo.email"
                    class="text-[#1e5a6b] text-sm break-all hover:underline"
                  >
                    {{ companyInfo.email }}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div class="p-3.5 bg-gray-50 rounded-xl flex items-center gap-3 w-full sm:w-auto">
              <i class="fab fa-facebook-messenger text-2xl text-[#1e5a6b]"></i>
              <span class="text-xs text-gray-700 font-medium">Kết nối Zalo / Hotline hỗ trợ 24/7</span>
            </div>

            <button
              type="button"
              @click="emit('openQuote')"
              class="btn-primary text-white text-sm font-semibold px-5 py-3 rounded-lg shadow w-full sm:w-auto"
            >
              <i class="fas fa-paper-plane mr-1.5"></i> Yêu cầu báo giá
            </button>
          </div>
        </div>

        <!-- Google Maps Embed (only rendered if URL provided) -->
        <div v-if="companyInfo?.mapEmbedUrl" class="bg-white rounded-2xl card-shadow p-6 md:p-8 flex flex-col">
          <div class="flex items-center gap-2 mb-5">
            <i class="fas fa-map-marked-alt text-2xl text-[#1e5a6b]"></i>
            <h3 class="text-2xl font-bold text-gray-800">Bản đồ công ty</h3>
          </div>
          
          <div class="w-full flex-grow min-h-[320px] overflow-hidden rounded-xl border border-gray-200 shadow-inner">
            <iframe
              :src="companyInfo.mapEmbedUrl"
              width="100%"
              height="100%"
              style="border:0; min-height: 320px;"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
