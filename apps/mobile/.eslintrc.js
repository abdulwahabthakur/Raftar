module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/node_modules/*', '/.expo/*'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Node.js config files — __dirname, require, module are valid here
      files: ['*.config.js', 'babel.config.js', 'metro.config.js'],
      env: { node: true },
    },
  ],
};
