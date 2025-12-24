import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Alert,
  PanResponder,
  Animated,
} from 'react-native';
import VoiceInputModule, { VoiceInputEvents } from '../native/VoiceInput';
import PermissionManager, { PermissionStatus } from '../utils/Permissions';

interface VoiceInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: (text?: string) => void;
  style?: ViewStyle;
  disabled?: boolean;
  asrType?: string;
  duplexSwitch?: boolean;
  hotwordJsonStr?: string;
  initialPermissionStatus?: PermissionStatus | null;
  onPermissionRequest?: () => Promise<PermissionStatus>;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  value = '',
  onChangeText,
  placeholder = '点击麦克风说话',
  onSubmitEditing,
  style,
  disabled = false,
  asrType = 'unisound',
  duplexSwitch = true,
  hotwordJsonStr = '{"hot":[]}',
  initialPermissionStatus = null,
  onPermissionRequest,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(initialPermissionStatus);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [accumulatedText, setAccumulatedText] = useState('');
  const listenersRef = useRef<any[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 初始化ASR
  useEffect(() => {
    const initializeAsr = async () => {
      try {
        setIsInitializing(true);
        await VoiceInputModule.initAsr(asrType, duplexSwitch, hotwordJsonStr);
        setIsInitialized(true);
      } catch (error) {
        console.error('ASR初始化失败:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAsr();

    // 清理函数
    return () => {
      // 移除所有事件监听器
      listenersRef.current.forEach(listener => listener.remove());
      listenersRef.current = [];

      // 释放ASR资源
      if (isInitialized) {
        VoiceInputModule.releaseAsr().catch(console.error);
      }
    };
  }, []);

  // 添加事件监听器
  useEffect(() => {
    if (!isInitialized) return;

    const onAsrBeginListener = VoiceInputModule.addEventListener('onAsrBegin', () => {
      console.log('ASR开始识别');
      setInterimText('');
    });

    const onAsrResultListener = VoiceInputModule.addEventListener('onAsrResult', (event) => {
      console.log('ASR识别结果:', event.result);
      // 只更新临时文本，不累积
      // 累积逻辑在asrEnd和handlePressOut中处理，避免重复
      setInterimText(event.result);
    });

    const onAsrEndListener = VoiceInputModule.addEventListener('onAsrEnd', (event) => {
      console.log('ASR识别结束:', event.finalResult);
      
      // 在长按过程中，将最终结果累积到总文本中
      if (pressing && event.finalResult) {
        setAccumulatedText(prev => prev + event.finalResult);
      }
      
      // 清除临时文本
      setInterimText('');
      
      // 只有在非长按状态下（即开关模式）才立即处理结果
      // 长按模式下，我们会在松开手指时处理累积的文本
      if (!pressing && event.finalResult) {
        if (onChangeText) {
          onChangeText(event.finalResult);
        }
        // 立即提交，不使用setTimeout
        if (onSubmitEditing) {
          onSubmitEditing(event.finalResult);
        }
      }
      
      // duplexSwitch=true模式下，引擎会自动持续识别，不需要手动重启
    });

    const onAsrErrorListener = VoiceInputModule.addEventListener('onAsrError', (event) => {
      console.error('ASR识别错误:', event.message);
      setIsListening(false);
      setInterimText('');

      // 注意：不再在这里手动重启ASR，因为Android端已经在持续模式下自动处理错误
      // 如果Android端自动重启失败，用户可以手动切换开关来重启
    });

    // 保存监听器引用以便清理
    listenersRef.current = [
      onAsrBeginListener,
      onAsrResultListener,
      onAsrEndListener,
      onAsrErrorListener,
    ];

    return () => {
      listenersRef.current.forEach(listener => listener.remove());
      listenersRef.current = [];
    };
  }, [isInitialized, onChangeText, onSubmitEditing, pressing]);

  // 开始语音识别
  const startListening = async () => {
    if (!isInitialized || isListening) return;

    try {
      setIsListening(true);
      await VoiceInputModule.startAsr();
    } catch (error) {
      console.error('启动ASR失败:', error);
      setIsListening(false);
    }
  };

  // 停止语音识别
  const stopListening = async () => {
    // 即使isListening为false也要尝试停止，因为可能存在后台识别
    try {
      await VoiceInputModule.stopAsr();
      setIsListening(false);
      setInterimText(''); // 清除临时文本
    } catch (error) {
      console.error('停止ASR失败:', error);
    }
  };

  // 检查并请求权限
  const checkAndRequestPermission = async (showRationale: boolean = true): Promise<boolean> => {
    // 如果已经有权限，直接返回
    if (permissionStatus === PermissionStatus.GRANTED) {
      return true;
    }

    // 如果没有权限状态，先检查
    if (permissionStatus === null) {
      const status = await PermissionManager.checkRecordAudioPermission();
      setPermissionStatus(status);
      
      if (status === PermissionStatus.GRANTED) {
        return true;
      }
    }

    // 如果权限被拒绝或被阻止，尝试请求权限
    if (permissionStatus === PermissionStatus.DENIED || permissionStatus === PermissionStatus.BLOCKED) {
      setPermissionLoading(true);
      try {
        // 对于DENIED状态，显示权限说明
        if (permissionStatus === PermissionStatus.DENIED && showRationale) {
          const userAgreed = await PermissionManager.showPermissionRationale();
          if (!userAgreed) {
            return false;
          }
        }

        let status: PermissionStatus;
        
        if (onPermissionRequest) {
          status = await onPermissionRequest();
        } else {
          status = await PermissionManager.requestRecordAudioPermission();
        }
        
        setPermissionStatus(status);
        
        if (status === PermissionStatus.GRANTED) {
          return true;
        } else if (status === PermissionStatus.BLOCKED) {
          // 权限被永久拒绝，显示去设置的提示
          const goToSettings = await PermissionManager.showPermissionDeniedAlert(true);
          if (goToSettings) {
            // 用户点击了去设置，等待用户从设置返回后再次检查权限
            setTimeout(async () => {
              const newStatus = await PermissionManager.checkRecordAudioPermission();
              setPermissionStatus(newStatus);
            }, 1000);
          }
        } else if (status === PermissionStatus.DENIED && showRationale) {
          // 权限再次被拒绝，提示用户可以重试
          Alert.alert(
            '权限请求',
            '录音权限被拒绝，您可以稍后再次尝试授权。',
            [
              {
                text: '确定',
                style: 'default',
              },
            ]
          );
        }
        
        return false;
      } catch (error) {
        console.error('权限请求失败:', error);
        Alert.alert(
          '错误',
          '权限请求过程中发生错误，请重试。',
          [
            {
              text: '确定',
              style: 'default',
            },
          ]
        );
        return false;
      } finally {
        setPermissionLoading(false);
      }
    }
    
    return false;
  };

  // 处理长按开始
  const handlePressIn = async () => {
    if (!isInitialized || isListening) return;
    
    // 检查权限
    const hasPermission = await checkAndRequestPermission();
    if (hasPermission) {
      setPressing(true);
      startListening();
      // 开始脉冲动画
      startPulseAnimation();
    }
  };

  // 处理长按结束
  const handlePressOut = async () => {
    setPressing(false);
    if (isListening) {
      await stopListening();
    }
    
    // 停止脉冲动画
    stopPulseAnimation();
    
    // 处理累积的文本和临时文本
    let finalText = accumulatedText;
    
    // 如果有临时文本，将其添加到最终文本中
    // 这样可以确保即使用户在asrResult阶段松开按钮，也能获取到最新的识别结果
    if (interimText.trim()) {
      finalText += interimText;
    }
    
    // 如果有最终文本，发送给父组件
    if (finalText.trim()) {
      if (onChangeText) {
        onChangeText(finalText.trim());
      }
      if (onSubmitEditing) {
        onSubmitEditing(finalText.trim());
      }
    }
    
    // 清空累积的文本和临时文本
    setAccumulatedText('');
    setInterimText('');
  };

  // 开始脉冲动画
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // 停止脉冲动画
  const stopPulseAnimation = () => {
    pulseAnim.setValue(1);
    pulseAnim.stopAnimation();
  };

  // 创建PanResponder来处理长按
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderReject: () => {
        handlePressOut();
      },
      onPanResponderGrant: () => {
        handlePressIn();
      },
      onPanResponderRelease: () => {
        handlePressOut();
      },
    })
  ).current;

  // 获取权限状态文本
  const getPermissionStatusText = () => {
    if (permissionStatus === null) return '';
    switch (permissionStatus) {
      case PermissionStatus.GRANTED:
        return '';
      case PermissionStatus.DENIED:
        return '需要麦克风权限';
      case PermissionStatus.BLOCKED:
        return '权限被拒绝，请在设置中开启';
      case PermissionStatus.UNAVAILABLE:
        return '权限不可用';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {pressing ? (accumulatedText + interimText) : (interimText || value || placeholder)}
        </Text>
        {permissionLoading && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={styles.permissionIndicator}
          />
        )}
      </View>

      <View style={styles.controlContainer}>
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonActive,
              pressing && styles.micButtonPressing,
              (disabled || isInitializing || !isInitialized || permissionLoading) && styles.micButtonDisabled
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || isInitializing || !isInitialized || permissionLoading}
            {...panResponder.panHandlers}
          >
            <Animated.View style={[
              styles.micIconContainer,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}>
              <Text style={[
                styles.micIcon,
                isListening && styles.micIconActive
              ]}>
                🎙️
              </Text>
            </Animated.View>
            {isListening && (
              <View style={styles.recordingRing} />
            )}
          </TouchableOpacity>
          <Text style={styles.micHintText}>
            {isListening ? '正在录音...' : '长按说话'}
          </Text>
        </View>
        
        {getPermissionStatusText() ? (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => checkAndRequestPermission()}
            disabled={permissionLoading}
          >
            <Text style={styles.permissionButtonText}>
              {permissionStatus === PermissionStatus.BLOCKED ? '去设置' : '授权'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      
      {getPermissionStatusText() && (
        <Text style={styles.permissionStatusText}>
          {getPermissionStatusText()}
        </Text>
      )}
    </View>

  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 40,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  indicator: {
    marginLeft: 10,
  },
  permissionIndicator: {
    marginLeft: 10,
  },
  controlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  micContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  micButtonActive: {
    backgroundColor: '#EC4899',
    shadowColor: '#EC4899',
  },
  micButtonPressing: {
    shadowOpacity: 0.5,
    elevation: 12,
  },
  micButtonDisabled: {
    backgroundColor: '#e0e0e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  micIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  micIcon: {
    fontSize: 28,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  micIconActive: {
    fontSize: 24,
  },
  recordingRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(245, 87, 108, 0.5)',
    zIndex: 1,
  },
  micHintText: {
    fontSize: 16,
    color: '#333',
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    marginLeft: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionStatusText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});

export default VoiceInput;