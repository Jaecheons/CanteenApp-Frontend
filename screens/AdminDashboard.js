// screens/AdminDashboard.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

export default function AdminDashboard({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      console.log('FETCHING: /Bookings /Specials');
      const [bookingsRes, specialsRes] = await Promise.all([
        api.get('/Bookings'),
        api.get('/Specials'),
      ]);
      console.log('BOOKINGS DATA:', JSON.stringify(bookingsRes.data));
      console.log('SPECIALS DATA:', JSON.stringify(specialsRes.data));
      setBookings(bookingsRes.data ?? []);
      setSpecials(specialsRes.data ?? []);
      setError(null);
    } catch (err) {
      console.log('ADMIN ERROR:', err.response?.status, err.response?.data);
      console.log('ADMIN ERROR URL:', err.config?.baseURL + err.config?.url);
      setError('Failed to load data. Please try again.');
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
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={fetchData}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const confirmed = bookings.filter(b => b.status?.toLowerCase() === 'confirmed').length;
  const cancelled = bookings.filter(b => b.status?.toLowerCase() === 'cancelled').length;

  const sections = [
    { title: 'header', data: ['header'] },
    { title: 'Specials', data: specials.length > 0 ? specials : ['empty_specials'] },
    { title: 'All Bookings', data: bookings.length > 0 ? bookings : ['empty_bookings'] },
  ];

  const renderItem = ({ item, section }) => {

    // Header section
    if (section.title === 'header') {
      return (
        <View>
          <View style={styles.header}>
            <Text style={styles.heading}>Admin Dashboard</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logout}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{bookings.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#27ae60' }]}>{confirmed}</Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#c0392b' }]}>{cancelled}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.specialBtn}
            onPress={() => navigation.navigate('PublishSpecial')}
          >
            <Text style={styles.specialBtnText}>📢 Publish Special Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('AdminMenu')}
          >
            <Text style={styles.menuBtnText}>🍽 Manage Weekly Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outletBtn}
            onPress={() => navigation.navigate('OutletBookings')}
          >
            <Text style={styles.outletBtnText}>📍 View by Outlet</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Empty states
    if (item === 'empty_specials') {
      return <Text style={styles.emptyText}>No specials published yet.</Text>;
    }
    if (item === 'empty_bookings') {
      return <Text style={styles.emptyText}>No bookings found.</Text>;
    }

    // Specials section
    if (section.title === 'Specials') {
      return (
        <TouchableOpacity
          style={styles.specialCard}
          onPress={() => navigation.navigate('PublishSpecial', { special: item })}
        >
          <View style={styles.cardTop}>
            <Text style={styles.specialName}>{item.specialName}</Text>
            <Text style={styles.specialMealType}>{item.mealType}</Text>
          </View>
          <Text style={styles.specialDate}>{item.date?.split('T')[0]}</Text>
          <Text style={styles.specialOutlets}>
            📍 {item.applicableOutlets?.join(', ')}
          </Text>
        </TouchableOpacity>
      );
    }

    // Bookings section
    const status = item.status?.toLowerCase() ?? 'confirmed';
    const statusColor = STATUS_COLORS[status] ?? '#888';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => navigation.navigate('AdminBookingDetail', { booking: item })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.bookingId}>#{item.bookingID}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.employeeName}>
          {item.employeeName ?? 'Employee'}
        </Text>
        <Text style={styles.mealType}>
          {item.isSpecialMeal ? '🌟 ' : ''}{item.mealType}
        </Text>
        <Text style={styles.dates}>
          {item.fromDate?.split('T')[0]} → {item.toDate?.split('T')[0]}
        </Text>
        <Text style={styles.outlet}>📍 {item.canteenLocation}</Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => {
    if (section.title === 'header') return null;
    return <Text style={styles.sectionTitle}>{section.title}</Text>;
  };

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item, index) =>
        typeof item === 'string'
          ? `string-${item}-${index}`
          : String(item.bookingID ?? item.specialID ?? index)
      }
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#005f99']} />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#c0392b', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 50, marginBottom: 20,
  },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  logout: { fontSize: 14, color: '#005f99', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    padding: 14, alignItems: 'center', elevation: 2,
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  specialBtn: {
    backgroundColor: '#005f99', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  specialBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  menuBtn: {
    backgroundColor: '#27ae60', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  menuBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  outletBtn: {
    backgroundColor: '#ff0303', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 20,
  },
  outletBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#1a1a1a',
    marginBottom: 12, marginTop: 8,
  },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  specialCard: {
    backgroundColor: '#fff8e1', borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#f39c12',
  },
  specialName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  specialMealType: { fontSize: 12, color: '#e67e22', fontWeight: '600' },
  specialDate: { fontSize: 13, color: '#555', marginTop: 4 },
  specialOutlets: { fontSize: 13, color: '#555', marginTop: 2 },
  bookingCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 14, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#e67e22',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  bookingId: { fontSize: 13, fontWeight: 'bold', color: '#e67e22' },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  employeeName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  mealType: { fontSize: 13, color: '#555', marginBottom: 2 },
  dates: { fontSize: 13, color: '#555', marginBottom: 2 },
  outlet: { fontSize: 13, color: '#555' },
  btn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});