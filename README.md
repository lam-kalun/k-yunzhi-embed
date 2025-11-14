# micro-web

微前端模板。生成的项目采用 Vue3 + Vite + TypeScript 及相关技术栈。

## 下载模板

执行 `npx @ksware/ksw-cli@latest create [项目名]`, 根据提示选择"微前端VUE3开发模版"创建项目。

## 项目说明

### NPM版本使用 18.20.x

### 安装依赖

执行 `npm install`。

### 配置环境变量

[.env.development](./.env.development) 和 [.env.production](./.env.production) 文件中， `VITE_APP_HOST` 为要对接的服务器地址，`VITE_APP_DEMO_NAME` 为微服务模块名。

### 开发

执行 `npm run dev` 运行项目，通过 `http://localhost:5173/` 访问。
页面正下方有调试工具 [vite-plugin-vue-devtools](https://github.com/vuejs/devtools)，无需使用浏览器插件。

### 打包

执行 `npm run build` 打包，产物为 `dist/app-dist-[项目名]`。

### 部署为子应用

1. 通过 admin 用户打开主应用，配置“微前端管理”，打开进行项目和菜单的配置
2. 在 [router.js](./src/utils/router.js) 文件中配置路由
3. 打包
4. 将打包产物 `dist/app-dist-[项目名]` 放到主应用目录下的 web 目录下

### 打包后预览

执行 `npm run build:dev` 打包，打包生成 `dist/app-dist-[项目名]` 会复制到 [.env.production](./.env.production) 文件指定的 `VITE_APP_BUILD_OUT_PATH` 路径下。然后打开主应用，配置“微前端管理”后进行访问。

### 调试测试/生产环境

首次打开微前端页面，控制台会打印模块名和打包时间，以供参考。

1. 生成 source map：将 [vite.config.ts](./vite.config.ts) 中的 `build.sourcemap` 改为 `true`
2. 打包：执行 `npm run build`
3. 提供访问 source map 文件的服务：执行 `npm run preview`
4. 在测试/生产环境，打开 devtools 源代码，找到目标 js 文件，右键添加该文件的 source map 的 URL 即可

### 效率及质量保证

推荐使用 VSCode。以下是需要安装的插件。

- Code Spell Checker：单词拼写检查
- Vue - Offical：Vue 文件高亮、语法提示检查等
- ESLint：ESLint 校验
- EditorConfig: 统一 编辑器/IDE 的代码风格
- Stylelint：CSS/Sass 格式化工具
- Prettier：格式化工具

对于 VSCode：保存时，会自行修复部分代码、格式化代码。
部分问题仍需手动修复，例如 JSDoc。
还可以通过执行 `npm run lint` 对整个项目进行检查、修复和格式化。

### 使用到的技术栈

- 状态管理：[Pinia](https://pinia.vuejs.org/introduction.html)
- 路由：[Vue Router](https://router.vuejs.org/zh/introduction.html)
- 微前端依赖：[@ksware/micro-lib-web-temp](https://www.npmjs.com/package/@ksware/micro-lib-web-temp)
- UI库：公司开发的 [@ksware/ksw-ux](https://github.com/xiyure/k-component-lib/tree/dev)，基于 Element Plus
- 图标库：公司开发的 [ksw-vue-icon](https://github.com/sengoku-f/KSW-vue-icon)

### 全局引入

已全局引入UI库和图标库，均可直接使用。

```html
<!-- 无需引入，直接使用 -->
<k-button @click="handleSubmit">提交</k-button>
<IconFlowAdd />
```

### 目录结构

```
├── .vscode // VSCode 配置文件
│   ├── extensions.json // 推荐安装的插件
│   └── settings.json // 当前工作区的配置
├── src // 源代码目录，所有文件会经过 Vite 处理
│   ├── assets // 静态资源
│   ├── component // 公共的业务组件
│   ├── stores // 状态管理
│   ├── styles // 样式文件
│   ├── utils // 工具函数
│   ├── views // 页面
│   ├── App.vue // 根组件
│   ├── main.js // 入口 js 文件
│   └── public-components.d.ts // 全局组件的类型
├── .env.development // 开发环境变量
├── .env.production // 生产环境变量
├── .gitignore
├── .npmrc
├── index.html // 入口 html 文件
├── package.json // npm 依赖文件
│   ├── .editorconfig
│   ├── .prettierignore
│   ├── .stylelintignore
│   ├── cspell.config.js
│   ├── eslint.config.js
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── prettier.config.js
│   └── stylelin.config.js
├── README.md // 此 readme 文件
├── tsconfig.json // ts 配置文件
│   ├── env.d.ts // Vite 类型文件
│   ├── tsconfig.app.json // 前端 ts 配置文件
│   └── tsconfig.node.json // node ts 配置文件
└── vite.config.ts
```

### 示例

该项目中有若干示例，均在 `/src/views` 中。

### 调用接口

```typescript
// 从微前端依赖引入调用接口的函数
import { callServerFunc } from '@ksware/micro-lib-web-temp'

// 调用接口
callServerFunc(
  // 模块名。如果是微服务的，那就是 demo
  'demo',
  // 方法名。
  'demo_getFlowErrorRate',
  // 接口的入参
  requestData,
  // 其他配置项
  options,
)
```

### 提交代码

提交代码前，执行 `npm run lint` 进行校验，没有错误和警告才可提交。
