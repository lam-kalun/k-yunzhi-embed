<script setup lang="ts">
import { type Ref, nextTick, onMounted, reactive, ref } from 'vue'
import { callServerFunc } from '@ksware/micro-lib-web-temp'
import type { EChartsOption } from 'echarts'

import { getDateMonthList } from '@/utils/format'

import ChartItem from './components/ChartItem.vue'

const emit = defineEmits(['update:visible'])
const props = defineProps<{
  userNameList: string[]
  startDate: string
  endDate: string
}>()

onMounted(() => {
  allUserList.push(...props.userNameList)
  nextTick(() => {
    loadData(1000)
  })
})

const dialogContainerRef: Ref<HTMLDivElement | undefined> = ref()

/** 取消及点击x事件 */
function cancel() {
  emit('update:visible', false)
}

interface IChartItem {
  title: string
  options: EChartsOption
}
const allUserList: string[] = []
const showUserItemList: IChartItem[] = reactive([])

type IUserMap = Map<string, { countList: string[]; startCount: number }>

/**
 * 加载数据
 *
 * @param count 数据数量
 */
async function loadData(count = 1) {
  if (allUserList.length === 0) return
  const itemList = allUserList.splice(0, count)

  const { userMap, monthList } = await getUserFlowCount(itemList)

  for (let i = 0; i < itemList.length; i++) {
    const userName = itemList[i]
    const obj = userMap.get(userName)
    if (obj) {
      const { countList, startCount } = obj
      let iStartCount = startCount
      const countListNew = countList.map((count) => {
        iStartCount += parseInt(count)
        return iStartCount
      })
      const options = getOptions(userName, monthList, countListNew)
      showUserItemList.push({ title: userName, options })
    }
  }
}

/**
 * 获取用户流程数量数据
 *
 * @param userList 用户列表
 * @returns 用户流程数量数据
 */
async function getUserFlowCount(userList: string[]): Promise<{ userMap: IUserMap; monthList: string[] }> {
  const { data }: any = await callServerFunc(
    'demo',
    'getFlowCountByUserNameList',
    {
      userList: JSON.stringify(userList),
      startDate: props.startDate,
      endDate: props.endDate,
    },
    { loadingEl: dialogContainerRef.value },
  )
  const rows: { createTime: string; scenesName: string }[] = JSON.parse(data.rows)
  const monthList = getDateMonthList(props.startDate, props.endDate)

  const userMap = new Map()
  userList.forEach((userName) => {
    userMap.set(userName, {
      countList: monthList.map(() => 0),
      // 从开始时间算起，已经有多少个流程
      startCount: 0,
    })
  })

  for (let i = 0; i < rows.length; i++) {
    const { createTime, scenesName: name } = rows[i]
    const obj = userMap.get(name)
    const month = createTime.replace(/-/g, '').substring(0, 6)
    const index = monthList.indexOf(month)
    // 数据为开始查询前的数据
    if (month < monthList[0]) {
      obj.startCount++
    } else if (index !== -1) {
      obj.countList[index]++
    }
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
    title="个人流程总数详细"
    width="90vw"
    @close="cancel"
  >
    <div ref="dialogContainerRef" class="dialog-container">
      <div v-if="showUserItemList.length === 0" class="empty-div">没有数据</div>
      <div v-else v-infinite-scroll="loadData" class="infinite-list" style="overflow: auto">
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
