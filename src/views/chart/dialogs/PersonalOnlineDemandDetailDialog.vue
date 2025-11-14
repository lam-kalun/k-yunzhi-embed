<script setup lang="ts">
import { type Ref, nextTick, onMounted, reactive, ref } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'
import type { EChartsOption } from 'echarts'

import { getDateMonthList } from '@/utils/format'

import ChartItem from './components/ChartItem.vue'

const emit = defineEmits(['update:visible'])
const props = defineProps<{
  startDate: string
  endDate: string
  deptId: string | undefined
}>()

onMounted(() => {
  nextTick(() => {
    initWindow()
  })
})

const dialogContainerRef: Ref<HTMLDivElement | undefined> = ref()

/** 初始化页面 */
async function initWindow() {
  const { data }: any = await callServerFunc(
    'demo',
    'getDemandAddDetail',
    {
      startDate: props.startDate,
      endDate: props.endDate,
      roleId: props.deptId,
    },
    { loadingEl: dialogContainerRef.value },
  )

  const monthList = getDateMonthList(props.startDate, props.endDate)
  const userMap: Map<string, { startCount: number; countList: number[] }> = new Map()

  const table = new SQLTable(data.k_shop_demand_main)
  table.first()
  while (!table.eof()) {
    const userName = table.s('UserName') || '其他'
    const onlineTime = table.s('OnlineTime')
    if (!onlineTime) {
      table.next()
      continue
    }
    const month = onlineTime.replace(/-/g, '').substring(0, 6)
    const index = monthList.indexOf(month)
    let obj = userMap.get(userName)
    if (!obj) {
      obj = {
        startCount: 0,
        countList: monthList.map(() => 0),
      }
      userMap.set(userName, obj)
    }

    // 数据为开始查询前的数据
    if (month < monthList[0]) {
      obj.startCount++
    } else if (index !== -1) {
      obj.countList[index]++
    }
    table.next()
  }

  const userNameList = [...userMap.keys()]
  for (let i = 0; i < userNameList.length; i++) {
    const userName = userNameList[i]
    const obj = userMap.get(userName)
    if (obj) {
      const { countList, startCount } = obj
      let iStartCount = startCount
      const countListNew = countList.map((count: number) => {
        iStartCount += count
        return iStartCount
      })
      const options = getOptions(userName, monthList, countListNew)
      showUserItemList.push({ title: userName, options })
    }
  }
}

/** 取消及点击x事件 */
function cancel() {
  emit('update:visible', false)
}

interface IChartItem {
  title: string
  options: EChartsOption
}

const showUserItemList: IChartItem[] = reactive([])

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
      name: '单位：个',
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
    top="50px"
    :close-on-click-modal="false"
    :model-value="true"
    title="个人需求上线详细"
    width="90vw"
    @close="cancel"
  >
    <div ref="dialogContainerRef" class="dialog-container">
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
