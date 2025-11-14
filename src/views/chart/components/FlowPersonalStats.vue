<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { callServerFunc } from '@ksware/micro-lib-web-temp'
import * as echarts from 'echarts'
import { throttle } from 'lodash-es'

const props = defineProps({
  deptId: String,
  startDate: String,
  endDate: String,
})

let chart, personChart
const chartRef = ref('')
const personChartRef = ref('')
// 个人拥有流程的数据
const personPossessData = reactive([])
// 个人搜索值
const searchArr = ref([])
const flowPersonalStatsRef = ref('')

/** 当前显示具体人 */
const currentPerson = ref('')

// 搜索
watch(searchArr, (valueArr) => {
  let res = []
  if (valueArr.length === 0) {
    initChart(personPossessData)
  } else {
    res = personPossessData.filter((item) => {
      let bool = false
      for (let i = 0; i < valueArr.length; i++) {
        if (item.name.startsWith(valueArr[i])) {
          bool = true
          break
        }
      }
      return bool
    })
    initChart(res)
  }
})

watch(
  () => {
    return props.deptId + props.startDate + props.endDate
  },
  () => {
    initWindow()
  },
)

onMounted(() => {
  initWindow()
  new ResizeObserver(throttle(() => chart?.resize(), 50)).observe(chartRef.value)
  new ResizeObserver(throttle(() => personChart?.resize(), 50)).observe(personChartRef.value)
})

/** 初始化页面 */
function initWindow() {
  // 清空当前已经过滤的选项
  searchArr.value.length = 0
  // 查询时间范围
  const { startDate = '', endDate = '' } = props
  callServerFunc(
    'demo',
    'demo_getFowCount',
    { roleId: props.deptId, startDate, endDate },
    { loadingEl: flowPersonalStatsRef.value, awaitTime: true },
  ).then(({ data }) => {
    const rows = JSON.parse(data.rows)
    personPossessData.length = 0
    personPossessData.push(...rows)
    initChart(personPossessData)
  })
}

// 初始化柱状图
const initChart = (data) => {
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  const option = {
    tooltip: {
      axisPointer: {
        show: true,
        type: 'shadow',
      },
    },
    grid: {
      top: '50px',
      left: 'center',
      width: '90%',
      height: '60%',
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLine: {
        show: true,
        lineStyle: {
          color: '#9E9E9E',
        },
      },
      axisLabel: {
        interval: 0,
        rotate: 30,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: '单位:个',
      position: 'left',
      min: 0,
      axisLine: {
        show: true,
        lineStyle: {
          color: '#9E9E9E',
        },
      },
      splitLine: {
        show: false,
      },
      axisTick: {
        show: true,
      },
    },
    dataZoom: {
      /** 滑动条类型 */
      type: 'slider',
      show: data.length > 20,
      startValue: 0,
      endValue: 20,
      height: 10,
      // 距离图表区域下边的距离
      bottom: 5,
      // 拖拽时是否显示详情
      showDetail: false,
      // 是否在组件中显示数据阴影
      showDataShadow: false,
      borderColor: 'transparent',
      // 锁定视图
      zoomLock: true,
      // 不可缩放
      brushSelect: false,
      handleStyle: {
        // 手柄样式
        opacity: 0,
      },
    },
    series: [
      {
        barWidth: 20,
        data: data.map((item) => item.count),
        type: 'bar',
        label: { show: true, position: 'top', formatter: '{c}个' },
        itemStyle: {
          color: '#69B4FF',
        },
        barCategoryGap: '80%',
      },
    ],
  }

  chart.setOption(option)
}

/** 返回 */
function goBack() {
  currentPerson.value = ''
}
</script>
<template>
  <div ref="flowPersonalStatsRef" class="flow-personal-stats">
    <div class="title">
      <div class="icon"><SvgIcon :icon-name="'icon-liuchen2'" :color="'#22C55E'" /></div>
      <span>个人流程拥有数</span>
    </div>
    <!-- 搜索 -->
    <div v-show="!currentPerson" class="search-div">
      <el-select
        v-model="searchArr"
        filterable
        size="default"
        :prefix-icon="Search"
        collapse-tags
        placeholder="请输入姓名"
        :max-collapse-tags="2"
        multiple
        clearable
        style="width: 300px"
      >
        <el-option v-for="item in personPossessData" :key="item.name" :label="item.name" :value="item.name" />
      </el-select>
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
.flow-personal-stats {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 8px;

  box-sizing: border-box;
  height: 315px;
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

  .search-div {
    padding-left: 24px;
  }

  .person-tool {
    position: relative;
    z-index: 10;
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
    width: 100%;
    height: 215px;
  }
}
</style>
