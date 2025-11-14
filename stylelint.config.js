/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue/scss',
    'stylelint-config-two-dash-bem',
    'stylelint-config-clean-order',
    'stylelint-config-prettier-scss',
  ],
  rules: {
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'deep'],
      },
    ],
    'no-empty-source': null,
    'at-rule-no-unknown': null,
    'no-descending-specificity': null,
    'scss/at-rule-no-unknown': null,
  },
}
