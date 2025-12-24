import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';

interface RobotIconProps {
    mWidth?: number;
    mHeight?: number;
    size?: number;
}

const RobotIcon: React.FC<RobotIconProps> = ({mWidth = 61.2, mHeight = 25.2}) => {
    return (
        <View style={[styles.container, {width: 40, height: 40}]}>
            <Image
                source={require('../assets/ic_robot_new.png')}
                style={[styles.robotFace, {width: 40, height: 40}]}
                resizeMode="contain"
            />
            {/*<Image*/}
            {/*    source={require('../assets/ic_robot.png')}*/}
            {/*    style={[styles.robotFace, {width: mWidth, height: mHeight}]}*/}
            {/*    resizeMode="contain"*/}
            {/*/>*/}
        </View>

    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // 确保子元素不会超出圆角边界
    },
    robotFace: {
        width: '70%',
        height: '70%',
        marginTop:5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    robotHead: {
        width: '100%',
        height: '100%',
        backgroundColor: '#6366F1',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    antenna: {
        position: 'absolute',
        top: -8,
        alignItems: 'center',
    },
    antennaLine: {
        width: 2,
        height: 6,
        backgroundColor: '#6366F1',
    },
    antennaBall: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#6366F1',
        marginTop: -1,
    },
    eyes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '60%',
        marginBottom: 4,
    },
    eye: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'white',
    },
    leftEye: {
        marginLeft: 2,
    },
    rightEye: {
        marginRight: 2,
    },
    mouth: {
        width: '40%',
        height: 2,
        backgroundColor: 'white',
        borderRadius: 1,
    },
});

export default RobotIcon;