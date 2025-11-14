<script setup lang="ts">
import { type PropType, computed, reactive, ref } from 'vue'
import { MD5, callServerFunc, encryptByDES } from '@ksware/micro-lib-web-temp'
import { ElForm, ElMessage } from 'element-plus'

const emit = defineEmits(['confirm', 'cancel'])
// 定义接受参数字段
const props = defineProps({
  title: String,
  formData: Object as PropType<{ userName: string; userId: string }>,
  isNew: Boolean,
})

// 定义表单需要的字段
const form = reactive({ userName: '', eMail: '', userId: '', password: '', password1: '', passEx: '' })
// 将父组件的参数进行初始化赋值
Object.assign(form, props.formData)
// 表单元素
const formRef = ref<typeof ElForm | null>(null)

// 输入密码的提示文字
const passwordPlaceholder = ref(props.isNew ? '请输入密码' : '暂未修改')
const password1Placeholder = computed(() => {
  // 只有新增用户  和 修改用户模式时输入了密码一
  return props.isNew || (!props.isNew && form.password) ? '请再次输入密码' : '暂未修改'
})

/** 关闭 */
function onClose() {
  emit('cancel')
}

/** 提交 */
function onsubmit() {
  // 校验表单完整性
  formRef.value?.validate().then(async () => {
    // 判断是否有输入密码、以及校验密码是否合法
    if (form.password || form.password1) {
      if (form.password !== form.password1) {
        return ElMessage.warning('两次输入密码不一致，请重新输入')
      }

      // 获取key
      const { data } = await callServerFunc('TBaseDM', 'Test2', {})
      form.password = MD5(form.password)
      // 后台必须要的，应该是用来解密啥的
      form.passEx = encryptByDES(form.password, (data as any).key)
    }

    emit('confirm', form)
  })
}
</script>
<template>
  <el-dialog class="dialog" :model-value="true" width="500" :title="props.title" append-to-body @close="onClose">
    <el-form ref="formRef" :model="form" label-width="100">
      <el-form-item label="用户名称" prop="userName" :rules="[{ required: true, message: '请输入用户名称' }]">
        <el-input v-model="form.userName" placeholder="请输入用户名称" />
      </el-form-item>

      <el-form-item label="登录名称" prop="userId" :rules="[{ required: true, message: '请输入登录名称' }]">
        <el-input v-model="form.userId" :disabled="!props.isNew" placeholder="请输入登录名称" />
      </el-form-item>

      <el-form-item label="密码" prop="password" :rules="[{ required: props.isNew, message: '请输入密码' }]">
        <el-input v-model="form.password" show-password :placeholder="passwordPlaceholder" />
      </el-form-item>

      <el-form-item label="确认密码" prop="password1" :rules="[{ required: props.isNew, message: '请输再次输入密码' }]">
        <el-input
          v-model="form.password1"
          :disabled="!props.isNew && !form.password"
          show-password
          :placeholder="password1Placeholder"
        />
      </el-form-item>

      <el-form-item label="邮箱地址">
        <el-input v-model="form.eMail" placeholder="请输入邮箱地址" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <k-button @click="onClose">取消</k-button>
        <k-button type="primary" main @click="onsubmit">确认</k-button>
      </div>
    </template>
  </el-dialog>
</template>
<style lang="scss" scoped>
.dialog {
  // padding: 8px;
  .dialog-footer {
    text-align: center;
  }
}
</style>
