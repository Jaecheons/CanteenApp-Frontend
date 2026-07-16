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

// Group individual booking rows (each = one meal) into cards by bookingGroupID.
// Bookings without a bookingGroupID (older data) are treated as their own group.
function groupBookings(bookings) {
  const groups = new Map();
  bookings.forEach((b) => {
    const key = b.bookingGroupID ?? `single-${b.bookingID}`;
    if (!groups.has(key)) {
      groups.set(key, {
        bookingGroupID: b.bookingGroupID ?? null,
        fromDate: b.fromDate,
        toDate: b.toDate,
        canteenLocation: b.canteenLocation,
        bookingFor: b.bookingFor,
        guestCount: b.guestCount,
        userID: b.employeeID ?? b.newUserID,
        meals: [],
      });
    }
    groups.get(key).meals.push(b);
  });
  return Array.from(groups.values());
}

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

  const groupedAll = groupBookings(bookings);

  // A group's overall status: confirmed if any meal in it is still confirmed
  const groupStatus = (group) => {
    const anyConfirmed = group.meals.some((m) => (m.status?.toLowerCase() ?? 'confirmed') === 'confirmed');
    return anyConfirmed ? 'confirmed' : 'cancelled';
  };

  const groupTotalCost = (group) =>
    group.meals.reduce((sum, m) => sum + (m.totalCost ?? 0), 0);

  const groupCanModify = (group) => group.meals.some((m) => m.canModify);

  // Filter groups by status and search query
  const filteredGroups = groupedAll.filter((g) => {
    const status = groupStatus(g);
    const matchesStatus = statusFilter === 'All' || status === statusFilter.toLowerCase();
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const outlet = (g.canteenLocation ?? '').toLowerCase();
    const date = (g.fromDate ?? '').toLowerCase();
    const mealTypes = g.meals.map((m) => (m.mealType ?? '').toLowerCase()).join(' ');
    const bookingIds = g.meals.map((m) => String(m.bookingID)).join(' ');

    return (
      bookingIds.includes(q) ||
      mealTypes.includes(q) ||
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

  const renderItem = ({ item: group }) => {
    const status = groupStatus(group);
    const statusColor = STATUS_COLORS[status] ?? '#888';
    const totalCost = groupTotalCost(group);
    const canModify = groupCanModify(group);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { group })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.bookingId}>
            {group.bookingGroupID ? `Group #${String(group.bookingGroupID).slice(0, 8)}` : `#${group.meals[0].bookingID}`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</Text>
          </View>
        </View>

        <Text style={styles.dates}>
          {group.fromDate?.split('T')[0]} → {group.toDate?.split('T')[0]}
        </Text>
        <Text style={styles.outlet}>📍 {group.canteenLocation}</Text>
        <Text style={styles.bookedFor}>
          {group.bookingFor === 'Guests'
            ? `👥 Guests (${group.guestCount} persons)`
            : '👤 Self'}
        </Text>

        {/* Meal rows within the group */}
        <View style={styles.mealList}>
          {group.meals.map((m) => {
            const mealStatus = m.status?.toLowerCase() ?? 'confirmed';
            return (
              <View key={m.bookingID} style={styles.mealRow}>
                <Text style={styles.mealRowText}>
                  {m.isSpecialMeal ? '🌟 ' : ''}{m.mealType}
                  {mealStatus === 'cancelled' ? ' (cancelled)' : ''}
                </Text>
                <View style={styles.mealRowRight}>
                  {m.isCollected && <Text style={styles.collectedTag}>✓ Collected</Text>}
                  <Text style={styles.mealRowCost}>
                    {m.totalCost != null ? `₹${m.totalCost}` : '—'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalCostLabel}>Total: ₹{totalCost}</Text>
          {canModify && <Text style={styles.modifyHint}>Tap to edit or cancel</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredGroups}
      keyExtractor={(item) => item.bookingGroupID ?? `single-${item.meals[0].bookingID}`}
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
              {filteredGroups.length} booking{filteredGroups.length !== 1 ? 's' : ''} found
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
  dates: { fontSize: 13, color: '#555', marginBottom: 4 },
  outlet: { fontSize: 13, color: '#555', marginBottom: 4 },
  bookedFor: { fontSize: 13, color: '#555', marginBottom: 8 },
  mealList: {
    borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 4, paddingTop: 8,
  },
  mealRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
  },
  mealRowText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  mealRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collectedTag: { fontSize: 11, color: '#27ae60', fontWeight: '600' },
  mealRowCost: { fontSize: 13, color: '#555', fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
    borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10,
  },
  totalCostLabel: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' },
  modifyHint: { fontSize: 12, color: '#005f99', fontWeight: '600' },
});
