<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonalOnlineDemandDetailDialog from '@/views/chart/dialogs/PersonalOnlineDemandDetailDialog.vue'
import ChartAndTable from '../components/ChartAndTable.vue'

const props = defineProps<{
  data: {
    onlineCount: number
    userName: string
  }[]
  startDate: string
  endDate: string
  deptId: string | undefined
}>()

const dataOrderByOnlineCountDesc = computed(() =>
  props.data.slice().sort((a, b) => Number(b.onlineCount) - Number(a.onlineCount)),
)

const isShowDetail = ref(false)

/** 显示详情 */
function showDetail() {
  isShowDetail.value = true
}
</script>

<template>
  <ChartAndTable
    title="个人上线RPA"
    :is-show-detail="true"
    :x-axis-data="dataOrderByOnlineCountDesc.map(({ onlineCount }) => onlineCount)"
    :y-axis-data="dataOrderByOnlineCountDesc.map(({ userName }) => userName)"
    item-name="上线RPA"
    unit="个"
    x-axis-name="个"
    series-color="#0b7d0bba"
    @look-detail="showDetail()"
  />

  <PersonalOnlineDemandDetailDialog
    v-if="isShowDetail"
    v-model:visible="isShowDetail"
    :start-date="startDate"
    :end-date="endDate"
    :dept-id="deptId"
  />
</template>
