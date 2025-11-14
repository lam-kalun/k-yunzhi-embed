<script setup lang="ts">
import { reactive, ref } from 'vue'
import { SQLTable } from '@ksware/micro-lib-web-temp'

import { numFixedExcept0 } from '@/utils/format'

import ChartAndTable from '../components/ChartAndTable.vue'
import PersonalFlowExecTimeDialog from '../dialogs/PersonalFlowExecTimeDialog.vue'
import type { IFlowInfo } from '../flowStatsTwo.vue'

defineProps<{
  startDate: string
  endDate: string
}>()

defineExpose({ initWindow })

const usernameList = reactive([]) as string[]
const execTimeList = reactive([]) as string[]

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
  execTimeList.length = 0
  type IInfoItem = { userName: string; execTime: number }
  const userNameMap: Map<string, IInfoItem> = new Map()

  const table = new SQLTable(tableData)
  table.first()
  while (!table.eof()) {
    const flowId = table.s('FlowID') as string
    const flowInfo = flowInfoMap.get(flowId)
    if (flowInfo) {
      // 单位：秒
      const execTime = table.i('ExecTime')
      const userName = flowInfo.userName || '其他'
      let obj: IInfoItem | undefined = userNameMap.get(userName)
      if (!obj) {
        obj = {
          execTime: 0,
          userName,
        }
        userNameMap.set(userName, obj)
      }
      obj.execTime += execTime
    }

    table.next()
  }
  const itemList = [...userNameMap.values()].sort((a, b) => b.execTime - a.execTime)

  itemList.forEach((item) => {
    usernameList.push(item.userName)
    const execTime = numFixedExcept0(parseFloat((item.execTime / 3600).toFixed(2)))
    execTimeList.push(execTime)
  })

  loading.close()
}

const isShowDetail = ref(false)

/** 显示详情 */
function showDetail() {
  isShowDetail.value = true
}
</script>

<template>
  <div>
    <ChartAndTable
      title="个人执行时长"
      :x-axis-data="execTimeList"
      :is-show-detail="true"
      :y-axis-data="usernameList"
      item-name="执行时长"
      unit="小时"
      x-axis-name="小时"
      @look-detail="showDetail()"
    />

    <PersonalFlowExecTimeDialog
      v-if="isShowDetail"
      v-model:visible="isShowDetail"
      :start-date="startDate"
      :end-date="endDate"
      :flow-info-map="currentFlowInfoMap"
      :table-data="currentTableData"
    />
  </div>
</template>
