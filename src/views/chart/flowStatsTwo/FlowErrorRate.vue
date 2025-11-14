<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { throttle } from 'lodash-es'

import { numFixedExcept0 } from '@/utils/format'

defineExpose({ initWindow })

type FlowErrorRate = {
  errorRate: string
  execCount: number
  succCount: number
  scenesName: string
}

const props = defineProps<{
  currentDate: [string, string]
}>()

// const dataOrderByErrorRateAsc = computed(() =>
//   props.data.slice().sort((a, b) => Number(a.errorRate) - Number(b.errorRate))
// )

/** 图表实例 */
let chart: ECharts, personChart: ECharts
const chartRef = ref<HTMLDivElement | null>(null)
const personChartRef = ref<HTMLDivElement | null>(null)
const errorRateRef = ref<HTMLDivElement | null>(null)

/** 当前显示具体人 */
const currentPerson = ref('')

// 用户名称对应的流程ID列表
const userNameAsFlowIDList = reactive(new Map<string, string[]>())

onMounted(() => {
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(chartRef.value!)
  new ResizeObserver(throttle(() => personChart?.resize(), 50)).observe(personChartRef.value!)
})

/**
 * 初始化页面
 *
 * @param data 流程报错率数据
 * @param loading 加载状态
 */
function initWindow(data: any, loading: any) {
  const flowItemList: { flowId: string; scenesName: string }[] = JSON.parse((data as any).scenesNameRows)
  const flowIdAsScenesName: Record<string, string> = {}
  for (let i = 0; i < flowItemList.length; i++) {
    const { flowId, scenesName } = flowItemList[i]
    flowIdAsScenesName[flowId] = scenesName

    // 保存用户对应的流程ID列表
    let flowIdList = userNameAsFlowIDList.get(scenesName || '其他')
    if (!flowIdList) {
      flowIdList = []
      userNameAsFlowIDList.set(scenesName || '其他', flowIdList)
    }
    // 如果不存在则添加进去
    flowIdList.indexOf(flowId) === -1 && flowIdList.push(flowId)
  }

  const scenesNameAsCountInfo: Record<string, Omit<FlowErrorRate, 'errorRate'>> = {}
  const table = new SQLTable((data as any).k_smart_flow_detail_query)
  table.first()
  while (!table.eof()) {
    const flowId = table.s('FlowID')
    const execCount = table.i('ExecCount')
    const succCount = table.i('SuccCount')
    const scenesName = flowIdAsScenesName[flowId] || '其他'

    let obj = scenesNameAsCountInfo[scenesName]
    if (!obj) {
      obj = {
        execCount: 0,
        succCount: 0,
        scenesName,
      }
      scenesNameAsCountInfo[scenesName] = obj
    }

    obj.execCount += execCount
    obj.succCount += succCount
    table.next()
  }
  const itemArr = Object.values(scenesNameAsCountInfo).map((item) => {
    const { execCount, succCount } = item
    const errorRate = numFixedExcept0(((execCount - succCount) / execCount) * 100)
    return { ...item, errorRate }
  })

  const usernameList: string[] = []
  const execCountList: string[] = []
  const errorRateList: string[] = []
  itemArr.forEach(({ errorRate, execCount, scenesName }) => {
    usernameList.push(scenesName)
    execCountList.push(numFixedExcept0(execCount))
    errorRateList.push(errorRate)
  })

  initBarChart(usernameList, execCountList, errorRateList)
  loading && loading.close()
}

/**
 * 初始化柱状图
 *
 * @param userNameList 用户名列表
 * @param execCountList 执行次数列表
 * @param errorRateList 报错率列表
 */
function initBarChart(userNameList: string[], execCountList: string[], errorRateList: string[]) {
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
    initChartEvent(chart)
  }
  const option = {
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
      data: ['报错率', '执行次数'],
    },
    xAxis: [
      {
        type: 'category',
        data: userNameList,
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
        name: '单位:百分比',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: function (value: number) {
            return value === 0 ? value : `${value}%`
          },
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#9E9E9E',
          },
        },
        axisTick: {
          show: true,
        },
        splitLine: {
          show: false,
        },
      },
      {
        type: 'value',
        name: '单位:次数',
        min: 0,
        axisLine: {
          show: true,
        },
        axisTick: {
          show: true,
        },
        splitLine: {
          show: false,
        },
      },
    ],

    dataZoom: {
      show: true,
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
    series: [
      {
        name: '报错率',
        type: 'bar',
        color: '#EF4444',
        barWidth: 30,
        label: {
          show: true,
          position: 'top',
          formatter: ({ value }: { value: string }) => {
            return parseFloat(value) > 0 ? value + '%' : ''
          },
        },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + '%'
          },
        },
        data: errorRateList,
      },
      {
        name: '执行次数',
        color: '#69b4ff',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: 20,
        tooltip: {
          valueFormatter: function (value: string) {
            return value + '次'
          },
        },
        label: {
          show: true,
          position: 'top',
          fontsize: 10,
          formatter: ({ value }: { value: string }) => {
            return value + '次'
          },
        },
        data: execCountList,
      },
    ],
  }
  chart.setOption(option)
}

/**
 * 初始化用户的图表
 *
 * @param timeList 时间列表
 * @param execCountList 执行次数列表
 * @param errorRateList 报错率列表
 * @param execTimeList 执行时间列表
 */
function initChartByPerson(
  timeList: string[],
  execCountList: number[],
  errorRateList: string[],
  execTimeList: number[],
) {
  if (!personChart) {
    personChart = echarts.init(personChartRef.value)
  }

  const option = {
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
      data: ['报错率', '执行次数', '执行时长'],
    },
    xAxis: [
      {
        type: 'category',
        data: timeList,
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
        name: '单位:百分比',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: function (value: number) {
            return value === 0 ? value : `${value}%`
          },
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#9E9E9E',
          },
        },
        axisTick: {
          show: true,
        },
        splitLine: {
          show: false,
        },
      },
      {
        type: 'value',
        name: '单位:次数',
        min: 0,
        axisLine: {
          show: true,
        },
        axisTick: {
          show: true,
        },
        splitLine: {
          show: false,
        },
      },
    ],

    dataZoom: {
      show: errorRateList.length > 20 ? true : false,
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
    series: [
      {
        name: '报错率',
        type: 'line',
        color: '#EF4444',
        label: {
          show: true,
          position: 'top',
          formatter: ({ value }: { value: string }) => {
            return parseFloat(value) > 0 ? value + '%' : ''
          },
        },
        tooltip: {
          valueFormatter: function (value: string) {
            return value + '%'
          },
        },
        data: errorRateList,
      },
      {
        name: '执行次数',
        type: 'line',
        yAxisIndex: 1,
        tooltip: {
          valueFormatter: function (value: string) {
            return value + '次'
          },
        },
        label: {
          show: true,
          position: 'top',
          fontsize: 10,
          formatter: ({ value }: { value: string }) => {
            return value + '次'
          },
        },
        data: execCountList,
      },
      {
        name: '执行时长',
        type: 'line',
        yAxisIndex: 1,
        tooltip: {
          valueFormatter: function (value: string) {
            return value + '分钟'
          },
        },
        label: {
          show: true,
          position: 'top',
          fontsize: 10,
          formatter: ({ value }: { value: string }) => {
            return value + '分钟'
          },
        },
        data: execTimeList,
      },
    ],
  }
  personChart.setOption(option)
}

/**
 * 获取用户的流程执行状态
 *
 * @param userName 用户名称
 */
async function getFlowExecStateByUser(userName: string) {
  const flowIdList = userNameAsFlowIDList.get(userName || '其他') || []
  const requestData = { flowIdList, startDate: props.currentDate[0], endDate: props.currentDate[1] }

  const { data } = await callServerFunc('demo', 'demo_getFlowExecStateByFlowIds', requestData)

  const dayList: string[] = []
  const countList: number[] = []
  const errorList: string[] = []
  const execTimeList: number[] = []

  const table = new SQLTable((data as any).k_flow_exec_user)
  table.first()
  while (!table.eof()) {
    const day = table.s('DBDate')
    const execCount = table.i('ExecCount')
    const succCount = table.i('SuccCount')
    const execTime = table.i('ExecTime')
    dayList.push(day)
    countList.push(execCount)
    const errorRate = numFixedExcept0(((execCount - succCount) / execCount) * 100)
    errorList.push(errorRate)
    execTimeList.push(Math.round((execTime / 60) * 100) / 100)
    table.next()
  }
  initChartByPerson(dayList, countList, errorList, execTimeList)
}

/**
 * 初始化图表事件
 *
 * @param chart 图表
 */
function initChartEvent(chart: ECharts) {
  chart.on('click', function ({ name }) {
    currentPerson.value = name
    nextTick(() => {
      getFlowExecStateByUser(name)
    })
  })
}

/** 返回 */
function goBack() {
  currentPerson.value = ''
}
</script>
<template>
  <div ref="errorRateRef" class="error-rate">
    <div class="title">
      <div class="icon">
        <SvgIcon :icon-name="'icon-ceshi'" :color="'#22C55E'" />
      </div>
      <span>个人流程报错率(点击图表查看个人详细)</span>
    </div>
    <div v-show="!!currentPerson" class="person-tool">
      <k-button type="primary" main link @click="goBack">
        <FontIcon icon-name="icon-left-12"></FontIcon>
        返回
      </k-button>
      <div class="person-text">{{ currentPerson }}</div>
    </div>
    <div class="main-div">
      <div v-show="!currentPerson" ref="chartRef" class="main"></div>
      <div v-show="!!currentPerson" ref="personChartRef" class="main"></div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.error-rate {
  padding: 0 16px 16px;
  background-color: #fff;

  .title {
    display: flex;
    align-items: center;
    height: 44px;
    font-size: 14px;

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;

      width: 28px;
      height: 28px;
      margin-right: 4px;
      border-radius: 50%;

      line-height: 28px;

      background: #eff5fe;
    }
  }

  .person-tool {
    position: relative;
    z-index: 10;
    top: 24px;

    margin-top: -20px;
    padding: 0 20px;

    .person-text {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);

      font-size: 16px;
      font-weight: bold;
      color: #38363c;
    }
  }

  .main {
    height: 300px;
  }
}
</style>
