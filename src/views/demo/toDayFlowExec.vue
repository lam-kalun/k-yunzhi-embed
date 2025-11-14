<script setup>
import { onMounted, reactive } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'

// 流程执行数据
const tableData = reactive([])

onMounted(() => {
  initWindow()
})

/** 初始化页面 */
function initWindow() {
  tableData.length = 0
  callServerFunc('demo', 'getTodyFlowExec', {}).then(({ data }) => {
    const table = new SQLTable(data.flowExecTable)
    const rows = []
    table.first()
    while (!table.eof()) {
      const row = {}
      row.id = table.s('ID')
      row.name = table.s('FlowName')
      row.sTime = table.s('BeginTime')
      row.eTime = table.s('EndTime')
      row.remark = table.s('Remark')
      rows.push(row)
      table.next()
    }
    tableData.push(...rows)
  })
}
</script>
<template>
  <AppContainer ref="containerDivRef">
    <div class="btn-tool">
      <k-button :icon="Refresh" @click="initWindow">刷新</k-button>
    </div>
    <div class="table-div">
      <vxe-table
        ref="tableRef"
        border
        height="auto"
        :column-config="{ resizable: true }"
        :tree-config="{ transform: true, rowField: 'id', parentField: 'pid', trigger: 'cell' }"
        :data="tableData"
      >
        <vxe-column field="name" title="流程名称"></vxe-column>
        <vxe-column field="sTime" align="center" title="开始时间" width="200"></vxe-column>
        <vxe-column field="eTime" align="center" title="结束时间" width="200"></vxe-column>
        <vxe-column field="remark" align="center" title="执行状态">
          <template #default="{ row }">
            <el-tag :type="/成功/.test(row.remark) ? 'success' : 'danger'">{{ row.remark }}</el-tag>
          </template>
        </vxe-column>
        <vxe-column width="120" align="center" field="opt" title="操作">
          <template #default="{ row }">
            <k-button :disabled="true" @click="onDelUser(row)">删除</k-button>
          </template>
        </vxe-column>
      </vxe-table>
    </div>
  </AppContainer>
</template>
<style lang="scss" scoped>
.btn-tool {
  padding: 0 0 12px;
}

.table-div {
  height: calc(100% - 37px);
}
</style>
