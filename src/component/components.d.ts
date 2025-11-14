import AppContainer from './AppContainer.vue'

// 解决使用组件时候无法高亮的问题
declare module 'vue' {
  export interface GlobalComponents {
    AppContainer: typeof AppContainer
  }
}

export {}
