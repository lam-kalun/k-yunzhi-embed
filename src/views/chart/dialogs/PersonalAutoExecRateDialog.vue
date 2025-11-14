<script setup lang="ts">
import { type Ref, nextTick, onMounted, reactive, ref } from 'vue'
import type { EChartsOption, SeriesOption } from 'echarts'

import { getDateMonthList } from '@/utils/format'

import type { IFlowInfo } from '../flowStatsTwo.vue'
import { type IRowItem } from '../personalFlowStats/PersonalAutoExecRate.vue'

import ChartItem from './components/ChartItem.vue'

const emit = defineEmits(['update:visible'])
const { flowInfoMap, tableData, endDate, rowsData, startDate } = defineProps<{
  tableData: any
  rowsData: IRowItem[]
  flowInfoMap: Map<string, IFlowInfo>
  startDate: string
  endDate: string
}>()

onMounted(() => {
  nextTick(() => {
    initWindow()
  })
})

const containerRef: Ref<HTMLDivElement | undefined> = ref()

/** 取消及点击x事件 */
function cancel() {
  emit('update:visible', false)
}

interface IChartItem {
  title: string
  options: EChartsOption
}
const showUserItemList: IChartItem[] = reactive([])
type IUserMap = Map<string, { execCountList: number[]; autoCountList: number[] }>

/** 初始化页面 */
function initWindow() {
  const monthList = getDateMonthList(startDate, endDate)
  const userMap: IUserMap = new Map()
  const table = tableData
  table.first()
  while (!table.eof()) {
    const flowId = table.s('FlowId')
    const userName = flowInfoMap.get(flowId)?.userName || '其他'

    let obj = userMap.get(userName)
    if (!obj) {
      obj = {
        execCountList: monthList.map(() => 0),
        autoCountList: monthList.map(() => 0),
      }
      userMap.set(userName, obj)
    }
    const month = table.s('DBDate').substring(0, 6)
    const index = monthList.indexOf(month)
    if (index !== -1) {
      obj.execCountList[index] = obj.execCountList[index] + table.i('ExecCount')
    }
    table.next()
  }

  // 自动次数
  for (let i = 0; i < rowsData.length; i++) {
    const { DataBaseName: dbDate, FlowID: flowId, iCount } = rowsData[i]
    const userName = flowInfoMap.get(flowId)?.userName || '其他'

    let obj = userMap.get(userName)
    if (!obj) {
      obj = {
        execCountList: monthList.map(() => 0),
        autoCountList: monthList.map(() => 0),
      }
      userMap.set(userName, obj)
    }
    const month = dbDate.substring(0, 6)
    const index = monthList.indexOf(month)
    if (index !== -1) {
      obj.autoCountList[index] = obj.autoCountList[index] + iCount
    }
  }

  loadData(userMap, monthList)
}

/**
 * 加载数据
 *
 * @param userMap 用户与其执行数据的对应关系
 * @param monthList 月份列表
 */
async function loadData(userMap: IUserMap, monthList: string[]) {
  const itemList = [...userMap.keys()]
  for (let i = 0; i < itemList.length; i++) {
    const userName = itemList[i]
    const { execCountList, autoCountList } = userMap.get(userName)!
    const autoRateList: string[] = []

    for (let j = 0; j < monthList.length; j++) {
      const execCount = execCountList[j]
      const autoCount = autoCountList[j]
      const autoRate = execCount === 0 ? 0 : (autoCount / execCount) * 100
      autoRateList.push((autoRate > 100 ? 100 : autoRate).toFixed(2))
    }

    const options = getOptions(userName, monthList, autoRateList)
    showUserItemList.push({ title: userName, options })
  }
}

/**
 * 获取 ECharts 配置
 *
 * @param userName 用户名称
 * @param xAxisData x 轴数据
 * @param yAxisData y 轴数据
 * @returns ECharts 配置
 */
function getOptions(userName: string, xAxisData: string[], yAxisData: string[]): EChartsOption {
  return {
    color: ['#3398DB'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        // 坐标轴指示器，坐标轴触发有效
        // 默认为直线，可选为：'line' | 'shadow'
        type: 'shadow',
      },
    },
    legend: {
      data: [userName],
      left: 0,
      top: 0,
      formatter() {
        return `[${userName}]`
      },
    },
    grid: {
      top: '70px',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        data: xAxisData,
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          rotate: -30,
        },
      },
    ],
    yAxis: {
      name: '',
      type: 'value',
      show: true,
      splitLine: {
        show: false,
      },
      splitNumber: 1,
    },
    series: [
      {
        name: userName,
        type: 'line',
        data: yAxisData,
        // barWidth: 20,
        label: {
          show: true,
          position: 'top',
          formatter: ({ value }) => {
            return value + ''
          },
        },
        tooltip: {
          valueFormatter(value: string) {
            return value + ' %'
          },
        },
      } as SeriesOption,
    ],
  }
}
</script>
<template>
  <!-- @close：点击xx时的事件， 我们要手动将visible设置为false -->
  <el-dialog
    top="50px"
    :close-on-click-modal="false"
    :model-value="true"
    title="个人流程自动执行率详细"
    width="90vw"
    @close="cancel"
  >
    <div ref="containerRef" class="container">
      <div v-if="showUserItemList.length === 0" class="empty-div">没有数据</div>
      <div v-else class="infinite-list" style="overflow: auto">
        <template v-for="{ title, options } in showUserItemList" :key="title">
          <ChartItem class="infinite-list-item" :echarts-options="options" :title="title" />
        </template>
      </div>
    </div>
    <!-- 弹窗按钮 -->
    <template #footer>
      <div class="footer-div">
        <k-button @click="cancel">关闭</k-button>
      </div>
    </template>
  </el-dialog>
</template>
<style lang="scss" scoped>
.infinite-list {
  display: flex;
  flex-flow: row wrap;
  gap: 16px;

  height: calc(100vh - 250px);
  padding-left: 20px;

  .infinite-list-item {
    width: calc(50% - 20px);
    height: 300px;

    // border: 1px solid #eee;
  }
}

.footer-div {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-div {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}
</style>
