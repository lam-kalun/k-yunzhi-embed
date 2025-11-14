<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonalTotalFlowDetailDialog from '@/views/chart/dialogs/PersonalTotalFlowDetailDialog.vue'
import ChartAndTable from '../components/ChartAndTable.vue'

const props = defineProps<{
  data: {
    name: string
    count: number
  }[]
  startDate: string
  endDate: string
}>()

const dataOrderByCountDesc = computed(() => props.data.slice().sort((a, b) => b.count - a.count))

const userList = computed(() => {
  return props.data.map((item) => item.name).filter((name) => name !== '其他')
})

const isShowDetail = ref(false)

/** 显示详情 */
function showDetail() {
  isShowDetail.value = true
}
</script>

<template>
  <div>
    <ChartAndTable
      title="个人流程总数"
      :is-show-detail="true"
      :x-axis-data="dataOrderByCountDesc.map(({ count }) => count)"
      :y-axis-data="dataOrderByCountDesc.map(({ name }) => name)"
      item-name="流程总数"
      unit="个"
      x-axis-name="个"
      @look-detail="showDetail()"
    />
    <PersonalTotalFlowDetailDialog
      v-if="isShowDetail"
      v-model:visible="isShowDetail"
      :start-date="startDate"
      :end-date="endDate"
      :user-name-list="userList"
    />
  </div>
</template>
