const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub native-only packages when bundling for web
const webStubs = {
  'react-native-maps': path.resolve(__dirname, 'mocks/react-native-maps.js'),
  '@stripe/stripe-react-native': path.resolve(__dirname, 'mocks/stripe-react-native.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { filePath: webStubs[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
