<script setup>
import { ref } from 'vue'

import StatsHeadFilter from './components/StatsHeadFilter.vue'
import DemandCount from './flowStats/DemandCount.vue'
import FlowCount from './flowStats/FlowCount.vue'
import FlowExecCount from './flowStats/FlowExecCount.vue'
import FlowExecTime from './flowStats/FlowExecTime.vue'

// 全局条件 - 当前选择的日期
const currentDate = ref(['', ''])
// 当前选中的部门信息
const currentDepRow = ref({ id: '', pid: '' })
// 先加载顶部过滤器再加载下面的统计图
const isLoadFinisHeadFilter = ref(false)
</script>
<template>
  <AppContainer v-loading="!isLoadFinisHeadFilter" class="app-container">
    <StatsHeadFilter
      v-model="currentDepRow"
      v-model:current-date="currentDate"
      @load-finish="
        () => {
          isLoadFinisHeadFilter = true
        }
      "
    />
    <div v-if="isLoadFinisHeadFilter" class="main-container">
      <!-- 流程数量统计 -->
      <FlowCount
        :dept-id="currentDepRow.id"
        :dept-type="currentDepRow.type"
        :dept-pid="currentDepRow.pid"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
        class="flow-count"
      ></FlowCount>
      <!-- 流程执行数据统计 -->
      <FlowExecCount
        :dept-id="currentDepRow.id"
        :dept-pid="currentDepRow.pid"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
      ></FlowExecCount>
      <!-- 需求统计 -->
      <DemandCount
        :dept-id="currentDepRow.id"
        :dept-pid="currentDepRow.pid"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
      ></DemandCount>
      <!-- 流程执行时长统计 -->
      <FlowExecTime
        ref="flowExecTimeRef"
        :dept-id="currentDepRow.id"
        :dept-pid="currentDepRow.pid"
        :start-date="currentDate[0]"
        :end-date="currentDate[1]"
      ></FlowExecTime>
    </div>
  </AppContainer>
</template>
<style lang="scss" scoped>
.app-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #eee;

  .main-container {
    overflow: auto;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 16px;
  }
}
</style>
