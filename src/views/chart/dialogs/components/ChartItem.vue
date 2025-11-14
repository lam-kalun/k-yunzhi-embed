<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { type ECharts } from 'echarts'

const props = defineProps<{
  title: string
  echartsOptions: { [key: string]: any }
}>()

onMounted(() => {
  initWindow()
})

window.addEventListener('resize', () => {
  if (chart) {
    chart.resize()
  }
})

const chartRef = ref<HTMLDivElement | null>(null)
let chart: ECharts

/** 初始化页面 */
function initWindow() {
  initChart()
}

/** 初始化图表 */
function initChart() {
  if (!chartRef.value) return

  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  chart.setOption(props.echartsOptions)
}
</script>
<template>
  <div class="chart-item">
    <!-- <div class="title">{{ title }}</div> -->
    <div ref="chartRef" class="chart-ref"></div>
  </div>
</template>
<style lang="scss" scoped>
.chart-item {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid #eee;

  .title {
    padding: 20px 0;
    text-align: center;
  }

  .chart-ref {
    height: calc(100%);
  }
}
</style>
