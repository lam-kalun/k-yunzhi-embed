<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { SQLTable, callServerFunc, getGuid } from '@ksware/micro-lib-web-temp'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import { throttle } from 'lodash-es'

import { getDateMonthList, numFixedExcept0 } from '@/utils/format'

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

// 图表实例
let chart, totalChart
// 当前显示界面类型 图表， 表格
const currentShowType = ref('chart')
const demandCountRef = ref('')
const manageIndRef = ref('')
const totalChartRef = ref('')

// 数据变量定义
/** 统计数据的月份列表 */
const monthList = reactive([]),
  /** 新增需求 */
  addList = reactive([]),
  /** 完成需求 */
  finishedList = reactive([]),
  /** 累计新增 */
  addUpList = reactive([]),
  /** 累计完成 */
  finishedUpList = reactive([]),
  /** 累计完成率 */
  finishedRateList = reactive([]),
  /** 表格显示的数据 */
  tableData = reactive([])

onMounted(() => {
  initWindow()
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(manageIndRef.value)
  new ResizeObserver(throttle(() => totalChart?.resize(), 50)).observe(totalChartRef.value)
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

/** 初始化页面 */
function initWindow() {
  const { endDate } = props
  monthList.length = 0
  addList.length = 0
  finishedList.length = 0
  addUpList.length = 0
  finishedUpList.length = 0
  finishedRateList.length = 0

  tableData.length = 0

  // 获取所有要查询的日期开始时间
  const queryStartDate = dayjs(endDate).add(-1, 'Y').format('YYYY-01-01')
  callServerFunc(
    'demo',
    'demo_getDemandCount',
    { startDate: queryStartDate, endDate, roleId: props.deptId },
    { awaitTime: true, loadingEl: demandCountRef.value },
  ).then(({ data }) => {
    // const filedKeys = ['addNewCount', 'finishedCount', 'addUp', 'finishedCount', 'finishedRate']
    // const fieldTexts = ['新增需求', '完成需求', '累计新增', '累计完成', '累计完成率']
    const filedKeys = ['addNewCount', 'finishedCount']
    const fieldTexts = ['新增需求', '完成需求']
    const table = new SQLTable(data.k_shop_demand_main)
    /** month => { addNewCount: 0, finishedCount: 0 } */
    const monthMap = new Map()

    // 初始所有月份对应统计指标的值
    getDateMonthList(queryStartDate, endDate).forEach((month) => {
      const obj = {}
      filedKeys.forEach((key) => {
        obj[key] = 0
      })
      monthMap.set(month, obj)
    })
    table.first()
    while (!table.eof()) {
      // 处理增加的记录
      const addMonth = table.s('CreateTime').replace(/-/g, '').substring(0, 6)
      const monthObj = monthMap.get(addMonth)
      monthObj.addNewCount++

      if (table.i('iState') === 1) {
        // 处理当月已经完成的数量
        const finishedMonth = table.s('OnlineTime').replace(/-/g, '').substring(0, 6)
        const monthObj = monthMap.get(finishedMonth)
        monthObj.finishedCount++
      }
      table.next()
    }

    monthList.length = 0
    // 初始化所有的月份
    monthList.push(...getDateMonthList(dayjs(endDate).format('YYYY01'), endDate))
    for (let i = 0; i < monthList.length; i++) {
      const month = monthList[i]
      const data = monthMap.get(month)
      // 本月新增
      addList.push(data.addNewCount)

      // 本月完成
      finishedList.push(data.finishedCount)

      // 累计新增 = 上个月累计新增 + 本月新增
      const addUp = (addUpList[i - 1] || 0) + data.addNewCount
      addUpList.push(addUp)
      data.addUp = addUp

      // 累计完成 = 上个月累计完成 + 本月完成
      const finishedUp = (finishedUpList[i - 1] || 0) + data.finishedCount
      finishedUpList.push(finishedUp)

      // 累计完成率
      const finishedRate = addUp === 0 ? 0 : numFixedExcept0((finishedUp / addUp) * 100)
      finishedRateList.push(finishedRate)
      data.finishedRate = finishedRate
    }

    for (let i = 0; i < fieldTexts.length; i++) {
      const row = {}
      row.id = getGuid()
      row['target'] = fieldTexts[i]
      monthList.forEach((month) => {
        const data = monthMap.get(month)
        const key = filedKeys[i]
        row[month] = key === 'finishedRate' ? `${data[key]} %` : data[key]
      })
      tableData.push(row)
    }
    initChart()

    // 统计今年1月到结束日期的数据
    let lastAddCountTotal = 0
    let lastFinishCountTotal = 0
    // 上一年同样的月份
    const lastYearMonthList = [
      ...getDateMonthList(dayjs(endDate).add(-1, 'Y').format('YYYY01'), dayjs(endDate).add(-1, 'Y').format('YYYYMM')),
    ]

    // 统计今年1月到结束日期的数据
    let addCountTotal = 0
    let finishCountTotal = 0
    // 当前查询日期1月到结束日期有多少个月份
    const currentYearMonthList = [...getDateMonthList(dayjs(endDate).format('YYYY01'), dayjs(endDate).format('YYYYMM'))]

    // 计算上一年统计的数据
    for (let i = 0; i < lastYearMonthList.length; i++) {
      const month = lastYearMonthList[i]
      const data = monthMap.get(month)
      lastAddCountTotal += data.addNewCount
      lastFinishCountTotal += data.finishedCount
    }

    // 计算当前年统计的数据
    for (let i = 0; i < currentYearMonthList.length; i++) {
      const month = currentYearMonthList[i]
      const data = monthMap.get(month)
      addCountTotal += data.addNewCount
      finishCountTotal += data.finishedCount
    }

    // 统计图x轴显示的统计月份文字
    const momentTextList = [
      `${lastYearMonthList[0]}~${lastYearMonthList.at(-1)}`,
      `${currentYearMonthList[0]}~${currentYearMonthList.at(-1)}`,
    ]

    initTotalChart(momentTextList, [lastAddCountTotal, addCountTotal], [lastFinishCountTotal, finishCountTotal])
  })
}

/** 初始化图表 */
function initChart() {
  if (!chart) {
    chart = echarts.init(manageIndRef.value)
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      right: '5%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        data: monthList,
        axisLabel: {
          rotate: -45,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
      },
      // {
      //   type: 'value',
      //   min: 0,
      //   max: 100,
      //   axisLabel: {
      //     formatter: '{value} %'
      //   },
      //   axisLine: {
      //     show: true,
      //     lineStyle: {
      //       color: '#9E9E9E'
      //     }
      //   }
      // }
    ],
    series: [
      {
        name: '新增需求',
        type: 'bar',
        label: { show: true, position: 'top' },
        stack: 'Ad',
        emphasis: {
          focus: 'series',
        },
        data: addList,
      },
      {
        name: '完成需求',
        type: 'bar',
        data: finishedList,
        label: { show: true, position: 'top' },
        emphasis: {
          focus: 'series',
        },
      },
      // {
      //   name: '累计新增',
      //   data: addUpList,
      //   type: 'line'
      // },
      // {
      //   name: '累计完成',
      //   data: finishedUpList,
      //   type: 'line'
      // },
      // {
      //   name: '累计完成率',
      //   data: finishedRateList,
      //   type: 'line',
      //   tooltip: {
      //     valueFormatter: function (value) {
      //       return value + '%'
      //     }
      //   }
      // }
    ],
  }

  option && chart.setOption(option)
}

/**
 * 初始化全部图表
 *
 * @param monthTextList 月份文本列表
 * @param addCountList 新增数量列表
 * @param finishCountList 完成数量列表
 */
function initTotalChart(monthTextList, addCountList, finishCountList) {
  if (!totalChart) {
    totalChart = echarts.init(totalChartRef.value)
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      right: '5%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        data: monthTextList,
      },
    ],
    yAxis: [
      {
        type: 'value',
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
        name: '新增需求',
        type: 'bar',
        label: { show: true, position: 'top' },
        stack: 'Ad',
        emphasis: {
          focus: 'series',
        },
        data: addCountList,
      },
      {
        name: '完成需求',
        type: 'bar',
        data: finishCountList,
        label: { show: true, position: 'top' },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  }

  totalChart.setOption(option)
}
</script>
<template>
  <div ref="demandCountRef" class="demand-count-wrapper">
    <div class="demand-count left">
      <div class="title">
        <div class="icon"><SvgIcon icon-name="icon-wenbenbianji-yellow" /></div>
        <span>RPA需求建设完成情况趋势图</span>
      </div>
      <div class="type-tool-div">
        <el-radio-group v-model="currentShowType" size="default">
          <el-radio-button label="图表" value="chart" />
          <el-radio-button label="表格" value="table" />
        </el-radio-group>
      </div>
      <div v-show="currentShowType === 'chart'" ref="manageIndRef" class="main"></div>
      <div v-show="currentShowType === 'table'" class="main">
        <vxe-table
          height="auto"
          :data="tableData"
          :column-config="{ resizable: true }"
          :scroll-x="{ enabled: true, gt: 10 }"
          border
        >
          <vxe-column fixed="left" field="target" align="left" title="指标" width="100"></vxe-column>
          <vxe-column
            v-for="month in monthList"
            :key="month"
            :field="month"
            width="80"
            :title="month"
            align="right"
          ></vxe-column>
        </vxe-table>
      </div>
    </div>
    <div class="demand-count right">
      <div class="title">
        <div class="icon"><SvgIcon icon-name="icon-wenbenbianji-yellow" /></div>
        <span>RPA需求建设累计完成情况图</span>
      </div>
      <div ref="totalChartRef" class="main" style="margin-top: 40px"></div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.demand-count-wrapper {
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

.demand-count {
  display: flex;
  flex-direction: column;
  gap: 8px;

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
      background: rgb(249 115 22 / 15%);

      > svg {
        transform: translate(1px, 2px);
      }
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
