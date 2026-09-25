const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * The judged APK is a release build (JS bundled in, no dev server) that is still
 * marked debuggable: RevenueCat's Test Store refuses to run in non-debuggable
 * builds (it shows an alert and closes the app). This app is a hackathon demo
 * that is never shipped to a store. Remove this plugin, and swap the Test Store
 * key for a real store key, before any real release.
 */
module.exports = function withDemoRelease(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = '// fridge-rescue: debuggable demo release (Test Store needs it)';
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents = config.modResults.contents.replace(
        /(release \{\n)(\s*)(\/\/ Caution!)/,
        `$1$2${marker}\n$2debuggable true\n$2$3`,
      );
    }
    return config;
  });
};
