<script setup lang="ts">
import '@/assets/iconfont/iconfont.css'

defineProps({
  /** 图标的名称 */
  iconName: String,
  color: String,
})

const emit = defineEmits(['click'])
</script>
<template>
  <i :class="['iconfont', iconName]" :style="{ color: color }" @click="emit('click')" />
</template>
