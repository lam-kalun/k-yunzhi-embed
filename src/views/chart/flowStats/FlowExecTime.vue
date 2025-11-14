<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'
import dayjs from 'dayjs'

import { getDateMonthList } from '@/utils/format'

import AvgAndTotalExecTime from './flowExecTime/AvgAndTotalExecTime.vue'
import OneFlowAvgExecTime from './flowExecTime/OneFlowAvgExecTime.vue'

const props = defineProps<{
  /** 部门ID */
  deptId: string
  /** 父级ID */
  deptPid: string
  /** 查询数据的开始时间 */
  startDate: string
  /** 查询数据的结束时间 */
  endDate: string
}>()

const isLoadFinish = ref(false)
const flowExecTimeRef = ref<HTMLDivElement>()

interface IMapItem {
  execTime: number
  dayMap: Map<string, number>
  flowIdSet: Set<string>
}
// 数据MAP month => {execTime:string, dayMap:[]}
const monthMap = new Map<string, IMapItem>()

onMounted(async () => {
  initWindow()
})

watch(
  () => {
    const { startDate = '', endDate = '', deptId = '' } = props
    return [startDate, endDate, deptId].join()
  },
  () => {
    initWindow()
  },
)

/** 初始化页面 */
async function initWindow() {
  // 查询时间范围
  const { endDate = '', deptId } = props
  const queryStartDate = dayjs(endDate).add(-1, 'y').format('YYYY-01-01')

  callServerFunc(
    'demo',
    'demo_getFlowExecInfo',
    { roleId: deptId, startDate: queryStartDate, endDate },
    { loadingEl: flowExecTimeRef.value, awaitTime: true },
  ).then(({ data }) => {
    monthMap.clear()
    // 初始所有月份对应统计指标的值
    getDateMonthList(queryStartDate, endDate).forEach((month) => {
      const obj = {
        execTime: 0,
        dayMap: new Map(),
        flowIdSet: new Set(),
      } as IMapItem

      monthMap.set(month, obj)
    })

    isLoadFinish.value = false
    const table = new SQLTable((data as any).k_smart_flow_detail_query)
    table.first()
    while (!table.eof()) {
      const date = table.s('DBDate')
      const month = dayjs(date).format('YYYYMM')
      const execTime = table.i('ExecTime')
      const flowId = table.s('FlowID')

      let obj = monthMap.get(month)
      if (!obj) {
        obj = {
          execTime: 0,
          // date => execTime
          dayMap: new Map(),
          flowIdSet: new Set(),
        }
        monthMap.set(month, obj)
      }
      obj.execTime += execTime

      const { dayMap, flowIdSet } = obj
      const dayExecTime = (dayMap.get(date) || 0) + execTime
      dayMap.set(date, dayExecTime)

      flowIdSet.add(flowId)
      table.next()
    }

    nextTick(() => {
      isLoadFinish.value = true
    })
  })
}
</script>
<template>
  <div ref="flowExecTimeRef" class="flow-exec-time-wrapper">
    <!-- 总执行时长、总日均时长 -->
    <AvgAndTotalExecTime
      v-if="isLoadFinish"
      :dept-id="props.deptId"
      :end-date="props.endDate"
      :start-date="props.startDate"
      :month-map="monthMap"
    ></AvgAndTotalExecTime>
    <!-- 单个流程日均执行时长 -->
    <OneFlowAvgExecTime
      v-if="isLoadFinish"
      :dept-id="props.deptId"
      :end-date="props.endDate"
      :start-date="props.startDate"
      :month-map="monthMap"
    ></OneFlowAvgExecTime>
  </div>
</template>
<style lang="scss" scoped>
.flow-exec-time-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  column-gap: 16px;

  width: 100%;

  .left {
    width: calc(100% * 2 / 3);
  }

  .right {
    width: calc(100% * 1 / 3);
  }
}

.flow-exec-time {
  padding: 0 16px 16px;
  background-color: #fff;

  .title {
    display: flex;
    align-items: center;
    height: 44px;
    font-size: 14px;

    .icon {
      margin-right: 4px;
      padding: 3px 5px;
      border-radius: 50%;
      background: rgb(40 130 255 / 8%);
    }
  }

  .type-tool-div {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main {
    width: 100%;
    height: 250px;
  }
}
</style>
