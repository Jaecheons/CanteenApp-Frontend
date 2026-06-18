// screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('role');

        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (token) {
          if (role?.toLowerCase() === 'admin') {
            navigation.replace('AdminDashboard');
          } else {
            navigation.replace('Home');
          }
        } else {
          navigation.replace('Login');
        }
      } catch (e) {
        navigation.replace('Login');
      }
    };

    checkToken();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>XYZ Canteen</Text>
      <Text style={styles.subtitle}>Meal Booking App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#005f99',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cce5ff',
  },
});