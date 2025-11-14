<script setup lang="ts">
import { computed, ref } from 'vue'

import PersonalAddDemandDetailDialog from '@/views/chart/dialogs/PersonalAddDemandDetailDialog.vue'
import ChartAndTable from '../components/ChartAndTable.vue'

const props = defineProps<{
  data: {
    addCount: number
    userName: string
  }[]
  startDate: string
  endDate: string
  deptId: string | undefined
}>()

const dataOrderByErrorRateDesc = computed(() =>
  props.data.slice().sort((a, b) => Number(b.addCount) - Number(a.addCount)),
)

const isShowDetail = ref(false)

/** 显示详情 */
function showDetail() {
  isShowDetail.value = true
}
</script>

<template>
  <ChartAndTable
    title="个人新增需求"
    :is-show-detail="true"
    :x-axis-data="dataOrderByErrorRateDesc.map(({ addCount }) => addCount)"
    :y-axis-data="dataOrderByErrorRateDesc.map(({ userName }) => userName)"
    item-name="新增需求"
    unit="个"
    x-axis-name="个"
    @look-detail="showDetail()"
  />
  <PersonalAddDemandDetailDialog
    v-if="isShowDetail"
    v-model:visible="isShowDetail"
    :start-date="startDate"
    :end-date="endDate"
    :dept-id="deptId"
  />
</template>
