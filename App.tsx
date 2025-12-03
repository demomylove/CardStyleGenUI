import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ChatScreen from './src/screens/ChatScreen';

/**
 * 应用程序根组件。
 * 设置 SafeAreaProvider 并渲染 ChatScreen。
 */
const App = (): React.JSX.Element => {
  return (
    <SafeAreaProvider>
      <ChatScreen />
    </SafeAreaProvider>
  );
};

export default App;
