const path = require('path');
const webpack = require('webpack');
const BundleTracker = require('webpack-bundle-tracker');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const mode = process.env.npm_lifecycle_event;
const isDev = (mode.includes('dev'));
const filename = isDev ? "[name]" : "[name].[hash]";

module.exports = {
  context: __dirname,
  entry: {
      App: ['./src/index.tsx'],
  },
  output: {
    path: path.resolve('./assets/webpack_bundles/'),
    filename:filename + ".js"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [{loader: 'ts-loader'}],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
      {
        test: /\.(png|jp(e*)g|svg|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'images/[hash]-[name].[ext]',
            },
          },
        ],
      },
    ],
  },
  plugins: [
        new CleanWebpackPlugin(),
        new BundleTracker({ filename: './webpack-stats.json' }),
        new MiniCssExtractPlugin({
            filename: filename + '.css',
            chunkFilename: filename + '.css',
        }),
    ],
  resolve: {
    modules: ['node_modules'],
    extensions: [".ts", ".tsx", ".js", ".css", ".scss", ".svg"]
  },
}
