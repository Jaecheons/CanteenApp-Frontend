// screens/AdminBookingDetailScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import api from '../services/api';

const STATUS_COLORS = {
  confirmed: '#27ae60',
  pending: '#f39c12',
  cancelled: '#c0392b',
  completed: '#888',
};

export default function AdminBookingDetailScreen({ route, navigation }) {
  const { booking } = route.params;
  const [cancelling, setCancelling] = useState(false);

  const bookingId = booking.bookingId ?? booking.BookingID ?? booking.id;
  const status = booking.status?.toLowerCase() ?? 'pending';
  const statusColor = STATUS_COLORS[status] ?? '#888';
  const canCancel = status === 'confirmed' || status === 'pending';

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      `Cancel booking #${bookingId} for ${booking.employeeName ?? 'this employee'}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: confirmCancel },
      ]
    );
  };

  const confirmCancel = async () => {
    try {
      setCancelling(true);
      await api.delete(`/api/bookings/${bookingId}`);
      Alert.alert('Cancelled', 'Booking has been cancelled.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const Row = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? '—'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Booking #{bookingId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{booking.status ?? 'Pending'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Employee" value={booking.employeeName ?? booking.name ?? '—'} />
        <Row label="Employee ID" value={String(booking.employeeId ?? '—')} />
        <Row label="Meal Type" value={booking.mealType} />
        <Row label="From Date" value={booking.fromDate?.split('T')[0]} />
        <Row label="To Date" value={booking.toDate?.split('T')[0]} />
        <Row label="Outlet" value={booking.canteenLocation} />
        <Row label="Booked For" value={booking.bookingFor} />
        {booking.bookingFor === 'Guests' && (
          <>
            <Row label="Total Guests" value={String(booking.guestCount)} />
          </>
        )}
        <Row label="Veg" value={String(booking.vegCount ?? 0)} />
        <Row label="Paneer" value={String(booking.paneerCount ?? 0)} />
        <Row label="Non-Veg" value={String(booking.nonVegCount ?? 0)} />
      </View>

      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          disabled={cancelling}
        >
          {cancelling
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.cancelText}>Cancel This Booking</Text>
          }
        </TouchableOpacity>
      )}

      {!canCancel && (
        <Text style={styles.cannotCancel}>This booking cannot be cancelled.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  heading: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, elevation: 2, marginBottom: 24,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 14, color: '#888', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  cancelBtn: {
    backgroundColor: '#c0392b', padding: 16,
    borderRadius: 10, alignItems: 'center',
  },
  cancelBtnDisabled: { backgroundColor: '#aaa' },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cannotCancel: { textAlign: 'center', color: '#888', fontSize: 14 },
});