<script setup>
import { onMounted, ref } from 'vue'
import { isInset } from '@ksware/micro-lib-web-temp'

import MenuTool from './component/MenuTool.vue'
import { useRouterCacheStore } from './store/routerCache'

const useStore = useRouterCacheStore()
// 当前是否为开发模式
const isDev = import.meta.env.DEV
// 初始化keepAlive 的REF对象
const keepAliveRef = ref('')

onMounted(() => {
  useStore.keepAliveRef = keepAliveRef.value
})
</script>

<template>
  <router-view v-slot="{ route, Component }">
    <keep-alive ref="keepAliveRef">
      <component :is="Component" :key="route.path" />
    </keep-alive>
  </router-view>
  <!-- 开发模式显示的路由切换工具 -->
  <MenuTool v-if="!isInset && isDev"></MenuTool>
</template>

<style lang="scss"></style>
