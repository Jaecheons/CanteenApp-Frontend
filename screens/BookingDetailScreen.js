// screens/BookingDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, TextInput
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];
const MEAL_CATEGORIES = ['Veg', 'Paneer', 'Non-Veg'];
const CATEGORY_MEAL_TYPES = ['Lunch', 'Dinner'];

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

export default function BookingDetailScreen({ route, navigation }) {
  const { booking } = route.params;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [outlet, setOutlet] = useState(booking.canteenLocation);
  const [mealCategory, setMealCategory] = useState(
    booking.vegCount > 0 ? 'Veg' : booking.paneerCount > 0 ? 'Paneer' : 'Non-Veg'
  );
  const [guestCount, setGuestCount] = useState(String(booking.guestCount ?? ''));
  const [vegCount, setVegCount] = useState(String(booking.vegCount ?? 0));
  const [paneerCount, setPaneerCount] = useState(String(booking.paneerCount ?? 0));
  const [nonVegCount, setNonVegCount] = useState(String(booking.nonVegCount ?? 0));

  const [loggedInName, setLoggedInName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('name').then((n) => {
      if (n) setLoggedInName(n);
    });
  }, []);

  const bookingId = booking.bookingID;
  const status = booking.status?.toLowerCase() ?? 'confirmed';
  const statusColor = STATUS_COLORS[status] ?? '#888';

  // Only show category for Lunch and Dinner
  const showCategorySection = CATEGORY_MEAL_TYPES.includes(booking.mealType);

  const handleSave = async () => {
    const payload = { canteenLocation: outlet };

    if (booking.bookingFor === 'Self' && !booking.isSpecialMeal) {
      if (showCategorySection) {
        payload.vegCount = mealCategory === 'Veg' ? 1 : 0;
        payload.paneerCount = mealCategory === 'Paneer' ? 1 : 0;
        payload.nonVegCount = mealCategory === 'Non-Veg' ? 1 : 0;
      } else {
        // Breakfast / Evening Snacks — default to veg
        payload.vegCount = 1;
        payload.paneerCount = 0;
        payload.nonVegCount = 0;
      }
    }

    if (booking.bookingFor === 'Guests') {
      const total = parseInt(guestCount) || 0;

      if (showCategorySection) {
        const v = parseInt(vegCount) || 0;
        const p = parseInt(paneerCount) || 0;
        const n = parseInt(nonVegCount) || 0;

        if (v + p + n !== total) {
          Alert.alert('Validation Error', 'Veg + Paneer + Non-Veg must equal total guest count.');
          return;
        }

        payload.guestCount = total;
        payload.vegCount = v;
        payload.paneerCount = p;
        payload.nonVegCount = n;
      } else {
        // Breakfast / Evening Snacks — just send total
        payload.guestCount = total;
        payload.vegCount = 0;
        payload.paneerCount = 0;
        payload.nonVegCount = 0;
      }
    }

    try {
      setSaving(true);
      await api.put(`/Bookings/${bookingId}`, payload);
      Alert.alert('Updated!', 'Your booking has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not update booking.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel booking #${bookingId}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: confirmCancel },
      ]
    );
  };

  const confirmCancel = async () => {
    try {
      setCancelling(true);
      await api.delete(`/Bookings/${bookingId}`);
      Alert.alert('Cancelled', 'Your booking has been cancelled.', [
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

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Booking #{bookingId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>
      </View>

      {/* Employee Details */}
      <Text style={styles.sectionLabel}>Employee Details</Text>
      <View style={styles.card}>
        <Row label="Employee ID" value={String(booking.employeeID ?? '—')} />
        <Row label="Employee Name" value={booking.employeeName || loggedInName || '—'} />
      </View>

      {/* Booking Details */}
      <Text style={styles.sectionLabel}>Booking Details</Text>
      <View style={styles.card}>
        <Row
        label="Meal Type"
        value={booking.isSpecialMeal
          ? `🌟 ${booking.mealType} (Special)`
          : booking.mealType}
          />
          <Row label="From Date" value={booking.fromDate?.split('T')[0]} />
          <Row label="To Date" value={booking.toDate?.split('T')[0]} />
          <Row label="Outlet" value={booking.canteenLocation} />
          <Row label="Booked For" value={booking.bookingFor} />
          {booking.bookingFor === 'Guests' && (
            <Row label="Total Guests" value={String(booking.guestCount)} />
            )}
            <Row label="Cost" value={booking.totalCost != null ? `₹${booking.totalCost}` : '—'} />
            <Row
            label="Collected"
            value={booking.isCollected ? `Yes${booking.collectedAt ? ' · ' + booking.collectedAt.split('T')[0] : ''}` : 'Not yet'}
            />
            </View>

      {/* Editable fields — only if canModify */}
      {booking.canModify && (
        <>
          <View style={styles.editHeader}>
            <Text style={styles.sectionTitle}>Edit Booking</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editToggle}>{editing ? 'Cancel Edit' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {editing && (
            <View style={styles.card}>

              {/* Outlet */}
              <Text style={styles.fieldLabel}>Canteen Outlet</Text>
              <View style={styles.buttonRow}>
                {OUTLETS.map((o) => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.optionBtn, outlet === o && styles.optionBtnSelected]}
                    onPress={() => setOutlet(o)}
                  >
                    <Text style={[styles.optionText, outlet === o && styles.optionTextSelected]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Meal Category — Self, not special, Lunch/Dinner only */}
              {booking.bookingFor === 'Self' && !booking.isSpecialMeal && showCategorySection && (
                <>
                  <Text style={styles.fieldLabel}>Meal Category</Text>
                  <View style={styles.buttonRow}>
                    {MEAL_CATEGORIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.optionBtn, mealCategory === c && styles.optionBtnSelected]}
                        onPress={() => setMealCategory(c)}
                      >
                        <Text style={[styles.optionText, mealCategory === c && styles.optionTextSelected]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Guest counts */}
              {booking.bookingFor === 'Guests' && (
                <>
                  <Text style={styles.fieldLabel}>Total Persons</Text>
                  <TextInput
                    style={styles.input}
                    value={guestCount}
                    onChangeText={setGuestCount}
                    keyboardType="numeric"
                  />

                  {/* Veg/Paneer/Non-Veg only for Lunch and Dinner */}
                  {showCategorySection && (
                    <>
                      <Text style={styles.fieldLabel}>Veg Count</Text>
                      <TextInput style={styles.input} value={vegCount} onChangeText={setVegCount} keyboardType="numeric" />
                      <Text style={styles.fieldLabel}>Paneer Count</Text>
                      <TextInput style={styles.input} value={paneerCount} onChangeText={setPaneerCount} keyboardType="numeric" />
                      <Text style={styles.fieldLabel}>Non-Veg Count</Text>
                      <TextInput style={styles.input} value={nonVegCount} onChangeText={setNonVegCount} keyboardType="numeric" />
                    </>
                  )}
                </>
              )}

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel Booking */}
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.cancelText}>Cancel Booking</Text>
            }
          </TouchableOpacity>
        </>
      )}

      {!booking.canModify && (
        <Text style={styles.cannotModify}>
          {status === 'cancelled'
            ? 'This booking has been cancelled.'
            : 'This booking can no longer be modified.'}
        </Text>
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
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sectionLabel: {
    fontSize: 13, fontWeight: 'bold', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8, marginTop: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, elevation: 2, marginBottom: 16,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 14, color: '#888', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  editHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  editToggle: { fontSize: 14, color: '#005f99', fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 14, marginBottom: 6 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
  },
  optionBtnSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: '#27ae60', padding: 14,
    borderRadius: 10, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cancelBtn: {
    backgroundColor: '#c0392b', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 8,
  },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { backgroundColor: '#aaa' },
  cannotModify: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 10 },
});