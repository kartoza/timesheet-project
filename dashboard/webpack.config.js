const path = require('path');
const webpack = require('webpack');
const BundleTracker = require('webpack-bundle-tracker');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const mode = process.env.npm_lifecycle_script;
const isDev = (mode.includes('development'));
const filename = isDev ? "[name]" : "[name].[chunkhash]";
const statsFilename = './webpack-stats.json';

let conf = {
  context: __dirname,
  entry: {
      App: ['./src/index.tsx'],
      Space: ['./src/Space.tsx'],
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
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
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
        new BundleTracker({ filename: statsFilename }),
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
if (isDev) {
    conf['output'] = {
      path: path.resolve('./assets/webpack_bundles/'),
      filename: filename + '.js',
      publicPath: 'http://localhost:9000/static/',
    }
    conf['devServer'] = {
        hot: true,
        port: 9000,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        compress: true,
    }
    conf['plugins'].push(
        new ReactRefreshWebpackPlugin({ overlay: false })
    )
}
module.exports = conf;