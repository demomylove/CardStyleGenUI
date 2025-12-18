import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, Button, Alert, TextInput, FlatList } from 'react-native';
import { AGUIClient } from '../utils/AGUIClient';
import { isWeatherIntent, fetchWeatherForPrompt } from '../api/weather';
import { renderComponent } from '../dsl/DslRenderer';
import TaskCard, { TaskStatus } from '../components/TaskCard';

// 统一服务器地址（与 GenUITestScreen 保持一致）
const SERVER_URL = 'http://10.210.0.58:3001/api/chat';

export default function MainScreen() {
  const client = useRef(new AGUIClient(SERVER_URL)).current;
  const [status, setStatus] = useState<TaskStatus>('thinking');
  const [statusText, setStatusText] = useState('');
  const [dsl, setDsl] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user'|'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  // 初始不自动加载，等用户点击“生成UI”
  const [loading, setLoading] = useState(false);

  const send = async (prompt: string) => {
    setLoading(true);
    setStatus('thinking');
    setStatusText('');
    setDsl(null);
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    try {
      let dataContext: any = { title: 'demo' };
      if (isWeatherIntent(prompt)) {
        // 先真实请求天气数据，放入 dataContext 提供给后端生成更贴合的数据 UI
        const weather = await fetchWeatherForPrompt(prompt);
        if (weather) {
          dataContext.weather = weather;
        }
      }
      await client.sendMessage(prompt, { dataContext });
    } catch (e: any) {
      Alert.alert('请求失败', e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    client.setListeners({
      onMessageDelta: (delta) => {
        setStatusText((prev) => prev + delta);
      },
      onStateUpdate: (newState) => {
        if (newState.dsl) {
          setDsl(newState.dsl);
          setStatus('drawing');
        }
      },
      onToolStart: () => {},
      onToolEnd: () => {},
      onError: (err) => {
        setStatus('thinkingComplete');
        Alert.alert('错误', err);
        setLoading(false);
      },
    });

    // 不自动发起请求；等待用户点击按钮
    return () => client.close();
  }, []);

  useEffect(() => {
    if (dsl) {
      // 获取到 DSL 视为完成
      setStatus('completed');
      setLoading(false);
    }
  }, [dsl]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Card Style GenUI</Text>
      </View>

      {/* 对话框区域 */}
      <FlatList
        style={styles.chat}
        data={messages}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.bubbleMe : styles.bubbleAI]}>
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <ActivityIndicator size="small" color="#1677ff" />
              <TaskCard status={status} />
              {!!statusText && <Text style={styles.hint}>{statusText}</Text>}
            </View>
          ) : null
        }
      />

      {/* DSL 渲染区域 */}
      {dsl ? (
        <View style={styles.resultBox}>{renderComponent(dsl, { title: 'demo' }, () => {})}</View>
      ) : null}

      {/* 输入区 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="请输入需求，例如：给我生成一个简单卡片UI"
        />
        <Button title="发送" onPress={() => { if (input.trim()) { send(input.trim()); setInput(''); } }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#333' },
  chat: { flex: 1 },
  bubble: { marginVertical: 4, padding: 10, borderRadius: 12, maxWidth: '80%' },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#d6f5ff' },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  bubbleText: { fontSize: 14, color: '#333' },
  resultBox: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  hint: { marginTop: 8, fontSize: 12, color: '#666' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, height: 40 },
});
