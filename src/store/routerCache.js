import { initGlobalVariable } from '@ksware/micro-lib-web-temp'
import { defineStore } from 'pinia'

export const useRouterCacheStore = defineStore('routerCacheStore', {
  state: () => ({
    /** 缓存页面组件如果又滚动条的高度 */
    scrollList: new Map(),
    keepAliveRef: null,
  }),

  actions: {
    remove(name) {
      this.caches = this.caches.filter((item) => item !== name)
    },
    clear() {
      this.caches = []
    },
  },
})

/**
 * 删除缓存的路由
 *
 * @param {string} path 路由
 */
export function delRouteCache(path) {
  const useStore = useRouterCacheStore()
  const ref = useStore.keepAliveRef
  // 必须是先关闭页面再清除缓存，否则卸载钩子函数会不生效
  setTimeout(() => {
    if (ref) {
      ref.$pruneCacheEntry(path)
    }
  }, 500)
}

initGlobalVariable('delRouteCacheFunc', delRouteCache)
