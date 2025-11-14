<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { SQLTable } from '@ksware/micro-lib-web-temp'
import * as echarts from 'echarts'
import { throttle } from 'lodash-es'

import { numFixedExcept0 } from '@/utils/format'

defineExpose({ initWindow })

const processExecutionCount = ref('')
let chart: any
const chartRef = ref('') as any

onMounted(() => {
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(chartRef.value)
})

/**
 * 初始化页面
 *
 * @param tableData 表格数据
 * @param loading 加载状态
 */
function initWindow(tableData: any, loading: any) {
  const monthMap = new Map<string, { execTime: number; count: number }>()
  const table = new SQLTable(tableData)
  table.first()
  while (!table.eof()) {
    const date = table.s('DBDate')
    const month = date.substring(0, 6)
    // 后台单位为秒
    const execTime = table.i('ExecTime')
    let obj = monthMap.get(month)
    if (!obj) {
      obj = {
        execTime: 0,
        count: 0,
      }
      monthMap.set(month, obj)
    }
    obj.count++
    obj.execTime += execTime
    table.next()
  }

  // 统计 月的个数，及月的日均执行时长
  const monthList = Array.from(monthMap.keys()).sort()
  const execTimeList: string[] = []
  const countList: number[] = []
  for (let i = 0; i < monthList.length; i++) {
    const month = monthList[i]
    const obj = monthMap.get(month)!
    const hours = numFixedExcept0(obj.execTime / 3600)
    execTimeList.push(hours)
    countList.push(obj.count)
  }

  initLineChart(monthList, execTimeList, countList)

  nextTick(() => {
    loading && loading.close()
  })
}

/**
 * 初始化折线图
 *
 * @param monthList 月份列表
 * @param timeList 时间列表
 * @param countList 数值列表
 */
function initLineChart(monthList: string[], timeList: string[], countList: number[]) {
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  const option = {
    color: ['#A8DBFF', '#8F8FF1'],
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
      data: ['月执行时长', '执行次数'],
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
      {
        type: 'value',
        name: '单位:次数',
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
      show: monthList.length > 12 ? true : false,
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
      endValue: 11,
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
        name: '月执行时长',
        type: 'bar',
        label: { show: true, position: 'top', formatter: '{c}h' },
        barWidth: 30,
        tooltip: {
          valueFormatter: function (value: string) {
            return value + 'h'
          },
        },
        data: timeList,
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
        data: countList,
      },
    ],
  }
  chart.setOption(option)
}
</script>
<template>
  <div ref="processExecutionCount" class="process-execution-count">
    <div class="title">
      <div class="icon"><SvgIcon icon-name="icon-ceshi" /></div>
      <span>流程执行时长与次数</span>
    </div>
    <div ref="chartRef" class="main"></div>
  </div>
</template>
<style lang="scss" scoped>
.process-execution-count {
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

  .main {
    height: 300px;
  }
}
</style>
