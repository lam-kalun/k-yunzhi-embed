<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { SQLTable, callServerFunc } from '@ksware/micro-lib-web-temp'
import dayjs from 'dayjs'

export type Row = {
  id: string
  pid?: string
  name: string
  type: string
  children: Row[]
}

defineProps<{
  modelValue: Row
  currentDate: [string, string]
}>()

const emit = defineEmits(['update:modelValue', 'update:currentDate', 'loadFinish'])

/** 默认的时间范围 */
const DEFAULT_DATE_RANGE = [dayjs().add(-1, 'y').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')]
// 全局条件 - 当前选择的日期
const dateData = ref<any>(DEFAULT_DATE_RANGE)
const deptIds = ref([''])
// 部门选择器 可选的数据
const deptOptions = reactive<Row[]>([])
const deptMap = new Map<string, Row>()
// 日期选择器快捷按钮配置
const dateShortcuts = [
  {
    text: '本年度',
    value: [dayjs().format('YYYY-01-01'), dayjs().format('YYYY-MM-DD')],
  },
  {
    text: '最近三个月',
    value: [dayjs().add(-3, 'M').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
  },
  {
    text: '最近半年',
    value: [dayjs().add(-6, 'M').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
  },
  {
    text: '最近一年',
    value: [dayjs().add(-1, 'y').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
  },
]

onMounted(() => {
  emit('update:currentDate', dateData.value)
  initWindow()
})

watch(dateData, (value) => {
  emit('update:currentDate', value)
})

/** 初始化页面 */
function initWindow() {
  callServerFunc('demo', 'demo_getAllDept', {}).then(({ data }) => {
    deptOptions.length = 0
    const rootChildren: Row[] = []
    const rootRow = { id: 'root', name: '全部部门', type: '', children: rootChildren }
    deptOptions.push(rootRow)
    const table = new SQLTable((data as any).k_user_department)
    table.first()
    while (!table.eof()) {
      const row = {} as Row
      row.id = table.s('ID')
      row.pid = table.s('PID')
      row.name = table.s('Name')
      row.children = []
      row.type = table.i('iType') === 1 ? 'cDept' : 'dept'
      deptMap.set(row.id, row)

      if (!row.pid) {
        row.pid = 'root'
        rootChildren.push(row)
      } else {
        const pRow = deptMap.get(row.pid)
        if (pRow) {
          pRow.children.push(row)
        }
      }
      table.next()
    }

    emit('loadFinish')
  })
}

/**
 * 改变部门选择
 *
 * @param state 级联选择器显示状态
 */
function changeDeptSelect(state: boolean) {
  if (state) return
  const id = deptIds.value.at(-1) || 'root'
  const row = id === 'root' ? { type: '', id: '', pid: '', name: '', children: [] } : deptMap.get(id)!
  emit('update:modelValue', row)
}

/** 重置日期范围 */
function resetDateRange() {
  dateData.value = DEFAULT_DATE_RANGE
}
</script>
<template>
  <div ref="topDivRef" class="stats-head-filter">
    <el-form class="el-form" inline size="default">
      <el-form-item label="数据来源:" style="margin: 0">
        <el-cascader
          v-model="deptIds"
          :options="deptOptions"
          :props="{ label: 'name', value: 'id', checkStrictly: true }"
          :show-all-levels="true"
          value-format="YYYY-MM-DD"
          placeholder="全部部门"
          :filterable="true"
          style="width: 256px"
          @visible-change="changeDeptSelect"
        />
      </el-form-item>
      <el-form-item label="时间区间:" style="margin: 0">
        <el-date-picker
          v-model="dateData"
          :clearable="false"
          type="daterange"
          range-separator="~"
          :shortcuts="dateShortcuts"
          value-format="YYYY-MM-DD"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 256px"
        />
      </el-form-item>
      <el-form-item style="margin: 0">
        <k-button @click="resetDateRange">重置时间</k-button>
      </el-form-item>
    </el-form>
  </div>
</template>
<style lang="scss" scoped>
.stats-head-filter {
  display: flex;
  align-items: center;

  height: 48px;
  padding: 8px 12px;

  background-color: #fff;

  .el-form {
    display: flex;
    gap: 24px;
  }
}
</style>
