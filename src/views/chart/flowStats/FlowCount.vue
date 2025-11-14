<script setup>
import { onMounted, ref, watch } from 'vue'
import { callServerFunc } from '@ksware/micro-lib-web-temp'
import * as echarts from 'echarts'

import FlowPersonalStats from '../components/FlowPersonalStats.vue'

const props = defineProps({
  /** 选择部门的类型 */
  deptType: String,
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
let chart

const pieChartRef = ref('')

const leftChartRef = ref('')

// 流程总数量
const processTotal = ref('')

onMounted(async () => {
  initWindow()
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
  // 如果是选择的小组，则需要使用它的父级ID
  let roleId = ''
  let type = ''
  const deptType = props.deptType
  if (deptType === 'dept') {
    roleId = props.deptId
    type = 'dept'
  } else if (deptType === 'cDept') {
    roleId = props.deptPid
    type = 'dept'
  }

  // 查询时间范围
  const { startDate = '', endDate = '' } = props
  // 获取环形图数据
  callServerFunc(
    'demo',
    'demo_getFlowTotal',
    { roleId, type, startDate, endDate },
    { loadingEl: leftChartRef.value, awaitTime: true },
  ).then(({ data }) => {
    initPieChart(data)
  })
}

// 初始化饼图
const initPieChart = (data) => {
  data.counts = JSON.parse(data.counts)
  data.names = JSON.parse(data.names)
  const pieData = ref([])
  for (let i = 0; i < data.counts.length; i++) {
    pieData.value.push({ value: data.counts[i], name: data.names[i] })
  }

  // 计算RPA流程总数
  const total = data.counts.reduce((prev, current) => current + prev, 0)
  processTotal.value = numFormat(total)

  chart ??= echarts.init(pieChartRef.value)
  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      top: 'center',
      left: '65%',
      icon: 'circle',
      align: 'left',
      formatter: function (name) {
        const item = pieData.value.find((item) => item.name === name)
        return `${name}  ${item ? item.value : ''}`
      },
    },
    series: [
      {
        name: '流程数量',
        type: 'pie',
        radius: ['60%', '70%'],
        center: ['30%', 'center'],
        avoidLabelOverlap: false,
        color: ['#A8DBFF', '#8EE085', '#FF97A9', '#FFC56D', '#C4B5FD'],
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: false,
            fontSize: 40,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: pieData.value,
      },
    ],
  }
  chart.setOption(option)
}

// 添加千分位分隔符
const numFormat = (number) => {
  const num = number.toString().split('.')
  const leftNum = num[0].split('').reverse()
  const result = leftNum.reduce((init, it, index) => {
    return (index % 3 === 0 && index != 0 ? it + ',' : it) + init
  }, '')
  return num[1] ? result + '.' + num[1] : result
}
</script>
<template>
  <div class="container-box">
    <!-- 饼图 -->
    <div ref="leftChartRef" class="left-chart">
      <div class="title">
        <div class="icon"><SvgIcon :icon-name="'icon-liuchen2'" :color="'#22C55E'" /></div>
        <span>流程总数量</span>
      </div>
      <div ref="pieChartRef" class="main"></div>
      <div class="chart-name">
        <span class="text">RPA流程总数</span>
        <span class="sum">{{ processTotal }}</span>
      </div>
    </div>
    <!-- 柱状图 -->
    <FlowPersonalStats
      :dept-id="props.deptId"
      :start-date="props.startDate"
      :end-date="props.endDate"
      style="width: 0"
    ></FlowPersonalStats>
  </div>
</template>
<style lang="scss" scoped>
.container-box {
  display: flex;
  gap: 8px;

  .left-chart {
    position: relative;

    box-sizing: border-box;
    width: 400px;
    padding: 16px;

    background-color: #fff;

    .title {
      display: flex;
      align-items: center;

      height: 20px;

      font-size: 14px;
      line-height: 20px;

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 20px;
        height: 20px;
        margin-right: 4px;
        border-radius: 50%;

        background: rgb(34 197 94 / 15%);

        > .svg-icon {
          transform: translate(1px, -1px);
          width: 12px;
          height: 12px;
        }
      }
    }

    .main {
      width: 100%;
      height: 255px;
    }

    .chart-name {
      position: absolute;
      top: calc(50% - 12px);
      left: 94px;

      display: flex;
      flex-direction: column;
      gap: 4px;

      .text {
        font-size: 12px;
        color: #737373;
      }

      .sum {
        font-size: 24px;
        font-weight: 700;
        color: #38363c;
        text-align: center;
      }
    }
  }
}
</style>
