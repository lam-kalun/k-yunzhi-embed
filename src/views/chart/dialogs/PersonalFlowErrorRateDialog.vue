<script setup lang="ts">
import { type Ref, nextTick, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import type { EChartsOption, SeriesOption } from 'echarts'
import { ElLoading } from 'element-plus'

import { getDateMonthList } from '@/utils/format'

import type { IFlowInfo } from '../flowStatsTwo.vue'

import ChartItem from './components/ChartItem.vue'

const emit = defineEmits(['update:visible'])
const { flowInfoMap, tableData, endDate, startDate } = defineProps<{
  tableData: any
  flowInfoMap: Map<string, IFlowInfo>
  startDate: string
  endDate: string
}>()

onMounted(() => {
  nextTick(() => {
    initWindow()
  })
})

const containerRef: Ref<HTMLDivElement | undefined> = ref()

/** 取消及点击x事件 */
function cancel() {
  emit('update:visible', false)
}

interface IChartItem {
  title: string
  options: EChartsOption
}
const showUserItemList: IChartItem[] = reactive([])
type IUserMap = Map<string, { execCountList: number[]; succCountList: number[] }>

/** 初始化页面 */
function initWindow() {
  const monthList = getDateMonthList(startDate, endDate)
  const userMap: IUserMap = new Map()
  const table = tableData
  table.first()
  while (!table.eof()) {
    const flowId = table.s('FlowId')
    const flowInfo = flowInfoMap.get(flowId)

    if (flowInfo && getIsFilterState(flowInfo.createTime)) {
      const userName = flowInfo.userName || '其他'
      let obj = userMap.get(userName)
      if (!obj) {
        obj = {
          execCountList: monthList.map(() => 0),
          succCountList: monthList.map(() => 0),
        }
        userMap.set(userName, obj)
      }
      const month = table.s('DBDate').substring(0, 6)
      const index = monthList.indexOf(month)
      if (index !== -1) {
        obj.execCountList[index] = obj.execCountList[index] + table.i('ExecCount')
        obj.succCountList[index] = obj.succCountList[index] + table.i('SuccCount')
      }
    }

    table.next()
  }
  loadData(userMap, monthList)
}

/**
 * 加载数据
 *
 * @param userMap 用户和执行次数的对应关系
 * @param monthList 月份列表
 */
function loadData(userMap: IUserMap, monthList: string[]) {
  const itemList = [...userMap.keys()]
  for (let i = 0; i < itemList.length; i++) {
    const userName = itemList[i]
    const { execCountList, succCountList } = userMap.get(userName)!
    const errorRateList: number[] = []

    for (let j = 0; j < monthList.length; j++) {
      const execCount = execCountList[j]
      const succCount = succCountList[j]
      const errorRate = execCount === 0 ? 0 : ((execCount - succCount) / execCount) * 100
      errorRateList.push(parseFloat((errorRate > 100 ? 100 : errorRate).toFixed(2)))
    }

    const options = getOptions(userName, monthList, errorRateList)
    showUserItemList.push({ title: userName, options })
  }
}

/**
 * 获取 ECharts 配置
 *
 * @param userName 用户名称
 * @param xAxisData x 轴数据
 * @param yAxisData y 轴数据
 * @returns ECharts 配置
 */
function getOptions(userName: string, xAxisData: string[], yAxisData: number[]): EChartsOption {
  return {
    color: ['red'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        // 坐标轴指示器，坐标轴触发有效
        // 默认为直线，可选为：'line' | 'shadow'
        type: 'shadow',
      },
    },
    legend: {
      data: [userName],
      left: 0,
      top: 0,
      formatter() {
        return `[${userName}]`
      },
    },
    grid: {
      top: '70px',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        data: xAxisData,
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          rotate: -30,
        },
      },
    ],
    yAxis: {
      name: '',
      type: 'value',
      show: true,
      splitLine: {
        show: false,
      },
      splitNumber: 1,
      max: 100,
    },
    series: [
      {
        name: userName,
        type: 'line',
        data: yAxisData,
        // barWidth: 20,
        label: {
          show: true,
          position: 'top',
          formatter: ({ value }) => {
            return value + ''
          },
        },
        tooltip: {
          valueFormatter(value: string) {
            return value + ' %'
          },
        },
      } as SeriesOption,
    ],
  }
}

// 过滤数据
const filterValue = ref(0)
const filterItemList = [
  { title: '所有流程', value: 0 },
  { title: '近3月流程上线', value: 1 },
  { title: '不含近3月上线流程', value: 2 },
]

/** 选择事件回调 */
function onChangeFilter() {
  showUserItemList.length = 0
  const loading = ElLoading.service({ target: containerRef.value })
  showUserItemList.length = 0
  nextTick(() => {
    initWindow()
    loading.close()
  })
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
</script>
<template>
  <!-- @close：点击xx时的事件， 我们要手动将visible设置为false -->
  <el-dialog
    top="50px"
    :close-on-click-modal="false"
    :model-value="true"
    title="个人流程执行报错率详细"
    width="90vw"
    @close="cancel"
  >
    <div ref="containerRef" class="container">
      <el-select
        v-model="filterValue"
        size="default"
        placeholder="请选择"
        style="width: 200px"
        @change="onChangeFilter"
      >
        <el-option v-for="item in filterItemList" :key="item.value" :label="item.title" :value="item.value"></el-option>
      </el-select>

      <div v-if="showUserItemList.length === 0" class="empty-div">没有数据</div>
      <div v-else class="infinite-list" style="overflow: auto">
        <template v-for="{ title, options } in showUserItemList" :key="title">
          <ChartItem class="infinite-list-item" :echarts-options="options" :title="title" />
        </template>
      </div>
    </div>
    <!-- 弹窗按钮 -->
    <template #footer>
      <div class="footer-div">
        <k-button @click="cancel">关闭</k-button>
      </div>
    </template>
  </el-dialog>
</template>
<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 20px;

  .infinite-list {
    display: flex;
    flex-flow: row wrap;
    gap: 16px;
    height: calc(100vh - 250px);

    .infinite-list-item {
      width: calc(50% - 20px);
      height: 300px;
    }
  }

  .footer-div {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-div {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
  }
}
</style>
