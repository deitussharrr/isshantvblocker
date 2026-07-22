const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    devtool: isDev ? 'inline-source-map' : false,
    entry: {
      'service-worker': './src/background/service-worker.ts',
      'content': './src/content/content.ts',
      'universal-content': './src/content/universal-content.ts',
      'popup': './src/popup/popup.ts',
      'options': './src/options/options.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@data': path.resolve(__dirname, 'src/data'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@content': path.resolve(__dirname, 'src/content'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'src/data', to: 'data' },
          { from: 'icons', to: 'icons' },
        ],
      }),
      new HtmlPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),
      new HtmlPlugin({
        template: './src/options/options.html',
        filename: 'options.html',
        chunks: ['options'],
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],
    optimization: {
      // Disable split chunks for content script - Chrome requires single file per content entry
      splitChunks: {
        chunks: (chunk) => {
          // Don't split the content script bundles (Chrome requires single file per content entry)
          return chunk.name !== 'content' && chunk.name !== 'universal-content';
        },
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'initial',
            minChunks: 2,
            enforce: true,
          },
        },
      },
    },
  };
};
