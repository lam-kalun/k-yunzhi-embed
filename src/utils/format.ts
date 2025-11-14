import dayjs from 'dayjs'

/**
 * 使用定点表示法将数值转为字符串。如果结果为 "0.00"，就转为 "0"。 参考 Number.prototype.toFixed。
 *
 * @param num 被处理的数值
 * @param digits 小数点后的位数，默认为2
 * @returns 结果
 */
export function numFixedExcept0(num: number, digits: number = 2): string {
  if (isNaN(num)) return '0'
  const result = num.toFixed(digits)

  if (result === '0.00') {
    return '0'
  } else {
    return result
  }
}

/**
 * 获取一段时间的月份列表
 *
 * @param startTime 开始时间 YYYYMM*** / YYYY-MM-***
 * @param endTime 结束时间 YYYYMM*** / YYYY-MM-***
 * @returns 月份列表
 */
export function getDateMonthList(startTime: string, endTime: string): string[] {
  let startTimeDayjs = dayjs(startTime)
  const endTimeDayjs = dayjs(endTime)
  const monthList: string[] = []
  while (true) {
    if (startTimeDayjs.isAfter(endTimeDayjs, 'month')) break
    monthList.push(startTimeDayjs.format('YYYYMM'))
    startTimeDayjs = startTimeDayjs.add(1, 'month')
  }
  return monthList
}
