import React from 'react';
import {View, StyleSheet, Image} from 'react-native';

interface UserIconProps {
    size?: number;
}

const UserIcon: React.FC<UserIconProps> = ({size = 40}) => {
    return (
        <View style={[styles.container, {width: size, height: size, borderRadius: size / 2}]}>
            <Image
                source={require('../assets/ic_user.png')}
                style={[styles.userFace, {width: size, height: size}]}
                resizeMode="contain"
            />
            {/*<View style={styles.userAvatar}>*/}
            {/*  /!* 用户头像圆形背景 *!/*/}
            {/*  <View style={styles.avatarCircle}>*/}
            {/*    /!* 用户头部 *!/*/}
            {/*    <View style={styles.userHead} />*/}
            {/*    /!* 用户身体 *!/*/}
            {/*    <View style={styles.userBody} />*/}
            {/*  </View>*/}
            {/*</View>*/}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E6F2FF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    userFace: {
        width: '70%',
        height: '70%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatar: {
        width: '70%',
        height: '70%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCircle: {
        width: '100%',
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    userHead: {
        width: '40%',
        height: '35%',
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 1,
    },
    userBody: {
        width: '70%',
        height: '45%',
        backgroundColor: 'white',
        borderRadius: 25,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
});

export default UserIcon;