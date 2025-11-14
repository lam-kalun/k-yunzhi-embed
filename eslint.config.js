import eslintJs from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import pluginImport from 'eslint-plugin-import'
import pluginJsdoc from 'eslint-plugin-jsdoc'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default downgradeErrorsToWarnings(
  tseslint.config(
    {
      ignores: ['dist', 'package-lock.json', 'src/assets'],
    },
    {
      files: ['**/*.{js,jsx}'],
      extends: [eslintJs.configs.recommended, pluginJsdoc.configs['flat/recommended']],
    },
    {
      files: ['**/*.{ts,tsx,vue}'],
      extends: [...tseslint.configs.recommended, pluginJsdoc.configs['flat/recommended-typescript']],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
      },
    },
    {
      files: ['**/*.vue'],
      extends: pluginVue.configs['flat/recommended'],
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          parser: tseslint.parser,
          jsx: true,
        },
      },
      rules: {
        'vue/multi-word-component-names': [
          'error',
          {
            ignores: ['index', 'main'],
          },
        ],
        'vue/max-attributes-per-line': 'off',
        'vue/singleline-html-element-content-newline': 'off',
        'vue/require-default-prop': 'off',
      },
    },
    {
      files: ['**/*.{js,jsx,ts,tsx,vue}'],
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.node,
        },
      },
      plugins: {
        '@stylistic': stylistic,
        'plugin-import': pluginImport,
      },
      rules: {
        'no-var': 'error',
        'no-console': 'warn',
        'no-unreachable': 'warn',
        'jsdoc/require-jsdoc': ['warn', { require: { ClassDeclaration: true }, enableFixer: false }],
        'jsdoc/require-description': 'warn',
        'jsdoc/require-param': 'off',
        'jsdoc/check-param-names': ['warn', { checkDestructured: false }],
        'jsdoc/require-returns': 'off',
        'jsdoc/tag-lines': 'off',
        '@stylistic/line-comment-position': 'warn',
        '@stylistic/spaced-comment': 'warn',
        'plugin-import/first': 'warn',
        'plugin-import/newline-after-import': 'warn',
        'plugin-import/no-duplicates': 'warn',
        'plugin-import/order': [
          'warn',
          {
            named: true,
            'newlines-between': 'always',
            distinctGroup: false,
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'unknown'],
            pathGroups: [
              {
                pattern: 'vue',
                group: 'external',
                position: 'before',
              },
              {
                pattern: '@/views/**',
                group: 'parent',
                position: 'before',
              },
              {
                pattern: '@/**',
                group: 'internal',
                position: 'before',
              },
            ],
            pathGroupsExcludedImportTypes: ['builtin'],
            alphabetize: {
              order: 'asc',
              orderImportKind: 'desc',
            },
          },
        ],
      },
    },
    eslintPluginPrettierRecommended,
  ),
)

/** 将所有“错误”级别的规则降为“警告” */
function downgradeErrorsToWarnings(configs) {
  return configs.map((config) => {
    if (!config.rules) return config
    const newRules = {}
    for (const [ruleId, value] of Object.entries(config.rules)) {
      if (value === 'error') {
        newRules[ruleId] = 'warn'
      } else if (Array.isArray(value) && value[0] === 'error') {
        newRules[ruleId] = ['warn', ...value.slice(1)]
      } else {
        newRules[ruleId] = value
      }
    }
    return { ...config, rules: newRules }
  })
}
