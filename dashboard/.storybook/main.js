module.exports = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
  ],
  core: {
    builder: '@storybook/builder-webpack5',
  },
  framework: '@storybook/react',
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.extensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.css',
      '.scss',
      '.svg',
      ...(config.resolve.extensions || []),
    ];

    config.module = config.module || { rules: [] };
    config.module.rules = [
      ...(config.module.rules || []),
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ];

    return config;
  },
};
