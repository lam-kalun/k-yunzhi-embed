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
const dayChartRef = ref<HTMLDivElement | null>(null)
const totalChartRef = ref<HTMLDivElement | null>(null)
/** 树状图实例 */
let chart: ECharts, dayChart: ECharts, totalChart: ECharts
/** 当前显示界面类型 */
const currentShowType = ref<'month' | 'day'>('month')

onMounted(async () => {
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(chartRef.value!)
  new ResizeObserver(throttle(() => dayChart?.resize(), 50)).observe(dayChartRef.value!)
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

/** 初始化表格数据 */
function initLeftChartData() {
  const { endDate = '' } = props

  const monthList: string[] = [],
    /** 日均 */
    execTimeList: string[] = [],
    /** 月总 */
    execTotalTimeList: string[] = []

  // 统计 月的个数，及月的日均执行时长
  monthList.push(...getDateMonthList(dayjs(endDate).format('YYYY01'), endDate))
  for (let i = 0; i < monthList.length; i++) {
    const month = monthList[i]
    const { dayMap, execTime /* 后台返回的是秒*/ } = monthMap.get(month)!
    if (execTime) {
      const totalExecTime = execTime / 3600
      execTotalTimeList.push(totalExecTime.toFixed(2))

      // 所有流程日均执行时长  注意： 只统计了有执行数据的天数
      const dayCount = Array.from(dayMap.values()).filter((execTime) => execTime > 0).length
      const avgTime = dayCount === 0 ? 0 : totalExecTime / dayCount
      const hours = numFixedExcept0(avgTime)
      execTimeList.push(hours)
    } else {
      execTimeList.push('0')
      execTotalTimeList.push('0')
    }
  }

  initChart(monthList, execTimeList, execTotalTimeList)

  // 初始化日的趋势图数据
  const dayData = [...monthMap.values()]
    .reduce((pre, cur) => [...pre, ...cur.dayMap], [] as [string, number][])
    .sort(([preDay], [curDay]) => (preDay > curDay ? 1 : -1))
  const dayList = dayData.map(([day]) => dayjs(day).format('YYYYMMDD'))

  // 日执行趋势图数据
  const dayExecTimeList = dayData.map(([, execTime]) => numFixedExcept0(execTime / 3600))
  initDayChart(dayList, dayExecTimeList)
}

/** 初始化右边图表数据 */
function initRightChartData() {
  const { endDate = '' } = props

  // 计算上一年的数据
  const lastStartDay = dayjs(endDate).add(-1, 'y').format('YYYY01')
  const lastEndDay = dayjs(endDate).add(-1, 'y').format('YYYYMM')
  const lastMonthList = [...getDateMonthList(lastStartDay, lastEndDay)]
  /** 所有月份总执行时长 */
  let lastYearTotalExecTime = 0
  /** 所有有执行记录的天数 */
  let lastTotalDayCount = 0
  for (let i = 0; i < lastMonthList.length; i++) {
    const month = lastMonthList[i]
    const { dayMap, execTime /* 后台返回的是秒*/ } = monthMap.get(month)!
    if (execTime) {
      lastYearTotalExecTime += execTime / 3600
      lastTotalDayCount += [...dayMap.values()].filter((execTime) => execTime > 0).length
    }
  }

  // 计算当前年份的数据
  const startDay = dayjs(endDate).format('YYYY01')
  const endDay = dayjs(endDate).format('YYYYMM')
  const monthList = [...getDateMonthList(startDay, endDay)]
  /** 所有月份总执行时长 */
  let totalExecTime = 0
  /** 所有有执行记录的天数 */
  let totalDayCount = 0
  for (let i = 0; i < monthList.length; i++) {
    const month = monthList[i]
    const { dayMap, execTime /* 后台返回的是秒*/ } = monthMap.get(month)!
    if (execTime) {
      totalExecTime += execTime / 3600
      totalDayCount += [...dayMap.values()].filter((execTime) => execTime > 0).length
    }
  }

  // 右边累计统计数据
  const monthTextList = [`${lastStartDay}~${lastEndDay}`, `${startDay}~${endDay}`]
  // 执行总时长数据
  const execTotalTimeList = [
    numFixedExcept0(parseFloat(lastYearTotalExecTime.toFixed(2))),
    numFixedExcept0(parseFloat(totalExecTime.toFixed(2))),
  ]

  const dayAvgTimeList = [
    numFixedExcept0(parseFloat((lastYearTotalExecTime / lastTotalDayCount).toFixed(2))),
    numFixedExcept0(parseFloat((totalExecTime / totalDayCount).toFixed(2))),
  ]
  initTotalChart(monthTextList, execTotalTimeList, dayAvgTimeList)
}

/**
 * 月统计初始化柱状图
 *
 * @param monthList 月份列表
 * @param execTimeList 日均执行时长列表
 * @param execTotalTimeList 月执行时长列表
 */
function initChart(monthList: string[], execTimeList: string[], execTotalTimeList: string[]) {
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
      data: ['总日均执行时长', '总执行时长', '单个流程日均执行时长'],
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
        name: '单位:小时',
        axisLine: {
          show: true,
        },
      },
      {
        type: 'value',
        name: '单位:小时',
        data: execTotalTimeList,
        axisLine: {
          show: true,
        },
      },
    ],
    series: [
      {
        name: '总执行时长',
        type: 'bar',
        barMaxWidth: 20,
        yAxisIndex: 0,
        label: { show: true, position: 'top', formatter: '{c}h' },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + 'h'
          },
        },
        data: execTotalTimeList,
      },
      {
        name: '总日均执行时长',
        yAxisIndex: 1,
        type: 'line',
        tooltip: {
          valueFormatter: function (value: string) {
            return value + 'h'
          },
        },
        data: execTimeList,
      },
    ],
  }

  chart.setOption(option)
}

/**
 * 初始胡日统计图表
 *
 * @param dayList 日期列表
 * @param execTimeList 日均执行时长列表
 */
function initDayChart(dayList: string[], execTimeList: string[]) {
  if (!dayChart) {
    dayChart = echarts.init(dayChartRef.value)
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
      height: '50%',
    },
    legend: {
      right: '5%',
      data: ['执行时长'],
    },
    xAxis: [
      {
        type: 'category',
        data: dayList,
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
          rotate: -40,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '单位:小时',
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
        name: '执行时长',
        type: 'line',
        label: { show: true, position: 'top', formatter: '{c}h' },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + 'h'
          },
        },
        data: execTimeList,
      },
    ],
    dataZoom: {
      show: execTimeList.length > 20 ? true : false,
      // 单独滚动条
      type: 'slider',
      // 不过滤数据 - 保证 y 轴数据范围不变
      filterMode: 'none',
      brushSelect: true,
      bottom: 0,
      zoomLock: true,
      height: 20,
      backgroundColor: 'transparent',
      // 选中范围的填充颜色
      fillerColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      dataBackground: {
        lineStyle: {
          color: 'transparent',
        },
        areaStyle: {
          color: 'transparent',
        },
      },
      selectedDataBackground: {
        lineStyle: {
          color: 'transparent',
        },
        areaStyle: {
          color: 'transparent',
        },
      },
      startValue: 0,
      endValue: 10,
      xAxisIndex: [0],
      showDetail: false,

      handleSize: '0%',
      // 移动手柄尺寸高度
      // 测试发现手柄颜色和边框颜色会出现 偏差，所有设置手柄高度为0, 添加边框高度。由边框撑起高度
      // 设置拖动手柄高度为0，只由边框负责高度展示
      moveHandleSize: 0,
      // 不展示拖动手柄图标
      moveHandleIcon: 'none',
      moveHandleStyle: {
        borderColor: '#E4E6E7',
        // 设置边框高度
        borderWidth: 10,
        borderType: 'solid',
        borderCap: 'round',
        // 保证拖动手柄右边框结尾有圆角
        borderJoin: 'round',
      },
      // 拖动高亮时设置
      emphasis: {
        moveHandleStyle: {
          borderColor: '#5d6177',
          borderWidth: 10,
          borderType: 'solid',
          borderCap: 'round',
        },
      },
    },
  }

  dayChart.setOption(option)
}

/**
 * 初始胡月统计的累计图表
 *
 * @param monthList 月份列表
 * @param execTimeList 月执行时长列表
 * @param dayAvgTimeList 日均执行时长列表
 */
function initTotalChart(monthList: string[], execTimeList: string[], dayAvgTimeList: string[]) {
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
      data: ['累计总执行时长', '累计总日均执行时长'],
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
        name: '单位:小时',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#9E9E9E',
          },
        },
      },
      {
        type: 'value',
        name: '单位:小时',
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
        name: '累计总执行时长',
        yAxisIndex: 0,
        type: 'bar',
        barMaxWidth: 30,
        label: { show: true, position: 'top', formatter: '{c}h' },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + 'h'
          },
        },
        data: execTimeList,
      },
      {
        name: '累计总日均执行时长',
        yAxisIndex: 1,
        type: 'line',
        // label: { show: true, position: 'top', formatter: '{c}h' },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + 'h'
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
        <span>RPA流程执行时长</span>
      </div>
      <div class="type-tool-div">
        <el-radio-group v-model="currentShowType" size="default">
          <el-radio-button label="月份" value="month" />
          <el-radio-button label="日期" value="day" />
        </el-radio-group>
      </div>
      <div class="main-div">
        <div v-show="currentShowType === 'month'" ref="chartRef" class="main"></div>
        <div v-show="currentShowType === 'day'" ref="dayChartRef" class="main"></div>
      </div>
    </div>
    <div class="flow-exec-time right">
      <div class="title">
        <div class="icon"><SvgIcon icon-name="icon-ceshi" /></div>
        <span>累计RPA流程执行总时长</span>
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

    .main-div {
      padding-top: 32px;
    }
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
