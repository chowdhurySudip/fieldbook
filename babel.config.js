module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Optimize bundle size
      ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
      // Tree shaking for libraries
      [
        'babel-plugin-module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],

    ],
  };
};
