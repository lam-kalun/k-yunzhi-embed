<script setup>
import { onMounted, ref, watch } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import { throttle } from 'lodash-es'

import { numFixedExcept0 } from '@/utils/format'

const props = defineProps({
  /** 部门ID */
  deptId: String,
  /** 父级ID */
  deptPid: String,
  /** 查询数据的开始时间 */
  startDate: String,
  /** 查询数据的结束时间 */
  endDate: String,
})

const flowExecCountRef = ref('')
let chart
const manageIndRef = ref('')
onMounted(() => {
  initWindow()
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(manageIndRef.value)
})

watch(
  () => {
    return props.deptId
  },
  () => {
    initWindow()
  },
)

watch(
  () => {
    return props.startDate + props.endDate
  },
  () => {
    initWindow()
  },
)

// 上一年月份对应的数据
let lastYearMonthMap = null

/** 初始化页面 */
function initWindow() {
  const { startDate, endDate } = props
  callServerFunc(
    'demo',
    'demo_getFowExecCount',
    { startDate, endDate, roleId: props.deptId },
    { awaitTime: true, loadingEl: flowExecCountRef.value },
  ).then(({ data }) => {
    const monthMap = getMontStatisticMap(data.k_flow_exec_count, data.autoRows)
    // 月份排序
    const monthList = Array.from(monthMap.keys()).sort((a, b) => {
      return a > b ? 1 : -1
    })
    const dayAvgList = []
    const errorRateList = []
    const autoRateList = []
    for (let i = 0; i < monthList.length; i++) {
      /** 月份 */
      const month = monthList[i]
      const { avgCount, errorRate, autoRate } = getMontData(month, monthMap)
      dayAvgList.push(avgCount)
      errorRateList.push(errorRate)
      autoRateList.push(autoRate)
    }
    // 初始化图表
    initLineChart(monthList, dayAvgList, errorRateList, autoRateList)

    // 处理环比数据信息
    lastYearMonthMap = getMontStatisticMap(data.k_last_flow_exec_count, data.lastAutoRows)
  })
}

/**
 * 获取当月的数据
 *
 * @param month 月份
 * @param monthMap 月份数据
 * @returns 当月的数据
 */
function getMontData(month, monthMap) {
  // 每月对应的数据  {allCount, success, auto, error}
  const item = monthMap.get(month)
  if (!item) {
    return { allCount: 0, errorRate: 0, autoRate: 0, avgCount: 0 }
  }

  const allCount = parseInt(item.error) + parseInt(item.success)
  /** 报错率 */
  const errorRate = numFixedExcept0((item.error / allCount) * 100 || 0)
  /** 自动率 */
  const autoRate = numFixedExcept0((item.auto / allCount) * 100 || 0)
  const avgCount = numFixedExcept0(allCount / item.daySet.size || 0)
  return { allCount, errorRate, autoRate, avgCount }
}

/**
 * 获取统计数据 Map
 *
 * @param flowTable 流程执行次数数据
 * @param autoRowsJson 自动执行率数据
 * @returns 统计数据 Map
 */
function getMontStatisticMap(flowTable, autoRowsJson) {
  const monthMap = new Map()
  // 执行表里面保存所有的流程ID
  const flowIDSet = new Set()
  const table = new SQLTable(flowTable)
  table.first()
  while (!table.eof()) {
    // 后台数据是以日统计， 格式 20220101
    const date = table.s('DBDate')
    // 截取年月月份 如： 202201
    const month = date.substring(0, 6)
    let obj = monthMap.get(month)
    if (!obj) {
      obj = { daySet: new Set(), success: 0, error: 0, auto: 0, all: 0 }
      monthMap.set(month, obj)
    }
    const all = table.i('ExecCount') || 0
    // 只统计当天有执行记录的数据
    if (all > 0) {
      // 保存有多少天，后面要做平均数
      obj.daySet.add(date)
      flowIDSet.add(table.s('FlowID'))
    }

    const success = table.i('SuccCount') || 0
    obj.success += success
    obj.error += all - success
    obj.all += all
    table.next()
  }

  // 统计自动执行率
  const autoRows = JSON.parse(autoRowsJson)
  for (let i = 0; i < autoRows.length; i++) {
    const row = autoRows[i]

    if (!flowIDSet.has(row.FlowID)) continue
    // 后台数据是以日统计， 格式 20220101
    const date = row.DataBaseName
    const iCount = row.iCount
    // 截取年月月份 如： 202201
    const month = date.substring(0, 6)
    const obj = monthMap.get(month)
    if (obj) {
      obj.auto += iCount
    }
  }

  return monthMap
}

/**
 * 初始化折线图
 *
 * @param monthList 月份列表
 * @param countList 数值列表
 * @param errorRateList 报错率列表
 * @param autoRateList 自动率列表
 */
function initLineChart(monthList, countList, errorRateList, autoRateList) {
  if (!chart) {
    chart = echarts.init(manageIndRef.value)
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
      formatter: getTooltipFormatText,
    },
    grid: {
      left: 'center',
      width: '90%',
      height: '60%',
    },
    legend: {
      right: '5%',
      data: ['RPA日均流程执行量', 'RPA流程自动执行率', 'RPA流程报错率'],
    },
    xAxis: [
      {
        type: 'category',
        data: monthList,
        axisPointer: {
          type: 'shadow',
        },
        axisLabel: {
          formatter: (value) => {
            const arr = value.split('')
            arr.splice(4, 0, '.')
            return arr.join('')
          },
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
        name: '单位:次',
        axisLabel: {
          formatter: '{value} ',
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#9E9E9E',
          },
        },
      },
      {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value} %',
        },
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
        name: 'RPA日均流程执行量',
        type: 'bar',
        label: { show: true, position: 'top', formatter: '{c}次' },
        barWidth: 30,
        tooltip: {
          valueFormatter: function (value) {
            return value + '次'
          },
        },
        data: countList,
      },
      {
        name: 'RPA流程自动执行率',
        type: 'line',
        yAxisIndex: 1,
        tooltip: {
          valueFormatter: function (value) {
            return value + '%'
          },
        },
        data: autoRateList,
      },
      {
        name: 'RPA流程报错率',
        type: 'line',
        yAxisIndex: 1,
        tooltip: {
          valueFormatter: function (value) {
            return value + '%'
          },
        },
        data: errorRateList,
      },
    ],
  }

  option && chart.setOption(option)
}

/**
 * 获取提示文本
 *
 * @param params ECharts format 入参
 * @returns 提示文本
 */
function getTooltipFormatText(params) {
  const month = params[0].axisValue

  // 获取环比数据
  const lastYearMonth = dayjs(month, 'YYYYMM').add(-1, 'Y').format('YYYYMM')
  const lastYearMontData = getMontData(lastYearMonth, lastYearMonthMap)

  const lastYearParams = [
    {
      color: params[0].color,
      seriesName: params[0].seriesName,
      value: lastYearMontData.avgCount,
    },
    {
      color: params[1].color,
      seriesName: params[1].seriesName,
      value: lastYearMontData.autoRate,
    },
    {
      color: params[2].color,
      seriesName: params[2].seriesName,
      value: lastYearMontData.errorRate,
    },
  ]

  params[0].upValue = params[0].value - lastYearMontData.avgCount
  params[1].upValue = params[1].value - lastYearMontData.autoRate
  params[2].upValue = params[2].value - lastYearMontData.errorRate

  const text = `
    <div class="tooltip-formatter-div">
        <div class="month-title">${month}</div>
        ${getTooltipMonthText(params)}

        <div class="last-year-title">${lastYearMonth}</div>
        ${getTooltipMonthText(lastYearParams)}
    </div>
  `
  return text
}

/**
 * 获取格式文本，按月份的
 *
 * @param params ECharts format 入参
 * @returns 格式文本
 */
function getTooltipMonthText(params) {
  /**
   * 获取方向图标
   *
   * @param upValue 大于 0 向上，小于 0 向下
   * @returns 方向图标
   */
  function getIcon(upValue) {
    if (upValue === undefined || upValue === 0) return ''
    if (upValue < 0) {
      return `<div class="arrows down">⬆</div>`
    } else {
      return `<div class="arrows">⬆</div>`
    }
  }
  const resText = `
        <div class="item-div">
          <div class="name-div">
            <div class="icon" style="background-color:${params[0].color};"></div>
            <div class="text">${params[0].seriesName}</div>
            ${getIcon(params[0].upValue)}
          </div>
          <div class="value">${params[0].value} 次</div>
        </div>

        <div class="item-div">
          <div class="name-div">
            <div class="icon" style="background-color:${params[1].color};"></div>
            <div class="text">${params[1].seriesName}</div>
            ${getIcon(params[1].upValue)}
          </div>
          <div class="value">${params[1].value} %</div>
        </div>

        <div class="item-div">
          <div class="name-div">
            <div class="icon" style="background-color:${params[2].color};"></div>
            <div class="text">${params[2].seriesName}</div>
            ${getIcon(params[2].upValue)}
          </div>
          <div class="value">${params[2].value} %</div>
        </div>`

  return resText
}
</script>
<template>
  <div ref="flowExecCountRef" class="flow-exec-count">
    <div class="title">
      <div class="icon"><SvgIcon :icon-name="'icon-liuchen2'" :color="'#22C55E'" /></div>
      <span>RPA管理类指标</span>
    </div>
    <div ref="manageIndRef" class="main"></div>
  </div>
</template>
<style lang="scss" scoped>
.flow-exec-count {
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
      background: rgb(34 197 94 / 15%);
    }
  }

  .main {
    width: 100%;
    height: 250px;

    :deep(.tooltip-formatter-div) {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .item-div {
        display: flex;
        gap: 30px;
        justify-content: space-between;
        font-size: 14px;

        .name-div {
          display: flex;
          gap: 8px;
          align-items: center;

          .icon {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
          }

          .arrows {
            color: red;

            &.down {
              transform: rotate(180deg);
              color: green;
            }
          }
        }

        .value {
          font-size: 12px;
        }
      }
    }
  }
}
</style>
