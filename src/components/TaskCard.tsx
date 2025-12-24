import React, { useEffect, useRef } from 'react';
import {View, Text, Animated, Easing, StyleSheet, Image} from 'react-native';

export type TaskStatus = 'thinking' | 'thinkingComplete' | 'drawing' | 'completed';

interface TaskCardProps {
  status: TaskStatus;
  content?: React.ReactNode;
}

const TaskCard: React.FC<TaskCardProps> = ({ status, content }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 根据状态控制旋转动画
  useEffect(() => {
    if (status === 'thinking' || status === 'drawing') {
      startRotation();
    } else {
      stopRotation();
    }
  }, [status]);

  const startRotation = () => {
    rotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true, // Use native driver for smoother performance
      })
    ).start();
  };
// ... existing code ...

  const stopRotation = () => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (status === 'completed') {
    return (
      <View style={styles.card}>
        {content}
      </View>
    );
  }

  // 修改模式：只要已有内容（无论是在思考还是绘制），都显示内容 + 加载指示器
  if (content) {
    return (
      <View style={styles.card}>
        {content}
        <View style={styles.loadingOverlay}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Text style={{ fontSize: 16 }}>🔄</Text>
          </Animated.View>
          <Text style={{ marginLeft: 8, color: 'green' }}>
             {status === 'thinking' ? '思考中...' : '更新中...'}
          </Text>
        </View>
      </View>
    );
  }

  // 新建卡片：显示思考中/绘制中状态
  return (
    <View style={styles.card}>
      <StatusRow
        label="思考中"
        icon={require('../assets/ic_thinking.png')}
        active={status === 'thinking'}
        rotating={status === 'thinking'}
        spin={spin}
        done={status === 'thinkingComplete' || status === 'drawing'}
      />
      <View style={{ height: 8 }} />
      <StatusRow
        label="绘制中"
        icon={require('../assets/ic_thinking.png')}
        active={status === 'drawing'}
        rotating={status === 'drawing'}
        spin={spin}
        done={false}
      />
    </View>
  );
};

const StatusRow = ({ label, icon, active, rotating, spin, done }: any) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {rotating ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Image
                source={icon}
                style={[{width: 16, height: 16}]}
                resizeMode="contain"
            />
        </Animated.View>
      ) : (
        <Text style={{ fontSize: 16 }}>{done ? '✅' : (active ? icon : '⚪')}</Text>
      )}
      <Text style={{ marginLeft: 8, color: (active || done) ? 'green' : 'grey' }}>
        {done ? (label === '思考中' ? '完成思考' : label) : label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EEEEEE',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
});

export default TaskCard;
