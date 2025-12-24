import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import TaskCard, { TaskStatus } from '../components/TaskCard';
import { omphalos, weather, music, poi } from '../api/senseClient';
import { DslFactory } from '../dsl/DslFactory';
import VoiceInput from '../components/VoiceInput';

interface Message {
  id: string;
  isUser: boolean;
  text?: string;
  task?: {
    status: TaskStatus;
    content?: React.ReactNode;
  };
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCardMsgId, setLastCardMsgId] = useState<string | null>(null);

  /**
   * 检测用户消息是否为修改请求（而非新卡片请求）
   */
  const isModificationRequest = (text: string): boolean => {
    const keywords = ['改', '换', '调整', '颜色', '标题', '字体', '大小', '修改', '背景', '样式'];
    return keywords.some(k => text.includes(k));
  };

  /**
   * 更新特定任务消息的状态。
   * @param id 要更新的消息 ID
   * @param status 任务的新状态
   * @param content 任务完成时要渲染的可选内容
   */
  const updateTaskStatus = (id: string, status: TaskStatus, content?: React.ReactNode) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id && m.task
          ? { ...m, task: { ...m.task, status, content: content || m.task.content } }
          : m
      )
    );
  };

  /**
   * 处理用户提交消息时的发送操作。
   * 启动 API 调用序列：意图识别 -> DSL -> 渲染。
   */
  /**
   * 处理用户提交消息时的发送操作。
   * 启动 API 调用序列：意图识别 -> DSL -> 渲染。
   * @param contentOptional 可选的直接文本输入（用于解决 ASR 异步 State 更新问题）
   */
  const handleSend = async (contentOptional?: string | any) => {
    // 优先使用直接传入的文本（如果是字符串），否则使用 State 中的文本
    // 注意：TouchableOpacity 的 onPress 会传入事件对象，需要忽略
    let text = '';
    if (typeof contentOptional === 'string') {
        text = contentOptional;
    } else {
        text = inputText;
    }
    text = text.trim();
    
    if (!text) return;

    // 检测是否为修改请求
    const isRequestModify = isModificationRequest(text);
    
    // 如果是修改请求但 lastCardMsgId 为空（可能是 Hot Reload 导致状态丢失），尝试从历史消息中找回
    let targetId = lastCardMsgId;
    if (isRequestModify && !targetId) {
      const lastTaskMsg = [...messages].reverse().find(m => !m.isUser && m.task?.content);
      if (lastTaskMsg) {
        targetId = lastTaskMsg.id;
        setLastCardMsgId(targetId);
      }
    }

    const isModify = isRequestModify && targetId !== null;

    const userMsg: Message = {
      id: Date.now().toString() + '_user',
      isUser: true,
      text: text,
    };

    let taskMsgId: string;

    if (isModify) {
      // 修改模式：复用现有卡片，不创建新任务消息
      taskMsgId = targetId!;
      setMessages((prev) => [...prev, userMsg]);
      updateTaskStatus(taskMsgId, 'drawing'); // 跳过 thinking，卡片保持可见
    } else {
      // 新卡片模式：创建新任务消息
      taskMsgId = Date.now().toString() + '_task';
      const taskMsg: Message = {
        id: taskMsgId,
        isUser: false,
        task: {
          status: 'thinking',
        },
      };
      setMessages((prev) => [...prev, userMsg, taskMsg]);
    }

    setInputText('');
    setLoading(true);

    try {
      // 1. Get Intentions
      // Hack: Bypass omphalos for coffee/poi demo to avoid external service latency/failure
      let intentions: any[] = [];
      if (text.includes('咖啡') || text.includes('附近') || text.toLowerCase().includes('coffee') || text.toLowerCase().includes('nearby')) {
          console.log('Skipping Omphalos for local POI demo');
          intentions = [{ can_execute: true, domain: 'poi' }];
      } else {
          intentions = await omphalos(text);
      }
      
      updateTaskStatus(taskMsgId, 'thinkingComplete');
      
      // Wait a bit for visual effect
      await new Promise(r => setTimeout(() => r(undefined), 200));

      let dslString = '';

      if (intentions && intentions.length > 0) {
        updateTaskStatus(taskMsgId, 'drawing');
        
        for (const intention of intentions) {
          if (intention.can_execute) {
            const domain = intention.domain;
            console.log('Domain:', domain);
            
            if (domain === 'weather') {
              dslString = await weather(text);
            } else if (domain === 'media') {
              dslString = await music(text);
            } else if (domain === 'poi') {
              dslString = await poi(text);
            }
          }
        }
      }

      console.log('DSL:', dslString);

      if (dslString) {
        // Auto-detect JSON component vs legacy string DSL
        const widget = await (DslFactory as any).parseAny
          ? (DslFactory as any).parseAny(dslString)
          : DslFactory.parseDsl(dslString);
        updateTaskStatus(taskMsgId, 'completed', widget);
        setLastCardMsgId(taskMsgId); // 记住此卡片 ID，供后续修改使用
      } else {
        updateTaskStatus(taskMsgId, 'completed', (
          <View style={{ padding: 12 }}>
            <Text style={{ color: 'orange', textAlign: 'center' }}>
              暂时无法获取相关数据{'\n'}请稍后再试或联系管理员检查服务器配置
            </Text>
          </View>
        ));
      }

    } catch (e) {
      console.error(e);
      updateTaskStatus(taskMsgId, 'completed', (
        <View style={{ padding: 12 }}>
          <Text style={{ color: 'red' }}>错误: {String(e)}</Text>
        </View>
      ));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 渲染列表中的单个消息项。
   * @param item 要渲染的消息对象
   */
  const renderItem = ({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <View style={styles.userMsgContainer}>
          <View style={styles.userMsgBubble}>
            <Text style={styles.userMsgText}>{item.text}</Text>
          </View>
        </View>
      );
    } else {
      const content = item.task!.content;
      // Fail-safe: if content is empty but我们已经完成，则给一个提示避免空白
      if (item.task!.status === 'completed' && !content) {
        return (
          <View style={{ padding: 12 }}>
            <Text style={{ color: 'orange', textAlign: 'center' }}>未收到可渲染的内容，请重试或检查服务端 DSL。</Text>
          </View>
        );
      }
      return <TaskCard status={item.task!.status} content={content} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Demo</Text>
        </View>
        
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
        />

        <View style={styles.inputContainer}>
          <VoiceInput
            style={styles.voiceInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="请输入或点击麦克风说话..."
            onSubmitEditing={handleSend}
            disabled={loading}
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={loading}>
             <Text style={{ opacity: loading ? 0.3 : 1 }}>➡️</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: '#EEE'
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: 'bold'
  },
  userMsgContainer: {
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  userMsgBubble: {
    backgroundColor: '#90CAF9',
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%',
  },
  userMsgText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    alignItems: 'center',
  },
  voiceInput: {
    flex: 1,
    height: 40,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
});

export default ChatScreen;
