module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'google'],
  parserOptions: {
    ecmaVersion: 8,
  },
  rules: {
    indent: 'off',
    'require-jsdoc': 0,
  },
};
