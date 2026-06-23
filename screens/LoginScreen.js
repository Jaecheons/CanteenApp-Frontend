// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!employeeId || !password) {
      Alert.alert('Error', 'Please enter both Employee ID and Password.');
      return;
    }

    try {
      setLoading(true);

      console.log('SENDING:', {
        employeeID: parseInt(employeeId),
        password: password,
      });

      const response = await api.post('/Auth/login', {
        employeeID: parseInt(employeeId),
        password: password,
      });

      console.log('LOGIN RESPONSE:', response.data);

      const {
        token,
        role,
        name,
        employeeID,
        department,
      } = response.data;

      console.log('STORING:', { token: !!token, role, name, employeeID, department });

      await AsyncStorage.setItem('token', token ?? '');
      await AsyncStorage.setItem('role', role ?? '');
      await AsyncStorage.setItem('name', name ?? '');
      await AsyncStorage.setItem('employeeID', String(employeeID ?? ''));
      await AsyncStorage.setItem('department', department ?? '');

      console.log('STORED SUCCESSFULLY');

      if (role === 'Admin') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('Home');
      }
    } catch (err) {
      console.log('LOGIN ERROR STATUS:', err.response?.status);
      console.log('LOGIN ERROR DATA:', JSON.stringify(err.response?.data));
      console.log('LOGIN ERROR URL:', err.config?.baseURL + err.config?.url);
      Alert.alert(
        'Login Failed',
        err.response?.data?.message ?? 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/login-bg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>

          <Text style={styles.heading}>Welcome</Text>
          <Text style={styles.subheading}>Sign in to continue</Text>

          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            value={employeeId}
            onChangeText={setEmployeeId}
            keyboardType="numeric"
            placeholder="Enter your Employee ID"
            placeholderTextColor="#383838"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your Password"
            placeholderTextColor="#383838"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '90%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    alignSelf: 'center',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    alignSelf: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8,
    padding: 13,
    fontSize: 15,
    color: '#fff',
  },
  button: {
    backgroundColor: '#005f99',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { backgroundColor: '#aaa' },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});