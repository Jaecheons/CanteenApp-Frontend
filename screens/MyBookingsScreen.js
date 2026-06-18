// screens/MyBookingsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  pending: '#f39c12',
  cancelled: '#c0392b',
  completed: '#888',
};

export default function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/api/Bookings/my');
      setBookings(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh every time screen comes into focus
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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchBookings}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No bookings found.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => navigation.navigate('BookMeal')}
        >
          <Text style={styles.retryText}>Book a Meal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const status = item.status?.toLowerCase() ?? 'pending';
    const statusColor = STATUS_COLORS[status] ?? '#888';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { booking: item })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.bookingId}>#{item.bookingId ?? item.BookingID ?? item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status ?? 'Pending'}</Text>
          </View>
        </View>

        <Text style={styles.mealType}>{item.mealType}</Text>
        <Text style={styles.dates}>
          {item.fromDate?.split('T')[0]} → {item.toDate?.split('T')[0]}
        </Text>
        <Text style={styles.outlet}>📍 {item.canteenLocation}</Text>
        <Text style={styles.bookedFor}>
          {item.bookingFor === 'Guests'
            ? `👥 Guests (${item.guestCount} persons)`
            : '👤 Self'}
        </Text>
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
        <Text style={styles.heading}>My Bookings</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#c0392b', fontSize: 15, textAlign: 'center' },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8, marginTop: 12,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 14, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#005f99',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  bookingId: { fontSize: 13, fontWeight: 'bold', color: '#005f99' },
  statusBadge: {
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  mealType: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  dates: { fontSize: 13, color: '#555', marginBottom: 4 },
  outlet: { fontSize: 13, color: '#555', marginBottom: 4 },
  bookedFor: { fontSize: 13, color: '#555' },
});