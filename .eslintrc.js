module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    "indent": ["error", 2],
    "object-curly-newline": ["error", {
      "minProperties": 1
    }],
    "object-property-newline": ["error", {
      "allowMultiplePropertiesPerLine": false
    }]
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
};