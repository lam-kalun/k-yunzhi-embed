<script setup lang="ts">
import { isInset } from '@ksware/micro-lib-web-temp'
</script>
<template>
  <div :class="['container-div', { 'no-inset': !isInset }]">
    <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
.container-div {
  overflow-y: auto;
  box-sizing: border-box;
  height: 100%;
  padding: 12px;

  &.no-inset {
    height: 100vh;
  }
}
</style>
