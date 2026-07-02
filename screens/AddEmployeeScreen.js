// screens/AddEmployeeScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import api from '../services/api';

const ROLES = ['Employee', 'Admin'];

export default function AddEmployeeScreen({ navigation }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Employee');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim()) return 'Please enter the employee name.';
    if (!username.trim()) return 'Please enter a username / Employee ID.';
    if (!password.trim()) return 'Please enter a password.';
    if (password.length < 4) return 'Password should be at least 4 characters.';
    return null;
  };

  const handleCreate = async () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }

    const payload = {
      name: name.trim(),
      username: username.trim(),
      department: department.trim(),
      phone: phone.trim(),
      role,
      password,
    };

    try {
      setLoading(true);
      console.log('CREATE USER PAYLOAD:', JSON.stringify(payload));
      const response = await api.post('/Users', payload);
      console.log('CREATE USER RESPONSE:', JSON.stringify(response.data));

      Alert.alert('User Created! ✅', `${name.trim()} has been added as ${role}.`, [
        {
          text: 'OK',
          onPress: () => {
            setName('');
            setUsername('');
            setDepartment('');
            setPhone('');
            setRole('Employee');
            setPassword('');
            navigation.goBack();
          }
        }
      ]);
    } catch (err) {
      console.log('CREATE USER ERROR:', err.response?.status, JSON.stringify(err.response?.data));
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Add New User</Text>
      <Text style={styles.subheading}>Create a login for an employee or admin.</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Priya Sharma"
      />

      <Text style={styles.label}>Username / Employee ID</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="e.g. 5 or priya.sharma"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Department <Text style={styles.optionalTag}>(optional)</Text></Text>
      <TextInput
        style={styles.input}
        value={department}
        onChangeText={setDepartment}
        placeholder="e.g. HR"
      />

      <Text style={styles.label}>Phone <Text style={styles.optionalTag}>(optional)</Text></Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. 9876543210"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Role</Text>
      <View style={styles.buttonRow}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.optionBtn, role === r && styles.optionBtnSelected]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.optionText, role === r && styles.optionTextSelected]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Set a login password"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Create User</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subheading: { fontSize: 13, color: '#888', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  optionalTag: { fontSize: 12, color: '#aaa', fontWeight: '400' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
  },
  optionBtnSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#005f99', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 30,
  },
  btnDisabled: { backgroundColor: '#aaa' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});