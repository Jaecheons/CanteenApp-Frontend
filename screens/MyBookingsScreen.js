// screens/MyBookingsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

const FILTERS = ['All', 'Confirmed', 'Cancelled'];

export default function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchBookings = async () => {
    try {
      const response = await api.get('/Bookings/my');
      const sorted = (response.data ?? []).sort((a, b) => b.bookingID - a.bookingID);
      setBookings(sorted);
      setError(null);
      setIsOffline(false);
    } catch (err) {
      console.log('MY BOOKINGS ERROR:', err.response?.status, err.response?.data);
      if (!err.response) {
        setIsOffline(true);
        setError('No internet connection. Please check your network and try again.');
      } else {
        setIsOffline(false);
        setError('Failed to load bookings. Please try again.');
      }
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

  // Filter bookings by status and search query
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus =
      statusFilter === 'All' ||
      b.status?.toLowerCase() === statusFilter.toLowerCase();

    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const bookingIdStr = String(b.bookingID);
    const mealType = (b.mealType ?? '').toLowerCase();
    const outlet = (b.canteenLocation ?? '').toLowerCase();
    const date = (b.fromDate ?? '').toLowerCase();

    return (
      bookingIdStr.includes(q) ||
      mealType.includes(q) ||
      outlet.includes(q) ||
      date.includes(q)
    );
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <View style={styles.centered}>
        {isOffline && <Text style={styles.offlineIcon}>📡</Text>}
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
        <Text style={styles.emptyText}>No bookings yet.</Text>
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
    const status = item.status?.toLowerCase() ?? 'confirmed';
    const statusColor = STATUS_COLORS[status] ?? '#888';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { booking: item })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.bookingId}>#{item.bookingID}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.mealType}>
          {item.isSpecialMeal ? '🌟 ' : ''}{item.mealType}
        </Text>
        <Text style={styles.dates}>
          {item.fromDate?.split('T')[0]} → {item.toDate?.split('T')[0]}
        </Text>
        <Text style={styles.outlet}>📍 {item.canteenLocation}</Text>
        <Text style={styles.bookedFor}>
          {item.bookingFor === 'Guests'
            ? `👥 Guests (${item.guestCount} persons)`
            : '👤 Self'}
        </Text>

        {item.canModify && (
          <Text style={styles.modifyHint}>Tap to edit or cancel</Text>
        )}
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.heading}>My Bookings</Text>

          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>📡 You're offline — showing last loaded data</Text>
            </View>
          )}

          {/* Search */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by booking ID, meal, outlet, date..."
              placeholderTextColor="#aaa"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Status filter tabs */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, statusFilter === f && styles.filterTabSelected]}
                onPress={() => setStatusFilter(f)}
              >
                <Text style={[styles.filterText, statusFilter === f && styles.filterTextSelected]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(searchQuery.length > 0 || statusFilter !== 'All') && (
            <Text style={styles.resultCount}>
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          No bookings match your filters.
        </Text>
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
  offlineIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 20, marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8, marginTop: 12,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  offlineBanner: {
    backgroundColor: '#fdecea', borderRadius: 8,
    padding: 10, marginBottom: 14, alignItems: 'center',
  },
  offlineBannerText: { color: '#c0392b', fontSize: 12, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#ddd',
    paddingHorizontal: 12, marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111' },
  clearBtn: { fontSize: 16, color: '#888', paddingLeft: 8 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterTab: {
    paddingVertical: 7, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
  },
  filterTabSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  filterText: { fontSize: 13, color: '#333', fontWeight: '500' },
  filterTextSelected: { color: '#fff', fontWeight: '600' },
  resultCount: { fontSize: 12, color: '#888', marginBottom: 10 },
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
  statusBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  mealType: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  dates: { fontSize: 13, color: '#555', marginBottom: 4 },
  outlet: { fontSize: 13, color: '#555', marginBottom: 4 },
  bookedFor: { fontSize: 13, color: '#555' },
  modifyHint: { fontSize: 12, color: '#005f99', marginTop: 8, fontWeight: '600' },
});