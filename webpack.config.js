const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const clientConfig = {
  entry: './client/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/clientBuild'),
    filename: 'main.js',
  },
  module: {
    rules: [
      { test: /\.(js)$/, use: 'babel-loader' },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(eot|otf|webp|ttf|woff|woff2|cur|ani)(\?.*)?$/,
        use: 'null-loader'
      },
      {
        test: /\.(ico|png|jp(e*)g|svg|gif)$/,
        use: [
          {
            loader: 'file-loader?name=[name].[ext]'
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __isBrowser__: 'true',
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
};

const serverConfig = {
  entry: './index.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    path: path.resolve(__dirname, 'dist/serverBuild'),
    filename: 'server.js',
  },
  module: {
    rules: [
      { test: /\.(js)$/, use: 'babel-loader' },
      { test: /\.css$/, use: 'css-loader' },
      {
        test: /\.(eot|otf|webp|ttf|woff|woff2|cur|ani)(\?.*)?$/,
        use: 'null-loader'
      },
      {
        test: /\.(ico|png|jp(e*)g|svg|gif)$/,
        use: [
          {
            loader: 'file-loader?name=[name].[ext]'
          },
        ],
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __isBrowser__: 'false',
    })
  ],
};

module.exports = [clientConfig, serverConfig];