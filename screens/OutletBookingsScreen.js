// screens/OutletBookingsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];
const TIME_FILTERS = ['Past', 'Today', 'Upcoming'];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function OutletBookingsScreen({ navigation, route }) {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState(route.params?.outlet ?? 'Central Canteen');
  const [timeFilter, setTimeFilter] = useState('Today');
  const [searchDate, setSearchDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  // If searching a specific date, that overrides the Past/Today/Upcoming tabs
  const matchesTimeFilter = (b) => {
    const from = b.fromDate?.split('T')[0] ?? '';
    const to = b.toDate?.split('T')[0] ?? '';

    if (searchDate) {
      return from <= searchDate && to >= searchDate;
    }

    if (timeFilter === 'Today') {
      return from <= todayStr && to >= todayStr;
    }
    if (timeFilter === 'Upcoming') {
      return from > todayStr;
    }
    // Past
    return to < todayStr;
  };

  const timeFilteredBookings = allBookings.filter(matchesTimeFilter);

  const filteredBookings = timeFilteredBookings
    .filter((b) => b.canteenLocation === selectedOutlet)
    .sort((a, b) => {
      const aDate = new Date(a.fromDate);
      const bDate = new Date(b.fromDate);
      return (!searchDate && timeFilter === 'Past') ? bDate - aDate : aDate - bDate;
    });

  const confirmedCount = filteredBookings.filter(
    (b) => b.status?.toLowerCase() === 'confirmed'
  ).length;

  const cancelledCount = filteredBookings.filter(
    (b) => b.status?.toLowerCase() === 'cancelled'
  ).length;

  const clearDateSearch = () => setSearchDate(null);

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
        <Text style={styles.employeeName}>
          {item.employeeName || `Employee #${item.employeeID ?? item.newUserID}`}
        </Text>
        <Text style={styles.mealType}>
          {item.isSpecialMeal ? 'Special - ' : ''}{item.mealType}
        </Text>
        <Text style={styles.dates}>
          {item.fromDate?.split('T')[0]} - {item.toDate?.split('T')[0]}
        </Text>
        <Text style={styles.bookedFor}>
          {item.bookingFor === 'Guests'
            ? `Guests (${item.guestCount} persons)`
            : 'Self'}
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
          <Text style={styles.heading}>All Bookings</Text>

          {/* Search by specific date */}
          <Text style={styles.sectionLabel}>Search by Date</Text>
          <TouchableOpacity
            style={styles.dateSearchBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateSearchBtnText}>
              {searchDate ? searchDate : 'Pick a date to search'}
            </Text>
          </TouchableOpacity>
          {searchDate && (
            <TouchableOpacity onPress={clearDateSearch} style={styles.clearDateBtn}>
              <Text style={styles.clearDateBtnText}>Clear date filter</Text>
            </TouchableOpacity>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={searchDate ? new Date(searchDate) : new Date()}
              mode="date"
              display="calendar"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setSearchDate(formatDate(selectedDate));
                }
              }}
            />
          )}

          {/* Time Range Tabs — disabled while a date search is active */}
          {!searchDate && (
            <View style={styles.timeTabsContainer}>
              {TIME_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.timeTab, timeFilter === f && styles.timeTabSelected]}
                  onPress={() => setTimeFilter(f)}
                >
                  <Text style={[styles.timeTabText, timeFilter === f && styles.timeTabTextSelected]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!searchDate && timeFilter === 'Today' && (
            <Text style={styles.dateLabel}>{todayStr}</Text>
          )}

          {/* Outlet Tabs */}
          <View style={styles.tabsContainer}>
            {OUTLETS.map((outlet) => {
              const count = timeFilteredBookings.filter(
                (b) => b.canteenLocation === outlet
              ).length;
              return (
                <TouchableOpacity
                  key={outlet}
                  style={[
                    styles.tab,
                    selectedOutlet === outlet && styles.tabSelected,
                  ]}
                  onPress={() => setSelectedOutlet(outlet)}
                >
                  <Text style={[
                    styles.tabText,
                    selectedOutlet === outlet && styles.tabTextSelected,
                  ]}>
                    {outlet}
                  </Text>
                  <Text style={[
                    styles.tabCount,
                    selectedOutlet === outlet && styles.tabCountSelected,
                  ]}>
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
              {searchDate
                ? `No bookings for ${selectedOutlet} on ${searchDate}.`
                : `No ${timeFilter.toLowerCase()} bookings for ${selectedOutlet}.`}
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
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  sectionLabel: {
    fontSize: 13, fontWeight: 'bold', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  dateSearchBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 13, marginBottom: 6,
  },
  dateSearchBtnText: { fontSize: 15, color: '#111' },
  clearDateBtn: { marginBottom: 12 },
  clearDateBtnText: { fontSize: 13, color: '#c0392b', fontWeight: '600' },
  timeTabsContainer: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  timeTab: {
    flex: 1, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1,
    borderColor: '#ccc', backgroundColor: '#fff',
    alignItems: 'center',
  },
  timeTabSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  timeTabText: { fontSize: 13, fontWeight: '600', color: '#333' },
  timeTabTextSelected: { color: '#fff' },
  dateLabel: { fontSize: 13, color: '#888', marginBottom: 12 },
  tabsContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 16,
  },
  tab: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1,
    borderColor: '#ccc', backgroundColor: '#fff',
    alignItems: 'center', minWidth: 80,
  },
  tabSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#333' },
  tabTextSelected: { color: '#fff' },
  tabCount: {
    fontSize: 18, fontWeight: 'bold',
    color: '#005f99', marginTop: 2,
  },
  tabCountSelected: {
    color: '#fff',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    padding: 14, alignItems: 'center', elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  emptyText: {
    textAlign: 'center', color: '#888',
    fontSize: 14, marginTop: 20, marginBottom: 20,
  },
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