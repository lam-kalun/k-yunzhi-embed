<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Expand } from '@element-plus/icons-vue'

import router, { routeList } from '@/utils/router'

// 当前选中的path
const activePath = ref('/')
// 是否显示收缩图标
const isShowIconItem = ref(false)
// 是否收缩起来
const isCollapsed = ref(false)
// 所有的路由列表
const options: { name: string; path: string }[] = reactive([])
options.push(
  ...routeList
    .filter((item: any) => !!item.path && item.path !== '/login' && item.isShow !== false)
    .map((item) => {
      return { path: item.path, name: item.name || '' }
    }),
)

// 监听当前路由改变
watch(
  () => router.currentRoute,
  (route: any) => {
    activePath.value = route?.value.path
  },
  { deep: true },
)

/** 手动选择路由 */
function onSelectPath() {
  router.push(activePath.value)
}
</script>
<template>
  <div
    :class="['menu-tool', { 'is-collapsed': isCollapsed }]"
    @mouseenter="isShowIconItem = true"
    @mouseleave="isShowIconItem = false"
  >
    <el-icon v-show="isShowIconItem || isCollapsed" class="icon-item" @click="isCollapsed = !isCollapsed">
      <Expand />
    </el-icon>
    <div class="form-item-div">
      <el-form-item label="当前菜单：">
        <el-select v-model="activePath" :disabled="activePath === '/login'" @change="onSelectPath">
          <el-option
            v-for="item in options"
            :key="item.path"
            :label="`${item.path}__${item.name}`"
            :value="item.path"
          />
        </el-select>
      </el-form-item>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.menu-tool {
  position: absolute;
  top: 0;
  right: 0;

  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;

  padding: 15px;

  .form-item-div {
    overflow: hidden;
    width: 350px;
    transition: width 0.3s;

    :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }

  .icon-item {
    cursor: pointer;

    color: #999;

    animation-name: left-right-animation;
    animation-duration: 1.5s;
    animation-iteration-count: 1;
  }

  &.is-collapsed {
    padding-right: 0;

    .form-item-div {
      width: 0;
    }

    .icon-item {
      transform: rotate(-180deg);
    }
  }
}
@keyframes left-right-animation {
  0% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(3px);
  }

  50% {
    transform: translateX(0);
  }
}
</style>
