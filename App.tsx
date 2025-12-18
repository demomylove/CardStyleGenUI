import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainScreen from './src/screens/MainScreen';

/**
 * 应用程序根组件。
 * 设置 SafeAreaProvider 并渲染 GenUITestScreen。
 */
const App = (): React.JSX.Element => {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
};

export default App;
