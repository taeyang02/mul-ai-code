<script setup lang="ts">
import { ref } from 'vue'
import type { SiteResponse, ContactResponse } from '@/types/api'

defineProps<{
  site: SiteResponse | null
  contact: ContactResponse | null
}>()

const emit = defineEmits<{
  (e: 'openQuote'): void
}>()

const mobileMenuOpen = ref(false)

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
    <div class="container mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
      <!-- Logo & Company Brand -->
      <a href="#home" class="flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] rounded-lg p-1">
        <i class="fas fa-hard-hat text-3xl text-[#1e5a6b]"></i>
        <div class="leading-tight">
          <h1 class="font-extrabold text-lg md:text-xl tracking-tight text-gray-800">
            {{ site?.brandName || 'THANH AN' }}
          </h1>
          <p v-if="site?.tagline" class="text-[11px] md:text-xs font-semibold text-[#2c7a5e] tracking-wider uppercase">
            {{ site.tagline }}
          </p>
        </div>
      </a>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-7 font-medium text-gray-700">
        <!-- Render nav items dynamically from Site API if available -->
        <template v-if="site?.navItems && site.navItems.length > 0">
          <a
            v-for="(item, idx) in site.navItems"
            :key="idx"
            :href="item.href"
            class="hover:text-[#1e5a6b] transition"
          >
            {{ item.label }}
          </a>
        </template>
        <!-- Default anchor navigation -->
        <template v-else>
          <a href="#home" class="hover:text-[#1e5a6b] transition">Trang chủ</a>
          <a href="#about" class="hover:text-[#1e5a6b] transition">Giới thiệu</a>
          <a href="#products" class="hover:text-[#1e5a6b] transition">Sản phẩm</a>
          <a href="#advantages" class="hover:text-[#1e5a6b] transition">Lợi thế</a>
          <a href="#contact" class="hover:text-[#1e5a6b] transition">Liên hệ</a>
        </template>
        
        <button
          type="button"
          @click="emit('openQuote')"
          class="btn-primary text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:shadow-md transition flex items-center gap-2"
        >
          <i class="fas fa-file-invoice-dollar"></i> Nhận báo giá
        </button>

        <a
          v-if="contact?.hotlineDisplay"
          :href="'tel:' + (contact.hotlineE164 || contact.hotlineDisplay)"
          class="bg-gray-100 text-[#1e5a6b] border border-gray-300 hover:bg-[#1e5a6b] hover:text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          <i class="fas fa-phone-alt"></i> {{ contact.hotlineDisplay }}
        </a>
      </nav>

      <!-- Mobile Menu Toggle Button -->
      <button
        type="button"
        @click="mobileMenuOpen = !mobileMenuOpen"
        class="block md:hidden text-2xl text-gray-700 focus:outline-none p-1 rounded-lg hover:bg-gray-100"
        aria-label="Toggle Navigation Menu"
      >
        <i :class="mobileMenuOpen ? 'fas fa-times text-[#1e5a6b]' : 'fas fa-bars'"></i>
      </button>

      <!-- Mobile Drawer Backdrop & Menu -->
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
        @click="closeMobileMenu"
      ></div>

      <div
        class="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 transform md:hidden p-6 flex flex-col space-y-5 transition-transform duration-300 ease-in-out"
        :class="mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'"
      >
        <div class="flex items-center justify-between border-b pb-4">
          <div class="flex items-center space-x-2">
            <i class="fas fa-hard-hat text-2xl text-[#1e5a6b]"></i>
            <span class="font-bold text-gray-800">{{ site?.brandName || 'Thanh An Bắc Giang' }}</span>
          </div>
          <button
            type="button"
            @click="closeMobileMenu"
            class="text-2xl text-gray-600 hover:text-gray-900 p-1"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <nav class="flex flex-col space-y-3 font-medium text-gray-800 text-base">
          <template v-if="site?.navItems && site.navItems.length > 0">
            <a
              v-for="(item, idx) in site.navItems"
              :key="idx"
              :href="item.href"
              class="py-2 px-3 rounded hover:bg-gray-100 transition"
              @click="closeMobileMenu"
            >
              {{ item.label }}
            </a>
          </template>
          <template v-else>
            <a href="#home" class="py-2 px-3 rounded hover:bg-gray-100 transition" @click="closeMobileMenu">Trang chủ</a>
            <a href="#about" class="py-2 px-3 rounded hover:bg-gray-100 transition" @click="closeMobileMenu">Giới thiệu</a>
            <a href="#products" class="py-2 px-3 rounded hover:bg-gray-100 transition" @click="closeMobileMenu">Sản phẩm</a>
            <a href="#advantages" class="py-2 px-3 rounded hover:bg-gray-100 transition" @click="closeMobileMenu">Lợi thế</a>
            <a href="#contact" class="py-2 px-3 rounded hover:bg-gray-100 transition" @click="closeMobileMenu">Liên hệ</a>
          </template>
        </nav>

        <div class="pt-4 border-t space-y-3">
          <button
            type="button"
            @click="emit('openQuote'); closeMobileMenu()"
            class="w-full btn-primary text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 shadow"
          >
            <i class="fas fa-file-invoice-dollar"></i> Nhận báo giá nhanh
          </button>
          
          <a
            v-if="contact?.hotlineDisplay"
            :href="'tel:' + (contact.hotlineE164 || contact.hotlineDisplay)"
            class="w-full block text-center border border-[#1e5a6b] text-[#1e5a6b] py-2.5 rounded-lg font-semibold hover:bg-[#1e5a6b]/5 transition"
          >
            <i class="fas fa-phone-alt mr-2"></i> {{ contact.hotlineDisplay }}
          </a>
        </div>
      </div>
    </div>
  </header>
</template>
