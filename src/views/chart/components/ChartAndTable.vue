<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { type ECharts } from 'echarts'
import { throttle } from 'lodash-es'

const props = defineProps<{
  title: string
  xAxisData: (string | number)[]
  yAxisData: string[]
  itemName: string
  unit: string
  xAxisName: string
  /** 柱子的颜色 */
  seriesColor?: string
  /** 是否显示可以查看详情的按钮 */
  isShowDetail?: boolean
}>()

const { title, itemName, unit, xAxisName } = props

const emit = defineEmits<{ lookDetail: [] }>()

let chart: ECharts
const chartAndTableRef = ref<HTMLDivElement | null>(null)
// 当前显示界面类型
const currentShowType = ref<'chart' | 'table'>('chart')
const chartRef = ref<HTMLDivElement | null>(null)
const maxShowCount = 10
// 当前图标是否处于点击后激活状态
const isClickActive = ref(false)

onMounted(() => {
  initChart()
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(chartRef.value!)
})

watch(
  () => {
    return [...props.xAxisData, ...props.yAxisData].join(',')
  },
  () => {
    initChart()
  },
)

const tableData = computed(() => {
  return props.yAxisData.map((yData, idx) => {
    return { name: yData, [itemName]: props.xAxisData[idx] }
  })
})

/** 初始化图表 */
function initChart() {
  if (!chartRef.value) return
  // 设置初始化时 当前显示的值
  currentValue = props.xAxisData.length - maxShowCount
  if (!chart) {
    chart = echarts.init(chartRef.value)
    chart.on('dataZoom', ({ start }: any) => {
      // 解决手动拖动滚动条后 再滚动滚轮位置异常问题
      currentValue = parseInt(String((start * props.yAxisData.length) / 100))
    })
  }
  const option = {
    animationDurationUpdate: 300,
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
      width: '85%',
      height: '75%',
    },
    legend: {
      right: '5%',
      data: [itemName],
    },
    yAxis: [
      {
        type: 'category',
        data: props.yAxisData.slice().reverse(),
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
    xAxis: [
      {
        type: 'value',
        name: xAxisName,
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
      orient: 'vertical',
      brushSelect: false,
      zoomLock: true,
      borderWidth: 10,
      startValue: props.yAxisData.length - maxShowCount,
      endValue: props.yAxisData.length,
      yAxisIndex: [0],
      showDetail: false,
      filterMode: 'empty',
    },
    series: [
      {
        name: itemName,
        color: props.seriesColor || '#69b4ff',
        type: 'bar',
        barWidth: 20,
        tooltip: {
          valueFormatter: function (value: string) {
            return value + ' ' + unit
          },
        },
        label: {
          show: true,
          position: 'right',
          fontsize: 10,
          formatter: ({ value }: { value: string }) => {
            return value + ' ' + unit
          },
        },
        data: props.xAxisData.slice().reverse(),
      },
    ],
  }
  chart.setOption(option)
}

// 手写图标Y轴滚动效果

/** dataZoom endValue 离顶部的距离 */
let currentValue = 0

/**
 * 鼠标滚动事件回调
 *
 * @param e 滚动事件
 */
function onChangeWheel(e: WheelEvent) {
  if (!isClickActive.value) {
    return
  }
  e.preventDefault()
  if (e.deltaY < 0) {
    currentValue++
  } else {
    currentValue--
  }
  if (currentValue < 0) {
    currentValue = 0
  } else if (currentValue >= props.yAxisData.length - maxShowCount) {
    currentValue = props.yAxisData.length - maxShowCount
  }
  chart.setOption({
    dataZoom: {
      startValue: currentValue + maxShowCount,
      endValue: 0 + currentValue,
    },
  })
}

/** 查看个人详情 */
function onLookDetail() {
  emit('lookDetail')
}
</script>

<template>
  <div ref="chartAndTableRef" class="chart-and-table">
    <div class="title">
      <div class="icon">
        <SvgIcon :icon-name="'icon-ceshi'" :color="'#22C55E'" />
      </div>
      <span>{{ title }}</span>
      <k-button v-if="props.isShowDetail" link type="primary" main @click="onLookDetail">(查看个人详情)</k-button>
    </div>
    <div class="type-tool-div">
      <slot name="filterTool"></slot>
      <el-radio-group v-model="currentShowType" size="default">
        <el-radio-button label="图" value="chart" />
        <el-radio-button label="表格" value="table" />
      </el-radio-group>
    </div>
    <div class="main-div">
      <div
        v-show="currentShowType === 'chart'"
        ref="chartRef"
        v-clickOutside="
          () => {
            isClickActive = false
          }
        "
        class="chart"
        @click="
          () => {
            isClickActive = true
          }
        "
        @wheel="onChangeWheel"
      ></div>
      <div v-show="currentShowType === 'table'" class="table-div">
        <vxe-table
          height="auto"
          :data="tableData"
          :column-config="{ resizable: true }"
          :scroll-x="{ enabled: true, gt: 10 }"
          border
        >
          <vxe-column fixed="left" field="name" align="left" width="400" title="名称"></vxe-column>
          <vxe-column :field="itemName" :title="`${itemName}（${unit}）`" width="400" align="left"></vxe-column>
        </vxe-table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chart-and-table {
  display: flex;
  flex-direction: column;
  gap: 12px;

  height: 500px;
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

  .type-tool-div {
    display: flex;
    gap: 15px;
    align-items: center;
    justify-content: center;
  }

  .main-div {
    display: flex;
    flex-grow: 1;
    column-gap: 16px;

    .table-div {
      width: 100%;
      max-height: 500px;
    }

    .chart {
      width: 100%;
      height: 100%;
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
}
</style>
