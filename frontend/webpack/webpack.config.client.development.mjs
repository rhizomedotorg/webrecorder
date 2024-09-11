import CopyPlugin from 'copy-webpack-plugin';

import ESLintPlugin from 'eslint-webpack-plugin';
import { merge } from 'webpack-merge';
import webpack from 'webpack';
import WebpackAssetsManifest from 'webpack-assets-manifest';

import config from '../src/config.mjs';
import baseConfiguration from './webpack.config.mjs';

let host = process.env.APP_HOST  || '127.0.0.1';
const port = Number(config.port) + 1;

if (host.includes(':')) {
  host = host.split(':')[0];
}


const devConfig = {
  mode: 'development',
  entry: {
    main: [
      'react-hot-loader/patch',
      `webpack-hot-middleware/client?path=http://${host}:${port}/__webpack_hmr`,
      './src/client.js'
    ]
  },

  output: {
    filename: '[name].js',
    chunkFilename: '[name].js',
    publicPath: `http://${host}:${port}${baseConfiguration.output.publicPath}`
  },

  devServer: {
    static: './dist',
  },

  optimization: {
    runtimeChunk: 'single',
  },

  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader'
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
            loader: 'style-loader'
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
            loader: 'style-loader'
          },
          {
            loader: 'css-loader'
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

  resolve: {
    alias: {
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    }
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new CopyPlugin({
      patterns: [
        'src/shared/images/favicon.ico',
        'src/shared/images/conifer-social.jpg'
      ]
    }),
    new WebpackAssetsManifest({
      output: 'webpack-manifest.json',
      writeToDisk: true,
      publicPath: true
    }),
    //new ESLintPlugin(),
    new webpack.DefinePlugin({
      __CLIENT__: true,
      __SERVER__: false,
      __DEVELOPMENT__: true,
      __DEVTOOLS__: true,
      __PLAYER__: false,
      __DESKTOP__: false
    })
  ]
};

export default merge(baseConfiguration, devConfig);
