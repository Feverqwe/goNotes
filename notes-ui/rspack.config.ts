import { defineConfig } from '@rspack/cli';
import * as rspack from '@rspack/core';
import * as Path from 'path';

export default defineConfig({
  entry: {
    index: './src/index',
  },
  output: {
    filename: '[name]-[contenthash].js',
    chunkFilename: '[contenthash].chunk.js',
    path: Path.resolve(__dirname, './dist'),
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          name: 'commons',
          chunks: 'initial',
          minChunks: 2,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
        ],
      },
      {
        test: /\.png$/,
        type: 'asset/resource',
      },
      {
        test: /\.(less|css)$/,
        use: [
          {
            loader: 'builtin:css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      filename: 'index.html',
      template: './src/assets/index.html',
      chunks: ['index'],
      scriptLoading: 'blocking',
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: './src/assets/icons', to: 'icons' },
        { from: './src/assets/manifest.json', to: 'manifest.json' },
        { from: './src/sw.js', to: 'sw.js' },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
});