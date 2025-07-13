// Webpack configuration for further optimization
const path = require('path');

module.exports = {
  // Enable tree shaking
  mode: 'production',
  
  // Code splitting
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  
  // Performance hints
  performance: {
    hints: 'warning',
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
  },
};
