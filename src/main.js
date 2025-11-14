import { createApp } from 'vue'
import KswUx from '@ksware/ksw-ux'
import { insetInit, isInset } from '@ksware/micro-lib-web-temp'
import { ClickOutside } from 'element-plus'
import { KswIcon } from 'ksw-vue-icon'
import { createPinia } from 'pinia'

import AppContainer from '@/component/AppContainer.vue'
import FontIcon from '@/component/icon/FontIcon.vue'
import SvgIcon from '@/component/icon/SvgIcon.vue'
import router from '@/utils/router'

import App from './App.vue'

import './styles/style.scss'
import '@ksware/ksw-ux/kingsware-ui/style.css'
import '@/utils/getToken'

const app = createApp(App)
app.directive('ClickOutside', ClickOutside)
app.use(KswUx).use(KswIcon).use(router).use(createPinia())
app.component('SvgIcon', SvgIcon)
app.component('FontIcon', FontIcon)
app.component('AppContainer', AppContainer)

// 判断是否为嵌入模式
if (isInset) {
  // 初始化嵌入功能
  insetInit(app)
} else {
  // 不是嵌入模式
  app.mount('#app')
}
