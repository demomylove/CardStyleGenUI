import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString() + '_user',
      isUser: true,
      text: text,
    };

    const taskMsgId = Date.now().toString() + '_task';
    const taskMsg: Message = {
      id: taskMsgId,
      isUser: false,
      task: {
        status: 'thinking',
      },
    };

    setMessages((prev) => [...prev, userMsg, taskMsg]);
    setInputText('');
    setLoading(true);

    try {
      // 1. Get Intentions
      // Wait 2 seconds simulation? No, real call.
      const intentions = await omphalos(text);
      
      updateTaskStatus(taskMsgId, 'thinkingComplete');
      
      // Wait a bit for visual effect
      await new Promise(r => setTimeout(r, 200));

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
        const widget = await DslFactory.parseDsl(dslString);
        updateTaskStatus(taskMsgId, 'completed', widget);
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
      return (
        <TaskCard
          status={item.task!.status}
          content={item.task!.content}
        />
      );
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
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="请输入..."
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
             <Text>➡️</Text> 
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
