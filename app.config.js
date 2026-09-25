/**
 * app.json holds the config; this only adds a base path for the GitHub Pages web
 * demo (served from /fridge-rescue/). Set EXPO_BASE_URL when exporting for Pages;
 * everything else (native builds, local web dev) is unchanged.
 */
module.exports = ({ config }) =>
  process.env.EXPO_BASE_URL ? { ...config, experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL } } : config;
