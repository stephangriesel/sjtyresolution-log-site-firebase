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
    "max-len": [2, 200, 4],
    "func-call-spacing": "off",

  },
};
