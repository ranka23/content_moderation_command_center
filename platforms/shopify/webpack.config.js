const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production'

  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'eval-source-map',
    bail: isProd,
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'app.js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
            },
          },
        },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: process.env.LOCAL_DEV
        ? {
            // Use local mock for app-bridge-react when running standalone
            '@shopify/app-bridge-react$': path.resolve(
              __dirname,
              'src/app-bridge-mock.js',
            ),
          }
        : {},
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'app.css',
      }),
    ],
    optimization: {
      minimize: isProd,
      minimizer: ['...', new CssMinimizerPlugin()],
    },
    // For local dev (LOCAL_DEV=true), bundle everything so the app works standalone.
    // In production, these are externalized (provided by Shopify admin via CDN).
    externals: process.env.LOCAL_DEV
      ? {}
      : {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@shopify/app-bridge-react': 'AppBridgeReact',
          '@shopify/polaris': 'Polaris',
        },
  }
}
