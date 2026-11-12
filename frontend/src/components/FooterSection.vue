<script setup lang="ts">
import type { SiteResponse, CompanyResponse, ContactResponse } from '@/types/api'

defineProps<{
  site: SiteResponse | null
  company: CompanyResponse | null
  contact: ContactResponse | null
}>()

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-gray-900 text-gray-300 pt-14 pb-8">
    <div class="container mx-auto px-5 md:px-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-gray-800 pb-10">
        <!-- Col 1: Brand Info -->
        <div>
          <div class="flex items-center gap-2.5">
            <i class="fas fa-hard-hat text-2xl text-emerald-400" aria-hidden="true"></i>
            <span class="font-extrabold text-white text-lg tracking-tight">
              {{ company?.legalName || site?.brandName || '' }}
            </span>
          </div>
          <p v-if="site?.heroSubtitle" class="text-sm mt-3.5 text-gray-400 leading-relaxed">
            {{ site.heroSubtitle }}
          </p>
          <!-- MST only rendered when returned by API -->
          <div v-if="company?.taxCode" class="mt-4 text-xs text-gray-400">
            <span>Mã số thuế: </span>
            <strong class="text-gray-200">{{ company.taxCode }}</strong>
          </div>
        </div>

        <!-- Col 2: Quick Links (strictly rendered from site.navItems if present) -->
        <div>
          <h4 class="font-bold text-white mb-4 text-base">Liên kết nhanh</h4>
          <ul v-if="site?.navItems && site.navItems.length > 0" class="space-y-2.5 text-sm">
            <li v-for="(item, idx) in site.navItems" :key="idx">
              <a :href="item.href" class="hover:text-emerald-400 transition">{{ item.label }}</a>
            </li>
          </ul>
        </div>

        <!-- Col 3: Hours & Socials (only rendered if verified) -->
        <div>
          <h4 class="font-bold text-white mb-4 text-base">Giờ làm việc & Hỗ trợ</h4>
          <p v-if="contact?.businessHoursWeekday" class="text-sm text-gray-300">
            <i class="fas fa-clock mr-2 text-emerald-400" aria-hidden="true"></i>
            {{ contact.businessHoursWeekday }}
          </p>
          <p v-if="contact?.businessHoursWeekend" class="text-sm text-gray-300 mt-2">
            <i class="fas fa-headset mr-2 text-emerald-400" aria-hidden="true"></i>
            {{ contact.businessHoursWeekend }}
          </p>
          <p v-if="contact?.hotlineDisplay" class="text-sm text-emerald-400 font-bold mt-2">
            <i class="fas fa-phone-alt mr-2" aria-hidden="true"></i>
            {{ contact.hotlineDisplay }}
            <span v-if="contact.hotlineContactName" class="text-xs text-gray-400 font-normal">({{ contact.hotlineContactName }})</span>
          </p>

          <div
            v-if="contact?.facebookUrl || contact?.zaloUrl"
            class="flex items-center gap-4 mt-5 text-xl"
          >
            <a
              v-if="contact.facebookUrl"
              :href="contact.facebookUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1e5a6b] text-gray-300 hover:text-white transition"
              aria-label="Facebook"
            >
              <i class="fab fa-facebook-f" aria-hidden="true"></i>
            </a>
            <a
              v-if="contact.zaloUrl"
              :href="contact.zaloUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1e5a6b] text-gray-300 hover:text-white transition font-bold text-xs"
              aria-label="Zalo"
            >
              Zalo
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="text-center text-xs text-gray-400 pt-7 flex flex-col md:flex-row justify-between items-center gap-3">
        <span>© {{ currentYear }} {{ company?.legalName || site?.brandName || '' }}. All rights reserved.</span>
        <span v-if="site?.tagline" class="text-gray-300 font-medium">{{ site.tagline }}</span>
      </div>
    </div>
  </footer>
</template>
