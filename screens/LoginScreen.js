import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
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
      const response = await api.post('/api/auth/login', {
        employeeId: parseInt(employeeId),
        password: password,
      });

      const { token, role, name } = response.data;
      console.log('LOGIN RESPONSE:', response.data);

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', role);
      await AsyncStorage.setItem('name', name);

      if (role?.toLowerCase() === 'admin') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('Home');
      }
    } catch (err) {
      Alert.alert(
        'Login Failed',
        err.response?.data?.message ?? 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.heading}>Welcome</Text>
      <Text style={styles.subheading}>Sign in to continue</Text>

      <Text style={styles.label}>Employee ID</Text>
      <TextInput
        style={styles.input}
        value={employeeId}
        onChangeText={setEmployeeId}
        keyboardType="numeric"
        placeholder="Enter your Employee ID"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Enter your Password"
        placeholderTextColor="#aaa"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#005f99',
    alignSelf: 'center',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: '#888',
    alignSelf: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 13,
    fontSize: 15,
    color: '#111',
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