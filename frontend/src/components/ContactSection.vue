<script setup lang="ts">
import type { ContactResponse, ErrorResponse } from '@/types/api'
import StatusAlert from '@/components/StatusAlert.vue'

defineProps<{
  contact: ContactResponse | null
  loading?: boolean
  error?: ErrorResponse | null
}>()

const emit = defineEmits<{
  (e: 'openQuote'): void
  (e: 'retry'): void
}>()
</script>

<template>
  <section id="contact" class="py-16 md:py-24 bg-cool-surface border-b border-gray-200">
    <div class="container mx-auto px-5 md:px-8">
      <!-- Section Title (Neutral UI Chrome) -->
      <div class="text-center max-w-2xl mx-auto mb-14">
        <h2 class="text-3xl md:text-4xl font-extrabold text-[#0F2438]">
          Thông tin liên hệ
        </h2>
        <div class="w-20 h-1 bg-[#B45309] mx-auto mt-4 mb-3 rounded-full"></div>
      </div>

      <!-- Section Error State with Retry -->
      <div v-if="error" class="max-w-2xl mx-auto my-6">
        <StatusAlert
          type="error"
          title="Lỗi tải thông tin liên hệ"
          :message="error.message || 'Không thể lấy thông tin liên hệ từ máy chủ.'"
          retry-text="Thử tải lại"
          @retry="emit('retry')"
        />
      </div>

      <!-- Main Contact Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <!-- Contact Information Card -->
        <div class="bg-white rounded-xl card-shadow p-6 md:p-8 flex flex-col justify-between border border-slate-200">
          <div>
            <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <i class="fas fa-address-card text-3xl text-[#0F2438]" aria-hidden="true"></i>
              <h3 class="text-2xl font-bold text-[#0F2438]">Thông tin liên hệ</h3>
            </div>

            <div class="space-y-5">
              <!-- Old Address (only rendered if provided by API) -->
              <div v-if="contact?.addressOld" class="flex items-start gap-4">
                <i class="fas fa-map-marker-alt text-xl text-[#0F2438] mt-1" aria-hidden="true"></i>
                <div>
                  <span class="font-bold text-[#0F2438] text-sm block">Địa chỉ kinh doanh (cũ):</span>
                  <span class="text-slate-600 text-sm">
                    {{ contact.addressOld }}
                  </span>
                </div>
              </div>

              <!-- New Address (only rendered if provided by API) -->
              <div v-if="contact?.addressNew" class="flex items-start gap-4">
                <i class="fas fa-building text-xl text-[#0F2438] mt-1" aria-hidden="true"></i>
                <div>
                  <span class="font-bold text-[#0F2438] text-sm block">Địa chỉ kinh doanh (mới):</span>
                  <span class="text-slate-600 text-sm">
                    {{ contact.addressNew }}
                  </span>
                  <span v-if="contact.addressNote" class="text-xs text-slate-500 block mt-0.5">
                    ({{ contact.addressNote }})
                  </span>
                </div>
              </div>

              <!-- Hotline (strictly from Contact API) -->
              <div v-if="contact?.hotlineDisplay" class="flex items-start gap-4">
                <i class="fas fa-phone-alt text-xl text-[#B45309] mt-1" aria-hidden="true"></i>
                <div>
                  <span class="font-bold text-[#0F2438] text-sm block">Hotline tư vấn 24/7:</span>
                  <a
                    :href="'tel:' + (contact.hotlineE164 || contact.hotlineDisplay)"
                    class="text-[#B45309] font-bold text-lg hover:underline focus:outline-none focus:ring-2 focus:ring-[#B45309] rounded"
                  >
                    {{ contact.hotlineDisplay }}
                  </a>
                  <span v-if="contact.hotlineContactName" class="text-slate-600 text-sm ml-1">
                    ({{ contact.hotlineContactName }})
                  </span>
                </div>
              </div>

              <!-- Email (strictly from Contact API) -->
              <div v-if="contact?.email" class="flex items-start gap-4">
                <i class="fas fa-envelope text-xl text-[#0F2438] mt-1" aria-hidden="true"></i>
                <div>
                  <span class="font-bold text-[#0F2438] text-sm block">Email:</span>
                  <a
                    :href="'mailto:' + contact.email"
                    class="text-[#0F2438] text-sm break-all hover:underline focus:outline-none focus:ring-2 focus:ring-[#0F2438] rounded"
                  >
                    {{ contact.email }}
                  </a>
                </div>
              </div>

              <!-- Working Hours -->
              <div v-if="contact?.businessHoursWeekday || contact?.businessHoursWeekend" class="flex items-start gap-4">
                <i class="fas fa-clock text-xl text-[#0F2438] mt-1" aria-hidden="true"></i>
                <div>
                  <span class="font-bold text-[#0F2438] text-sm block">Giờ làm việc:</span>
                  <span v-if="contact.businessHoursWeekday" class="text-slate-600 text-sm block">
                    {{ contact.businessHoursWeekday }}
                  </span>
                  <span v-if="contact.businessHoursWeekend" class="text-slate-500 text-xs block mt-0.5">
                    {{ contact.businessHoursWeekend }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div class="flex items-center gap-4 text-xl">
              <a
                v-if="contact?.facebookUrl"
                :href="contact.facebookUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#0F2438] hover:text-[#B45309] transition focus:outline-none focus:ring-2 focus:ring-[#0F2438] rounded"
                aria-label="Facebook"
              >
                <i class="fab fa-facebook" aria-hidden="true"></i>
              </a>
              <a
                v-if="contact?.zaloUrl"
                :href="contact.zaloUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#0F2438] font-bold text-sm bg-slate-100 border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-200 transition focus:outline-none focus:ring-2 focus:ring-[#0F2438]"
                aria-label="Zalo"
              >
                Zalo
              </a>
            </div>

            <button
              type="button"
              @click="emit('openQuote')"
              class="btn-primary text-white text-sm font-bold px-5 py-3 rounded-md shadow w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#B45309]"
            >
              <i class="fas fa-paper-plane mr-1.5" aria-hidden="true"></i> Yêu cầu báo giá
            </button>
          </div>
        </div>

        <!-- Google Maps Embed -->
        <div v-if="contact?.mapEmbedUrl" class="bg-white rounded-xl card-shadow p-6 md:p-8 flex flex-col border border-slate-200">
          <div class="flex items-center gap-2 mb-5">
            <i class="fas fa-map-marked-alt text-2xl text-[#0F2438]" aria-hidden="true"></i>
            <h3 class="text-2xl font-bold text-[#0F2438]">Bản đồ công ty</h3>
          </div>
          
          <div class="w-full flex-grow min-h-[320px] overflow-hidden rounded-xl border border-slate-200 shadow-inner">
            <iframe
              :src="contact.mapEmbedUrl"
              title="Bản đồ vị trí trụ sở công ty"
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
