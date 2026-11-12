<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { apiService, normalizeApiError } from '@/services/api'
import type { QuoteRequestPayload, Product } from '@/types/api'

const props = defineProps<{
  isOpen: boolean
  defaultProduct?: string
  products?: Product[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted'): void
}>()

const form = reactive<QuoteRequestPayload>({
  fullName: '',
  phone: '',
  email: '',
  productName: '',
  quantity: '',
  note: '',
})

const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

watch(
  () => props.defaultProduct,
  (val) => {
    if (val) {
      form.productName = val
    }
  },
  { immediate: true }
)

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      errorMessage.value = null
      successMessage.value = null
      fieldErrors.value = {}
      if (props.defaultProduct) {
        form.productName = props.defaultProduct
      }
    }
  }
)

function validateClient(): boolean {
  fieldErrors.value = {}
  let valid = true

  if (!form.fullName.trim()) {
    fieldErrors.value.fullName = 'Vui lòng nhập họ và tên của bạn'
    valid = false
  }

  const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/
  const cleanPhone = form.phone.replace(/[\s.-]/g, '')
  if (!cleanPhone) {
    fieldErrors.value.phone = 'Vui lòng cung cấp số điện thoại liên hệ'
    valid = false
  } else if (!phoneRegex.test(cleanPhone)) {
    fieldErrors.value.phone = 'Số điện thoại không hợp lệ (ví dụ: 0393284994)'
    valid = false
  }

  if (form.email && form.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      fieldErrors.value.email = 'Địa chỉ email không đúng định dạng'
      valid = false
    }
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
    const res = await apiService.submitQuoteRequest({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email?.trim() || undefined,
      productName: form.productName?.trim() || undefined,
      quantity: form.quantity?.trim() || undefined,
      note: form.note?.trim() || undefined,
    })

    successMessage.value = res.message || 'Yêu cầu báo giá của bạn đã được gửi thành công! Đội ngũ tư vấn Thanh An sẽ liên hệ lại trong thời gian sớm nhất.'
    emit('submitted')

    // Reset form after 2 seconds
    setTimeout(() => {
      form.fullName = ''
      form.phone = ''
      form.email = ''
      form.quantity = ''
      form.note = ''
      if (!props.defaultProduct) {
        form.productName = ''
      }
    }, 1500)
  } catch (err) {
    const apiErr = normalizeApiError(err)
    errorMessage.value = apiErr.message || 'Không thể gửi yêu cầu báo giá. Vui lòng thử lại.'
    if (apiErr.errors && apiErr.errors.length) {
      for (const fe of apiErr.errors) {
        fieldErrors.value[fe.field] = fe.message
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
    <div class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8 overflow-hidden transform transition-all border border-gray-100">
      <!-- Close button -->
      <button
        type="button"
        @click="emit('close')"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl p-1 rounded-lg hover:bg-gray-100 transition"
        aria-label="Đóng cửa sổ"
      >
        <i class="fas fa-times"></i>
      </button>

      <!-- Modal Header -->
      <div class="mb-6">
        <span class="text-[#1e5a6b] text-xs font-bold uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
          Tư vấn & Báo giá
        </span>
        <h3 class="text-2xl font-bold text-gray-800 mt-2">
          Yêu cầu báo giá trực tuyến
        </h3>
        <p class="text-gray-600 text-sm mt-1">
          Điền thông tin bên dưới để nhận bảng giá Thép & Xi măng ưu đãi nhất từ Thanh An Bắc Giang.
        </p>
      </div>

      <!-- Success feedback -->
      <div
        v-if="successMessage"
        class="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3"
      >
        <i class="fas fa-check-circle text-emerald-600 text-xl mt-0.5"></i>
        <div>
          <strong class="font-bold block">Gửi yêu cầu thành công!</strong>
          <span>{{ successMessage }}</span>
          <button
            type="button"
            @click="emit('close')"
            class="mt-3 block text-xs font-bold text-emerald-700 hover:underline"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>

      <!-- Global Error feedback -->
      <div
        v-if="errorMessage"
        class="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2.5"
      >
        <i class="fas fa-exclamation-triangle text-red-500 text-lg mt-0.5"></i>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Quote Request Form -->
      <form v-if="!successMessage" @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Full Name -->
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Họ và tên <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.fullName"
            type="text"
            required
            placeholder="Ví dụ: Nguyễn Văn A"
            class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
            :class="{ 'border-red-500 bg-red-50/50': fieldErrors.fullName }"
          />
          <p v-if="fieldErrors.fullName" class="text-xs text-red-600 mt-1">
            {{ fieldErrors.fullName }}
          </p>
        </div>

        <!-- Phone & Email Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Số điện thoại <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.phone"
              type="tel"
              required
              placeholder="0393.xxx.xxx"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
              :class="{ 'border-red-500 bg-red-50/50': fieldErrors.phone }"
            />
            <p v-if="fieldErrors.phone" class="text-xs text-red-600 mt-1">
              {{ fieldErrors.phone }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Email (nếu có)
            </label>
            <input
              v-model="form.email"
              type="email"
              placeholder="email@vidu.com"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
              :class="{ 'border-red-500 bg-red-50/50': fieldErrors.email }"
            />
            <p v-if="fieldErrors.email" class="text-xs text-red-600 mt-1">
              {{ fieldErrors.email }}
            </p>
          </div>
        </div>

        <!-- Product & Quantity Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Sản phẩm quan tâm
            </label>
            <select
              v-model="form.productName"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 bg-white"
            >
              <option value="">-- Chọn sản phẩm --</option>
              <option value="Thép Hòa Phát">Thép Hòa Phát</option>
              <option value="Xi măng Pomihua">Xi măng Pomihua</option>
              <option value="Cả hai loại VLXD">Cả Thép & Xi măng</option>
              <option value="Vật liệu xây dựng khác">Vật liệu xây dựng khác</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Khối lượng ước tính
            </label>
            <input
              v-model="form.quantity"
              type="text"
              placeholder="Ví dụ: 30 tấn, 500 bao..."
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        <!-- Note / Project Address -->
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Ghi chú / Địa chỉ công trình
          </label>
          <textarea
            v-model="form.note"
            rows="3"
            placeholder="Địa chỉ giao hàng, tiến độ công trình hoặc yêu cầu riêng..."
            class="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e5a6b] text-sm text-gray-800 placeholder-gray-400"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="pt-2 flex justify-end gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition"
          >
            Hủy
          </button>
          
          <button
            type="submit"
            :disabled="submitting"
            class="btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
            <span>{{ submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu báo giá' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
