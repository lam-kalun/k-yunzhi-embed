/**
 * @type {import('prettier').Config}
 * @see https://prettier.io/docs/en/configuration.html
 */
export default {
  // 单行长度
  printWidth: 120,
  // 使用空格代替 tab 缩进
  useTabs: false,
  // 缩进长度
  tabWidth: 2,
  // 句末使用分号
  semi: false,
  // 使用单引号
  singleQuote: true,
  // 仅在必需时为对象的 key 添加引号
  quoteProps: 'as-needed',
  // 在对象前后添加空格-eg: { foo: bar }
  bracketSpacing: true,
  // 多属性 HTML 标签的‘>’折行放置
  bracketSameLine: false,
  // 单参数箭头函数参数周围使用圆括号-eg: (x) => x
  arrowParens: 'always',
  // 无需顶部注释即可格式化
  requirePragma: false,
  // 不在已被 prettier 格式化的文件顶部加上标注
  insertPragma: false,
  proseWrap: 'preserve',
  // 对 HTML 全局空白不敏感
  htmlWhitespaceSensitivity: 'ignore',
  // 不对 Vue 中的 script 及 style 标签缩进
  vueIndentScriptAndStyle: false,
  // 结束行形式
  endOfLine: 'lf',
  // 对引用代码进行格式化
  embeddedLanguageFormatting: 'auto',
  // 尽可能加上末尾的逗号
  trailingComma: 'all',

  plugins: ['prettier-plugin-jsdoc'],
  tsdoc: true,
  jsdocCapitalizeDescription: false,
}
