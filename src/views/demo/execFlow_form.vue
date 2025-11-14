<script setup>
import { onMounted, reactive } from 'vue'
import { SQLTable, callServerFunc, hexToString, parseWebJson } from '@ksware/micro-lib-web-temp'
import { ElMessage } from 'element-plus'

import { startFlow } from './execFlow.js'

const formData = reactive({ flowId: '' })

const flowListOptions = reactive([])

onMounted(() => {
  initWindow()
})

/** 初始化页面，获取所有流程列表信息 */
function initWindow() {
  callServerFunc('TFlowDM', 'GetFlowList', {}).then(({ data }) => {
    const flowRowMap = new Map()
    const table = new SQLTable(data.k_flow_group)
    table.first()
    // 遍历获取流程分组
    while (!table.eof()) {
      const pid = table.s('PID')
      const id = table.s('ID')
      const row = {}
      row.label = table.s('Name')
      row.value = id
      row.folder = true
      row.children = []
      if (pid) {
        const pRow = flowRowMap.get(pid)
        if (pRow) {
          pRow.children.push(row)
        }
      } else {
        flowListOptions.push(row)
      }
      flowRowMap.set(id, row)
      table.next()
    }

    const flowTable = new SQLTable(data.k_flow_info)
    flowTable.first()
    // 遍历获取流程
    while (!flowTable.eof()) {
      const pid = flowTable.s('PID')
      const id = flowTable.s('FlowID')
      const row = {}
      row.label = flowTable.s('FlowName')
      row.value = id
      if (pid) {
        const pRow = flowRowMap.get(pid)
        if (pRow) {
          pRow.children.push(row)
        }
      } else {
        flowListOptions.push(row)
      }
      flowTable.next()
    }

    flowRowMap.forEach((item) => {
      if (item.folder && item.children.length === 0) {
        item.disabled = true
      }
    })
  })
}

const flowParamList = reactive([])

/**
 * 执行流程选项改变的回调
 *
 * @param flowIdArr 流程 id 列表
 */
function onSelectFlow(flowIdArr) {
  // 取流程ID
  const id = flowIdArr.at(-1)
  const data = {
    FlowID: id,
    LoadQuoteFlow: true,
    WebJson: true,
    viewtype: 'view',
  }

  callServerFunc('TFlowDM', 'GetFlowInfo', data).then(({ data }) => {
    // 获取流程图信息，流程图数据类型为二进制流，需要用hexToString 解析
    const obj = parseWebJson(hexToString(data.Obj.Data))
    const flowObj = parseWebJson(obj[2])
    const flowData = parseWebJson(flowObj.Data)

    /** 手动执行显示参数列表 */
    const askParams = flowData.AskParams || false
    /** 流程参数个数 */
    const paramCount = flowData.ParamCount || 0
    flowParamList.length = 0
    if (askParams) {
      for (let i = 0; i < paramCount; i++) {
        const item = {}
        item.name = flowData[`Param${i}Name`]
        item.value = flowData[`Param${i}Value`]
        flowParamList.push(item)
      }
    }
  })
}

/** 开始执行流程 */
function onStartFlow() {
  const id = formData.flowId.at(-1)

  // 拼接有多少个流程参数
  const paramList = []
  for (let i = 0; i < flowParamList.length; i++) {
    const item = flowParamList[i]
    paramList.push({
      key: item.name,
      value: item.value,
    })
  }

  startFlow(id, paramList).then(() => {
    ElMessage.success('流程已加入队列')
  })
}
</script>
<template>
  <AppContainer ref="containerDivRef" class="app-container">
    <div class="title-div"><h3>执行流程模板</h3></div>
    <el-form ref="ruleFormRef" style="width: 700px" label-width="120px" status-icon label-position="top">
      <el-form-item label="选择流程">
        <el-cascader
          v-model="formData.flowId"
          style="width: 100%"
          placeholder="请选择要执行的流程"
          :options="flowListOptions"
          filterable
          @change="onSelectFlow"
        >
          <template #default="{ data }">
            <div class="cascader-content">
              <!-- 流程目录显示 -->
              <span v-if="data.folder">
                <svg-icon icon-name="icon-wenjianyi"></svg-icon>
                {{ data.label }}
              </span>
              <!-- 流程节点显示 -->
              <span v-else>
                <svg-icon icon-name="icon-liuchen2"></svg-icon>
                {{ data.label }}
              </span>
            </div>
          </template>
        </el-cascader>
      </el-form-item>
      <el-form-item v-if="flowParamList.length" label="流程参数列表">
        <el-card class="box-card">
          <template v-for="item in flowParamList" :key="item.name">
            <el-form-item class="p-el-form-item" :label="item.name">
              <el-input v-model="item.value" :placeholder="`请填写流程参数${item.name}`"></el-input>
            </el-form-item>
          </template>
        </el-card>
      </el-form-item>

      <el-form-item>
        <k-button size="small" :disabled="!formData.flowId" type="primary" main @click="onStartFlow">开始执行</k-button>
      </el-form-item>
    </el-form>
  </AppContainer>
</template>
<style lang="scss" scoped>
.app-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  .title-div {
    display: block;
    width: 100%;
    text-align: center;
  }

  .box-card {
    box-sizing: border-box;
    width: 100%;
    box-shadow: none;

    :deep(.el-card__body) {
      padding-top: 0;
    }

    .p-el-form-item {
      margin-top: 8px;
    }
  }
}

.cascader-content > span {
  display: flex;
  gap: 4px;
  align-items: center;
}
</style>
