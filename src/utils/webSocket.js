import { ElMessage } from 'element-plus'


// 使用方法
// import { CreateWebSocket } from './utils/webSocket'
// const ws = new CreateWebSocket({
      // tokenKey: 'rpa_micro_Token',
      // onError: options?.onError || (() => {}),
    // })
// ws.init()
// await ws.callServerFunc(
//   'TSystemDM',
//   'GetServerConfigFile',
//   {},
//   (response) => {
//     console.log('ws response:', response.ConfigFile)
//   },
//   {},
// )

// 系统键名
let IDD_Return = '{50043442-8A69-4A6B-A8B5-61F882EDE4F3}'
let IDD_lpGuid = '{12455C51-A578-4538-8105-CF984177BBDD}'

// 初始化文档根路径
window.g_contextRoot = initContextRoot()

let topWindow = getTopWindow()
// window.parentWindow = getParentWindow()

/**
 * 错误回调方法定义
 *
 * @typedef {(error: Error, options: { controlId: string; errorCount: number }) => void} onError
 */


/**
 * 创建 WebSocket 连接
 *
 * @param {object} options 选项
 * @param {string} options.tokenKey 认证参数的键名
 * @param {onError} [options.onError] 连接错误时的回调
 */
export function CreateWebSocket(
  options = {
    tokenKey: 'Token',
    onError: null,
  },
) {
  const _this = this
  topWindow = window.top || window

  // 存储回调函数和请求数据
  const requestDataMap = new Map()

  // 后台返回的连接ID
  let controlId = ''
  // 连续错误次数
  let errorCount = 0
  // 检查连接定时器
  let checkTimer
  // 重连定时器
  let reConnectTimer

  // 获取认证信息
  const wsKey = sessionStorage.getItem('webSocket_Token') || ''
  const token = sessionStorage.getItem(options.tokenKey)

  if (!token && !wsKey) {
    throw { message: 'Token或认证参数缺失!' }
  }

  // WebSocket 实例
  this.ws = null
  // 0未连接，1连接成功，2认证成功
  this.connectState = 0
  this.url = `${location.protocol === 'http:' ? 'ws://' : 'wss://'}${location.host}${window.g_contextRoot ? `/${window.g_contextRoot}` : ''}`
  /** 初始化 WebSocket 连接 */
  this.init = async function () {
    if (!(window.WebSocket || window.MozWebSocket)) {
      throw { message: '警告：当前浏览器不支持WebSocket' }
    }
    await new Promise((resolve, reject) => {
      this.initWs(resolve, reject)
    })

    this.keepAlive()
  }

  /**
   * 初始化 WebSocket
   *
   * @param {Function} resolve 连接成功回调
   * @param {Function} reject 连接失败回调
   * @returns {void}
   */
  this.initWs = function (resolve, reject) {
    if (this.ws) this.ws.close()
    this.ws = new WebSocket(this.url + '/ws')

    this.ws.onopen = function () {
      errorCount = 0
      _this.connectState = 1
      _this.login(resolve, reject)

      // 连接成功重置计数
      topWindow.reconnectReset?.()
    }

    this.ws.onmessage = function (e) {
      _this.handleMessage(e.data)
    }

    this.ws.onerror = function (error) {
      errorCount++
      options.onError?.(error, { controlId, errorCount })
      reject?.()
      _this.connectState = 0
      _this.reConnect()
    }

    this.ws.onclose = function () {
      _this.connectState = 0
      topWindow.showConnectError?.()
      _this.reConnect()
    }
  }

  /** 保持连接活跃 */
  this.keepAlive = function () {
    /* 刷新后可能第一次获取不到系统设置，所以直接使用1分钟，第二次就正常了*/
    // const tokenTimeout = (parseInt(getSystemConfigByName('令牌超时(分钟)').value) || 1) * 60 * 1000

    const tokenTimeout = 30*1000

    setTimeout(() => {
      const params = {
        UserID: sessionStorage.getItem('user'),
        WsKey: sessionStorage.getItem('webSocket_Token'),
        DwTime: [parseInt(sessionStorage.getItem('webSocket_DWTime'))],
        KeepAlive: true,
        isWebJson: true,
        Token: sessionStorage.getItem('rpa_micro_Token'),
      }

      this.callServerFunc('TCoreDM', 'SetWsControlByToken', params, (response, error) => {
        // if (error) return msgBox(error)
        if (error) return ElMessage.error({ message: error })

        sessionStorage.setItem('webSocket_Token', response.WsKey)
        sessionStorage.setItem('webSocket_DWTime', response.DwTime)

        if (response.ControlID) {
          controlId = response.ControlID
          sessionStorage.setItem('ws_control_id', controlId)
        }

        _this.keepAlive()
      })
    }, tokenTimeout)
  }

  /**
   * 登录认证
   *
   * @param {Function} resolve 登录成功回调
   * @param {Function} reject 登录失败回调
   * @returns {void}
   */
  this.login = async function (resolve, reject) {
    const params = wsKey
      ? {
          userID: sessionStorage.getItem('user'),
          WsKey: wsKey,
          DwTime: [parseInt(sessionStorage.getItem('webSocket_DWTime'))],
          isWebJson: true,
        }
      : {
          Token: token,
          isWebJson: true,
        }

    this.callServerFunc('TCoreDM', 'SetWsControlByToken', params, (response, error) => {
      if (error) {
        reject?.()
        // return msgBox(error)
        return ElMessage.error({ message: error })
      }

      if (response.ControlID) {
        controlId = response.ControlID
        sessionStorage.setItem('ws_control_id', controlId)
      }

      sessionStorage.setItem('user', response.UserID)
      sessionStorage.setItem('webSocket_Token', response.WsKey)
      sessionStorage.setItem('webSocket_DWTime', response.DwTime)

      _this.connectState = 2
      clearTimeout(reConnectTimer)

      topWindow.mainMessages?.regWebJsonMessage()
      resolve?.()
    })
  }

  /**
   * 调用服务器方法
   *
   * @param {string} module 模块名
   * @param {string} method 方法名
   * @param {object} params 参数
   * @param {Function} callback 回调函数
   * @param {object} options 选项
   * @returns {void}
   */
  this.callServerFunc = async function (module, method, params, callback, options = {}) {
    _this.checkConnect()

    if (this.connectState !== 2 && method !== 'SetWsControlByToken') {
      return ElMessage.error({ message: '网络异常' })
    }

    const guid = getGuid()
    const requestData = {
      method,
      module,
      id: guid,
      newjson: true,
    }

    // 添加控制ID
    const wsControlId = sessionStorage.getItem('ws_control_id')
    if (wsControlId) {
      params.IDD_GlobalID = wsControlId
      if (Object.prototype.hasOwnProperty.call(params, 'ControlID')) {
        params.ControlID = wsControlId
      }
    }

    // 处理文件上传
    if (options.isUploadFunc && options.fileObj) {
      const buff = await options.fileObj.arrayBuffer()
      params.file = { type: 'hex', data: arrayBufferToHex(buff) }
    }

    // 保存请求信息
    requestDataMap.set(guid, {
      callback,
      params,
      options,
    })

    // 发送请求
    this.ws.send(
      JSON.stringify({
        request: requestData,
        body: params,
      }),
    )
  }

  /**
   * 处理服务器返回的消息
   *
   * @param {string} data 服务器返回的消息
   * @returns {void}
   */
  this.handleMessage = function (data) {
    try {
      // 在 HTML 中，直接使用 < 会被解析为标签的开始，所以需要转义成 &lt; 来避免 XSS（跨站脚本攻击）。
      const jsonData = parseWebJson(data.replace(/</g, '&lt;'))

      // 新JSON格式处理
      if (jsonData[IDD_lpGuid]) {
        this.handleJsonResponse(jsonData, data)
        return
      }

      const response = jsonData

      const guid = response.getRequestId()
      // 取回请求时保存的请求信息
      const { callback } = this.getRequestConfig(guid)

      // 错误检查
      const errorMsg = this.checkError(response.getReturn())
      if (errorMsg === true) return

      // 回调处理
      if (callback) {
        callback(response, errorMsg)
      } else if (topWindow.mainMessages && response.getMsgId() != 1) {
        // 消息推送
        topWindow.mainMessages.getSocketMessages(response, errorMsg)
      }
    } catch (error) {
      console.error('消息处理错误:', error)
    }
  }

  /**
   * 处理JSON格式响应
   *
   * @param {object} jsonData JSON格式数据
   * @returns {void}
   */
  this.handleJsonResponse = function (jsonData) {
    const guid = jsonData[IDD_lpGuid]
    const { callback } = this.getRequestConfig(guid)

    // 错误检查
    const errorMsg = this.checkError(jsonData[IDD_Return])
    if (errorMsg === true) return

    if (callback) {
      callback(jsonData, errorMsg)
    }
  }

  /**
   * 获取请求配置
   *
   * @param {string} id 请求ID
   * @returns {{ options: object; callback: Function }} 请求配置
   */
  this.getRequestConfig = function (id) {
    const info = requestDataMap.get(id)
    const result = { options: {}, callback: null }

    if (info) {
      requestDataMap.delete(id)
      result.options = info.options || {}
      result.callback = info.callback
    }

    return result
  }

  /**
   * 检查错误
   *
   * @param {string} errorMsg 错误信息
   * @returns {string} 错误信息
   */
  this.checkError = function (errorMsg) {
    if (!errorMsg) return null

    // 授权失效处理
    if (errorMsg === '授权信息已经失效') {
      top.location.href = '/web/dist/index.html#/test'
      return true
    }

    // 令牌失效处理
    if (['WsKey验证失败', 'WsKey验证超时'].includes(errorMsg) || /^无效令牌: /.test(errorMsg)) {
      alert('认证信息失效，请重新登陆')
      const logoutUrl = sessionStorage.getItem('LogoutUrl')

      if (topWindow.tokenLoseCallFunc instanceof Function) {
        topWindow.tokenLoseCallFunc(window)
      } else {
        topWindow.location.href = logoutUrl || '/login'
      }
      return true
    }

    // SQL错误处理
    if (/: SQL error /.test(errorMsg)) {
      localStorage.setItem(`error_log_${new Date()}`, topWindow.stringToHex(errorMsg))
      localStorage.setItem('error_log_last', topWindow.stringToHex(errorMsg))
      return '服务器内部错误，错误码500'
    }

    return errorMsg
  }

  /** 检查连接 */
  this.checkConnect = function () {
    clearTimeout(checkTimer)
    // 25秒检查一次
    checkTimer = setTimeout(() => {
      this.callServerFunc('Ws', 'Ping', {})
      this.checkConnect()
    }, 25000)
  }

  /** 重新连接 */
  this.reConnect = function () {
    clearTimeout(reConnectTimer)
    reConnectTimer = setTimeout(() => {
      // showPushMessageError(getENStr('正在重新连接...'), getENStr('提示'))
      ElMessage({
        message: '正在重新连接...',
        type: 'error',
        duration: 2,
      })
      this.initWs()
    }, 2000)
  }
}

/**
 * 处理JSON特殊字符
 *
 * @param {string} str JSON字符串
 * @returns {string} JSON
 */
function parseWebJson(str) {
  if (!str) {
    return {}
  }
  if (typeof str === 'object') {
    return str
  }
  const regex =
    /[^ !-~|\u4e00-\u9fa5|\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g
  str = str.replace(regex, (match) => {
    const uCode = match.charCodeAt(0)
    return `\\u${uCode.toString(16).padStart(4, 0)}`
  })
  let res
  try {
    res = JSON.parse(str)
  } catch (err) {
    console.error('解析JSON时出现错误', err)
  }
  return res || {}
}

/**
 * ArrayBuffer转16进制字符串
 *
 * @param {Buffer} buffer 传入二进制数据流
 * @returns {string} 十六进制字符串
 */
function arrayBufferToHex(buffer) {
  const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
    return ('00' + bit.toString(16)).slice(-2)
  })
  return hexArr.join('')
}

/**
 * 获取guid
 *
 * @returns {string} guid
 */
function getGuid() {
  const s = []
  const hexDigits = '0123456789abcdef'
  for (let i = 0; i < 32; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[12] = '4'
  s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1)
  return s.join('').toUpperCase()
}

/**
 * 初始化文档根路径
 *
 * @returns {string} 文档根路径
 */
function initContextRoot() {
  let res = ''
  let str = location.pathname || ''
  let index = str.lastIndexOf('/web/')
  if (index > 1) {
    res = str.substring(1, index)
  }
  return res
}

/**
 * 判断顶层 pathname值
 *
 * @param {Window} w 窗口对象
 * @returns {Window} 顶层窗口对象
 */
function getTopWindow(w) {
  w = w || window
  try {
    // 防止有些网址嵌入后，是同域名，导致w.parent无法判断，现在直接判断顶层 pathname值
    const reg = /(\/main\.html$)|(\/main_[a-z0-9]+\.html$)|(\/login\.html)|(\/login_[a-z0-9]+\.html)/i
    if (reg.test(w.location.pathname)) {
      return w
    }
    if (w.parent.document) {
      w = w.parent
    }
    if (top === w) return w
    return getTopWindow(w)
  } catch {
    return w
  }
}

// /**
//  * 单个获取系统配置
//  *
//  * @param {string} name 系统配置名称
//  * @returns {string} 系统配置值
//  */
// function getSystemConfigByName(name) {
//   if (!topWindow.g_systemConfig) return {}
//   return topWindow.g_systemConfig.get(name) || {}
// }

// /** 获取父窗口对象 */
// function getParentWindow() {
//   try {
//     if (parent.document) {
//       return parent
//     }
//   } catch {
//     return window
//   }
// }

// /**
//  * 获取中文字符串对应的英文
//  *
//  * @param {string} str 中文字符串
//  * @returns {string} 英文字符串
//  */
// function getENStr(str) {
//   if (!isEnLang) return str
//   if (mainLanguageObj != undefined) {
//     return mainLanguageObj.getEnStr(str)
//   } else if (window.parentWindow.mainLanguageObj != undefined) {
//     return window.parentWindow.mainLanguageObj.getEnStr(str)
//   }
//   return str
// }
