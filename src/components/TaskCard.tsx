import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';

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

  return (
    <View style={styles.card}>
      <StatusRow
        label="思考中"
        icon="🔄"
        active={status === 'thinking'}
        rotating={status === 'thinking'}
        spin={spin}
        done={status === 'thinkingComplete' || status === 'drawing'}
      />
      <View style={{ height: 8 }} />
      <StatusRow
        label="绘制中"
        icon="🛠️"
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
          <Text style={{ fontSize: 16 }}>{icon}</Text>
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
});

export default TaskCard;
