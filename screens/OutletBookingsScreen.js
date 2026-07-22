// screens/OutletBookingsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import usePagination from '../hooks/usePagination';
import PaginationControls from '../components/PaginationControls';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];
const TIME_FILTERS = ['Past', 'Today', 'Upcoming'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];
const CATEGORY_MEAL_TYPES = ['Lunch', 'Dinner'];

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
  const [expandedOutlet, setExpandedOutlet] = useState(null);
  const [expandedMeal, setExpandedMeal] = useState(null); // key: `${outlet}-${mealType}`

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
    
  const pagination = usePagination(filteredBookings, 5);

  const confirmedCount = filteredBookings.filter(
    (b) => b.status?.toLowerCase() === 'confirmed'
  ).length;

  const cancelledCount = filteredBookings.filter(
    (b) => b.status?.toLowerCase() === 'cancelled'
  ).length;

  const clearDateSearch = () => setSearchDate(null);

  const toggleOutletExpand = (outlet) => {
    setExpandedOutlet((prev) => (prev === outlet ? null : outlet));
    setExpandedMeal(null);
  };

  const toggleMealExpand = (outlet, mealType) => {
    const key = `${outlet}-${mealType}`;
    setExpandedMeal((prev) => (prev === key ? null : key));
  };

  const getMealBreakdown = (outlet) =>
    MEAL_TYPES.map((meal) => ({
      meal,
      count: timeFilteredBookings.filter(
        (b) => b.canteenLocation === outlet && b.mealType === meal
      ).length,
    }));

  const getCategoryBreakdown = (outlet, mealType) => {
    const rows = timeFilteredBookings.filter(
      (b) => b.canteenLocation === outlet && b.mealType === mealType
    );
    return {
      veg: rows.reduce((s, b) => s + (b.vegCount ?? 0), 0),
      paneer: rows.reduce((s, b) => s + (b.paneerCount ?? 0), 0),
      nonVeg: rows.reduce((s, b) => s + (b.nonVegCount ?? 0), 0),
      addOns: rows.reduce(
        (s, b) => s + (b.addOns ?? []).reduce((a, x) => a + (x.quantity ?? 0), 0),
        0
      ),
    };
  };

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
          {item.employeeName ?? item.newUserName} Employee #{item.employeeID ?? (item.newUserID || '—')}
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
      data={pagination.paginatedItems}
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

          {/* Outlet Accordion */}
          <View style={styles.outletListBox}>
            {OUTLETS.map((outlet) => {
              const count = timeFilteredBookings.filter(
                (b) => b.canteenLocation === outlet
              ).length;
              const isSelected = selectedOutlet === outlet;
              const isExpanded = expandedOutlet === outlet;
              const breakdown = isExpanded ? getMealBreakdown(outlet) : [];

              return (
                <View key={outlet} style={[styles.outletCard, isSelected && styles.outletCardSelected]}>
                  <TouchableOpacity
                    style={styles.outletCardHeader}
                    onPress={() => {
                      setSelectedOutlet(outlet);
                      toggleOutletExpand(outlet);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.outletCardName, isSelected && styles.outletCardNameSelected]}>
                      {outlet}
                    </Text>
                    <View style={styles.outletCardRight}>
                      <View style={[styles.outletCountBadge, isSelected && styles.outletCountBadgeSelected]}>
                        <Text style={[styles.outletCountBadgeText, isSelected && styles.outletCountBadgeTextSelected]}>
                          {count}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.outletCardBody}>
                      {breakdown.every((m) => m.count === 0) ? (
                        <Text style={styles.noBookingsText}>No bookings.</Text>
                      ) : (
                        breakdown.map((m) => {
                          const canExpandMeal = CATEGORY_MEAL_TYPES.includes(m.meal) && m.count > 0;
                          const mealKey = `${outlet}-${m.meal}`;
                          const isMealExpanded = expandedMeal === mealKey;
                          const cat = isMealExpanded ? getCategoryBreakdown(outlet, m.meal) : null;

                          return (
                            <View key={m.meal} style={styles.mealBreakdownRow}>
                              <TouchableOpacity
                                style={styles.mealBreakdownHeader}
                                onPress={() => canExpandMeal && toggleMealExpand(outlet, m.meal)}
                                disabled={!canExpandMeal}
                                activeOpacity={canExpandMeal ? 0.7 : 1}
                              >
                                <Text style={styles.mealBreakdownLabel}>{m.meal}</Text>
                                <View style={styles.mealBreakdownRight}>
                                  <Text style={styles.mealBreakdownCount}>{m.count}</Text>
                                  {canExpandMeal && (
                                    <Text style={styles.chevronSmall}>{isMealExpanded ? '▲' : '▼'}</Text>
                                  )}
                                </View>
                              </TouchableOpacity>

                              {isMealExpanded && cat && (
                                <View style={styles.categoryRow}>
                                  <View style={styles.categoryChip}>
                                    <Text style={styles.categoryChipCount}>{cat.veg}</Text>
                                    <Text style={styles.categoryChipLabel}>Veg</Text>
                                  </View>
                                  <View style={styles.categoryChip}>
                                    <Text style={styles.categoryChipCount}>{cat.paneer}</Text>
                                    <Text style={styles.categoryChipLabel}>Paneer</Text>
                                  </View>
                                  <View style={styles.categoryChip}>
                                    <Text style={styles.categoryChipCount}>{cat.nonVeg}</Text>
                                    <Text style={styles.categoryChipLabel}>Non-Veg</Text>
                                  </View>
                                  <View style={styles.categoryChip}>
                                    <Text style={styles.categoryChipCount}>{cat.addOns}</Text>
                                    <Text style={styles.categoryChipLabel}>Omelet</Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
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
      ListFooterComponent={
        filteredBookings.length > 0 ? (
          <PaginationControls
            {...pagination}
            totalCount={filteredBookings.length}
            itemLabel="Bookings"
          />
        ) : null
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
  outletListBox: { marginBottom: 16 },
  outletCard: {
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 10, elevation: 2, overflow: 'hidden',
    borderWidth: 1, borderColor: '#eee',
  },
  outletCardSelected: { borderColor: '#005f99' },
  outletCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  outletCardName: { fontSize: 14, fontWeight: '600', color: '#333' },
  outletCardNameSelected: { color: '#005f99', fontWeight: 'bold' },
  outletCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outletCountBadge: {
    backgroundColor: '#f0f0f0', borderRadius: 16,
    paddingVertical: 4, paddingHorizontal: 12,
  },
  outletCountBadgeSelected: { backgroundColor: '#005f99' },
  outletCountBadgeText: { color: '#333', fontWeight: 'bold', fontSize: 13 },
  outletCountBadgeTextSelected: { color: '#fff' },
  chevron: { fontSize: 12, color: '#888' },
  outletCardBody: {
    padding: 14, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  noBookingsText: { fontSize: 13, color: '#888', textAlign: 'center', paddingVertical: 10 },
  mealBreakdownRow: { marginTop: 8 },
  mealBreakdownHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  mealBreakdownLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  mealBreakdownRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealBreakdownCount: { fontSize: 14, fontWeight: 'bold', color: '#005f99' },
  chevronSmall: { fontSize: 10, color: '#888' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 4 },
  categoryChip: {
    backgroundColor: '#e8f4fd', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 68,
    borderLeftWidth: 3, borderLeftColor: '#005f99',
  },
  categoryChipCount: { fontSize: 15, fontWeight: 'bold', color: '#005f99' },
  categoryChipLabel: { fontSize: 10, color: '#555', marginTop: 2 },
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