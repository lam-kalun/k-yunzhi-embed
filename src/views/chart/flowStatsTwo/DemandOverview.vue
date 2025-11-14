<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'
import * as echarts from 'echarts'
import { type ECharts } from 'echarts'
import { throttle } from 'lodash-es'

const props = defineProps<{
  currentDate: [string, string]
  data: { userId: string; userName: string; addCount: number; onlineCount: number }[]
  userIdAndNameMap: Map<string, string>
}>()

/** 图表实例 */
let chart: ECharts, personChart: ECharts
const chartRef = ref<HTMLDivElement | null>(null)
const personChartRef = ref<HTMLDivElement | null>(null)
const demandOverviewRef = ref<HTMLDivElement | null>(null)

/** 当前显示具体人 */
const currentPerson = ref('')

const dataOrderByAddCount = computed(() => props.data.slice().sort((a, b) => a.addCount - b.addCount))

watch(props.data, () => {
  initChart()
})

onMounted(() => {
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(chartRef.value!)
  new ResizeObserver(throttle(() => personChart?.resize(), 50)).observe(personChartRef.value!)
})

/** 初始化图表 */
function initChart() {
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
      formatter(params: any) {
        const userId = params[0].axisValue

        const userName = props.userIdAndNameMap.get(userId)

        const arrList = params.map((item: any) => {
          return `<div style="padding-left:4px; font-size:12px;">${item.seriesName}：${item.value} 个</div>`
        })

        return `
          <div>${userName}[${userId}]</div>
          ${arrList.join('')}
        `
      },
    },
    grid: {
      left: 'center',
      width: '90%',
      height: '60%',
    },
    legend: {
      right: '5%',
      data: ['新增需求', '上线RPA'],
    },
    xAxis: [
      {
        type: 'category',
        data: dataOrderByAddCount.value.map(({ userId }) => userId),
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
          formatter: (userId: string) => {
            return props.userIdAndNameMap.get(userId) || '其他'
          },
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '单位:个',
        min: 0,
        axisLabel: {
          formatter: function (value: number) {
            return value === 0 ? value : `${value}`
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
    ],
    dataZoom: {
      show: true,
      /** 单独滚动条 */
      type: 'slider',
      /** 不过滤数据 - 保证 y 轴数据范围不变 */
      filterMode: 'none',
      brushSelect: true,
      bottom: 0,
      height: 10,
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
        name: '新增需求',
        type: 'bar',
        label: { show: true, position: 'top', formatter: '{c}个' },
        barGap: 0,
        barWidth: 30,
        emphasis: {
          focus: 'series',
        },
        data: dataOrderByAddCount.value.map(({ addCount }) => addCount),
      },
      {
        name: '上线RPA',
        type: 'bar',
        label: { show: true, position: 'top', formatter: '{c}个' },
        barWidth: 30,
        emphasis: {
          focus: 'series',
        },
        data: dataOrderByAddCount.value.map(({ onlineCount }) => onlineCount),
      },
    ],
  }

  // 使用刚指定的配置项和数据显示图表。
  chart.setOption(option)
}

/**
 * 初始化用户图表
 *
 * @param dayList 日期列表
 * @param addCountList 新增数量列表
 * @param onlineCountList 在线数量列表
 */
function initChartByPerson(dayList: string[], addCountList: number[], onlineCountList: number[]) {
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
      data: ['新增需求', '上线RPA'],
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
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '单位:个',
        min: 0,
        axisLabel: {
          formatter: function (value: number) {
            return value === 0 ? value : `${value}`
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
    ],
    dataZoom: {
      show: dayList.length > 20 ? true : false,
      // 单独滚动条
      type: 'slider',
      // 不过滤数据 - 保证 y 轴数据范围不变
      filterMode: 'none',
      brushSelect: true,
      bottom: 0,
      height: 10,
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
        name: '新增需求',
        type: 'line',
        label: { show: true, position: 'top', formatter: '{c}个' },
        emphasis: {
          focus: 'series',
        },
        data: addCountList,
      },
      {
        name: '上线RPA',
        type: 'line',
        label: { show: true, position: 'top', formatter: '{c}个' },
        emphasis: {
          focus: 'series',
        },
        data: onlineCountList,
      },
    ],
  }

  // 使用刚指定的配置项和数据显示图表。
  personChart.setOption(option)
}

/**
 * 获取用户的需求信息
 *
 * @param userId 用户 id
 */
async function getDemandInfoByUser(userId: string) {
  currentPerson.value = props.userIdAndNameMap.get(userId) || '其他'
  const requestData = { userId, startDate: props.currentDate[0], endDate: props.currentDate[1] }
  const { data } = await callServerFunc('demo', 'demo_getPersonalDemandInfoByUser', requestData)

  const monthList: string[] = []
  const newList: number[] = []
  const onlineList: number[] = []

  // 月份指向具体信息 day => {addCount:0, onlineCount: 0}
  const monthAsCountInfo: Record<string, { addCount: number; onlineCount: number }> = {}
  const newTable = new SQLTable((data as any).k_new_count)
  newTable.first()
  while (!newTable.eof()) {
    const day = newTable.s('CreateTime').substring(0, 10).replace(/-/g, '')
    const month = day.substring(0, day.length - 2)
    let obj = monthAsCountInfo[month]
    if (!obj) {
      obj = {
        addCount: 0,
        onlineCount: 0,
      }
      monthAsCountInfo[month] = obj
    }
    obj.addCount++
    newTable.next()
  }

  const onlineTable = new SQLTable((data as any).k_online_count)
  onlineTable.first()
  while (!onlineTable.eof()) {
    const day = newTable.s('CreateTime').substring(0, 10).replace(/-/g, '')
    const month = day.substring(0, day.length - 2)
    let obj = monthAsCountInfo[month]
    if (!obj) {
      obj = {
        addCount: 0,
        onlineCount: 0,
      }
      monthAsCountInfo[month] = obj
    }

    obj.onlineCount++

    onlineTable.next()
  }
  Object.keys(monthAsCountInfo)
    .sort()
    .forEach((month) => {
      const obj = monthAsCountInfo[month]
      monthList.push(month)
      newList.push(obj.addCount)
      onlineList.push(obj.onlineCount)
    })

  initChartByPerson(monthList, newList, onlineList)
}

/**
 * 初始化图表点击事件
 *
 * @param chart 图表
 */
function initChartEvent(chart: ECharts) {
  chart.on('click', function ({ name }) {
    nextTick(() => {
      getDemandInfoByUser(name)
    })
  })
}

/** 返回 */
function goBack() {
  currentPerson.value = ''
}
</script>
<template>
  <div ref="demandOverviewRef" class="demand-overview">
    <div ref="rightChartRef">
      <div class="title">
        <div class="icon"><SvgIcon icon-name="icon-shebei" /></div>
        <span>个人需求建设概况(点击图表查看个人详细)</span>
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
  </div>
</template>
<style lang="scss" scoped>
.demand-overview {
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

      background: #e9effe;
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
    height: 250px;
  }
}
</style>
