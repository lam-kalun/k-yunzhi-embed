export default {
  plugins: {
    autoprefixer: {},
    'postcss-pxtorem': {
      //   rootValue: 16, // 1rem = 16px，根据设计稿和需求调整
      //   propList: ['*'],
      //   selectorBlackList: [], // 过滤掉一些不需要转换的选择器
      // 小于等于2px的不转换为rem
      minPixelValue: 2,
      //   exclude: /node_modules/i // 排除node_modules目录下的文件
    },
  },
}
