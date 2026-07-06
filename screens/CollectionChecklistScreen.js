// screens/CollectionChecklistScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export default function CollectionChecklistScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [updatingId, setUpdatingId] = useState(null);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/Bookings');
      setBookings(response.data ?? []);
      setError(null);
    } catch (err) {
      console.log('CHECKLIST LOAD ERROR:', err.response?.status);
      setError('Failed to load bookings.');
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

  const dayBookings = bookings.filter(
    (b) =>
      b.status?.toLowerCase() === 'confirmed' &&
      b.fromDate?.split('T')[0] <= selectedDate &&
      b.toDate?.split('T')[0] >= selectedDate
  );

  const toggleCollected = async (booking) => {
    const wasCollected = booking.isCollected;
    try {
      setUpdatingId(booking.bookingID);
      if (wasCollected) {
        await api.put(`/Bookings/${booking.bookingID}/uncollect`);
      } else {
        await api.put(`/Bookings/${booking.bookingID}/collect`);
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingID === booking.bookingID
            ? { ...b, isCollected: !wasCollected }
            : b
        )
      );
    } catch (err) {
      console.log('TOGGLE COLLECT ERROR:', err.response?.status);
    } finally {
      setUpdatingId(null);
    }
  };

  const collectedBookings = dayBookings.filter((b) => b.isCollected);
  const notCollectedBookings = dayBookings.filter((b) => !b.isCollected);
  const totalCollectedCost = collectedBookings.reduce((sum, b) => sum + (b.totalCost ?? 0), 0);

  const employeeTotalsMap = {};
  bookings
    .filter((b) => b.status?.toLowerCase() === 'confirmed' && b.isCollected)
    .forEach((b) => {
      const key = b.employeeID ?? b.newUserID;
      if (!employeeTotalsMap[key]) {
        employeeTotalsMap[key] = {
          employeeID: b.employeeID,
          employeeName: b.employeeName || `Employee #${b.employeeID}`,
          total: 0,
          count: 0,
        };
      }
      employeeTotalsMap[key].total += b.totalCost ?? 0;
      employeeTotalsMap[key].count += 1;
    });
  const employeeTotals = Object.values(employeeTotalsMap).sort((a, b) => b.total - a.total);

  const renderItem = ({ item }) => {
    const isUpdating = updatingId === item.bookingID;
    return (
      <TouchableOpacity
        style={[styles.card, item.isCollected ? styles.cardCollected : styles.cardPending]}
        onPress={() => toggleCollected(item)}
        disabled={isUpdating}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.employeeName}>
            {item.employeeName || `Employee #${item.employeeID ?? item.newUserID}`}
          </Text>
          <Text style={styles.mealInfo}>
            {item.isSpecialMeal ? 'Special - ' : ''}{item.mealType} · {item.canteenLocation}
          </Text>
          <Text style={styles.bookingMeta}>
            #{item.bookingID} · {item.bookingFor === 'Guests' ? `${item.guestCount} guests` : 'Self'}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.costText}>₹{item.totalCost ?? 0}</Text>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#005f99" />
          ) : (
            <View style={[styles.checkCircle, item.isCollected ? styles.checkCircleYes : styles.checkCircleNo]}>
              <Text style={styles.checkCircleText}>{item.isCollected ? '✓' : '✕'}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
        <Text style={styles.loadingText}>Loading checklist...</Text>
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
      data={dayBookings}
      keyExtractor={(item) => String(item.bookingID)}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#005f99']} />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.subheading}>Tap a booking to mark it collected or not.</Text>

          {/* Date Navigator — no native picker needed */}
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateArrow}
              onPress={() => setSelectedDate((d) => addDays(d, -1))}
            >
              <Text style={styles.dateArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.dateLabelBox}>
              <Text style={styles.dateLabelText}>{selectedDate}</Text>
            </View>
            <TouchableOpacity
              style={styles.dateArrow}
              onPress={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <Text style={styles.dateArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => setSelectedDate(formatDate(new Date()))}
          >
            <Text style={styles.todayBtnText}>Go to Today</Text>
          </TouchableOpacity>

          {/* Day summary */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{dayBookings.length}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#27ae60' }]}>{collectedBookings.length}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#c0392b' }]}>{notCollectedBookings.length}</Text>
              <Text style={styles.statLabel}>Not Collected</Text>
            </View>
          </View>

          <View style={styles.totalCostBox}>
            <Text style={styles.totalCostLabel}>Collected Meals Revenue (This Day)</Text>
            <Text style={styles.totalCostValue}>₹{totalCollectedCost}</Text>
          </View>

          {/* Per-employee cumulative totals */}
          <Text style={styles.sectionLabel}>Employee Totals (All-Time, Collected Only)</Text>
          <View style={styles.employeeTotalsBox}>
            {employeeTotals.length === 0 ? (
              <Text style={styles.noDataText}>No collected meals recorded yet.</Text>
            ) : (
              employeeTotals.map((emp) => (
                <View key={emp.employeeID} style={styles.employeeRow}>
                  <View>
                    <Text style={styles.employeeRowName}>{emp.employeeName}</Text>
                    <Text style={styles.employeeRowCount}>{emp.count} meal{emp.count !== 1 ? 's' : ''} collected</Text>
                  </View>
                  <Text style={styles.employeeRowTotal}>₹{emp.total}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionLabel}>Bookings for {selectedDate}</Text>

          {dayBookings.length === 0 && (
            <Text style={styles.emptyText}>No confirmed bookings for this date.</Text>
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
  subheading: { fontSize: 13, color: '#888', marginBottom: 16 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: 10, gap: 12,
  },
  dateArrow: {
    backgroundColor: '#005f99', borderRadius: 8,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  dateArrowText: { color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
  dateLabelBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd',
    paddingVertical: 10, alignItems: 'center',
  },
  dateLabelText: { fontSize: 16, fontWeight: '600', color: '#111' },
  todayBtn: {
    alignSelf: 'center', marginBottom: 16,
    paddingVertical: 6, paddingHorizontal: 18,
    backgroundColor: '#e8f4fd', borderRadius: 20,
    borderWidth: 1, borderColor: '#005f99',
  },
  todayBtnText: { fontSize: 13, color: '#005f99', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    padding: 14, alignItems: 'center', elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  totalCostBox: {
    backgroundColor: '#005f99', borderRadius: 12,
    padding: 16, marginBottom: 20, alignItems: 'center',
  },
  totalCostLabel: { fontSize: 12, color: '#cce5ff', marginBottom: 4 },
  totalCostValue: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  sectionLabel: {
    fontSize: 13, fontWeight: 'bold', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  employeeTotalsBox: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 20, elevation: 2,
  },
  noDataText: { fontSize: 13, color: '#888', textAlign: 'center' },
  employeeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  employeeRowName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  employeeRowCount: { fontSize: 12, color: '#888', marginTop: 2 },
  employeeRowTotal: { fontSize: 16, fontWeight: 'bold', color: '#005f99' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 10 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 2, borderLeftWidth: 4,
  },
  cardCollected: { borderLeftColor: '#27ae60' },
  cardPending: { borderLeftColor: '#c0392b' },
  cardLeft: { flex: 1 },
  employeeName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  mealInfo: { fontSize: 13, color: '#555', marginTop: 2 },
  bookingMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  cardRight: { alignItems: 'center', gap: 6 },
  costText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  checkCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleYes: { backgroundColor: '#27ae60' },
  checkCircleNo: { backgroundColor: '#c0392b' },
  checkCircleText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});