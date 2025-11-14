<script setup lang="ts">
import { type Ref, ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { callServerFunc, downServerFile, getServerFilePath } from '@ksware/micro-lib-web-temp'
import { ElMessageBox, type UploadRequestOptions } from 'element-plus'

const isShowLoading = ref(false)
const loadingText = ref('正在上传文件...')

interface IFileListItem {
  name: string
  filePath: string
}
const fileList: Ref<IFileListItem[]> = ref([])

/**
 * http 请求
 *
 * @param uploadRequestOptions 上传请求的选项
 */
function httpRequest({ file }: UploadRequestOptions): Promise<void> {
  let fileName: string = file.name
  for (let i = 0; i < fileList.value.length; i++) {
    const item = fileList.value[i]
    if (item.name === fileName) {
      // 改为 -1，校验是否与当前 fileName 相同的名称
      i = -1
      const strArr = fileName.split('')
      strArr.splice(fileName.lastIndexOf('.'), 0, '(1)')
      fileName = strArr.join('')
    }
  }

  return new Promise((res, ret) => {
    isShowLoading.value = true

    const requestData = {
      /** 支持自定义存放到某个位置： 如：20240101/imgs */
      folderName: '存放位置',
      /** 是否为公开的文件，就是不需要校验token，任何人都可以访问的数据， 这个数据会被系统定时清除，具体清除时间再系统设置中可以设置 */
      isPublic: true,
    }

    callServerFunc('demo', 'uploadFile', requestData, { isUpload: true, file, awaitTime: true, isShowLoading: false })
      .then(({ data }: any) => {
        const { filePath } = data as { filePath: string }
        fileList.value.push({ name: fileName, filePath })
        res()
      })
      .catch(() => {
        ret()
      })
      .finally(() => {
        isShowLoading.value = false
      })
  })
}

/**
 * 删除文件
 *
 * @param fileItem 文件信息
 */
function delFile(fileItem: IFileListItem): void {
  fileList.value = fileList.value.filter((item) => {
    return fileItem !== item
  })
}

/**
 * 下载文件
 *
 * @param item 文件信息
 */
function getServerFile(item: IFileListItem) {
  const filePath = item.filePath
  ElMessageBox.prompt('请填写文件名称', '提示').then(({ value }) => {
    // 如果不直接下载，则可以调用下面的方法获取到所在服务全路径
    downServerFile(filePath, value)
    const fullFilePath = getServerFilePath(filePath)
    // eslint-disable-next-line no-console
    console.log(fullFilePath)
  })
}
</script>
<template>
  <AppContainer class="upload-file" drag>
    <el-upload
      v-loading="isShowLoading"
      class="upload-demo"
      :http-request="httpRequest"
      drag
      :show-file-list="false"
      :element-loading-text="loadingText"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        拖拽文件到此处或
        <em>点击上传选择文件</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">提示信息： 请选择xxx格式的文件，文件大小不能超过nM</div>
      </template>
    </el-upload>
    <hr />
    <div v-show="fileList.length > 0" class="uploaded-div">
      <div class="title">已经上传列表：</div>
      <div class="file-list">
        <div v-for="item in fileList" :key="item.filePath" class="file-list-item">
          <div class="name">{{ item.name }}</div>
          <div class="tool">
            <k-button type="danger" link @click="delFile(item)">删除</k-button>
            <k-button type="danger" link @click="getServerFile(item)">下载</k-button>
          </div>
        </div>
      </div>
    </div>
  </AppContainer>
</template>
<style lang="scss" scoped>
.upload-file {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;

  .upload-demo {
    width: 800px;
  }

  .uploaded-div {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 800px;

    .title {
      font-size: 18px;
    }

    .file-list {
      display: flex;
      flex-direction: column;
      gap: 4px;

      font-size: 12px;
      color: #666;

      .file-list-item {
        display: flex;
        justify-content: space-between;
        padding: 2px 8px;

        &:hover {
          color: #1a91f3c5;
          background-color: #f6f6f6;
        }

        .name {
          color: #1a91f3;
        }
      }
    }
  }
}
</style>
