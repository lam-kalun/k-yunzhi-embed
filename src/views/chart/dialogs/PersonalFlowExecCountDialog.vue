<script setup lang="ts">
import { type Ref, nextTick, onMounted, reactive, ref } from 'vue'
import { SQLTable } from '@ksware/micro-lib-web-temp'
import type { EChartsOption } from 'echarts'

import { getDateMonthList } from '@/utils/format'

import type { IFlowInfo } from '../flowStatsTwo.vue'

import ChartItem from './components/ChartItem.vue'

const emit = defineEmits(['update:visible'])
const { flowInfoMap, tableData, endDate, startDate } = defineProps<{
  tableData: any
  flowInfoMap: Map<string, IFlowInfo>
  startDate: string
  endDate: string
}>()

onMounted(() => {
  nextTick(() => {
    loadData()
  })
})

const elDialogRef: Ref<HTMLDivElement | undefined> = ref()

/** 取消及点击x事件 */
function cancel() {
  emit('update:visible', false)
}

interface IChartItem {
  title: string
  options: EChartsOption
}
const showUserItemList: IChartItem[] = reactive([])

type IUserMap = Map<string, number[]>

/** 加载数据 */
async function loadData() {
  const { userMap, monthList } = getInitData()

  const itemList = [...userMap.keys()]
  for (let i = 0; i < itemList.length; i++) {
    const userName = itemList[i]
    const execTimeList = userMap.get(userName)!
    const options = getOptions(userName, monthList, execTimeList)
    showUserItemList.push({ title: userName, options })
  }
}

/**
 * 获取初始化的数据
 *
 * @returns 初始化的数据
 */
function getInitData(): { userMap: IUserMap; monthList: string[] } {
  const table = new SQLTable(tableData)

  const monthList = getDateMonthList(startDate, endDate)

  const userMap: IUserMap = new Map()
  table.first()
  while (!table.eof()) {
    const flowId = table.s('FlowId')
    const userName = flowInfoMap.get(flowId)?.userName || '其他'
    const month = table.s('DBDate').replace(/-/g, '').substring(0, 6)
    let execList = userMap.get(userName)
    if (!execList) {
      execList = monthList.map(() => 0)
      userMap.set(userName, execList)
    }
    // 累加次数
    const index = monthList.indexOf(month)
    execList[index] = execList[index] + table.i('ExecCount')
    table.next()
  }
  return { userMap, monthList }
}

/**
 * 获取 ECharts 配置
 *
 * @param userName 用户名称
 * @param xAxisData x 轴数据
 * @param yAxisData y 轴数据
 * @returns ECharts 配置
 */
function getOptions(userName: string, xAxisData: string[], yAxisData: number[]): EChartsOption {
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
      name: '单位：次',
      type: 'value',
      show: true,
      splitLine: {
        show: false,
      },
      splitNumber: 1,
      max: Math.ceil(Math.max(...yAxisData.map((count) => count)) * 1.1),
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
            return value + ' '
          },
        },
      },
    ],
  }
}
</script>
<template>
  <!-- @close：点击xx时的事件， 我们要手动将visible设置为false -->
  <el-dialog
    ref="elDialogRef"
    top="50px"
    :close-on-click-modal="false"
    :model-value="true"
    title="个人流程执行次数详细"
    width="90vw"
    @close="cancel"
  >
    <div v-if="showUserItemList.length === 0" class="empty-div">没有数据</div>
    <div v-else class="infinite-list" style="overflow: auto">
      <template v-for="{ title, options } in showUserItemList" :key="title">
        <ChartItem class="infinite-list-item" :echarts-options="options" :title="title" />
      </template>
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
