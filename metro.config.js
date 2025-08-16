const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable bundle optimization
config.transformer.minifierEnabled = true;
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Optimize bundle size
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Exclude unnecessary files from bundle
config.resolver.blacklistRE = /(.*\/__tests__\/.*|.*\/__mocks__\/.*|.*\.test\..*|.*\.spec\..*)/;

module.exports = config;
