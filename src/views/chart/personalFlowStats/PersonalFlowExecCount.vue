<script setup lang="ts">
import { computed } from 'vue'

import ChartAndTable from '../components/ChartAndTable.vue'

const props = defineProps<{
  data: {
    execCount: number
    scenesName: string
  }[]
}>()

const dataOrderByExecCountDesc = computed(() => props.data.slice().sort((a, b) => b.execCount - a.execCount))
</script>

<template>
  <ChartAndTable
    title="个人流程执行次数"
    :x-axis-data="dataOrderByExecCountDesc.map(({ execCount }) => execCount)"
    :y-axis-data="dataOrderByExecCountDesc.map(({ scenesName }) => scenesName)"
    item-name="执行次数"
    unit="次"
    x-axis-name="次"
  />
</template>
