import { getSessionValue, getToken, initGlobalVariable, isInset, setSessionValue } from '@ksware/micro-lib-web-temp'
import { createMemoryHistory, createRouter } from 'vue-router'

export const routeList = [
  {
    path: '/empty__Page',
    // 修复手动缓存切换问题，勿删
    component: import('@/component/EmptyPage.vue'),
  },

  {
    // 路由地址，同主框架里面增加菜单的路由地址
    path: '/login',
    name: '登录页面',
    // 单个路由组件，即，要显示的网页内容
    component: () => import('@/views/login/loginIndex.vue'),
  },
  {
    // 路由地址，同主框架里面增加菜单的路由地址
    path: '/start',
    name: '启动',
    // 单个路由组件，即，要显示的网页内容
    component: () => import('@/views/start/index.vue'),
  },
  // 模版页面,用户管理页面
  // {
  //   path: '/userMgrJson',
  //   name: '用户管理',
  //   component: () => import('@/views/demo/userMgr_table.vue'),
  // },

  // //模版页面, 执行流程页面
  // {
  //   path: '/execFlowListJson',
  //   name: '执行流程',
  //   component: () => import('@/views/demo/execFlow_form.vue')
  // },
  // {
  //   path: '/uploadFile',
  //   name: '上传文件模版',
  //   component: () => import('@/views/demo/uploadFile.vue')
  // }

  // 模版页面, 今日流程执行列表
  // {
  //   path: '/toDayFlowExec',
  //   name: '今日流程',
  //   component: () => import('@/views/demo/toDayFlowExec.vue')
  // },

  // 模版页面, 动态路由示例
  // {
  //   path: '/toDayFlowExec/:id',
  //   name: '动态路由示例',
  //   isShow: false, //动态路由 在调试列表不应该显示出来
  //   component: () => import('@/views/demo/toDayFlowExec.vue')
  // },

  // 模版页面, 流程执行统计
  // {
  //   path: '/flowStats',
  //   name: '流程图统计',
  //   component: () => import('@/views/chart/flowStats.vue'),
  // },

  // 模版页面, 流程执行统计
  // {
  //   path: '/flowStatsTwo',
  //   name: '流程图统计看板2',
  //   component: () => import('@/views/chart/flowStatsTwo.vue'),
  // },
]

routeList.forEach((item) => {
  !item.meta && (item.meta = {})
  item.meta.keepAlive === undefined && (item.meta.keepAlive = true)
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: routeList,
})

initGlobalVariable('routerInstance', router)

let isFirst = false
// 路由执行前加载缓存数据
router.beforeEach((to, from, next) => {
  // 解决第一次路由跳转问题
  if (!isFirst && isInset) {
    isFirst = true
    return
  }

  // 非微前端模式，检查token， 没有token则去登录页面
  // if (!isInset && !getToken() && to.path !== '/login') {
  //   next('/login')
  //   return
  // }

  // 开发模式生效，刷新浏览器 继续打开之前打开的路由，方便调试
  if (import.meta.env.DEV && !isInset) {
    if (to.fullPath === '/') {
      const lastRoutePath = getSessionValue('last_route_path')
      if (lastRoutePath && lastRoutePath !== '/login') {
        next(lastRoutePath)
        return
      }
    } else {
      setSessionValue('last_route_path', to.fullPath)
    }
  }

  next()
})
export default router
