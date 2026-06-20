// screens/OutletBookingsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];

export default function OutletBookingsScreen({ navigation }) {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState('Central Canteen');

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchBookings = async () => {
    try {
      const response = await api.get('/Bookings');
      setAllBookings(response.data ?? []);
      setError(null);
    } catch (err) {
      console.log('OUTLET BOOKINGS ERROR:', err.response?.status);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBookings();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const filteredBookings = allBookings.filter(
    (b) =>
      b.canteenLocation === selectedOutlet &&
      b.fromDate?.split('T')[0] <= todayStr &&
      b.toDate?.split('T')[0] >= todayStr
  );

  const confirmedCount = filteredBookings.filter(
    (b) => b.status?.toLowerCase() === 'confirmed'
  ).length;

  const cancelledCount = filteredBookings.filter(
    (b) => b.status?.toLowerCase() === 'cancelled'
  ).length;

  const renderItem = ({ item }) => {
    const status = item.status?.toLowerCase() ?? 'confirmed';
    const statusColor = STATUS_COLORS[status] ?? '#888';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminBookingDetail', { booking: item })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.bookingId}>#{item.bookingID}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.employeeName}>{item.employeeName ?? 'Employee'}</Text>
        <Text style={styles.mealType}>
          {item.isSpecialMeal ? '🌟 ' : ''}{item.mealType}
        </Text>
        <Text style={styles.dates}>
          {item.fromDate?.split('T')[0]} → {item.toDate?.split('T')[0]}
        </Text>
        <Text style={styles.bookedFor}>
          {item.bookingFor === 'Guests'
            ? `👥 Guests (${item.guestCount} persons)`
            : '👤 Self'}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={fetchBookings}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredBookings}
      keyExtractor={(item) => String(item.bookingID)}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#005f99']} />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Today's Outlet Bookings</Text>
          <Text style={styles.dateLabel}>📅 {todayStr}</Text>

          {/* Outlet Tabs */}
          <View style={styles.tabsContainer}>
            {OUTLETS.map((outlet) => {
              const count = allBookings.filter(
                (b) =>
                  b.canteenLocation === outlet &&
                  b.fromDate?.split('T')[0] <= todayStr &&
                  b.toDate?.split('T')[0] >= todayStr
              ).length;
              return (
                <TouchableOpacity
                  key={outlet}
                  style={[styles.tab, selectedOutlet === outlet && styles.tabSelected]}
                  onPress={() => setSelectedOutlet(outlet)}
                >
                  <Text style={[styles.tabText, selectedOutlet === outlet && styles.tabTextSelected]}>
                    {outlet}
                  </Text>
                  <Text style={[styles.tabCount, selectedOutlet === outlet && styles.tabCountSelected]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{filteredBookings.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#27ae60' }]}>{confirmedCount}</Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#c0392b' }]}>{cancelledCount}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>

          {filteredBookings.length === 0 && (
            <Text style={styles.emptyText}>
              No bookings for {selectedOutlet} today.
            </Text>
          )}
        </View>
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
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  dateLabel: { fontSize: 13, color: '#888', marginBottom: 16 },
  tabsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1,
    borderColor: '#ccc', backgroundColor: '#fff',
    alignItems: 'center', minWidth: 80,
  },
  tabSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#333' },
  tabTextSelected: { color: '#fff' },
  tabCount: { fontSize: 18, fontWeight: 'bold', color: '#005f99', marginTop: 2 },
  tabCountSelected: { color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    padding: 14, alignItems: 'center', elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 20, marginBottom: 20 },
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
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  employeeName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  mealType: { fontSize: 13, color: '#555', marginBottom: 2 },
  dates: { fontSize: 13, color: '#555', marginBottom: 2 },
  bookedFor: { fontSize: 13, color: '#555' },
  btn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});