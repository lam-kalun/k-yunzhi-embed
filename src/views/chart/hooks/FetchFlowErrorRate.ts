import { type Ref, reactive, watch } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'

import { numFixedExcept0 } from '@/utils/format'

import { type Row } from '../components/StatsHeadFilter.vue'

type IProps = {
  currentDeptRow: Ref<Row>
  currentDate: Ref<[string, string]>
  isLoading: Ref<boolean>
}

type flowErrorRate = { errorRate: string; execCount: number; succCount: number; scenesName: string }

/**
 * 获取流程报错率
 *
 * @param props 页面状态
 * @returns 流程报错率列表，以及用户名称和流程 id 的对应关系
 */
export default function useFetchFlowErrorRate(props: IProps) {
  const { currentDate, currentDeptRow, isLoading } = props
  const flowErrorRateList = reactive<flowErrorRate[]>([])
  // 用户名称对应的流程ID列表
  const userNameAsFlowIDList = reactive(new Map<string, string[]>())

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
    isLoading.value = true
    callServerFunc(
      'demo',
      'demo_getFlowErrorRate',
      { startDate: currentDate.value[0], endDate: currentDate.value[1], roleId: currentDeptRow.value.id },
      { awaitTime: true },
    )
      .then(({ data }) => {
        const flowItemList: { flowId: string; scenesName: string }[] = JSON.parse((data as any).scenesNameRows)
        const flowIdAsScenesName: Record<string, string> = {}
        for (let i = 0; i < flowItemList.length; i++) {
          const { flowId, scenesName } = flowItemList[i]
          flowIdAsScenesName[flowId] = scenesName

          // 保存用户对应的流程ID列表
          let flowIdList = userNameAsFlowIDList.get(scenesName || '其他')
          if (!flowIdList) {
            flowIdList = []
            userNameAsFlowIDList.set(scenesName || '其他', flowIdList)
          }
          // 如果不存在则添加进去
          flowIdList.indexOf(flowId) === -1 && flowIdList.push(flowId)
        }

        const scenesNameAsCountInfo: Record<string, Omit<flowErrorRate, 'errorRate'>> = {}
        const table = new SQLTable((data as any).k_smart_flow_detail_query)
        table.first()
        while (!table.eof()) {
          const flowId = table.s('FlowID')
          const execCount = table.i('ExecCount')
          const succCount = table.i('SuccCount')
          const scenesName = flowIdAsScenesName[flowId] || '其他'

          let obj = scenesNameAsCountInfo[scenesName]
          if (!obj) {
            obj = {
              execCount: 0,
              succCount: 0,
              scenesName,
            }
            scenesNameAsCountInfo[scenesName] = obj
          }

          obj.execCount += execCount
          obj.succCount += succCount
          table.next()
        }
        const itemArr = Object.values(scenesNameAsCountInfo).map((item) => {
          const { execCount, succCount } = item
          const errorRate = numFixedExcept0(((execCount - succCount) / execCount) * 100)
          return { ...item, errorRate }
        })
        flowErrorRateList.length = 0
        flowErrorRateList.push(...itemArr)
      })
      .finally(() => {
        isLoading.value = false
      })
  }

  return {
    flowErrorRateList,
    userNameAsFlowIDList,
  }
}
