import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MainScreen from './src/screens/MainScreen';
import PermissionManager, { PermissionStatus } from './src/utils/Permissions';

/**
 * 应用程序根组件。
 * 设置 SafeAreaProvider 并渲染 MainScreen。
 */
const App = (): React.JSX.Element => {
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);

  useEffect(() => {
    // 应用启动时检查录音权限
    const checkPermission = async () => {
      try {
        const status = await PermissionManager.checkPermissionOnAppStart();
        setPermissionStatus(status);
        
        // 如果权限被拒绝或被阻止，显示提示
        if (status === PermissionStatus.BLOCKED) {
          // 权限被永久拒绝，显示去设置的提示
          PermissionManager.showPermissionDeniedAlert(true);
        } else if (status === PermissionStatus.DENIED) {
          // 权限被拒绝但可以再次请求，显示说明并请求权限
          const userAgreed = await PermissionManager.showPermissionRationale();
          if (userAgreed) {
            const newStatus = await PermissionManager.requestRecordAudioPermission();
            setPermissionStatus(newStatus);
            
            if (newStatus === PermissionStatus.BLOCKED) {
              PermissionManager.showPermissionDeniedAlert(true);
            }
          }
        }
      } catch (error) {
        console.error('权限检查失败:', error);
        setPermissionStatus(PermissionStatus.UNAVAILABLE);
      } finally {
        setPermissionChecked(true);
      }
    };

    checkPermission();
  }, []);

  // 如果权限检查还未完成，显示加载界面
  if (!permissionChecked) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>正在检查权限...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <MainScreen
        initialPermissionStatus={permissionStatus}
        onPermissionRequest={async () => {
          const status = await PermissionManager.requestRecordAudioPermission();
          setPermissionStatus(status);
          
          if (status === PermissionStatus.BLOCKED) {
            PermissionManager.showPermissionDeniedAlert(true);
          }
          
          return status;
        }}
      />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
});

export default App;
