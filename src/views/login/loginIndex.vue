<script setup>
import { ref } from 'vue'
import { MD5, callServerFunc, encryptByDES, removeToken, saveUserInfo, setToken } from '@ksware/micro-lib-web-temp'

import { delRouteCache } from '@/store/routerCache'
import router from '@/utils/router'

// 打开页面时清空原有Token
removeToken()

const formData = ref({
  user: '',
  pass: '',
})

const formRef = ref('')

/**
 * 更新 key
 *
 * @returns key 对象
 */
function updateKey() {
  return new Promise((res) => {
    callServerFunc('TBaseDM', 'Test2', {}).then(({ data }) => {
      res({ key: data.key })
    })
  })
}

/** 提交表单 */
function submitForm() {
  if (!formRef.value) return

  formRef.value.validate((bool) => {
    if (bool) {
      updateKey().then(({ key }) => {
        const data = {
          Key: key,
          User: formData.value.user,
          Pass: encryptByDES(MD5(formData.value.pass), key),
          webJson: true,
          WebLogin: true,
        }
        callServerFunc('TBaseDM', 'Test1', data).then(async ({ data }) => {
          setToken(data.Token)
          await saveUserInfo()
          router.push('/')
          delRouteCache('/login')
        })
      })
    }
  })
}
</script>
<template>
  <AppContainer>
    <div class="login-container">
      <div class="title-div">
        <p>登录RPA账号</p>
      </div>
      <el-form ref="formRef" :model="formData" size="default" label-width="80px" status-icon>
        <el-form-item label="登录名称" prop="user" :rules="[{ required: true, message: '登录名称不能为空' }]">
          <el-input v-model="formData.user" placeholder="请输入用户登录名称" />
        </el-form-item>
        <el-form-item label="登录密码" prop="pass" :rules="[{ required: true, message: '登录密码不能为空' }]">
          <el-input
            v-model="formData.pass"
            placeholder="请输入用户登录密码"
            type="password"
            @keydown.enter="submitForm"
          />
        </el-form-item>
        <el-form-item label="">
          <el-form-item>
            <k-button type="primary" main @click="submitForm()">登录</k-button>
          </el-form-item>
        </el-form-item>
      </el-form>
    </div>
  </AppContainer>
</template>
<style lang="scss" scoped>
.login-container {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: 500px;
  padding: 30px 80px 50px;
  border-radius: 5px;

  box-shadow: 0 0 2px 2px #eee;

  .title-div {
    margin-top: 0;
    margin-bottom: 50px;

    font-size: 22px;
    color: #333;
    text-align: center;
  }
}
</style>
