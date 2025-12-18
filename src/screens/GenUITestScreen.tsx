import { isWeatherIntent, fetchWeatherForPrompt } from '../api/weather';

import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Button, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { renderComponent } from '../dsl/DslRenderer';
import { AGUIClient } from '../utils/AGUIClient';

export default function GenUITestScreen() {
  const [query, setQuery] = useState('帮我设计一个展示周杰伦《七里香》的音乐卡片');
  const [dataJson, setDataJson] = useState('{\n  "title": "七里香",\n  "artist": "周杰伦",\n  "cover": "https://p1.music.126.net/s8rG2Jc8R9w0g7_l_G8jRg==/109951165792276536.jpg"\n}');
  const [generatedDsl, setGeneratedDsl] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  // 真实服务器地址（Android 模拟器已连接；走云端 NodePort/Ingress 暴露的地址）
  // 注意：Android 9+ 对 http 明文默认限制，AndroidManifest 已启用 usesCleartextTraffic=true 便于联调
  const SERVER_URL = 'http://10.210.0.58:3001/api/chat'; 
  
  const client = useRef(new AGUIClient(SERVER_URL)).current;

  // Setup listeners once
  useEffect(() => {
    client.setListeners({
        onMessageDelta: (delta) => {
            setStatusText(prev => prev + delta);
        },
        onStateUpdate: (newState) => {
            if (newState.dsl) {
                setGeneratedDsl(newState.dsl);
            }
        },
        onToolStart: (name, args) => {
             setStatusText(prev => prev + `\n[Tool] executing ${name}...`);
             if (name === 'playMusic') {
                 Alert.alert('Tool Execution', `Playing Music: ${args.songId || 'Unknown'}`);
             } else if (name === 'showToast') {
                 Alert.alert('Tool Execution', `Toast: ${args.message}`);
             } else {
                 Alert.alert('Tool Error', `Unknown tool: ${name}`);
             }
        },
        onHumanInputRequest: async (prompt, options) => {
            setStatusText(prev => prev + `\n[HITL] Requesting input: ${prompt}`);
            return new Promise((resolve) => {
                if (options && options.length > 0) {
                     Alert.alert(
                         "Input Required",
                         prompt,
                         options.map(opt => ({ text: opt, onPress: () => resolve(opt) }))
                     );
                } else {
                    Alert.alert(
                        "Input Required", 
                        prompt,
                        [
                            { text: "Cancel", onPress: () => resolve("Cancel"), style: "cancel" },
                            { text: "OK", onPress: () => resolve("OK") } // Simplification: In real app, use prompt dialog
                        ]
                    );
                }
            });
        },
        onError: (err) => {
            console.error(err);
            setStatusText(prev => prev + "\nError: " + err);
            setLoading(false);
            Alert.alert("Error", err);
        }
    });

    return () => {
        client.close();
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedDsl(null);
    setStatusText('');
    
    try {
      const dataContext = JSON.parse(dataJson);
      if (isWeatherIntent(query)) {
        const weather = await fetchWeatherForPrompt(query);
        if (weather) dataContext.weather = weather;
      }
      // We pass dataContext in the state so the server can use it to build the prompt
      await client.sendMessage(query, { dataContext });
    } catch (e: any) {
      console.error(e);
      setStatusText('Failed to start: ' + e.message);
      setLoading(false);
    }
  };



  // Monitor loading state based on status text or dsl presence
  useEffect(() => {
      // If we received DSL or error, we are done "loading" for UI purposes, though streaming might continue.
      // Simple logic: if we have DSL, stop loading spinner.
      if (generatedDsl) {
          setLoading(false);
      }
  }, [generatedDsl]);

  const handleInteraction = (action: any) => {
    // action is the payload from on_click, e.g. "navigate_to_details" or { type: "like", id: "123" }
    const actionMsg = `User performed action: ${JSON.stringify(action)}`;
    setStatusText(`Sending action: ${JSON.stringify(action)}...`);
    
    // Send action message.
    // We don't need to pass DSL anymore, Server has it in session.
    // We might want to pass dataContext if it changed, but here we assume it's static or managed.
    client.sendMessage(actionMsg).catch(err => {
      Alert.alert('Error sending action', err.message);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>AG-UI Client Test</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>User Query:</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. Unique music player card"
            multiline
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Data Context (JSON):</Text>
          <TextInput
            style={[styles.input, styles.jsonInput]}
            value={dataJson}
            onChangeText={setDataJson}
            multiline
            numberOfLines={4}
          />
        </View>

        <Button title="Generate UI (Server)" onPress={handleGenerate} disabled={loading} />

        <View style={styles.divider} />
        
        {statusText ? (
            <View style={styles.statusBox}>
                <Text style={styles.statusText}>{statusText}</Text>
            </View>
        ) : null}

        <Text style={styles.label}>Result:</Text>

        {loading && !generatedDsl ? (
           <ActivityIndicator size="large" color="#0000ff" />
        ) : (
           generatedDsl ? (
             <View style={styles.resultContainer}>
                {renderComponent(generatedDsl, JSON.parse(dataJson), handleInteraction)}
             </View>
           ) : (
             <Text style={styles.info}>UI will appear here...</Text>
           )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
      paddingBottom: 40,
  },
  inputContainer: {
      marginBottom: 16,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 40,
    textAlign: 'center',
    color: '#333',
  },
  info: {
      fontSize: 12,
      color: '#666',
      textAlign: 'center',
      marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    fontSize: 14,
  },
  jsonInput: {
    height: 100,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 20,
  },
  statusBox: {
      backgroundColor: '#e6f7ff',
      padding: 10,
      borderRadius: 8,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#91d5ff'
  },
  statusText: {
      fontSize: 12,
      color: '#0050b3',
      fontFamily: 'monospace'
  },
  resultContainer: {
    minHeight: 200,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center', // Center content if empty or small
  },
});
