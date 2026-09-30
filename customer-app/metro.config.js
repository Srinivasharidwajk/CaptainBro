const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
  ? [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'android')) + '[\\\\/].*'),
  new RegExp('^' + escapeRegExp(path.resolve(__dirname, 'ios')) + '[\\\\/].*'),
  /.*[\\/]\.gradle[\\/].*/,
  /.*[\\/]android[\\/].*[\\/]build[\\/].*/,
];

module.exports = config;
