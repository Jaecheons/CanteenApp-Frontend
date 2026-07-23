// screens/AdminDashboard.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList,
  TouchableOpacity, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import usePagination from '../hooks/usePagination';
import PaginationControls from '../components/PaginationControls';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];
const CATEGORY_MEAL_TYPES = ['Lunch', 'Dinner'];

export default function AdminDashboard({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOutlet, setExpandedOutlet] = useState(null);
  const [expandedMealTotal, setExpandedMealTotal] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      const [bookingsRes, specialsRes] = await Promise.all([
        api.get('/Bookings'),
        api.get('/Specials'),
      ]);
      setBookings(bookingsRes.data ?? []);
      setSpecials(specialsRes.data ?? []);
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

  const toggleOutlet = (outlet) => {
    setExpandedOutlet((prev) => (prev === outlet ? null : outlet));
  };

    // Today's bookings
  const todayBookings = bookings.filter(
    (b) =>
      b.fromDate?.split('T')[0] <= todayStr &&
      b.toDate?.split('T')[0] >= todayStr
  );

  const confirmed = todayBookings.filter(
    (b) => b.status?.toLowerCase() === 'confirmed'
  ).length;

  const cancelled = todayBookings.filter(
    (b) => b.status?.toLowerCase() === 'cancelled'
  ).length;

  // Per outlet: total confirmed bookings today
  const outletTotals = OUTLETS.map((outlet) => ({
    outlet,
    total: todayBookings.filter(
      (b) => b.canteenLocation === outlet && b.status?.toLowerCase() === 'confirmed'
    ).length,
  }));

  // Per outlet per meal counts — used when expanded
  const getMealBreakdown = (outlet) => {
    return MEAL_TYPES.map((meal) => ({
      meal,
      count: todayBookings.filter(
        (b) =>
          b.canteenLocation === outlet &&
          b.mealType === meal &&
          b.status?.toLowerCase() === 'confirmed'
      ).length,
    })).filter((m) => m.count > 0);
  };

  // Across ALL outlets, today's confirmed bookings — total per meal type
  const mealTypeTotals = MEAL_TYPES.map((meal) => ({
    meal,
    count: todayBookings.filter(
      (b) => b.mealType === meal && b.status?.toLowerCase() === 'confirmed'
    ).length,
  }));

  // Across ALL outlets — veg/paneer/non-veg/add-on breakdown for a given meal type
  const getCategoryTotalsForMeal = (mealType) => {
    const rows = todayBookings.filter(
      (b) => b.mealType === mealType && b.status?.toLowerCase() === 'confirmed'
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

  const toggleMealTotal = (meal) => {
    setExpandedMealTotal((prev) => (prev === meal ? null : meal));
  };

  // Filter bookings by search query
  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (b.employeeName ?? '').toLowerCase();
    const id = String(b.employeeID ?? b.newUserID ?? '');
    return name.includes(query) || id.includes(query);
  });

  const pagination = usePagination(filteredBookings, 5);

  // Split specials into active (today or future) and past (history)
  const activeSpecials = specials.filter(
    (s) => (s.date?.split('T')[0] ?? '') >= todayStr
  );
  const pastSpecials = specials
    .filter((s) => (s.date?.split('T')[0] ?? '') < todayStr)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  //const specialsSectionData = activeSpecials.length > 0 ? activeSpecials : ['empty_specials'];

  const bookingsSectionData = pagination.paginatedItems.length > 0
    ? [...pagination.paginatedItems, 'pagination_footer']
    : ['empty_bookings'];

  const sections = [
    { title: 'header', data: ['header'] },
    //{ title: 'Specials', data: specialsSectionData },
    { title: 'All Bookings', data: bookingsSectionData },
  ];

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

    const renderItem = ({ item, section }) => {

    if (section.title === 'header') {
      return (
        <View>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>Admin Dashboard</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.profileBtnText}>👤</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout}>
                <Text style={styles.logout}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.dateLabel}>📅 Today: {todayStr}</Text>

          {/* Stats */}
          <Text style={styles.sectionLabel}>Today's Bookings</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{todayBookings.length}</Text>
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

          {/* Meal-Type Totals — across all outlets, tap Lunch/Dinner to expand */}
          <Text style={styles.sectionLabel}>Today's Meals — All Outlets</Text>
          <View style={styles.mealTotalsBox}>
            {mealTypeTotals.map(({ meal, count }) => {
              const canExpand = CATEGORY_MEAL_TYPES.includes(meal) && count > 0;
              const isExpanded = expandedMealTotal === meal;
              const cat = isExpanded ? getCategoryTotalsForMeal(meal) : null;

              return (
                <View key={meal} style={styles.mealTotalCard}>
                  <TouchableOpacity
                    style={styles.mealTotalHeader}
                    onPress={() => canExpand && toggleMealTotal(meal)}
                    disabled={!canExpand}
                    activeOpacity={canExpand ? 0.8 : 1}
                  >
                    <Text style={styles.mealTotalLabel}>{meal}</Text>
                    <View style={styles.mealTotalRight}>
                      <Text style={styles.mealTotalCount}>{count}</Text>
                      {canExpand && (
                        <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && cat && (
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
                        <Text style={styles.categoryChipLabel}>Add-Ons</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Per Outlet — tap to expand */}
          <Text style={styles.sectionLabel}>Today's Bookings by Outlet</Text>
          <View style={styles.outletListBox}>
            {outletTotals.map(({ outlet, total }) => {
              const isExpanded = expandedOutlet === outlet;
              const breakdown = isExpanded ? getMealBreakdown(outlet) : [];

              return (
                <View key={outlet} style={styles.outletCard}>
                  <TouchableOpacity
                    style={styles.outletCardHeader}
                    onPress={() => toggleOutlet(outlet)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.outletCardLeft}>
                      <Text style={styles.outletCardName}>{outlet}</Text>
                      <Text style={styles.outletCardSub}>
                        {total} order{total !== 1 ? 's' : ''} today
                      </Text>
                    </View>
                    <View style={styles.outletCardRight}>
                      <View style={styles.outletCountBadge}>
                        <Text style={styles.outletCountBadgeText}>{total}</Text>
                      </View>
                      <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.outletCardBody}>
                      {breakdown.length === 0 ? (
                        <Text style={styles.noBookingsText}>No bookings today.</Text>
                      ) : (
                        <View style={styles.mealWiseRow}>
                          {breakdown.map((m) => (
                            <View key={m.meal} style={styles.mealWiseCard}>
                              <Text style={styles.mealWiseCount}>{m.count}</Text>
                              <Text style={styles.mealWiseLabel}>{m.meal}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.viewAllBtn}
                        onPress={() =>
                          navigation.navigate('OutletBookings', { outlet })
                        }
                      >
                        <Text style={styles.viewAllBtnText}>View All Bookings →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Action Buttons */}
          {/*<TouchableOpacity
            style={styles.specialBtn}
            onPress={() => navigation.navigate('PublishSpecial')}
          >
            <Text style={styles.specialBtnText}> Publish Special Meal</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('AdminMenu')}
          >
            <Text style={styles.menuBtnText}>Manage Weekly Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outletBtn}
            onPress={() => navigation.navigate('OutletBookings')}
          >
            <Text style={styles.outletBtnText}>View by Outlet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.announceBtn}
            onPress={() => navigation.navigate('SendAnnouncement')}
          >
            <Text style={styles.announceBtnText}>Send Announcement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addUserBtn}
            onPress={() => navigation.navigate('AddEmployee')}
          >
            <Text style={styles.addUserBtnText}>Add New User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checklistBtn}
            onPress={() => navigation.navigate('CollectionChecklist')}
          >
            <Text style={styles.checklistBtnText}>Collection Checklist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manageAddOnsBtn}
            onPress={() => navigation.navigate('ManageAddOns')}
          >
            <Text style={styles.manageAddOnsBtnText}>Manage Add-Ons</Text>
          </TouchableOpacity>

          {/* Search Bar */}
          <Text style={styles.sectionLabel}>Search Bookings</Text>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => { setSearchQuery(text); pagination.resetPage(); }}
              placeholder="Search by employee name or ID..."
              placeholderTextColor="#aaa"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.length > 0 && (
            <Text style={styles.searchResult}>
              {filteredBookings.length} result{filteredBookings.length !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
          )}
        </View>
      );
    }

    /* if (item === 'empty_specials') {
      return (
        <View>
          <Text style={styles.emptyText}>No active or upcoming specials.</Text>
          {pastSpecials.length > 0 && renderHistoryToggle()}
        </View>
      );
    } */
    if (item === 'empty_bookings') {
      return (
        <Text style={styles.emptyText}>
          {searchQuery.length > 0
            ? `No bookings found for "${searchQuery}"`
            : 'No bookings found.'}
        </Text>
      );
    }
    if (item === 'pagination_footer') {
      return (
        <PaginationControls
          {...pagination}
          totalCount={filteredBookings.length}
          itemLabel="Bookings"
        />
      );
    }

    {/* if (section.title === 'Specials') {
      const isLastActiveItem = activeSpecials[activeSpecials.length - 1] === item;

      return (
        <View>
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
          {isLastActiveItem && pastSpecials.length > 0 && renderHistoryToggle()}
        </View>
      );
    } */}

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
          {item.employeeID
            ? `${item.employeeName ?? 'Unknown'} (EmpId: ${item.employeeID})`
            : `${item.employeeName ?? 'Unknown'}`}
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

  /* const renderHistoryToggle = () => (
    <View>
      <TouchableOpacity
        style={styles.historyToggle}
        onPress={() => setShowHistory((prev) => !prev)}
      >
        <Text style={styles.historyToggleText}>
          {showHistory ? '▲ Hide' : '▼ Show'} Special Meals History ({pastSpecials.length})
        </Text>
      </TouchableOpacity>

      {showHistory && pastSpecials.map((item) => (
        <TouchableOpacity
          key={item.specialID}
          style={[styles.specialCard, styles.specialCardPast]}
          onPress={() => navigation.navigate('PublishSpecial', { special: item })}
        >
          <View style={styles.cardTop}>
            <Text style={[styles.specialName, styles.specialNamePast]}>{item.specialName}</Text>
            <Text style={styles.specialMealType}>{item.mealType}</Text>
          </View>
          <Text style={styles.specialDate}>{item.date?.split('T')[0]} (past)</Text>
          <Text style={styles.specialOutlets}>
            📍 {item.applicableOutlets?.join(', ')}
          </Text>
        </TouchableOpacity>

      ))}
    </View>
  ); */

  const renderSectionHeader = ({ section }) => {
    if (section.title === 'header') return null;
    return <Text style={styles.listSectionTitle}>{section.title}</Text>;
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
  errorText: { color: '#ff1900ba', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 50, marginBottom: 8,
  },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileBtn: {
    backgroundColor: '#005f99',
    width: 34, height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: { fontSize: 16 },
  logout: { fontSize: 14, color: '#005f99', fontWeight: '600' },
  dateLabel: { fontSize: 13, color: '#888', marginBottom: 12 },
  sectionLabel: {
    fontSize: 13, fontWeight: 'bold', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    padding: 14, alignItems: 'center', elevation: 2,
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  outletListBox: { marginBottom: 16 },
  mealTotalsBox: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  mealTotalCard: {
    backgroundColor: '#fff', borderRadius: 12,
    elevation: 2, overflow: 'hidden', minWidth: '47%', flexGrow: 1,
  },
  mealTotalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  mealTotalLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  mealTotalRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTotalCount: { fontSize: 18, fontWeight: 'bold', color: '#005f99' },
  categoryRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 14, paddingBottom: 14,
  },
  categoryChip: {
    backgroundColor: '#e8f4fd', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', minWidth: 64,
    borderLeftWidth: 3, borderLeftColor: '#005f99',
  },
  categoryChipCount: { fontSize: 15, fontWeight: 'bold', color: '#005f99' },
  categoryChipLabel: { fontSize: 10, color: '#555', marginTop: 2 },
  outletCard: {
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 10, elevation: 2, overflow: 'hidden',
  },
  outletCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  outletCardLeft: { flex: 1 },
  outletCardName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  outletCardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  outletCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outletCountBadge: {
    backgroundColor: '#005f99', borderRadius: 16,
    paddingVertical: 4, paddingHorizontal: 12,
  },
  outletCountBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  chevron: { fontSize: 12, color: '#888' },
  outletCardBody: {
    padding: 14, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  noBookingsText: {
    fontSize: 13, color: '#888', textAlign: 'center', paddingVertical: 10,
  },
  mealWiseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  mealWiseCard: {
    backgroundColor: '#e8f4fd', borderRadius: 10,
    padding: 12, alignItems: 'center', minWidth: 75,
    borderLeftWidth: 3, borderLeftColor: '#005f99',
  },
  mealWiseCount: { fontSize: 20, fontWeight: 'bold', color: '#005f99' },
  mealWiseLabel: { fontSize: 11, color: '#555', marginTop: 4, textAlign: 'center' },
  viewAllBtn: {
    marginTop: 12, paddingVertical: 8,
    alignItems: 'center',
  },
  viewAllBtnText: { fontSize: 13, color: '#005f99', fontWeight: '600' },
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
    backgroundColor: '#b01111', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  outletBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  announceBtn: {
    backgroundColor: '#e67e22', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  announceBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  addUserBtn: {
    backgroundColor: '#16a085', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  addUserBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#ddd',
    paddingHorizontal: 12, marginBottom: 8,
    elevation: 1,
  },

  manageAddOnsBtn: {
    backgroundColor: '#8e44ad', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 20,
  },
  manageAddOnsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1, paddingVertical: 12,
    fontSize: 15, color: '#111',
  },
  clearBtn: { fontSize: 16, color: '#888', paddingLeft: 8 },
  searchResult: { fontSize: 12, color: '#888', marginBottom: 8 },
  listSectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#1a1a1a',
    marginBottom: 12, marginTop: 8,
  },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  specialCard: {
    backgroundColor: '#fff8e1', borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#f39c12',
  },
  specialCardPast: {
    backgroundColor: '#f0f0f0', borderLeftColor: '#aaa', opacity: 0.8,
  },
  specialName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  specialNamePast: { color: '#666' },
  specialMealType: { fontSize: 12, color: '#e67e22', fontWeight: '600' },
  specialDate: { fontSize: 13, color: '#555', marginTop: 4 },
  specialOutlets: { fontSize: 13, color: '#555', marginTop: 2 },
  historyToggle: {
    paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    marginBottom: 10, borderWidth: 1, borderColor: '#ddd',
  },
  historyToggleText: { fontSize: 13, color: '#005f99', fontWeight: '600' },
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

  checklistBtn: {
    backgroundColor: '#2c3e50', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 10,
  },
  checklistBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});