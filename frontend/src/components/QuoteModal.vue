<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { apiService, parseApiError } from '@/services/api'
import type { ProductResponse } from '@/types/api'

const props = defineProps<{
  isOpen: boolean
  defaultProduct?: string
  products?: ProductResponse[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted'): void
}>()

const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  companyName: '',
  productInterest: '',
  message: '',
  website: '', // Honeypot field
})

const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const modalContainerRef = ref<HTMLElement | null>(null)
const firstInputRef = ref<HTMLInputElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)
let previousActiveElement: HTMLElement | null = null

watch(
  () => props.defaultProduct,
  (val) => {
    if (val) {
      form.productInterest = val
    }
  },
  { immediate: true }
)

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      previousActiveElement = document.activeElement as HTMLElement | null
      errorMessage.value = null
      successMessage.value = null
      fieldErrors.value = {}
      if (props.defaultProduct) {
        form.productInterest = props.defaultProduct
      }
      nextTick(() => {
        firstInputRef.value?.focus()
      })
    } else {
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        nextTick(() => {
          previousActiveElement?.focus()
        })
      }
    }
  }
)

function handleModalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }

  if (e.key === 'Tab' && modalContainerRef.value) {
    const focusable = modalContainerRef.value.querySelectorAll<HTMLElement>(
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
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

function validateClient(): boolean {
  fieldErrors.value = {}
  let valid = true

  if (!form.fullName.trim() || form.fullName.trim().length < 2) {
    fieldErrors.value.fullName = 'Họ và tên tối thiểu 2 ký tự'
    valid = false
  }

  const cleanPhone = form.phone.replace(/[\s.-]/g, '')
  if (!cleanPhone || cleanPhone.length < 8) {
    fieldErrors.value.phone = 'Số điện thoại tối thiểu 8 chữ số'
    valid = false
  }

  if (form.email && form.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      fieldErrors.value.email = 'Địa chỉ email không đúng định dạng'
      valid = false
    }
  }

  if (!form.message.trim() || form.message.trim().length < 5) {
    fieldErrors.value.message = 'Nội dung yêu cầu báo giá tối thiểu 5 ký tự'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validateClient()) {
    return
  }

  submitting.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const res = await apiService.createQuoteRequest({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email?.trim() || null,
      companyName: form.companyName?.trim() || null,
      productInterest: form.productInterest?.trim() || null,
      message: form.message.trim(),
      website: form.website || undefined,
    })

    successMessage.value = `Yêu cầu báo giá #${res.id.slice(0, 8)} đã được ghi nhận thành công.`
    emit('submitted')

    // Reset form fields
    form.fullName = ''
    form.phone = ''
    form.email = ''
    form.companyName = ''
    form.message = ''
    form.website = ''
    if (!props.defaultProduct) {
      form.productInterest = ''
    }

    setTimeout(() => {
      emit('close')
      successMessage.value = null
    }, 1500)
  } catch (err) {
    const apiErr = parseApiError(err)
    errorMessage.value = apiErr.message || 'Không thể gửi yêu cầu báo giá. Vui lòng kiểm tra lại thông tin.'
    if (apiErr.details && apiErr.details.length > 0) {
      for (const d of apiErr.details) {
        fieldErrors.value[d.field] = d.message
      }
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
    @click.self="emit('close')"
  >
    <div
      ref="modalContainerRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
      @keydown="handleModalKeydown"
      class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8 overflow-hidden transform transition-all border border-gray-100"
    >
      <!-- Close button -->
      <button
        ref="closeBtnRef"
        type="button"
        @click="emit('close')"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl p-1 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-[#1e5a6b]"
        aria-label="Đóng cửa sổ"
      >
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>

      <!-- Modal Header -->
      <div class="mb-6">
        <span class="text-[#1e5a6b] text-xs font-bold uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
          Tư vấn & Báo giá
        </span>
        <h3 id="quote-modal-title" class="text-2xl font-bold text-gray-800 mt-2">
          Yêu cầu báo giá trực tuyến
        </h3>
        <p class="text-gray-600 text-sm mt-1">
          Điền thông tin bên dưới để nhận bảng giá vật tư ưu đãi nhất.
        </p>
      </div>

      <!-- Success feedback -->
      <div
        v-if="successMessage"
        role="alert"
        aria-live="polite"
        data-testid="quote-success-alert"
        class="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3"
      >
        <i class="fas fa-check-circle text-emerald-600 text-xl mt-0.5" aria-hidden="true"></i>
        <div>
          <strong class="font-bold block">Gửi yêu cầu thành công!</strong>
          <span>{{ successMessage }}</span>
          <button
            type="button"
            @click="emit('close')"
            class="mt-3 block text-xs font-bold text-emerald-700 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-700 rounded"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>

      <!-- Global Error feedback -->
      <div
        v-if="errorMessage"
        role="alert"
        aria-live="assertive"
        class="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2.5"
      >
        <i class="fas fa-exclamation-triangle text-red-500 text-lg mt-0.5" aria-hidden="true"></i>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Quote Request Form -->
      <form v-if="!successMessage" @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Honeypot (hidden from real users) -->
        <input
          v-model="form.website"
          type="text"
          name="website"
          class="hidden"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />

        <!-- Full Name -->
        <div>
          <label for="quote-fullname" class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Họ và tên <span class="text-red-500">*</span>
          </label>
          <input
            id="quote-fullname"
            name="fullName"
            ref="firstInputRef"
            v-model="form.fullName"
            type="text"
            required
            placeholder="Ví dụ: Nguyễn Văn A"
            class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
            :class="{ 'border-red-500 bg-red-50/50': fieldErrors.fullName }"
            :aria-invalid="!!fieldErrors.fullName"
            :aria-describedby="fieldErrors.fullName ? 'quote-error-fullName' : undefined"
          />
          <p v-if="fieldErrors.fullName" id="quote-error-fullName" class="text-xs text-red-600 mt-1">
            {{ fieldErrors.fullName }}
          </p>
        </div>

        <!-- Phone & Email Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="quote-phone" class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Số điện thoại <span class="text-red-500">*</span>
            </label>
            <input
              id="quote-phone"
              v-model="form.phone"
              type="tel"
              required
              placeholder="0393.xxx.xxx"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
              :class="{ 'border-red-500 bg-red-50/50': fieldErrors.phone }"
              :aria-invalid="!!fieldErrors.phone"
              :aria-describedby="fieldErrors.phone ? 'quote-error-phone' : undefined"
            />
            <p v-if="fieldErrors.phone" id="quote-error-phone" class="text-xs text-red-600 mt-1">
              {{ fieldErrors.phone }}
            </p>
          </div>

          <div>
            <label for="quote-email" class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Email (nếu có)
            </label>
            <input
              id="quote-email"
              v-model="form.email"
              type="email"
              placeholder="email@vidu.com"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
              :class="{ 'border-red-500 bg-red-50/50': fieldErrors.email }"
              :aria-invalid="!!fieldErrors.email"
              :aria-describedby="fieldErrors.email ? 'quote-error-email' : undefined"
            />
            <p v-if="fieldErrors.email" id="quote-error-email" class="text-xs text-red-600 mt-1">
              {{ fieldErrors.email }}
            </p>
          </div>
        </div>

        <!-- Company Name & Product Interest Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="quote-company-name" class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Tên công ty / Đơn vị
            </label>
            <input
              id="quote-company-name"
              v-model="form.companyName"
              type="text"
              placeholder="Ví dụ: Công ty Xây dựng ABC"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
            />
          </div>

          <div>
            <label for="quote-product-interest" class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Sản phẩm quan tâm
            </label>
            <select
              id="quote-product-interest"
              v-model="form.productInterest"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 bg-white"
            >
              <option value="">-- Chọn sản phẩm --</option>
              <option
                v-for="p in products"
                :key="p.id"
                :value="p.name"
              >
                {{ p.name }}
              </option>
              <option value="Khác">Khác / Nhiều sản phẩm</option>
            </select>
          </div>
        </div>

        <!-- Message / Quantity / Note -->
        <div>
          <label for="quote-message" class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Nội dung yêu cầu / Số lượng dự kiến <span class="text-red-500">*</span>
          </label>
          <textarea
            id="quote-message"
            v-model="form.message"
            rows="3"
            required
            placeholder="Ví dụ: Xin báo giá số lượng vật tư giao tại công trình..."
            class="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
            :class="{ 'border-red-500 bg-red-50/50': fieldErrors.message }"
            :aria-invalid="!!fieldErrors.message"
            :aria-describedby="fieldErrors.message ? 'quote-error-message' : undefined"
          ></textarea>
          <p v-if="fieldErrors.message" id="quote-error-message" class="text-xs text-red-600 mt-1">
            {{ fieldErrors.message }}
          </p>
        </div>

        <!-- Submit Button -->
        <div class="pt-2 flex justify-end gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-[#1e5a6b]"
          >
            Hủy
          </button>
          
          <button
            type="submit"
            :disabled="submitting"
            class="btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#1e5a6b]"
          >
            <i v-if="submitting" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <span>{{ submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu báo giá' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
