<script setup lang="ts">
import { reactive, ref } from 'vue'
import { SQLTable } from '@ksware/micro-lib-web-temp'
import dayjs from 'dayjs'

import { numFixedExcept0 } from '@/utils/format'

import PersonalFlowErrorRateDialog from '@/views/chart/dialogs/PersonalFlowErrorRateDialog.vue'
import ChartAndTable from '../components/ChartAndTable.vue'
import type { IFlowInfo } from '../flowStatsTwo.vue'

defineExpose({ initWindow })
defineProps<{
  /** 查询数据的开始时间 */
  startDate: string
  /** 查询数据的结束时间 */
  endDate: string
}>()

const errorRateList = reactive([]) as string[]
const userNameList = reactive([]) as string[]

// 过滤数据
const filterValue = ref(0)
const filterItemList = [
  { title: '所有流程', value: 0 },
  { title: '近3月流程上线', value: 1 },
  { title: '不含近3月上线流程', value: 2 },
]

/** 过滤选项改变的回调 */
function onChangeFilter() {
  initWindow(lastData, lastFlowInfoMap)
}

// 缓存上次使用的数据
let lastData: any
let lastTableData: any
let lastFlowInfoMap: Map<string, IFlowInfo>

/**
 * 初始化页面
 *
 * @param data 流程详情表格数据
 * @param flowInfoMap 流程 id 和流程信息的对应关系
 * @param loading 加载状态
 */
function initWindow(data: any, flowInfoMap: Map<string, IFlowInfo>, loading?: any) {
  lastFlowInfoMap = flowInfoMap
  lastData = data
  errorRateList.length = 0
  userNameList.length = 0

  type IExecItem = { userName: string; execCount: number; succCount: number }
  const userNameMap: Map<string, IExecItem> = new Map()
  const table = new SQLTable((data as any).k_smart_flow_detail_query)
  lastTableData = table
  table.first()
  while (!table.eof()) {
    const flowId = table.s('FlowID')
    const execCount = table.i('ExecCount')
    const succCount = table.i('SuccCount')

    const flowInfo = flowInfoMap.get(flowId)
    // 数据存在， 且满足当前的过滤条件
    if (flowInfo && getIsFilterState(flowInfo.createTime)) {
      const userName = flowInfo.userName || '其他'
      let obj = userNameMap.get(userName)
      if (!obj) {
        obj = {
          execCount: 0,
          succCount: 0,
          userName,
        }
        userNameMap.set(userName, obj)
      }

      obj.execCount += execCount
      obj.succCount += succCount
    }

    table.next()
  }

  const itemList = [...userNameMap.values()].map(({ execCount, succCount, userName }) => {
    const errorRate = (((execCount - succCount) / execCount) * 100).toFixed(2)
    return {
      userName,
      errorRate: numFixedExcept0(parseFloat(errorRate)),
    }
  })

  itemList.sort((a, b) => parseFloat(b.errorRate) - parseFloat(a.errorRate))

  itemList.forEach(({ userName, errorRate }) => {
    userNameList.push(userName)
    errorRateList.push(errorRate)
  })

  loading && loading.close()
}

const month3Time = parseInt(dayjs().add(-3, 'M').format('YYYYMMDD000000'))

/**
 * 判断当前时间是否满足过滤
 *
 * @param dateText 日期文本
 * @returns 是否近3个月内
 */
function getIsFilterState(dateText: string) {
  if (filterValue.value === 0) {
    return true
  }
  const d = parseInt(dateText.replace(/[- :]/g, ''))
  if (filterValue.value === 1) {
    return d > month3Time
  } else {
    return d < month3Time
  }
}

const isShowDetail = ref(false)

/** 显示详情 */
function showDetail() {
  isShowDetail.value = true
}
</script>

<template>
  <div class="personal-flow-error-rate">
    <ChartAndTable
      title="个人流程报错率"
      :x-axis-data="errorRateList"
      :is-show-detail="true"
      :y-axis-data="userNameList"
      series-color="#c92626e3"
      item-name="报错率"
      unit="%"
      x-axis-name="%"
      @look-detail="showDetail()"
    >
      <template #filterTool>
        <el-select
          v-model="filterValue"
          size="default"
          placeholder="请选择"
          style="width: 200px"
          @change="onChangeFilter"
        >
          <el-option
            v-for="item in filterItemList"
            :key="item.value"
            :label="item.title"
            :value="item.value"
          ></el-option>
        </el-select>
      </template>
    </ChartAndTable>
    <PersonalFlowErrorRateDialog
      v-if="isShowDetail"
      v-model:visible="isShowDetail"
      :start-date="startDate"
      :end-date="endDate"
      :flow-info-map="lastFlowInfoMap"
      :table-data="lastTableData"
    />
  </div>
</template>
