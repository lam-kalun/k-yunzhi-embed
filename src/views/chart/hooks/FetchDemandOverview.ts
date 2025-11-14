import { type Ref, nextTick, reactive, watch } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'

import { type Row } from '../components/StatsHeadFilter.vue'

type IProps = {
  currentDeptRow: Ref<Row>
  currentDate: Ref<[string, string]>
  isLoading: Ref<boolean>
}

type DemandOverview = {
  userId: string
  userName: string
  addCount: number
  onlineCount: number
}

/**
 * 获取需求概览
 *
 * @param props 页面状态
 * @returns 需求概览列表，以及用户 id 和名称的对应关系
 */
export default function useFetchDemandOverview(props: IProps) {
  const { currentDate, currentDeptRow, isLoading } = props
  const demandOverviewList = reactive<DemandOverview[]>([])
  // 用户id获取到用户的名称
  const userIdAndNameMap = reactive(new Map<string, string>())

  watch(
    () => {
      return [currentDeptRow?.value?.id, ...currentDate.value].join('_')
    },
    () => {
      fetchData()
    },
  )

  /** 获取数据 */
  function fetchData() {
    if (!currentDate.value.every(Boolean)) return
    isLoading.value = true
    callServerFunc(
      'demo',
      'demo_getPersonalDemandInfo',
      { startDate: currentDate.value[0], endDate: currentDate.value[1], roleId: currentDeptRow.value.id },
      { isShowLoading: false, awaitTime: true },
    ).then(({ data }) => {
      type UserAsCountInfo = Record<
        string,
        {
          userName: string
          addCount: number
          onlineCount: number
        }
      >
      const userAsCountInfo = {} as UserAsCountInfo
      const addTable = new SQLTable((data as any).QueryAddNewDemand)
      addTable.first()
      while (!addTable.eof()) {
        const userName = addTable.s('UserName') || '其他'
        const userId = addTable.s('UserId')
        userIdAndNameMap.set(userId, userName)
        let obj = userAsCountInfo[userId]
        if (!obj) {
          obj = {
            userName,
            addCount: 0,
            onlineCount: 0,
          }
          userAsCountInfo[userId] = obj
        }
        obj.addCount = addTable.i('iCount')
        addTable.next()
      }

      const onlineTable = new SQLTable((data as any).QueryOnlineDemand)
      onlineTable.first()
      while (!onlineTable.eof()) {
        const userName = onlineTable.s('UserName') || '其他'
        const userId = onlineTable.s('UserId')
        userIdAndNameMap.set(userId, userName)
        let obj = userAsCountInfo[userId]
        if (!obj) {
          obj = {
            userName,
            addCount: 0,
            onlineCount: 0,
          }
          userAsCountInfo[userId] = obj
        }
        obj.onlineCount = onlineTable.i('iCount')
        onlineTable.next()
      }
      demandOverviewList.length = 0
      demandOverviewList.push(...Object.entries(userAsCountInfo).map(([userId, obj]) => ({ userId, ...obj })))
      nextTick(() => {
        isLoading.value = false
      })
    })
  }

  return {
    demandOverviewList,
    userIdAndNameMap,
  }
}
