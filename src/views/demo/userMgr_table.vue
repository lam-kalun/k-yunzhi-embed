<script setup lang="ts">
import { onMounted, reactive, useTemplateRef } from 'vue'
import { KMessage, KMessageBox, KTreeTable, type KTreeTableInstance } from '@ksware/ksw-ux'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'

import UserFormDialog from './dialogs/UserFormDialog.vue'

type Row = {
  id: string
  pid: string
  name: string
  __folder?: boolean
  userId?: string
  online?: string
  eMail?: string
}

const tableData = reactive<Row[]>([])
const containerDivRef = useTemplateRef<KTreeTableInstance>('tableRef')

const userFormDialog: any = reactive({
  visible: false,
  fromData: {},
  cancel() {
    userFormDialog.visible = false
  },
})

onMounted(() => {
  initWindow()
})

/** 初始化页面 */
function initWindow() {
  tableData.length = 0
  callServerFunc('TUserDM', 'GetUserList', {}, { loadingEl: containerDivRef.value?.$el }).then(({ data }: any) => {
    // 用户目录
    const table = new SQLTable(data.QryGroup)
    table.first()
    while (!table.eof()) {
      const row: Row = {
        id: table.s('ID'),
        pid: table.s('PID'),
        name: table.s('Name'),
        // 标记为一个目录节点，表格会用这个标识来进行显示目录图标
        __folder: true,
      }
      tableData.push(row)
      table.next()
    }

    // 用户
    const useTable = new SQLTable(data.QryUser)
    useTable.first()
    while (!useTable.eof()) {
      const row: Row = {
        id: useTable.s('ID'),
        pid: useTable.s('PID'),
        name: useTable.s('UserName'),
        userId: useTable.s('UserID'),
        online: useTable.s('Online'),
        eMail: useTable.s('eMail'),
      }
      tableData.push(row)
      useTable.next()
    }
  })
}

/**
 * 删除用户
 *
 * @param row 用户信息
 */
function onDelUser(row: Row) {
  KMessageBox.confirm(`确定要删除用户“${row.name}”？`, '提示', { type: 'warning' }).then(() => {
    const data = { ID: row.id, Type: 'utUser' }
    callServerFunc('TUserDM', 'DelUser', data).then(() => {
      for (let i = 0; i < tableData.length; i++) {
        if (tableData[i].id === row.id) {
          tableData.splice(i, 1)
          break
        }
      }
      KMessage.success('删除成功')
    })
  })
}

/**
 * 增加用户
 *
 * @param row 用户信息
 */
function onAddUser(row: Row) {
  // 弹窗标题
  userFormDialog.title = '增加用户'
  // 用户表单默认值
  userFormDialog.fromData = {}
  // 是否显示弹窗
  userFormDialog.visible = true
  // 是否为新增用户
  userFormDialog.isNew = true
  // 弹窗点击确认后的回调方法
  userFormDialog.confirm = ({ eMail, passEx, passWord, userId, userName }: any) => {
    // 整理后台需要的参数
    const userInfo = {
      WebJson: true,
      PID: row.id,
      eMail,
      PassWord: passWord,
      Pass: passEx,
      PassEx: passEx,
      UserName: userName,
      UserID: userId,
      // 是否为新增用户, 如果是修改则不用写该参数
      IsNew: true,
    }

    // 调用后台增加用户的接口
    callServerFunc('TUserDM', 'SetUserInfo', userInfo).then(({ data }: any) => {
      // 新增完成后，整理表格需要的参数
      const cRow = {
        id: data.ID,
        pid: row.id,
        name: userName,
        userId: userId,
        eMail: eMail,
        online: '',
      }

      // 加入到表格中
      tableData.push(cRow)
      // 弹窗关闭
      userFormDialog.visible = false
    })
  }
}

/**
 * 修改用户
 *
 * @param row 用户信息
 */
function onSetUser(row: Row) {
  userFormDialog.title = '修改用户'
  userFormDialog.fromData = {
    userName: row.name,
    userId: row.userId,
    eMail: row.eMail,
  }
  userFormDialog.isNew = false
  userFormDialog.visible = true
  userFormDialog.confirm = ({ eMail, passEx, passWord, userId, userName }: any) => {
    const userInfo = {
      ID: row.id,
      WebJson: true,
      PID: row.pid,
      eMail,
      UserName: userName,
      UserID: userId,
    } as any

    // 如果密码有修改
    if (passWord) {
      userInfo.PassWord = passWord
      userInfo.PassEx = passEx
      userInfo.Pass = passEx
    }

    callServerFunc('TUserDM', 'SetUserInfo', userInfo).then(() => {
      row.name = userName
      row.eMail = eMail
      userFormDialog.visible = false
    })
  }
}

const columnList = [
  {
    field: 'name',
    title: '用户名称',
    showIcon: true,
    treeNode: true,
  },
  {
    field: 'userId',
    title: '登录ID',
    width: 180,
  },
  {
    field: 'eMail',
    title: 'eMail',
    width: 250,
  },
  {
    field: 'onTime',
    title: '最近上线时间',
    width: 250,
  },
  {
    field: 'opt',
    title: '操作',
    width: 200,
    slot: '#opt',
  },
]
</script>
<template>
  <AppContainer ref="IconRPAWorkflowIfFileExistsColor">
    <div class="btn-tool">
      <k-button icon-left="IconIdeRefresh" @click="initWindow">刷新</k-button>
    </div>
    <div class="table-div">
      <k-tree-table ref="tableRef" border use-tree :column="columnList" :data="tableData">
        <template #opt="{ row }">
          <k-button v-if="row.__folder" @click="onAddUser(row)">增加</k-button>
          <k-button v-if="!row.__folder" type="danger" @click="onDelUser(row)">删除</k-button>
          <k-button v-if="!row.__folder" @click="onSetUser(row)">修改</k-button>
        </template>
      </k-tree-table>
    </div>

    <!-- 增加、修改用户窗口 -->
    <UserFormDialog
      v-if="userFormDialog.visible"
      :form-data="userFormDialog.fromData"
      :is-new="userFormDialog.isNew"
      :title="userFormDialog.title"
      @confirm="userFormDialog.confirm"
      @cancel="
        () => {
          userFormDialog.visible = false
        }
      "
    />
  </AppContainer>
</template>

<style lang="scss" scoped>
.btn-tool {
  height: 40px;
}

.table-div {
  height: calc(100% - 40px);
}

.td-name-field {
  display: flex;
  gap: 4px;
  align-items: center;
}
</style>
