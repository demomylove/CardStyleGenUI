import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

// 权限状态枚举
export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  BLOCKED = 'blocked',
  UNAVAILABLE = 'unavailable',
}

export class PermissionManager {
  /**
   * 检查录音权限状态
   * @returns Promise<PermissionStatus> 权限状态
   */
  static async checkRecordAudioPermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        return granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED;
      } catch (error) {
        console.error('检查录音权限失败:', error);
        return PermissionStatus.UNAVAILABLE;
      }
    } else {
      // iOS权限检查 - 由于没有安装react-native-permissions，暂时返回已授权
      // 实际项目中应该使用check(PERMISSIONS.IOS.MICROPHONE)
      return PermissionStatus.GRANTED;
    }
  }

  /**
   * 请求录音权限
   * @returns Promise<PermissionStatus> 权限状态
   */
  static async requestRecordAudioPermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'android') {
      try {
        // 检查是否已有权限
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        
        if (granted) {
          return PermissionStatus.GRANTED;
        }

        // 请求权限
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '录音权限',
            message: '应用需要访问麦克风来进行语音识别功能',
            buttonNeutral: '稍后询问',
            buttonNegative: '取消',
            buttonPositive: '确定',
          }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return PermissionStatus.GRANTED;
        } else if (result === PermissionsAndroid.RESULTS.DENIED) {
          return PermissionStatus.DENIED;
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return PermissionStatus.BLOCKED;
        } else {
          return PermissionStatus.DENIED;
        }
      } catch (error) {
        console.error('请求录音权限失败:', error);
        return PermissionStatus.UNAVAILABLE;
      }
    } else {
      // iOS权限请求 - 实际项目中应该使用request(PERMISSIONS.IOS.MICROPHONE)
      // 暂时返回已授权
      return PermissionStatus.GRANTED;
    }
  }

  /**
   * 显示权限说明对话框
   * @returns Promise<boolean> 用户是否同意继续
   */
  static showPermissionRationale(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '需要录音权限',
        '应用需要访问麦克风来进行语音识别功能，请在权限请求中点击"确定"。',
        [
          {
            text: '取消',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: '确定',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * 检查并请求录音权限（带用户说明）
   * @returns Promise<PermissionStatus> 权限状态
   */
  static async ensureRecordAudioPermission(): Promise<PermissionStatus> {
    // 先检查当前权限状态
    const currentStatus = await this.checkRecordAudioPermission();
    
    if (currentStatus === PermissionStatus.GRANTED) {
      return PermissionStatus.GRANTED;
    }

    // 显示权限说明
    const userAgreed = await this.showPermissionRationale();
    if (!userAgreed) {
      return PermissionStatus.DENIED;
    }

    // 请求权限
    return this.requestRecordAudioPermission();
  }

  /**
   * 显示权限被拒绝的提示
   * @param showSettingsButton 是否显示去设置按钮
   */
  static showPermissionDeniedAlert(showSettingsButton: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      const buttons = [
        {
          text: '确定',
          onPress: () => resolve(false),
          style: 'default' as const,
        },
      ];

      if (showSettingsButton) {
        buttons.unshift({
          text: '去设置',
          onPress: () => {
            this.openSettings();
            resolve(true);
          },
          style: 'default' as const,
        });
      }

      Alert.alert(
        '权限被拒绝',
        '无法使用语音识别功能，因为录音权限被拒绝。请在设置中手动开启权限。',
        buttons
      );
    });
  }

  /**
   * 打开应用设置页面
   */
  static openSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  /**
   * 应用启动时检查权限
   * @returns Promise<PermissionStatus> 权限状态
   */
  static async checkPermissionOnAppStart(): Promise<PermissionStatus> {
    const status = await this.checkRecordAudioPermission();
    
    if (status === PermissionStatus.DENIED || status === PermissionStatus.BLOCKED) {
      // 显示权限说明并请求权限
      const userAgreed = await this.showPermissionRationale();
      if (userAgreed) {
        return this.requestRecordAudioPermission();
      }
      return status;
    }
    
    return status;
  }
}

export default PermissionManager;