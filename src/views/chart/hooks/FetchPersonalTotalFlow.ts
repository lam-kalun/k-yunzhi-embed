import { type Ref, reactive, watch } from 'vue'
import { callServerFunc } from '@ksware/micro-lib-web-temp'

import { type Row } from '../components/StatsHeadFilter.vue'

type IProps = {
  currentDeptRow: Ref<Row>
  currentDate: Ref<[string, string]>
  isLoading: Ref<boolean>
}

export type PersonalTotalFlowList = {
  name: string
  count: number
}[]

/**
 * 获取个人总流程
 *
 * @param props 页面状态
 * @returns 个人总流程
 */
export default function useFetchPersonalTotalFlow(props: IProps) {
  const { currentDate, currentDeptRow, isLoading } = props
  const personalTotalFlowList = reactive<PersonalTotalFlowList>([])

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
    isLoading.value = false
    callServerFunc(
      'demo',
      'demo_getFowCount',
      { roleId: currentDeptRow.value.id, startDate: currentDate.value[0], endDate: currentDate.value[1] },
      { awaitTime: true },
    )
      .then(({ data }) => {
        personalTotalFlowList.length = 0
        personalTotalFlowList.push(...(JSON.parse((data as any).rows) as PersonalTotalFlowList))
      })
      .finally(() => {
        isLoading.value = false
      })
  }

  return personalTotalFlowList
}
