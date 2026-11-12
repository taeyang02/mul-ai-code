<script setup lang="ts">
import type { CompanyResponse } from '@/types/api'

defineProps<{
  company: CompanyResponse | null
  loading?: boolean
}>()
</script>

<template>
  <section id="about" class="py-16 md:py-24 bg-white border-b border-gray-200">
    <div class="container mx-auto px-5 md:px-8">
      <!-- Section Title -->
      <div class="text-center max-w-3xl mx-auto mb-14">
        <span class="text-[#1e5a6b] font-semibold tracking-wider uppercase text-xs md:text-sm bg-gray-100 px-4 py-1.5 rounded-full inline-block">
          Về chúng tôi
        </span>
        <h2 class="text-3xl md:text-4xl font-extrabold mt-4 text-gray-800">
          {{ company?.legalName || company?.tradeName || 'CÔNG TY TNHH THANH AN BẮC GIANG' }}
        </h2>
        <div class="w-20 h-1 bg-[#2c7a5e] mx-auto mt-4 rounded-full"></div>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Left: Description and Key Metrics -->
        <div class="space-y-6">
          <p v-if="company?.tradeName" class="text-gray-700 leading-relaxed text-base md:text-lg">
            {{ company.legalName }} ({{ company.tradeName }}) là đơn vị uy tín hàng đầu trong lĩnh vực cung ứng vật liệu xây dựng chất lượng cao tại Bắc Giang và các tỉnh miền Bắc.
          </p>

          <div
            v-if="company?.statusLabel || company?.foundedOn || company?.industry || company?.serviceArea"
            class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
          >
            <div v-if="company?.statusLabel" class="flex items-start gap-3.5 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <i class="fas fa-building text-2xl text-[#1e5a6b] mt-1"></i>
              <div>
                <span class="font-bold text-gray-800 text-sm block">Trạng thái:</span>
                <span class="text-gray-600 text-sm">{{ company.statusLabel }}</span>
              </div>
            </div>

            <div v-if="company?.foundedOn" class="flex items-start gap-3.5 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <i class="fas fa-calendar-alt text-2xl text-[#1e5a6b] mt-1"></i>
              <div>
                <span class="font-bold text-gray-800 text-sm block">Ngày thành lập:</span>
                <span class="text-gray-600 text-sm">{{ company.foundedOn }}</span>
              </div>
            </div>

            <div v-if="company?.industry" class="flex items-start gap-3.5 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <i class="fas fa-hard-hat text-2xl text-[#1e5a6b] mt-1"></i>
              <div>
                <span class="font-bold text-gray-800 text-sm block">Ngành nghề:</span>
                <span class="text-gray-600 text-sm">{{ company.industry }}</span>
              </div>
            </div>

            <div v-if="company?.serviceArea" class="flex items-start gap-3.5 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <i class="fas fa-map-marker-alt text-2xl text-[#1e5a6b] mt-1"></i>
              <div>
                <span class="font-bold text-gray-800 text-sm block">Khu vực phân phối:</span>
                <span class="text-gray-600 text-sm">{{ company.serviceArea }}</span>
              </div>
            </div>
          </div>

          <p v-if="company?.mission" class="text-gray-600 italic border-l-4 border-[#2c7a5e] pl-4 text-sm md:text-base bg-emerald-50/50 py-2.5 rounded-r">
            <strong>Sứ mệnh:</strong> {{ company.mission }}
          </p>
        </div>

        <!-- Right: Highlight Brand Card -->
        <div class="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-md border border-gray-200">
          <div class="bg-white rounded-xl p-6 md:p-8 card-shadow space-y-5">
            <div class="flex items-center gap-3 text-[#1e5a6b]">
              <i class="fas fa-chart-line text-3xl"></i>
              <h3 class="font-bold text-xl md:text-2xl text-gray-800">
                {{ company?.highlightTitle || 'Thép & Xi măng số 1 Bắc Giang' }}
              </h3>
            </div>
            
            <p v-if="company?.highlightBody" class="text-gray-600 text-sm md:text-base leading-relaxed">
              {{ company.highlightBody }}
            </p>

            <div
              v-if="company?.projectsCompletedLabel || company?.partnersLabel"
              class="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-center"
            >
              <div v-if="company?.projectsCompletedLabel" class="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                <span class="font-black text-[#1e5a6b] text-2xl md:text-3xl block">
                  {{ company.projectsCompletedLabel }}
                </span>
                <p class="text-xs text-gray-600 font-medium mt-1">Dự án hoàn thành</p>
              </div>

              <div v-if="company?.partnersLabel" class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4">
                <span class="font-black text-[#2c7a5e] text-2xl md:text-3xl block">
                  {{ company.partnersLabel }}
                </span>
                <p class="text-xs text-gray-600 font-medium mt-1">Đối tác thân thiết</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
