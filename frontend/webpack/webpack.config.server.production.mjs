import path from 'node:path';
import { merge } from 'webpack-merge';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import nodeExternals from 'webpack-node-externals';
import TerserPlugin from "terser-webpack-plugin";

import baseConfiguration from './webpack.config.mjs';


// turn off asset emitting for server side build
baseConfiguration.module.rules = baseConfiguration.module.rules.map(rule => {
  if (rule.type && rule.type.startsWith('asset')) {
    return {
      ...rule,
      generator: {
        emit: false,
      }
    }
  }
  return rule;
});


const config = {
  mode: 'production',
  target: 'node',
  externalsPresets: { node: true },
  externals: [
    nodeExternals({
      allowlist: [
        /\.(?!(?:jsx?|json)$).{1,5}$/i,
        /react-rte/,
      ]
    })
  ],
  entry: {
    server: "./src/server.js",
  },

  output: {
    path: path.resolve(process.cwd(), 'static/server'),
    filename: '[name].js',
    chunkFilename: '[name].js',
    libraryTarget: 'commonjs2',
    pathinfo: true,
    clean: true
  },

  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.scss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'style-loader',
          { loader: 'css-loader',
            options: {
              modules: {
                exportOnlyLocals: true,
              },
            },
          },
          'postcss-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.css$/,
        include: /node_modules\/react-rte/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: true
            }
          }
        ]
      },
      {
        test: /\.css$/i,
        exclude: /node_modules\/react-rte/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader',
            options: {
              modules: {
                exportOnlyLocals: true,
              },
            },
          },
        ]
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
    new MiniCssExtractPlugin(),
    new webpack.DefinePlugin({
      __CLIENT__: false,
      __SERVER__: true,
      __DEVELOPMENT__: false,
      __DEVTOOLS__: false,
      __PLAYER__: false,
      __DESKTOP__: false,
    })
  ]
};

export default merge(baseConfiguration, config);
