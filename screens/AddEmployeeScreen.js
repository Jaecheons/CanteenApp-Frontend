// screens/AddEmployeeScreen.js - To add New User (Employee, Contractor, Intern, Guest) with login credentials
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import api from '../services/api';

const ROLES = ['Employee', 'Admin'];
const USER_TYPES = ['Contractual Employee', 'Apprentice', 'Intern', 'Guest'];

export default function AddEmployeeScreen({ navigation }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Employee');
  const [userType, setUserType] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim()) return 'Please enter the full name.';
    if (!username.trim()) return 'Please enter a username.';
    if (!phone.trim()) return 'Please enter a phone number.';
    if (!/^\d{10}$/.test(phone.trim())) return 'Please enter a valid 10-digit phone number.';
    if (!userType) return 'Please select a user type.';
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
      department: department.trim() || null,
      userType,
      phone: phone.trim(),
      role,
      password,
    };

    try {
      setLoading(true);
      console.log('CREATE USER PAYLOAD:', JSON.stringify(payload));
      const response = await api.post('/Users', payload);
      console.log('CREATE USER RESPONSE:', JSON.stringify(response.data));

      const newUserID = response.data?.userID;

      Alert.alert('User Created!', `${name.trim()} has been added as ${role}.${newUserID ? ` (ID: ${newUserID})` : ''}`, [
        {
          text: 'OK',
          onPress: () => {
            setName('');
            setUsername('');
            setDepartment('');
            setPhone('');
            setRole('Employee');
            setUserType(null);
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

    <KeyboardAwareScrollView 
    style={styles.container} 
    contentContainerStyle={styles.content}
    enableOnAndroid={true}
    keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Add New User</Text>
      <Text style={styles.subheading}>Create a login for an employee, contractor, intern, or guest.</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Priya Sharma"
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="e.g. priya.sharma"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Department <Text style={styles.optionalTag}>(optional)</Text></Text>
      <TextInput
        style={styles.input}
        value={department}
        onChangeText={setDepartment}
        placeholder="e.g. HR"
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. 9876543210"
        keyboardType="phone-pad"
        maxLength={10}
      />

      <Text style={styles.label}>User Type</Text>
      <View style={styles.buttonRow}>
        {USER_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.optionBtn, userType === t && styles.optionBtnSelected]}
            onPress={() => setUserType(t)}
          >
            <Text style={[styles.optionText, userType === t && styles.optionTextSelected]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 120 },
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
  optionText: { fontSize: 14, color: '#333333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#005f99', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 30,
  },
  btnDisabled: { backgroundColor: '#aaa' },
  submitText: { color: '#fffcfc', fontSize: 16, fontWeight: 'bold' },
});