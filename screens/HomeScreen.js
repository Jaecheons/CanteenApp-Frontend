// screens/HomeScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const [name, setName] = useState('');
  const [specials, setSpecials] = useState([]);
  const [todayMenu, setTodayMenu] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getDayName = () => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  };

  const fetchData = async () => {
    try {
      const storedName = await AsyncStorage.getItem('name');
      if (storedName) setName(storedName);

      const [specialsRes, menuRes, notifRes] = await Promise.all([
        api.get('/Specials/today').catch(() => ({ data: [] })),
        api.get(`/Menu/${getDayName()}`).catch(() => ({ data: [] })),
        api.get('/Notifications/my').catch(() => ({ data: [] })),
      ]);

      const unread = (notifRes.data ?? []).filter((n) => !n.isRead).length;
      setUnreadCount(unread);

      // Load local images for each special
      const specialsWithImages = await Promise.all(
        (specialsRes.data ?? []).map(async (special) => {
          try {
            const localImage = await AsyncStorage.getItem(`special_image_${special.specialID}`);
            return { ...special, localImage };
          } catch {
            return { ...special, localImage: null };
          }
        })
      );

      setSpecials(specialsWithImages);

      // Group today's menu items by mealType
      const items = menuRes.data ?? [];
      const grouped = items.reduce((acc, item) => {
        const type = item.mealType;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      }, {});
      setTodayMenu(grouped);

    } catch (err) {
      console.log('HOME ERROR:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#005f99']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {name} 👋</Text>
          <Text style={styles.date}>{getDayName()}, {new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.iconBtnText}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.iconBtnText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Special Banner */}
      {specials.length > 0 && (
        <View style={styles.specialBanner}>
          <Text style={styles.specialTitle}>🌟 Today's Special</Text>
          {specials.map((special, index) => (
            <View key={index} style={styles.specialItem}>
              {special.localImage ? (
                <Image
                  source={{ uri: special.localImage }}
                  style={styles.specialImage}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.specialName}>{special.specialName}</Text>
              <Text style={styles.specialMeta}>
                {special.mealType} · {special.applicableOutlets?.join(', ')}
              </Text>
              {special.description ? (
                <Text style={styles.specialDesc}>{special.description}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

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

      {/* Today's Menu Preview */}
      {Object.keys(todayMenu).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Today's Menu</Text>
          <View style={styles.menuCard}>
            {Object.entries(todayMenu).map(([mealType, items]) => (
              <View key={mealType} style={styles.mealTypeBlock}>
                <Text style={styles.mealTypeTitle}>{mealType}</Text>
                {items.map((item, index) => (
                  <Text key={index} style={styles.menuItem}>
                    · {item.itemName}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginTop: 50, marginBottom: 20,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  date: { fontSize: 13, color: '#888', marginTop: 2 },
  headerIcons: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    backgroundColor: '#005f99',
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  iconBtnText: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#c0392b',
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  specialBanner: {
    backgroundColor: '#fff8e1', borderRadius: 12,
    padding: 16, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: '#f39c12', elevation: 2,
  },
  specialTitle: { fontSize: 15, fontWeight: 'bold', color: '#e67e22', marginBottom: 10 },
  specialItem: { marginBottom: 10 },
  specialImage: {
    width: '100%', height: 160,
    borderRadius: 10, marginBottom: 10,
  },
  specialName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  specialMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  specialDesc: { fontSize: 13, color: '#555', marginTop: 4 },
  sectionTitle: { fontSize: 14, color: '#888', marginBottom: 12, marginTop: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 20, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: '#005f99', elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#888' },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, elevation: 2,
  },
  mealTypeBlock: { marginBottom: 12 },
  mealTypeTitle: {
    fontSize: 13, fontWeight: '600', color: '#005f99',
    textTransform: 'uppercase', marginBottom: 6,
  },
  menuItem: { fontSize: 14, color: '#333', marginBottom: 3 },
});