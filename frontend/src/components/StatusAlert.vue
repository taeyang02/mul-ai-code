<script setup lang="ts">
defineProps<{
  type?: 'error' | 'warning' | 'info'
  title?: string
  message: string
  retryText?: string
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div
    class="rounded-xl p-4 border flex items-start gap-3 shadow-xs my-4"
    :class="{
      'bg-red-50 border-red-200 text-red-800': type === 'error' || !type,
      'bg-amber-50 border-amber-200 text-amber-800': type === 'warning',
      'bg-blue-50 border-blue-200 text-blue-800': type === 'info'
    }"
  >
    <i
      class="text-xl mt-0.5"
      :class="{
        'fas fa-exclamation-circle text-red-600': type === 'error' || !type,
        'fas fa-exclamation-triangle text-amber-600': type === 'warning',
        'fas fa-info-circle text-blue-600': type === 'info'
      }"
    ></i>

    <div class="flex-grow">
      <h4 v-if="title" class="font-bold text-sm">{{ title }}</h4>
      <p class="text-xs md:text-sm mt-0.5">{{ message }}</p>
    </div>

    <button
      v-if="retryText"
      type="button"
      @click="emit('retry')"
      class="text-xs font-bold underline px-2 py-1 rounded hover:bg-black/5 transition"
    >
      {{ retryText }}
    </button>
  </div>
</template>
