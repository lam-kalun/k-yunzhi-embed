<script setup lang="ts">
import '@/assets/iconfont/iconfont.js'

import { computed } from 'vue'

const props = defineProps({
  iconName: {
    type: String,
    required: true,
  },
  className: {
    type: String,
    default: '',
  },
  // 自定义颜色
  color: {
    type: String,
    default: '',
  },
})

// 图标在 iconfont 中的名字
const iconClassName = computed(() => {
  return `#${props.iconName}`
})

// 给图标添加上类名

const svgClass = computed(() => {
  if (props.className) {
    return `svg-icon ${props.className}`
  }

  return 'svg-icon'
})
</script>

<template>
  <svg :class="svgClass" aria-hidden="true">
    <use :xlink:href="iconClassName" :fill="color" />
  </svg>
</template>

<style scoped>
.svg-icon {
  position: relative;
  width: 1rem;
  height: 1rem;
}
</style>
