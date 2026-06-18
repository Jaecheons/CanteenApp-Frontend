// screens/AdminDashboard.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  pending: '#f39c12',
  cancelled: '#c0392b',
  completed: '#888',
};

export default function AdminDashboard({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [bookingsRes, statsRes] = await Promise.all([
        api.get('/api/Bookings'),
        api.get('/api/Bookings/stats').catch(() => ({ data: null })),
      ]);
      setBookings(bookingsRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      console.log('ADMIN ERROR:', err.response?.status, err.response?.data);
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

  const renderItem = ({ item }) => {
    const status = item.status?.toLowerCase() ?? 'pending';
    const statusColor = STATUS_COLORS[status] ?? '#888';
    const bookingId = item.bookingId ?? item.BookingID ?? item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminBookingDetail', { booking: item })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.bookingId}>#{bookingId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status ?? 'Pending'}</Text>
          </View>
        </View>
        <Text style={styles.employeeName}>{item.employeeName ?? item.name ?? 'Employee'}</Text>
        <Text style={styles.mealType}>{item.mealType}</Text>
        <Text style={styles.dates}>
          {item.fromDate?.split('T')[0]} → {item.toDate?.split('T')[0]}
        </Text>
        <Text style={styles.outlet}>📍 {item.canteenLocation}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={bookings}
      keyExtractor={(item, index) =>
        String(item.bookingId ?? item.BookingID ?? item.id ?? index)
      }
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#005f99']} />
      }
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>Admin Dashboard</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logout}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total ?? bookings.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#27ae60' }]}>{stats.confirmed ?? 0}</Text>
                <Text style={styles.statLabel}>Confirmed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#c0392b' }]}>{stats.cancelled ?? 0}</Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </View>
          )}

          {/* Publish Special Meal Button */}
          <TouchableOpacity
            style={styles.specialBtn}
            onPress={() => navigation.navigate('PublishSpecial')}
          >
            <Text style={styles.specialBtnText}>📢 Publish Special Meal</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>All Bookings</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No bookings found.</Text>
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
    borderRadius: 10, alignItems: 'center', marginBottom: 20,
  },
  specialBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 14, color: '#888', marginBottom: 12 },
  btn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  card: {
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
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  employeeName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  mealType: { fontSize: 13, color: '#555', marginBottom: 2 },
  dates: { fontSize: 13, color: '#555', marginBottom: 2 },
  outlet: { fontSize: 13, color: '#555' },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 15, marginTop: 40 },
});