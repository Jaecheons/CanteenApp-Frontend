// screens/ProfileScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState('');
  const [employeeID, setEmployeeID] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const n = await AsyncStorage.getItem('name');
      const e = await AsyncStorage.getItem('employeeID');
      const r = await AsyncStorage.getItem('role');
      const d = await AsyncStorage.getItem('department');
      if (n) setName(n);
      if (e) setEmployeeID(e);
      if (r) setRole(r);
      if (d) setDepartment(d);
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleColor = (r) => {
    return r === 'Admin' ? '#e67e22' : '#005f99';
  };

  const Row = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? '—'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: getRoleColor(role) }]}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <Text style={styles.nameText}>{name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) }]}>
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <Row label="Employee ID" value={employeeID} />
        <Row label="Full Name" value={name} />
        <Row label="Department" value={department} />
        <Row label="Role" value={role} />
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, elevation: 4,
  },
  avatarText: {
    fontSize: 34, fontWeight: 'bold', color: '#fff',
  },
  nameText: {
    fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8,
  },
  roleBadge: {
    paddingVertical: 4, paddingHorizontal: 16,
    borderRadius: 20,
  },
  roleText: {
    color: '#fff', fontWeight: '600', fontSize: 13,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, elevation: 2, marginBottom: 16,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 14, color: '#888', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  logoutBtn: {
    backgroundColor: '#c0392b', padding: 16,
    borderRadius: 10, alignItems: 'center',
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});