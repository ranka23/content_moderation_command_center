const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const isProduction =
  process.env.NODE_ENV === 'production' ||
  (process.argv.includes('--mode') &&
    process.argv[process.argv.indexOf('--mode') + 1] === 'production')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cmcc-app.js',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: '> 0.5%, not dead' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'cmcc-app.css',
    }),
  ],
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    'wp-api': 'wp',
    'wp-element': 'wp',
    'wp-i18n': 'wp',
    'wp-components': 'wp',
    'wp-hooks': 'wp',
    '@wordpress/api-fetch': ['wp', 'apiFetch'],
    '@wordpress/element': ['wp', 'element'],
    '@wordpress/i18n': ['wp', 'i18n'],
    '@wordpress/components': ['wp', 'components'],
    '@wordpress/hooks': ['wp', 'hooks'],
  },
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? false : 'source-map',
}
