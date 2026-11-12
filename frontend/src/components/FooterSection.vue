<script setup lang="ts">
import type { CompanyInfo } from '@/types/api'

defineProps<{
  companyInfo: CompanyInfo | null
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
              {{ companyInfo?.name || 'THANH AN BẮC GIANG' }}
            </span>
          </div>
          <p class="text-sm mt-3.5 text-gray-400 leading-relaxed">
            Đồng hành cùng mọi công trình từ dân dụng đến công nghiệp với chất lượng và uy tín hàng đầu tại Bắc Giang và các tỉnh miền Bắc.
          </p>
          <div v-if="companyInfo?.taxCode" class="mt-4 text-xs text-gray-400">
            <span>Mã số thuế: </span>
            <strong class="text-gray-200">{{ companyInfo.taxCode }}</strong>
          </div>
        </div>

        <!-- Col 2: Quick Links -->
        <div>
          <h4 class="font-bold text-white mb-4 text-base">Liên kết nhanh</h4>
          <ul class="space-y-2.5 text-sm">
            <li><a href="#home" class="hover:text-emerald-400 transition">Trang chủ</a></li>
            <li><a href="#about" class="hover:text-emerald-400 transition">Giới thiệu doanh nghiệp</a></li>
            <li><a href="#products" class="hover:text-emerald-400 transition">Sản phẩm phân phối</a></li>
            <li><a href="#advantages" class="hover:text-emerald-400 transition">Lợi thế cạnh tranh</a></li>
            <li><a href="#contact" class="hover:text-emerald-400 transition">Liên hệ & Bản đồ</a></li>
          </ul>
        </div>

        <!-- Col 3: Hours & Socials (only rendered if verified) -->
        <div>
          <h4 class="font-bold text-white mb-4 text-base">Giờ làm việc & Hỗ trợ</h4>
          <p v-if="companyInfo?.workingHours" class="text-sm text-gray-300">
            <i class="fas fa-clock mr-2 text-emerald-400"></i>
            {{ companyInfo.workingHours }}
          </p>
          <p v-if="companyInfo?.weekendHours" class="text-sm text-gray-300 mt-2">
            <i class="fas fa-headset mr-2 text-emerald-400"></i>
            {{ companyInfo.weekendHours }}
          </p>

          <div
            v-if="companyInfo?.socialLinks?.facebook || companyInfo?.socialLinks?.zalo || companyInfo?.socialLinks?.tiktok"
            class="flex items-center gap-4 mt-5 text-xl"
          >
            <a
              v-if="companyInfo.socialLinks.facebook"
              :href="companyInfo.socialLinks.facebook"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1e5a6b] text-gray-300 hover:text-white transition"
              aria-label="Facebook"
            >
              <i class="fab fa-facebook-f"></i>
            </a>
            <a
              v-if="companyInfo.socialLinks.zalo"
              :href="companyInfo.socialLinks.zalo"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1e5a6b] text-gray-300 hover:text-white transition font-bold text-xs"
              aria-label="Zalo"
            >
              Zalo
            </a>
            <a
              v-if="companyInfo.socialLinks.tiktok"
              :href="companyInfo.socialLinks.tiktok"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#1e5a6b] text-gray-300 hover:text-white transition"
              aria-label="TikTok"
            >
              <i class="fab fa-tiktok"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="text-center text-xs text-gray-400 pt-7 flex flex-col md:flex-row justify-between items-center gap-3">
        <span>© 2025 CÔNG TY TNHH THANH AN BẮC GIANG. All rights reserved.</span>
        <span class="text-gray-300 font-medium">🏗️ Phân phối Thép Hòa Phát & Xi măng Pomihua chính hãng</span>
      </div>
    </div>
  </footer>
</template>
