const fs = require('fs');
const path = require('path');

const patches = [
  {
    file: 'node_modules/expo-modules-core/android/CMakeLists.txt',
    from: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  CommonSettings',
    to: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  c++_shared\n  CommonSettings',
  },
  {
    file: 'node_modules/react-native-screens/android/CMakeLists.txt',
    from: 'target_link_libraries(rnscreens\n            ReactAndroid::reactnative',
    to: 'target_link_libraries(rnscreens\n            c++_shared\n            ReactAndroid::reactnative',
  },
  {
    file: 'node_modules/react-native-worklets/android/CMakeLists.txt',
    from: 'target_link_libraries(worklets log ReactAndroid::jsi',
    to: 'target_link_libraries(worklets c++_shared log ReactAndroid::jsi',
  },
  {
    file: 'node_modules/react-native-reanimated/android/CMakeLists.txt',
    from: 'target_link_libraries(reanimated log ReactAndroid::jsi',
    to: 'target_link_libraries(reanimated c++_shared log ReactAndroid::jsi',
  },
  {
    file: 'node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
    from: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  ReactAndroid::reactnative',
    to: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  c++_shared\n  ReactAndroid::reactnative',
  },
  {
    file: 'node_modules/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake',
    from: 'target_link_libraries(${CMAKE_PROJECT_NAME}\n        fbjni',
    to: 'target_link_libraries(${CMAKE_PROJECT_NAME}\n        c++_shared\n        fbjni',
  },
  {
    file: 'node_modules/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake',
    from: 'target_compile_options(common_flags INTERFACE ${folly_FLAGS})',
    to: 'target_compile_options(common_flags INTERFACE ${folly_FLAGS})\ntarget_link_libraries(common_flags INTERFACE c++_shared)',
  },
  {
    file: 'node_modules/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake',
    from: 'target_link_libraries(${autolinked_library} common_flags)',
    to: 'target_link_libraries(${autolinked_library} common_flags c++_shared)',
  },
  {
    file: 'node_modules/metro-file-map/src/watchers/FallbackWatcher.js',
    from: `  _watchdir = (dir) => {
    if (this.watched[dir]) {
      return false;
    }
    const watcher = _fs.default.watch(
      dir,
      {
        persistent: true,
      },
      (event, filename) => this._normalizeChange(dir, event, filename),
    );
    this.watched[dir] = watcher;`,
    to: `  _watchdir = (dir) => {
    if (this.watched[dir]) {
      return false;
    }
    let watcher;
    try {
      watcher = _fs.default.watch(
        dir,
        {
          persistent: true,
        },
        (event, filename) => this._normalizeChange(dir, event, filename),
      );
    } catch (error) {
      if (isIgnorableFileError(error)) {
        return false;
      }
      throw error;
    }
    this.watched[dir] = watcher;`,
  },
];

patches.forEach(({ file, from, to }) => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  if (content.includes(to.replace(/\r\n/g, '\n'))) {
    console.log(`[patch-cmake] Already patched: ${file}`);
    return;
  }
  if (content.includes(from.replace(/\r\n/g, '\n'))) {
    content = content.replace(from.replace(/\r\n/g, '\n'), to.replace(/\r\n/g, '\n'));
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`[patch-cmake] Successfully patched: ${file}`);
  }
});
