module.exports = {
  parserOptions: {
    ecmaVersion: 9,
  },
  env: {
    browser: false,
    node: true,
    es6: true,
    'jest/globals': true,
  },
  plugins: ['jest'],
  extends: ['prettier', 'eslint:recommended'],
};
