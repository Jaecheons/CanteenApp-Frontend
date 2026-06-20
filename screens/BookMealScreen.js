// screens/BookMealScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];
const MEAL_CATEGORIES = ['Veg', 'Paneer', 'Non-Veg'];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function BookMealScreen({ navigation }) {
  const today = new Date();

  const [fromDate, setFromDate] = useState(formatDate(today));
  const [toDate, setToDate] = useState(formatDate(today));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [outlet, setOutlet] = useState(null);
  const [mealType, setMealType] = useState(null);
  const [bookingFor, setBookingFor] = useState('Self');
  const [mealCategory, setMealCategory] = useState(null);
  const [isSpecialMeal, setIsSpecialMeal] = useState(false);
  const [guestCount, setGuestCount] = useState('');
  const [vegCount, setVegCount] = useState('');
  const [paneerCount, setPaneerCount] = useState('');
  const [nonVegCount, setNonVegCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [specials, setSpecials] = useState([]);

  useEffect(() => {
    api.get('/Specials/today')
      .then(async (res) => {
        const data = res.data ?? [];
        const withImages = await Promise.all(
          data.map(async (special) => {
            try {
              const localImage = await AsyncStorage.getItem(
                `special_image_${special.specialID}`
              );
              return { ...special, localImage };
            } catch {
              return { ...special, localImage: null };
            }
          })
        );
        setSpecials(withImages);
      })
      .catch(() => setSpecials([]));
  }, []);

  const activeSpecial = specials.find(
    (s) =>
      s.mealType === mealType &&
      s.applicableOutlets?.includes(outlet)
  );

  useEffect(() => {
    if (!activeSpecial) setIsSpecialMeal(false);
  }, [mealType, outlet]);

  const validate = () => {
    if (!fromDate || !toDate) return 'Please select both From and To dates.';
    if (fromDate > toDate) return 'From Date cannot be after To Date.';
    if (!outlet) return 'Please select a canteen outlet.';
    if (!mealType) return 'Please select a meal type.';
    if (bookingFor === 'Self' && !isSpecialMeal && !mealCategory) return 'Please select a meal category.';
    if (bookingFor === 'Guests') {
      const total = parseInt(guestCount) || 0;
      if (total < 1) return 'Please enter number of guests.';
      if (!isSpecialMeal) {
        const v = parseInt(vegCount) || 0;
        const p = parseInt(paneerCount) || 0;
        const n = parseInt(nonVegCount) || 0;
        if (v + p + n !== total) return 'Veg + Paneer + Non-Veg counts must equal total guest count.';
      }
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
      vegCount: isSpecialMeal ? 0 : (bookingFor === 'Guests' ? parseInt(vegCount) || 0 : (mealCategory === 'Veg' ? 1 : 0)),
      paneerCount: isSpecialMeal ? 0 : (bookingFor === 'Guests' ? parseInt(paneerCount) || 0 : (mealCategory === 'Paneer' ? 1 : 0)),
      nonVegCount: isSpecialMeal ? 0 : (bookingFor === 'Guests' ? parseInt(nonVegCount) || 0 : (mealCategory === 'Non-Veg' ? 1 : 0)),
      isSpecialMeal,
    };

    try {
      setLoading(true);
      const response = await api.post('/Bookings', payload);
      const bookingId = response.data.bookingID ?? response.data.bookingId ?? response.data.id;
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

      {/* From Date */}
      <Text style={styles.label}>From Date</Text>
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setShowFromPicker(true)}
      >
        <Text style={styles.dateBtnText}>📅 {fromDate}</Text>
      </TouchableOpacity>
      {showFromPicker && (
        <DateTimePicker
          value={new Date(fromDate)}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          maximumDate={addDays(new Date(), 30)}
          onChange={(event, selectedDate) => {
            setShowFromPicker(false);
            if (selectedDate) {
              const formatted = formatDate(selectedDate);
              setFromDate(formatted);
              if (formatted > toDate) setToDate(formatted);
            }
          }}
        />
      )}

      {/* To Date */}
      <Text style={styles.label}>To Date</Text>
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setShowToPicker(true)}
      >
        <Text style={styles.dateBtnText}>📅 {toDate}</Text>
      </TouchableOpacity>
      {showToPicker && (
        <DateTimePicker
          value={new Date(toDate)}
          mode="date"
          display="calendar"
          minimumDate={new Date(fromDate)}
          maximumDate={addDays(new Date(), 30)}
          onChange={(event, selectedDate) => {
            setShowToPicker(false);
            if (selectedDate) {
              setToDate(formatDate(selectedDate));
            }
          }}
        />
      )}
      <Text style={styles.hint}>Max 30 days ahead</Text>

      {/* Outlet */}
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

      {/* Meal Type */}
      <Text style={styles.label}>Meal Type</Text>
      <View style={styles.buttonRow}>
        {MEAL_TYPES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.optionBtn, mealType === m && styles.optionBtnSelected]}
            onPress={() => { setMealType(m); setMealCategory(null); setIsSpecialMeal(false); }}
          >
            <Text style={[styles.optionText, mealType === m && styles.optionTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Booking For */}
      <Text style={styles.label}>Booking For</Text>
      <View style={styles.buttonRow}>
        {['Self', 'Guests'].map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.optionBtn, bookingFor === b && styles.optionBtnSelected]}
            onPress={() => setBookingFor(b)}
          >
            <Text style={[styles.optionText, bookingFor === b && styles.optionTextSelected]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's Special Option */}
      {activeSpecial && (
        <View style={styles.specialBox}>
          <Text style={styles.specialTitle}>🌟 Today's Special Available</Text>
          {activeSpecial.localImage ? (
            <Image
              source={{ uri: activeSpecial.localImage }}
              style={styles.specialImage}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.specialName}>{activeSpecial.specialName}</Text>
          {activeSpecial.description ? (
            <Text style={styles.specialDesc}>{activeSpecial.description}</Text>
          ) : null}
          <View style={[styles.buttonRow, { marginTop: 10 }]}>
            <TouchableOpacity
              style={[styles.optionBtn, !isSpecialMeal && styles.optionBtnSelected]}
              onPress={() => setIsSpecialMeal(false)}
            >
              <Text style={[styles.optionText, !isSpecialMeal && styles.optionTextSelected]}>Regular Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionBtn, isSpecialMeal && styles.specialBtnSelected]}
              onPress={() => setIsSpecialMeal(true)}
            >
              <Text style={[styles.optionText, isSpecialMeal && styles.optionTextSelected]}>Today's Special</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Meal Category — only for regular meal, Self */}
      {!isSpecialMeal && bookingFor === 'Self' && (
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

      {/* Guest counts */}
      {bookingFor === 'Guests' && (
        <>
          <Text style={styles.label}>Total Number of Persons</Text>
          <TextInput
            style={styles.input}
            value={guestCount}
            onChangeText={setGuestCount}
            keyboardType="numeric"
            placeholder="e.g. 3"
          />
          {!isSpecialMeal && (
            <>
              <Text style={styles.label}>Veg Count</Text>
              <TextInput
                style={styles.input}
                value={vegCount}
                onChangeText={setVegCount}
                keyboardType="numeric"
                placeholder="0"
              />
              <Text style={styles.label}>Paneer Count</Text>
              <TextInput
                style={styles.input}
                value={paneerCount}
                onChangeText={setPaneerCount}
                keyboardType="numeric"
                placeholder="0"
              />
              <Text style={styles.label}>Non-Veg Count</Text>
              <TextInput
                style={styles.input}
                value={nonVegCount}
                onChangeText={setNonVegCount}
                keyboardType="numeric"
                placeholder="0"
              />
            </>
          )}
        </>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
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
  hint: { fontSize: 11, color: '#888', marginTop: 4 },
  dateBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 13, flexDirection: 'row', alignItems: 'center',
  },
  dateBtnText: { fontSize: 15, color: '#111' },
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
  specialBtnSelected: { backgroundColor: '#e67e22', borderColor: '#e67e22' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  specialBox: {
    backgroundColor: '#fff8e1', borderRadius: 12,
    padding: 16, marginTop: 16,
    borderLeftWidth: 4, borderLeftColor: '#f39c12',
  },
  specialTitle: { fontSize: 13, fontWeight: 'bold', color: '#e67e22', marginBottom: 6 },
  specialImage: {
    width: '100%', height: 160,
    borderRadius: 10, marginBottom: 10,
  },
  specialName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  specialDesc: { fontSize: 13, color: '#555', marginBottom: 10 },
  submitBtn: {
    backgroundColor: '#005f99', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 30,
  },
  submitBtnDisabled: { backgroundColor: '#aaa' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});