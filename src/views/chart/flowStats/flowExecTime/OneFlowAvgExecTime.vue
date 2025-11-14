<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { throttle } from 'lodash'

import { getDateMonthList, numFixedExcept0 } from '@/utils/format'

interface IItem {
  execTime: number
  dayMap: Map<string, number>
  flowIdSet: Set<string>
}

const props = defineProps<{
  /** 部门ID */
  deptId: string
  /** 查询数据的开始时间 */
  startDate: string
  /** 查询数据的结束时间 */
  endDate: string
  monthMap: Map<string, IItem>
}>()

const { monthMap, startDate, endDate, deptId } = props

const avgAndTotalExecTime = ref<HTMLDivElement>()

const chartRef = ref<HTMLDivElement | null>(null)
const totalChartRef = ref<HTMLDivElement | null>(null)
/** 树状图实例 */
let chart: ECharts, totalChart: ECharts

onMounted(async () => {
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(chartRef.value!)
  new ResizeObserver(throttle(() => totalChart?.resize(), 50)).observe(totalChartRef.value!)
  initWindow()
})

watch(
  () => [startDate, endDate, deptId].join(),
  () => {
    initWindow()
  },
)

/** 初始化页面 */
async function initWindow() {
  initLeftChartData()
  initRightChartData()
}

/** 初始化左边图表数据 */
function initLeftChartData() {
  const { endDate = '' } = props

  const monthList: string[] = [],
    /** 日均 */
    execTimeList: string[] = []

  // 统计 月的个数，及月的日均执行时长
  monthList.push(...getDateMonthList(dayjs(endDate).format('YYYY01'), endDate))
  for (let i = 0; i < monthList.length; i++) {
    const month = monthList[i]
    const { dayMap, execTime /* 后台返回的是秒*/, flowIdSet } = monthMap.get(month)!
    if (execTime) {
      const totalExecTime = execTime / 60

      // 所有流程日均执行时长  注意： 只统计了有执行数据的天数
      const dayCount = [...dayMap.values()].filter((execTime) => execTime > 0).length
      const avgTime = dayCount === 0 ? 0 : totalExecTime / dayCount / flowIdSet.size
      const hours = numFixedExcept0(avgTime)
      execTimeList.push(hours)
    } else {
      execTimeList.push('0')
    }
  }
  initChart(monthList, execTimeList)
}

/** 初始化右边图表数据 */
function initRightChartData() {
  const { endDate = '' } = props

  // 计算上一年的数据
  const lastStartDay = dayjs(endDate).add(-1, 'y').format('YYYY01')
  const lastEndDay = dayjs(endDate).add(-1, 'y').format('YYYYMM')
  const lastMonthList = [...getDateMonthList(lastStartDay, lastEndDay)]
  /** 所有月份总执行时长 */
  let lastTotalAvgExecTime = 0
  let lastAllDayCount = 0
  let lastAllFlowIdSet = new Set()

  for (let i = 0; i < lastMonthList.length; i++) {
    const month = lastMonthList[i]
    const { dayMap, execTime /* 后台返回的是秒*/, flowIdSet } = monthMap.get(month)!
    if (execTime) {
      const dayCount = [...dayMap.values()].filter((execTime) => execTime > 0).length
      lastAllDayCount += dayCount
      lastAllFlowIdSet = new Set([...lastAllFlowIdSet, ...flowIdSet])
      lastTotalAvgExecTime += execTime
    }
  }

  // 计算当前年份的数据
  const startDay = dayjs(endDate).format('YYYY01')
  const endDay = dayjs(endDate).format('YYYYMM')
  const monthList = [...getDateMonthList(startDay, endDay)]
  /** 所有月份总执行时长 */
  let totalAvgExecTime = 0
  let allDayCount = 0
  let allFlowIdSet = new Set()
  for (let i = 0; i < monthList.length; i++) {
    const month = monthList[i]
    const { dayMap, execTime /* 后台返回的是秒*/, flowIdSet } = monthMap.get(month)!
    if (execTime) {
      const dayCount = [...dayMap.values()].filter((execTime) => execTime > 0).length
      allDayCount += dayCount
      allFlowIdSet = new Set([...allFlowIdSet, ...flowIdSet])
      totalAvgExecTime += execTime
      //   totalAvgExecTime += dayCount === 0 ? 0 : execTime / dayCount / 3600 / flowIdSet.size
    }
  }

  // 右边累计统计数据
  const monthTextList = [`${lastStartDay}~${lastEndDay}`, `${startDay}~${endDay}`]

  //   const dayAvgTimeList = [
  //     numFixedExcept0(parseFloat(lastTotalAvgExecTime.toFixed(2))),
  //     numFixedExcept0(parseFloat(totalAvgExecTime.toFixed(2)))
  //   ]
  const dayAvgTimeList = [
    numFixedExcept0(parseFloat((lastTotalAvgExecTime / lastAllDayCount / lastAllFlowIdSet.size / 60).toFixed(2))),
    numFixedExcept0(parseFloat((totalAvgExecTime / allDayCount / allFlowIdSet.size / 60).toFixed(2))),
  ]

  initTotalChart(monthTextList, dayAvgTimeList)
}

/**
 * 初始化月统计初始化柱状图
 *
 * @param monthList 月份列表
 * @param execTimeList 执行时长列表
 */
function initChart(monthList: string[], execTimeList: string[]) {
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  const option = {
    color: ['#A8DBFF', '#8F8FF1', '#EF4444'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999',
        },
      },
    },
    grid: {
      left: 'center',
      width: '90%',
      height: '60%',
    },
    legend: {
      right: '5%',
      data: ['单个流程日均执行时长'],
    },
    xAxis: [
      {
        type: 'category',
        data: monthList,
        axisPointer: {
          type: 'shadow',
        },
        axisTick: {
          show: false,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#9E9E9E',
          },
        },
        axisLabel: {
          rotate: -45,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '单位:分钟',
        axisLine: {
          show: true,
        },
      },
    ],
    series: [
      {
        name: '单个流程日均执行时长',
        type: 'line',
        barMaxWidth: 20,
        yAxisIndex: 0,
        label: { show: true, position: 'top', formatter: '{c}分' },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + ' 分'
          },
        },
        data: execTimeList,
      },
    ],
  }

  chart.setOption(option)
}

/**
 * 月统计的累计
 *
 * @param monthList 月份列表
 * @param dayAvgTimeList 日均执行时长列表
 */
function initTotalChart(monthList: string[], dayAvgTimeList: string[]) {
  if (!totalChart) {
    totalChart = echarts.init(totalChartRef.value)
  }

  const option = {
    color: ['#A8DBFF', '#8F8FF1', '#EF4444'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999',
        },
      },
    },
    grid: {
      left: 'center',
      width: '80%',
      height: '60%',
    },
    legend: {
      right: '5%',
      data: ['累计单个流程日均执行时长'],
    },
    xAxis: [
      {
        type: 'category',
        data: monthList,
        axisPointer: {
          type: 'shadow',
        },
        axisTick: {
          show: false,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#9E9E9E',
          },
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '单位:分钟',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#9E9E9E',
          },
        },
      },
    ],
    series: [
      {
        name: '累计单个流程日均执行时长',
        yAxisIndex: 0,
        type: 'line',
        label: { show: true, position: 'top', formatter: '{c}分' },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + ' 分钟'
          },
        },
        data: dayAvgTimeList,
      },
    ],
  }

  totalChart.setOption(option)
}
</script>
<template>
  <div ref="avgAndTotalExecTime" class="avg-and-total-exec-time">
    <div class="flow-exec-time left">
      <div class="title">
        <div class="icon"><SvgIcon icon-name="icon-ceshi" /></div>
        <span>RPA单个流程日均执行时长</span>
      </div>
      <div class="main-div">
        <div ref="chartRef" class="main"></div>
      </div>
    </div>
    <div class="flow-exec-time right">
      <div class="title">
        <div class="icon"><SvgIcon icon-name="icon-ceshi" /></div>
        <span>RPA累计单个流程日均执行时长</span>
      </div>
      <div class="main-div">
        <div ref="totalChartRef" class="main"></div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.avg-and-total-exec-time {
  display: flex;
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
