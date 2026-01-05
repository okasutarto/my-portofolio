const Dotenv = require('dotenv-webpack');

module.exports = {
  configureWebpack: {
    plugins: [
      new Dotenv()
    ]
  },
  chainWebpack: config => {
    config.plugin('copy').tap(options => {
        options[0].patterns[0].globOptions.ignore.push('**/index.html')
        return options
    })
  }
};