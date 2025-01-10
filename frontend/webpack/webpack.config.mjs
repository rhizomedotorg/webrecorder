import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';

//const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
//const TimeFixPlugin = require('time-fix-plugin');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsPath = path.resolve(__dirname, '../static/dist');
//const smp = new SpeedMeasurePlugin({ disable: process.env.STATS });

import { createRequire } from "module";
const require = createRequire(import.meta.url);


export default {
  devtool: 'eval-source-map',
  context: path.resolve(__dirname, '..'),

  output: {
    path: assetsPath,
    publicPath: '/static/',
    filename: '[name]-[fullhash].js',
    chunkFilename: '[name]-[chunkhash].js',
    clean: true
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)?$/,
        exclude: /node_modules(\/|\\)(?!(superagent))/,
        include: [
          path.resolve(__dirname, '../src'),
          path.resolve(__dirname, '../node_modules/superagent')
        ],
        resolve: {
          fullySpecified: false
        },
        use: [
          {
            loader: 'babel-loader',
          }
        ]
      },
      {
        test: /\.(woff\d?|ttf|svg)(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource',
      },
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource'
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        type: 'asset/resource'
      },
      {
        test: /\.(mov|mp4|ogv|webm)$/,
        type: 'asset/resource'
      },
    ]
  },

  ignoreWarnings: [
    (warning) => true
  ],

  resolve: {
    alias: {
      components: path.resolve(__dirname, '../src/components'),
      containers: path.resolve(__dirname, '../src/containers'),
      helpers: path.resolve(__dirname, '../src/helpers'),
      store: path.resolve(__dirname, '../src/store'),
      shared: path.resolve(__dirname, '../src/shared'),
      config: path.resolve(__dirname, '../src/config.mjs'),
      routes: path.resolve(__dirname, '../src/routes.js'),
      'react-dom': '@hot-loader/react-dom',
    },
    modules: [
      'node_modules',
      path.resolve(__dirname, '../src'),
    ],
    extensions: ['.json', '.js'],
    fallback: {
      'path': require.resolve("path-browserify")
    }
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      APP_HOST: 'localhost:8089',
      ALLOW_DAT: false,
      ANON_DISABLED: false,
      ANNOUNCE_MAILING_LIST: null,
      CONTENT_HOST: 'localhost:8092',
      FRONTEND_PORT: 8095,
      SCHEME: 'http',
      PUBLIC_IP: '127.0.0.1',
      INTERNAL_HOST: 'localhost',
      INTERNAL_PORT: 80,
    })
  ],

  stats: {
    warnings: false
  },

  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000
  }
};
