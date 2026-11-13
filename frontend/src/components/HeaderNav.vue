<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import type { SiteResponse, ContactResponse } from '@/types/api'

defineProps<{
  site: SiteResponse | null
  contact: ContactResponse | null
}>()

const emit = defineEmits<{
  (e: 'openQuote'): void
}>()

const mobileMenuOpen = ref(false)
const toggleBtnRef = ref<HTMLButtonElement | null>(null)
const drawerRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)

function openMobileMenu() {
  mobileMenuOpen.value = true
  nextTick(() => {
    closeBtnRef.value?.focus()
  })
}

function closeMobileMenu() {
  if (!mobileMenuOpen.value) return
  mobileMenuOpen.value = false
  nextTick(() => {
    toggleBtnRef.value?.focus()
  })
}

function toggleMobileMenu() {
  if (mobileMenuOpen.value) {
    closeMobileMenu()
  } else {
    openMobileMenu()
  }
}

function handleDrawerKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeMobileMenu()
    return
  }

  if (e.key === 'Tab' && drawerRef.value) {
    const focusable = drawerRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === last) {
        first.focus()
        e.preventDefault()
      }
    }
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && mobileMenuOpen.value) {
    closeMobileMenu()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-[#B45309] shadow-sm transition-all">
    <div class="container mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
      <!-- Logo & Company Brand -->
      <a href="#home" class="flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-[#0F2438] rounded-lg p-1">
        <i class="fas fa-hard-hat text-2xl md:text-3xl text-[#0F2438]" aria-hidden="true"></i>
        <div class="leading-tight">
          <h1 class="font-extrabold text-base md:text-xl tracking-tight text-[#0F2438]">
            {{ site?.brandName || '' }}
          </h1>
          <p v-if="site?.tagline" class="text-[10px] md:text-xs font-bold text-[#B45309] tracking-wider uppercase">
            {{ site.tagline }}
          </p>
        </div>
      </a>

      <!-- Desktop Navigation (hidden on mobile, strictly driven by site.navItems) -->
      <nav aria-label="Điều hướng chính" class="hidden md:flex items-center space-x-7 font-semibold text-slate-700">
        <template v-if="site?.navItems && site.navItems.length > 0">
          <a
            v-for="(item, idx) in site.navItems"
            :key="idx"
            :href="item.href"
            class="hover:text-[#0F2438] transition focus:outline-none focus:ring-2 focus:ring-[#0F2438] rounded px-1"
          >
            {{ item.label }}
          </a>
        </template>
        
        <button
          type="button"
          @click="emit('openQuote')"
          class="btn-primary text-white px-4 py-2 rounded-md text-sm font-bold shadow hover:shadow-md transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
        >
          <i class="fas fa-file-invoice-dollar" aria-hidden="true"></i> Nhận báo giá
        </button>
      </nav>

      <!-- Header Actions: Single responsive hotline + Mobile Menu Toggle -->
      <div class="flex items-center gap-2 md:gap-3">
        <!-- Direct Hotline Button (Visible directly on mobile viewport 390 and desktop on first paint) -->
        <a
          v-if="contact?.hotlineDisplay"
          :href="'tel:' + (contact.hotlineE164 || contact.hotlineDisplay)"
          class="flex items-center gap-1.5 bg-[#0F2438]/5 text-[#0F2438] border border-[#0F2438]/20 hover:bg-[#0F2438] hover:text-white px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-md font-bold text-xs md:text-sm transition focus:outline-none focus:ring-2 focus:ring-[#0F2438]"
          aria-label="Gọi hotline tư vấn"
        >
          <i class="fas fa-phone-alt text-xs md:text-sm text-[#B45309]" aria-hidden="true"></i>
          <span class="tracking-tight">{{ contact.hotlineDisplay }}</span>
        </a>

        <!-- Mobile Menu Toggle Button (hidden on desktop/tablet) -->
        <button
          ref="toggleBtnRef"
          type="button"
          @click="toggleMobileMenu"
          class="md:hidden text-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2438] p-1.5 rounded-md hover:bg-slate-100 border border-slate-200"
          aria-label="Toggle Navigation Menu"
          :aria-expanded="mobileMenuOpen"
          aria-controls="mobile-nav-drawer"
          aria-haspopup="dialog"
        >
          <i :class="mobileMenuOpen ? 'fas fa-times text-[#0F2438]' : 'fas fa-bars'" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Mobile Drawer Backdrop & Menu Teleported to body to escape header backdrop-blur containing block -->
  <Teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-black/50 z-40 md:hidden"
        @click="closeMobileMenu"
        aria-hidden="true"
      ></div>
    </transition>

    <transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="mobileMenuOpen"
        ref="drawerRef"
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-drawer-title"
        @keydown="handleDrawerKeydown"
        class="fixed top-0 right-0 bottom-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl z-50 md:hidden p-6 flex flex-col space-y-5 overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b pb-4">
          <div class="flex items-center space-x-2">
            <i class="fas fa-hard-hat text-2xl text-[#0F2438]" aria-hidden="true"></i>
            <span id="mobile-nav-drawer-title" class="font-bold text-[#0F2438]">{{ site?.brandName || '' }}</span>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            @click="closeMobileMenu"
            class="text-2xl text-slate-600 hover:text-slate-900 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2438]"
            aria-label="Đóng menu"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <nav aria-label="Điều hướng mobile" class="flex flex-col space-y-3 font-semibold text-slate-800 text-base">
          <template v-if="site?.navItems && site.navItems.length > 0">
            <a
              v-for="(item, idx) in site.navItems"
              :key="idx"
              :href="item.href"
              class="py-2 px-3 rounded-md hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-[#0F2438]"
              @click="closeMobileMenu"
            >
              {{ item.label }}
            </a>
          </template>
        </nav>

        <div class="pt-4 border-t space-y-3">
          <button
            type="button"
            @click="emit('openQuote'); closeMobileMenu()"
            class="w-full btn-primary text-white py-2.5 rounded-md font-bold flex items-center justify-center gap-2 shadow focus:outline-none focus:ring-2 focus:ring-[#B45309]"
          >
            <i class="fas fa-file-invoice-dollar" aria-hidden="true"></i> Nhận báo giá nhanh
          </button>
          
          <a
            v-if="contact?.hotlineDisplay"
            :href="'tel:' + (contact.hotlineE164 || contact.hotlineDisplay)"
            class="w-full block text-center border-2 border-[#0F2438] text-[#0F2438] py-2.5 rounded-md font-bold hover:bg-[#0F2438]/5 transition focus:outline-none focus:ring-2 focus:ring-[#0F2438]"
          >
            <i class="fas fa-phone-alt mr-2 text-[#B45309]" aria-hidden="true"></i> {{ contact.hotlineDisplay }}
            <span v-if="contact.hotlineContactName" class="text-xs font-normal">({{ contact.hotlineContactName }})</span>
          </a>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
