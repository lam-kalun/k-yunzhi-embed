<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'

import PersonalAutoExecRateDialog from '@/views/chart/dialogs/PersonalAutoExecRateDialog.vue'
import ChartAndTable from '../components/ChartAndTable.vue'
import type { IFlowInfo } from '../flowStatsTwo.vue'

const props = defineProps<{
  /** 部门ID */
  deptId: string | undefined
  /** 查询数据的开始时间 */
  startDate: string
  /** 查询数据的结束时间 */
  endDate: string
  flowInfoMap: Map<string, IFlowInfo>
}>()

watch(
  () => {
    return [props.startDate, props.endDate, props.deptId].join(',')
  },
  () => {
    initWindow()
  },
)

const userNameList = reactive([]) as string[]
const autoRateList = reactive([]) as string[]
const personalAutoExecRateRef = ref('') as any

let currentTable = null as any

export interface IRowItem {
  DataBaseName: string
  FlowID: string
  iCount: number
}
let currentRows = [] as IRowItem[]

/** 初始化页面 */
async function initWindow() {
  const { deptId, startDate, endDate, flowInfoMap } = props

  const { data }: any = await callServerFunc(
    'demo',
    'demo_getPersonalFlowAutoData',
    { roleId: deptId, startDate, endDate },
    { loadingEl: personalAutoExecRateRef.value, awaitTime: true },
  )

  userNameList.length = 0
  autoRateList.length = 0

  const flowIdSet = new Set()
  /** 流程ID => {execCount, autoCount} */
  const userNameMap = new Map()
  const table = new SQLTable(data.k_flow_exec_count)
  currentTable = table
  table.first()
  while (!table.eof()) {
    const count = table.i('ExecCount')
    const flowId = table.s('FlowID')
    flowIdSet.add(flowId)

    const userName = flowInfoMap.get(flowId)?.userName || '其他'
    let obj = userNameMap.get(userName)
    if (!obj) {
      obj = { execCount: 0, autoCount: 0, userName }
      userNameMap.set(userName, obj)
    }
    obj.execCount += count
    table.next()
  }

  // 自动率数据
  const rows = JSON.parse(data.rows) as IRowItem[]
  // 保存当前ROWs
  currentRows = rows

  for (let i = 0; i < rows.length; i++) {
    const flowId = rows[i].FlowID

    if (flowIdSet.has(flowId)) {
      const flowInfo = flowInfoMap.get(flowId)
      const userName = flowInfo?.userName || '其他'
      const obj = userNameMap.get(userName)

      if (obj) {
        const count = rows[i].iCount
        obj.autoCount += count
      }
    }
  }

  const arrList = [...userNameMap.values()]
  arrList.forEach((item) => {
    const { autoCount, execCount } = item
    if (execCount === 0 || autoCount === 0) {
      item.autoRate = 0
    } else {
      item.autoRate = parseFloat(((autoCount / execCount) * 100).toFixed(2))
    }
  })

  // 降序排序
  arrList.sort((a, b) => {
    return b.autoRate - a.autoRate
  })

  for (let i = 0; i < arrList.length; i++) {
    const { userName, autoRate } = arrList[i]
    userNameList.push(userName)
    autoRateList.push(autoRate)
  }
}

const isShowDetail = ref(false)

/** 显示详情 */
function showDetail() {
  isShowDetail.value = true
}
</script>

<template>
  <div ref="personalAutoExecRateRef" class="personal-auto-exec-rate">
    <ChartAndTable
      title="个人自动执行率"
      :x-axis-data="autoRateList"
      :y-axis-data="userNameList"
      item-name="自动执行率"
      unit="%"
      x-axis-name="%"
      :is-show-detail="true"
      @look-detail="showDetail()"
    />
    <PersonalAutoExecRateDialog
      v-if="isShowDetail"
      v-model:visible="isShowDetail"
      :start-date="startDate"
      :end-date="endDate"
      :flow-info-map="flowInfoMap"
      :rows-data="currentRows"
      :table-data="currentTable"
    />
  </div>
</template>
