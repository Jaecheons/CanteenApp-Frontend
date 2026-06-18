import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [name, setName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('name').then((n) => {
      if (n) setName(n);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {name} 👋</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>What would you like to do?</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.cardTitle}>📋 Weekly Menu</Text>
        <Text style={styles.cardSub}>See what's being served this week</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BookMeal')}>
        <Text style={styles.cardTitle}>🍽 Book a Meal</Text>
        <Text style={styles.cardSub}>Place a new meal booking</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('MyBookings')}>
        <Text style={styles.cardTitle}>📅 My Bookings</Text>
        <Text style={styles.cardSub}>View and manage your bookings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  logout: { fontSize: 14, color: '#005f99', fontWeight: '600' },
  sectionTitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#005f99',
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#888' },
});