import path from 'path';
import webpack from 'webpack';
import { merge } from 'webpack-merge';

import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from "terser-webpack-plugin";
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import WebpackAssetsManifest from 'webpack-assets-manifest';

import baseConfiguration from './webpack.config.mjs';


const prodConfig = {
  devtool: 'source-map',
  mode: 'production',
  entry: {
    main: [
      //'./config/polyfills',
      './src/client.js'
    ]
  },

  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'postcss-loader',
          },
          'sass-loader'
        ]
      },
      {
        test: /\.css$/,
        include: /node_modules\/react-rte/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader',
            options: {
              modules: true
            }
          }
        ]
      },
      {
        test: /\.css$/,
        exclude: /node_modules\/react-rte/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader',
          }
        ]
      },
      {
        test: /node_modules\/vfile\/core\.js/,
        use: [{
          loader: 'imports-loader',
          options: {
            type: 'commonjs',
            imports: ['single process/browser process'],
          },
        }],
      },
    ]
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      })
    ]
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name]-[contenthash].css',
    }),
    new WebpackAssetsManifest({
      output: 'webpack-manifest.json',
      writeToDisk: true,
      publicPath: true
    }),

    new CopyPlugin({
      patterns: [
        'src/shared/images/favicon.ico',
        'src/shared/images/conifer-social.jpg'
      ]
    }),

    new webpack.DefinePlugin({
      __CLIENT__: true,
      __SERVER__: false,
      __DEVELOPMENT__: false,
      __DEVTOOLS__: false,
      __PLAYER__: false,
      __DESKTOP__: false,
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ]
};

if (process.env.STATS) {
  prodConfig.plugins.push(new BundleAnalyzerPlugin());
  prodConfig.stats = { all: false };
}


export default merge(baseConfiguration, prodConfig);
