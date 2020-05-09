const slsw = require('serverless-webpack');

module.exports = {
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  target: 'node',
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
    ],
  },
};
