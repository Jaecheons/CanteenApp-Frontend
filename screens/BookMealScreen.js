// screens/BookMealScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { isCutoffPassed } from '../utils/cutoff';
import api from '../services/api';

const OUTLETS = ['Outlet 1', 'Outlet 2', 'Outlet 3', 'Outlet 4'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];
const MEAL_CATEGORIES = ['Veg', 'Paneer', 'Non-Veg'];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function BookMealScreen({ navigation }) {
  const today = new Date();

  const [fromDate, setFromDate] = useState(formatDate(today));
  const [toDate, setToDate] = useState(formatDate(today));
  const [outlet, setOutlet] = useState(null);
  const [mealType, setMealType] = useState(null);
  const [bookingFor, setBookingFor] = useState('Self');
  const [mealCategory, setMealCategory] = useState(null);
  const [guestCount, setGuestCount] = useState('');
  const [vegCount, setVegCount] = useState('');
  const [paneerCount, setPaneerCount] = useState('');
  const [nonVegCount, setNonVegCount] = useState('');
  const [loading, setLoading] = useState(false);

  const cutoffPassed = mealType ? isCutoffPassed(mealType, fromDate) : false;

  const validate = () => {
    if (!fromDate || !toDate) return 'Please select both From and To dates.';
    if (fromDate > toDate) return 'From Date cannot be after To Date.';
    if (!outlet) return 'Please select a canteen outlet.';
    if (!mealType) return 'Please select a meal type.';
    if (cutoffPassed) return `Booking cutoff for ${mealType} has passed for today.`;
    if (bookingFor === 'Self' && !mealCategory) return 'Please select a meal category.';
    if (bookingFor === 'Guests') {
      const total = parseInt(guestCount) || 0;
      if (total < 1) return 'Please enter number of guests.';
      const v = parseInt(vegCount) || 0;
      const p = parseInt(paneerCount) || 0;
      const n = parseInt(nonVegCount) || 0;
      if (v + p + n !== total) return 'Veg + Paneer + Non-Veg counts must equal total guest count.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }

    const payload = {
      fromDate,
      toDate,
      canteenLocation: outlet,
      mealType,
      bookingFor,
      guestCount: bookingFor === 'Guests' ? parseInt(guestCount) : null,
      vegCount: bookingFor === 'Guests' ? parseInt(vegCount) || 0 : (mealCategory === 'Veg' ? 1 : 0),
      paneerCount: bookingFor === 'Guests' ? parseInt(paneerCount) || 0 : (mealCategory === 'Paneer' ? 1 : 0),
      nonVegCount: bookingFor === 'Guests' ? parseInt(nonVegCount) || 0 : (mealCategory === 'Non-Veg' ? 1 : 0),
      isSpecialMeal: false,
    };

    try {
      setLoading(true);
      const response = await api.post('/api/Bookings', payload);
      const bookingId = response.data.bookingId ?? response.data.BookingID ?? response.data.id;
      Alert.alert('Booking Confirmed! 🎉', `Your Booking ID is: ${bookingId}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Book a Meal</Text>

      <Text style={styles.label}>From Date</Text>
      <TextInput
        style={styles.input}
        value={fromDate}
        onChangeText={setFromDate}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>To Date</Text>
      <TextInput
        style={styles.input}
        value={toDate}
        onChangeText={setToDate}
        placeholder="YYYY-MM-DD"
      />
      <Text style={styles.hint}>Format: YYYY-MM-DD · Max 30 days ahead</Text>

      <Text style={styles.label}>Canteen Outlet</Text>
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

      <Text style={styles.label}>Meal Type</Text>
      <View style={styles.buttonRow}>
        {MEAL_TYPES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.optionBtn, mealType === m && styles.optionBtnSelected]}
            onPress={() => { setMealType(m); setMealCategory(null); }}
          >
            <Text style={[styles.optionText, mealType === m && styles.optionTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {cutoffPassed && (
        <Text style={styles.cutoffWarning}>⚠ Booking cutoff for {mealType} has passed for today.</Text>
      )}

      <Text style={styles.label}>Booking For</Text>
      <View style={styles.buttonRow}>
        {['Self', 'Guests/Others'].map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.optionBtn, bookingFor === (b === 'Self' ? 'Self' : 'Guests') && styles.optionBtnSelected]}
            onPress={() => setBookingFor(b === 'Self' ? 'Self' : 'Guests')}
          >
            <Text style={[styles.optionText, bookingFor === (b === 'Self' ? 'Self' : 'Guests') && styles.optionTextSelected]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {bookingFor === 'Self' && (
        <>
          <Text style={styles.label}>Meal Category</Text>
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

      {bookingFor === 'Guests' && (
        <>
          <Text style={styles.label}>Total Number of Persons</Text>
          <TextInput style={styles.input} value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" placeholder="e.g. 3" />
          <Text style={styles.label}>Veg Count</Text>
          <TextInput style={styles.input} value={vegCount} onChangeText={setVegCount} keyboardType="numeric" placeholder="0" />
          <Text style={styles.label}>Paneer Count</Text>
          <TextInput style={styles.input} value={paneerCount} onChangeText={setPaneerCount} keyboardType="numeric" placeholder="0" />
          <Text style={styles.label}>Non-Veg Count</Text>
          <TextInput style={styles.input} value={nonVegCount} onChangeText={setNonVegCount} keyboardType="numeric" placeholder="0" />
        </>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, (loading || cutoffPassed) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading || cutoffPassed}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Confirm Booking</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 11, color: '#888', marginTop: 2 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
  },
  optionBtnSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  cutoffWarning: { color: '#c0392b', marginTop: 8, fontSize: 13 },
  submitBtn: {
    backgroundColor: '#005f99', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 30,
  },
  submitBtnDisabled: { backgroundColor: '#aaa' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});