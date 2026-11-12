<script setup lang="ts">
import type { SiteResponse, CompanyResponse, ContactResponse } from '@/types/api'

defineProps<{
  site: SiteResponse | null
  company: CompanyResponse | null
  contact: ContactResponse | null
}>()
</script>

<template>
  <footer class="bg-gray-900 text-gray-300 pt-14 pb-8">
    <div class="container mx-auto px-5 md:px-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-gray-800 pb-10">
        <!-- Col 1: Brand Info -->
        <div>
          <div class="flex items-center gap-2.5">
            <i class="fas fa-hard-hat text-2xl text-emerald-400"></i>
            <span class="font-extrabold text-white text-lg tracking-tight">
              {{ company?.legalName || site?.brandName || 'THANH AN BẮC GIANG' }}
            </span>
          </div>
          <p class="text-sm mt-3.5 text-gray-400 leading-relaxed">
            {{ site?.heroSubtitle || 'Đồng hành cùng mọi công trình từ dân dụng đến công nghiệp với chất lượng và uy tín hàng đầu tại Bắc Giang và các tỉnh miền Bắc.' }}
          </p>
          <!-- MST only rendered when returned by API -->
          <div v-if="company?.taxCode" class="mt-4 text-xs text-gray-400">
            <span>Mã số thuế: </span>
            <strong class="text-gray-200">{{ company.taxCode }}</strong>
          </div>
        </div>

        <!-- Col 2: Quick Links -->
        <div>
          <h4 class="font-bold text-white mb-4 text-base">Liên kết nhanh</h4>
          <ul class="space-y-2.5 text-sm">
            <template v-if="site?.navItems && site.navItems.length > 0">
              <li v-for="(item, idx) in site.navItems" :key="idx">
                <a :href="item.href" class="hover:text-emerald-400 transition">{{ item.label }}</a>
              </li>
            </template>
            <template v-else>
              <li><a href="#home" class="hover:text-emerald-400 transition">Trang chủ</a></li>
              <li><a href="#about" class="hover:text-emerald-400 transition">Giới thiệu doanh nghiệp</a></li>
              <li><a href="#products" class="hover:text-emerald-400 transition">Sản phẩm phân phối</a></li>
              <li><a href="#advantages" class="hover:text-emerald-400 transition">Lợi thế cạnh tranh</a></li>
              <li><a href="#contact" class="hover:text-emerald-400 transition">Liên hệ & Bản đồ</a></li>
            </template>
          </ul>
        </div>

        <!-- Col 3: Hours & Socials (only rendered if verified) -->
        <div>
          <h4 class="font-bold text-white mb-4 text-base">Giờ làm việc & Hỗ trợ</h4>
          <p v-if="contact?.businessHoursWeekday" class="text-sm text-gray-300">
            <i class="fas fa-clock mr-2 text-emerald-400"></i>
            {{ contact.businessHoursWeekday }}
          </p>
          <p v-if="contact?.businessHoursWeekend" class="text-sm text-gray-300 mt-2">
            <i class="fas fa-headset mr-2 text-emerald-400"></i>
            {{ contact.businessHoursWeekend }}
          </p>
          <p v-if="contact?.hotlineDisplay" class="text-sm text-emerald-400 font-bold mt-2">
            <i class="fas fa-phone-alt mr-2"></i>
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
              <i class="fab fa-facebook-f"></i>
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
        <span>© 2025 {{ company?.legalName || 'CÔNG TY TNHH THANH AN BẮC GIANG' }}. All rights reserved.</span>
        <span class="text-gray-300 font-medium">🏗️ Phân phối Thép Hòa Phát & Xi măng Pomihua chính hãng</span>
      </div>
    </div>
  </footer>
</template>
