import { NativeModules, NativeEventEmitter } from 'react-native';

const { VoiceInput } = NativeModules;

// 定义事件类型
export interface VoiceInputEvents {
  onAsrBegin: void;
  onAsrResult: { result: string };
  onAsrEnd: { finalResult: string };
  onAsrError: { code: number; message: string };
}

// 创建事件发射器
const voiceInputEmitter = new NativeEventEmitter(VoiceInput);

// 定义VoiceInput API
export class VoiceInputModule {
  /**
   * 初始化ASR
   * @param asrType ASR类型，如'unisound'或'iflytek'
   * @param duplexSwitch 是否启用全双工模式
   * @param hotwordJsonStr 热词JSON字符串
   */
  static async initAsr(
    asrType: string = 'unisound',
    duplexSwitch: boolean = true,
    hotwordJsonStr: string = '{"hot":[]}'
  ): Promise<string> {
    return VoiceInput.initAsr(asrType, duplexSwitch, hotwordJsonStr);
  }

  /**
   * 开始ASR识别
   * @returns Promise<string> 识别结果
   */
  static async startAsr(): Promise<string> {
    return VoiceInput.startAsr();
  }

  /**
   * 停止ASR识别
   */
  static async stopAsr(): Promise<string> {
    return VoiceInput.stopAsr();
  }

  /**
   * 释放ASR资源
   */
  static async releaseAsr(): Promise<string> {
    return VoiceInput.releaseAsr();
  }

  /**
   * 添加事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  static addEventListener<K extends keyof VoiceInputEvents>(
    eventType: K,
    listener: (event: VoiceInputEvents[K]) => void
  ) {
    return voiceInputEmitter.addListener(eventType, listener);
  }

  /**
   * 移除所有事件监听器
   */
  static removeAllListeners() {
    voiceInputEmitter.removeAllListeners('onAsrBegin');
    voiceInputEmitter.removeAllListeners('onAsrResult');
    voiceInputEmitter.removeAllListeners('onAsrEnd');
    voiceInputEmitter.removeAllListeners('onAsrError');
  }
}

export default VoiceInputModule;