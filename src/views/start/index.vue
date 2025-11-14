<script setup lang="js">
import { computed, ref } from 'vue'
import { KMessage } from '@ksware/ksw-ux'

/** 是否下载 */
const isDownload = ref(true)

const loading = ref(false)

const btnText = computed(() => {
  return isDownload.value ? '启动云智RPA' : '下载'
})

const hasBlurred = ref(false)

const onBlur = () => {
  hasBlurred.value = true
  console.log('页面失焦，可能已唤起应用')
  // 可以在这里做成功回调
}
const obFocus = () => {
  console.log('页面聚焦，')
  hasBlurred.value = false
  // 可以在这里做成功回调
}
window.addEventListener('blur', onBlur)
window.addEventListener('focus', obFocus)

/** 轮询查询是否启动 */
function pollStartLite() {
  return new Promise((resolve, reject) => {
    let elapsedTime = 0
    const interval = 1000
    const maxTime = 5000
    const timer = setInterval(async () => {
      try {
        loading.value = true
        const res = await fetch('/KingAutomate', {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            '{2881E26D-62CE-4937-B4BB-8998440417C4}': 'CheckLiteStart',
          }),
        })
        const { LiteStart } = await res.json()
        console.log('LiteStart--->', LiteStart)
        if (LiteStart) {
          clearInterval(timer)
          resolve(true)
          loading.value = false
          alert('启动成功')
        }
      } catch (error) {
        console.error(error)
      }
      elapsedTime += interval
      if (elapsedTime >= maxTime && !hasBlurred.value) {
        clearInterval(timer)
        reject(new Error('轮询超时：超过时间未返回结果'))
        isDownload.value = false
        loading.value = false
        KMessage.error('启动失败，以为您自动下载')
        hasBlurred.value = false
        downloadLite()
      }
    }, interval)
  })
}
/** 启动lite */
function startLite() {
  console.log('启动lite')
  try {
    window.open(`KRPALite://`, '_self')
  } catch (error) {
    console.error(error)
  } finally {
    pollStartLite()
  }
}

const YZUrl = ref('')
/** 下载lite */
async function downloadLite() {
  // alert("跳转下载页");
  const baseUrl = 'https://download.krpalite.com:56780'
  const url = `${baseUrl}/config.json?t=${Date.now()}`
  console.log('url--->', url)
  const res = await fetch(url)
  const data = await res.json()
  if (data && data.windows && Array.isArray(data.windows)) {
    const arr = data.windows
    const maxVer = findLatestVersion(arr, 'version')
    const fullPath = baseUrl + '/windows/' + maxVer.version + `/K-RPA Lite Setup ${maxVer.version}.exe`
    console.log('fullPath--->', fullPath)
    YZUrl.value = fullPath
    downloadFile(fullPath)
  }
}
async function init() {
  if (isDownload.value) {
    startLite()
  } else {
    downloadLite()
  }
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  const longestLength = Math.max(parts1.length, parts2.length)

  for (let i = 0; i < longestLength; i++) {
    const num1 = i < parts1.length ? parts1[i] : 0
    const num2 = i < parts2.length ? parts2[i] : 0

    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }

  return 0
}
/**
 * @param items 传入对象数组
 * @param key 比较的版本key值
 */
function findLatestVersion(items, key) {
  if (!items || items.length === 0) {
    return {}
  }

  let latestItem = items[0]
  for (let i = 1; i < items.length; i++) {
    if (compareVersions(items[i][key], latestItem[key]) > 0) {
      latestItem = items[i]
    }
  }
  return latestItem
}

/**
 * 下载文件
 *
 * @param url
 */
const downloadFile = async (url) => {
  try {
    // 判断是否为 .json 文件
    if (url.endsWith('.json')) {
      // 使用 Blob 下载方式
      const response = await fetch(url)
      if (!response.ok) throw new Error(`下载失败: ${response.statusText}`)

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const downloadElement = document.createElement('a')
      downloadElement.href = blobUrl
      downloadElement.setAttribute('download', 'logo.json')
      document.body.appendChild(downloadElement)
      downloadElement.click()
      document.body.removeChild(downloadElement)
      URL.revokeObjectURL(blobUrl)
    } else {
      // 先发送 HEAD 请求检查状态
      const headResponse = await fetch(url, { method: 'HEAD' })
      if (headResponse.ok) {
        // 保持原来的直接下载方式
        const downloadElement = document.createElement('a')
        downloadElement.href = url
        downloadElement.setAttribute('download', '')
        document.body.appendChild(downloadElement)
        downloadElement.click()
        document.body.removeChild(downloadElement)
      }
    }
  } catch (e) {
    console.error('下载文件失败:', e)
  }
}
</script>

<template>
  <div class="yun-zhi">
    <div class="box">
      <!-- <k-button main @click="init" :loading="loading">{{ btnText }}</k-button> -->
      <k-button main :loading="loading" @click="init">启动云智RPA</k-button>
      <div v-if="!isDownload" class="tip">
        <div class="t1">感谢下载</div>
        <div class="t2">
          手动下载
          <div class="a" @click="downloadLite">{{ YZUrl }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.yun-zhi {
  width: 100%;
  height: 100%;
  .box {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 15px;
    width: 800px;
    height: 200px;
    .k-button {
      width: 160px;
      height: 40px;
      font-size: 18px;
    }
    .tip {
      color: #999;
      .t1 {
        // font-size: 28px;
      }
      .t2 {
        // font-size: 18px;
        .a {
          color: blue;
        }
      }
    }
  }
}
</style>
