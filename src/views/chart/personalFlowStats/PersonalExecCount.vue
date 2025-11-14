<script setup lang="ts">
import { reactive, ref } from 'vue'
import { SQLTable } from '@ksware/micro-lib-web-temp'

import ChartAndTable from '../components/ChartAndTable.vue'
import PersonalFlowExecCountDialog from '../dialogs/PersonalFlowExecCountDialog.vue'
import type { IFlowInfo } from '../flowStatsTwo.vue'

defineProps<{
  startDate: string
  endDate: string
}>()

defineExpose({ initWindow })

const usernameList = reactive([]) as string[]
const execCountList = reactive([]) as number[]

type IFlowInfoMap = Map<string, IFlowInfo>
let currentFlowInfoMap: IFlowInfoMap = new Map()
let currentTableData = [] as any

/**
 * 初始化页面
 *
 * @param tableData 流程详情表格数据
 * @param loading 加载状态
 * @param flowInfoMap 流程 id 和流程信息的对应关系
 */
function initWindow(tableData: any, loading: any, flowInfoMap: IFlowInfoMap) {
  currentTableData = tableData
  currentFlowInfoMap = flowInfoMap
  usernameList.length = 0
  execCountList.length = 0
  type IInfoItem = { userName: string; execCount: number }
  const userNameMap: Map<string, IInfoItem> = new Map()

  const table = new SQLTable(tableData)
  table.first()
  while (!table.eof()) {
    const flowId = table.s('FlowID') as string
    const execCount = table.i('ExecCount')
    const userName = flowInfoMap.get(flowId)?.userName || '其他'
    let obj: IInfoItem | undefined = userNameMap.get(userName)
    if (!obj) {
      obj = {
        execCount: 0,
        userName,
      }
      userNameMap.set(userName, obj)
    }
    obj.execCount += execCount

    table.next()
  }
  const itemList = [...userNameMap.values()].sort((a, b) => b.execCount - a.execCount)

  itemList.forEach((item) => {
    usernameList.push(item.userName)
    execCountList.push(item.execCount)
  })

  loading.close()
}

const isShowDetail = ref(false)
/** 查看详情 */
function showDetail() {
  isShowDetail.value = true
}
</script>

<template>
  <div>
    <ChartAndTable
      title="个人流程执行次数"
      :x-axis-data="execCountList"
      :is-show-detail="true"
      :y-axis-data="usernameList"
      item-name="执行次数"
      unit="次"
      x-axis-name="次"
      @look-detail="showDetail()"
    />

    <PersonalFlowExecCountDialog
      v-if="isShowDetail"
      v-model:visible="isShowDetail"
      :start-date="startDate"
      :end-date="endDate"
      :flow-info-map="currentFlowInfoMap"
      :table-data="currentTableData"
    />
  </div>
</template>
