import { callServerFunc, getGuid, hexToString, parseWebJson } from '@ksware/micro-lib-web-temp'

/**
 * 获取流程执行过的信息
 *
 * @param {string} flowId 流程 id
 * @returns {Promise<{ loading: object | undefined; data: object }>} 流程信息
 */
async function getFlowInfo(flowId) {
  const data = {
    WebJson: true,
    FlowID: flowId,
  }
  return callServerFunc('TFlowDM', 'GetFlowInfo', data)
}

/**
 * 设置流程参数并添加到队列
 *
 * @param {object} data 流程信息
 * @param {string} execId 执行 id
 * @param {{ key: any; value: any }[]} paramList 流程参数列表
 * @returns {Promise<{ loading: object | undefined; data: object }>} “添加流程到队列”接口的响应
 */
async function setFlowParamsAndToQueue(data, execId, paramList) {
  // 获取流程图信息，流程图数据类型为二进制流，需要用hexToString 解析
  const obj = parseWebJson(hexToString(data.Obj.Data))
  let flowData = parseWebJson(obj[2].Data)
  const formData = {
    FlowID: data.FlowID,
    ExecID: execId,
    TaskName: flowData.R_QueueTaskName,
    Data: flowData.R_QueueData,
    iType: 0,
    Level: flowData.R_QueueLevel,
    IdleRobot: flowData.R_IdleRobot,
    WebJson: true,
  }

  // 处理 哪个代理执行
  let R_BUAgentIDs = flowData.R_BUAgentIDs ? `,${flowData.R_BUAgentIDs}` : ''
  if (flowData.R_QueueFlow || flowData.R_AgentID) {
    let robot = `{Robot}{${flowData.R_AgentID}${R_BUAgentIDs}}{${flowData.R_MapIDs}}`
    formData.Robot = robot
  }

  // 处理流程参数
  setFlowParamToPar(formData, paramList)
  return callServerFunc('TRPADM', 'WebAddDataQueue', formData)
}

/**
 * 设置流程参数到vPar里面
 *
 * @param {{
 *   FlowID: any
 *   ExecID: string
 *   TaskName: any
 *   Data: any
 *   iType: number
 *   Level: any
 *   IdleRobot: any
 *   WebJson: boolean
 * }} formData
 *   vPar
 * @param {{ key: any; value: any }[]} paramList paramList 参数数组 : [ { key:'', //参数名称 value:'' , //参数值 type:'file', //可选，
 *   文件参数为file fileId:'' //文件上传后服务器返回的ID } ]
 */
async function setFlowParamToPar(formData, paramList = []) {
  if (paramList.length === 0) return
  const names = []
  const data = {}
  for (let i = 0; i < paramList.length; i++) {
    const item = paramList[i]
    const name = item.key || ''
    const value = item.value || ''
    data[`R_FlowParam_${name}`] = value
    data[`FlowParamsValue_${name}`] = value
    names.push(name)
  }

  data.FlowParamsNames = names
  data.R_FlowParam = names
  formData.TempParamJson = JSON.stringify(data)
}

/**
 * 开始流程
 *
 * @param {string} flowId 流程 id
 * @param {{ key: any; value: any }[]} paramList 流程参数列表
 * @returns {Promise<{ loading: object | undefined; data: object }>} 开始流程接口的响应
 */
export async function startFlow(flowId, paramList = []) {
  const execId = getGuid()
  const { data } = await getFlowInfo(flowId)
  return setFlowParamsAndToQueue(data, execId, paramList)
}
