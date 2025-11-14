<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { callServerFunc } from '@ksware/micro-lib-web-temp'
import { ElLoading } from 'element-plus'

import FlowPersonalStats from './components/FlowPersonalStats.vue'
import StatsHeadFilter, { type Row } from './components/StatsHeadFilter.vue'
import DemandOverview from './flowStatsTwo/DemandOverview.vue'
import FlowErrorRate from './flowStatsTwo/FlowErrorRate.vue'
import ProcessExecutionCount from './flowStatsTwo/ProcessExecutionCount.vue'
import useFetchDemandOverview from './hooks/FetchDemandOverview'
import useFetchFlowErrorRate from './hooks/FetchFlowErrorRate'
import useFetchPersonalTotalFlow from './hooks/FetchPersonalTotalFlow'
import PersonalAutoExecRate from './personalFlowStats/PersonalAutoExecRate.vue'
import PersonalExecCount from './personalFlowStats/PersonalExecCount.vue'
import PersonalExecTime from './personalFlowStats/PersonalExecTime.vue'
import PersonalFlowErrorRate from './personalFlowStats/PersonalFlowErrorRate.vue'
// import PersonalFlowExecCount from './personalFlowStats/PersonalFlowExecCount.vue'
import PersonalNewDemand from './personalFlowStats/PersonalNewDemand.vue'
import PersonalOnlineRPA from './personalFlowStats/PersonalOnlineRPA.vue'
import PersonalTotalFlow from './personalFlowStats/PersonalTotalFlow.vue'

const appContainerRef = ref<HTMLDivElement | undefined>(undefined)

/** 全局条件 - 当前选择的日期 */
const currentDate = ref<[string, string]>(['', ''])

/** 当前选中的部门信息 */
const currentDeptRow = ref({} as Row)

/** 先加载顶部过滤器再加载下面的统计图 */
const isLoadFinishHeadFilter = ref(false)
// 流程列表信息是否加载完成
const isLoadFlowListInfo = ref(false)
// 是否所有的准备数据都加载完成了(只需要初始化一次的的数据)， 只有加载完成了才能开始初始化子节点
const isLoadingFinish = computed(() => {
  return isLoadFinishHeadFilter.value && isLoadFlowListInfo.value
})

// 所有流程的信息 Map  flowId => {flowId, userName, createTime}
export interface IFlowInfo {
  flowId: string
  userName: string
  createTime: string
}
const flowInfoMap: Map<string, IFlowInfo> = new Map()

const requestCondition = {
  currentDeptRow,
  currentDate,
}

const isShowFlowExecCountLoading = ref(false)
useFetchFlowErrorRate({
  ...requestCondition,
  isLoading: isShowFlowExecCountLoading,
})

// 需求相关的模块是否正在加载中
const isShowDemandLoading = ref(false)
const { demandOverviewList, userIdAndNameMap } = useFetchDemandOverview({
  ...requestCondition,
  isLoading: isShowDemandLoading,
})

// 是否显示个人总流程的加载框
const isShowPersonalTotalFlowLoading = ref(false)
const personalTotalFlowList = useFetchPersonalTotalFlow({
  ...requestCondition,
  isLoading: isShowPersonalTotalFlowLoading,
})

onMounted(async () => {
  initWindow()
})

/** 初始化页面 */
async function initWindow() {
  await initAllServerFlowInfo()
  initFlowExecInfo()
  initFlowErrorRateInfo()

  // 监听数据
  watch(
    () => {
      return [currentDeptRow.value.id, ...currentDate.value].join('_')
    },
    () => {
      initFlowExecInfo()
      initFlowErrorRateInfo()
    },
  )
}

/** 初始化所有服务器下面的流程信息，要拿到流程的 ScenesName / createTime 属性 */
async function initAllServerFlowInfo() {
  const { data } = (await callServerFunc('demo', 'getAllServerFlowInfo', {}, { isShowLoading: false })) as any
  const rows = JSON.parse(data.rows) as IFlowInfo[]
  rows.forEach((row) => {
    flowInfoMap.set(row.flowId, row)
  })
  // 标记加载完成
  isLoadFlowListInfo.value = true
}

const flowErrorRateRef = ref() as any
const personalFlowErrorRateRef = ref() as any

/** 初始化流程报错率信息 */
async function initFlowErrorRateInfo() {
  const loading1 = ElLoading.service({ target: flowErrorRateRef?.value?.$el })
  const loading2 = ElLoading.service({ target: personalFlowErrorRateRef?.value?.$el })
  const request = {
    startDate: currentDate.value[0],
    endDate: currentDate.value[1],
    roleId: currentDeptRow.value.id,
  }
  callServerFunc('demo', 'demo_getFlowErrorRate', request, { awaitTime: true, isShowLoading: false }).then(
    ({ data }) => {
      flowErrorRateRef?.value?.initWindow(data, loading1)
      personalFlowErrorRateRef?.value?.initWindow(data, flowInfoMap, loading2)
    },
  )
}

const processExecutionCountRef = ref() as any
const personalExecTimeRef = ref() as any
const personalExecCountRef = ref() as any

/** 初始化流程执行信息 */
async function initFlowExecInfo() {
  const request = {
    startDate: currentDate.value[0],
    endDate: currentDate.value[1],
    roleId: currentDeptRow.value.id,
  }
  // 解决一个请求多个模块使用时无法单独加载状态的问题
  const loading1 = ElLoading.service({ target: processExecutionCountRef?.value?.$el })
  const loading2 = ElLoading.service({ target: personalExecTimeRef?.value?.$el })
  const loading3 = ElLoading.service({ target: personalExecCountRef?.value?.$el })

  const { data }: any = await callServerFunc('demo', 'demo_getFlowExecInfo', request, {
    awaitTime: true,
    isShowLoading: false,
  })

  // 更新子组件图表
  processExecutionCountRef.value?.initWindow(data.k_smart_flow_detail_query, loading1)
  personalExecTimeRef.value?.initWindow(data.k_smart_flow_detail_query, loading2, flowInfoMap)
  personalExecCountRef.value?.initWindow(data.k_smart_flow_detail_query, loading3, flowInfoMap)
}
</script>
<template>
  <AppContainer ref="appContainerRef" v-loading="!isLoadingFinish" class="app-container">
    <StatsHeadFilter
      v-model="currentDeptRow"
      v-model:current-date="currentDate"
      @load-finish="
        () => {
          isLoadFinishHeadFilter = true
        }
      "
    />
    <div class="main-container">
      <FlowPersonalStats
        :dept-id="currentDeptRow.id"
        :dept-pid="currentDeptRow.pid"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
      />
      <ProcessExecutionCount ref="processExecutionCountRef" />

      <FlowErrorRate ref="flowErrorRateRef" :current-date="currentDate" />
      <DemandOverview
        ref="demandOverviewRef"
        v-loading="isShowDemandLoading"
        :current-date="currentDate"
        :data="demandOverviewList"
        :user-id-and-name-map="userIdAndNameMap"
      />
      <PersonalFlowErrorRate ref="personalFlowErrorRateRef" :start-date="currentDate[0]" :end-date="currentDate[1]" />
      <PersonalNewDemand
        v-loading="isShowDemandLoading"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
        :dept-id="currentDeptRow.id"
        :data="demandOverviewList"
      />
      <PersonalOnlineRPA
        v-loading="isShowDemandLoading"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
        :dept-id="currentDeptRow.id"
        :data="demandOverviewList"
      />
      <!-- 旧的计算方式 -->
      <!-- <PersonalFlowExecCount v-loading="isShowFlowExecCountLoading" :data="flowErrorRateList" /> -->
      <PersonalExecCount
        ref="personalExecCountRef"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
      ></PersonalExecCount>
      <PersonalExecTime
        ref="personalExecTimeRef"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
      ></PersonalExecTime>

      <PersonalTotalFlow
        v-loading="isShowPersonalTotalFlowLoading"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
        :data="personalTotalFlowList"
      />

      <PersonalAutoExecRate
        :flow-info-map="flowInfoMap"
        :dept-id="currentDeptRow.id"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
      />
    </div>
  </AppContainer>
</template>
<style lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #eee;

  .main-container {
    overflow-y: auto;
    height: calc(100% - 50px);

    > div {
      margin-bottom: 16px;
    }
  }
}
</style>
