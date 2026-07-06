// screens/BookMealScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];
const MEAL_CATEGORIES = ['Veg', 'Paneer', 'Non-Veg'];
const CATEGORY_MEAL_TYPES = ['Lunch', 'Dinner'];

const CUTOFF_DISPLAY = {
  Breakfast: '8:30 AM',
  Lunch: '10:30 AM',
  'Evening Snacks': '3:00 PM',
  Dinner: '5:00 PM',
};

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
  const [showSummary, setShowSummary] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [mealPricing, setMealPricing] = useState([]);

  const showCategorySection = CATEGORY_MEAL_TYPES.includes(mealType);

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

  useEffect(() => {
    if (!showCategorySection) setMealCategory(null);
  }, [mealType]);

  useEffect(() => {
    api.get('/MealPricing')
    .then((res) => setMealPricing(res.data ?? []))
    .catch(() => setMealPricing([]));
  }, []);

  // Check if cutoff might have passed (display hint only — backend enforces)
  const isTodaySelected = fromDate === formatDate(today);
  const cutoffWarning = (() => {
    if (!mealType || !isTodaySelected) return null;
    const cutoffTimes = {
      Breakfast: { h: 8, m: 30 },
      Lunch: { h: 10, m: 30 },
      'Evening Snacks': { h: 15, m: 0 },
      Dinner: { h: 17, m: 0 },
    };
    const c = cutoffTimes[mealType];
    if (!c) return null;
    const cutoffDate = new Date();
    cutoffDate.setHours(c.h, c.m, 0, 0);
    return new Date() > cutoffDate;
  })();

  const validate = () => {
    if (!fromDate || !toDate) return 'Please select both From and To dates.';
    if (fromDate > toDate) return 'From Date cannot be after To Date.';
    if (!outlet) return 'Please select a canteen outlet.';
    if (!mealType) return 'Please select a meal type.';
    if (bookingFor === 'Self' && !isSpecialMeal && showCategorySection && !mealCategory) {
      return 'Please select a meal category.';
    }
    if (bookingFor === 'Guests') {
      const total = parseInt(guestCount) || 0;
      if (total < 1) return 'Please enter number of guests.';
      if (!isSpecialMeal && showCategorySection) {
        const v = parseInt(vegCount) || 0;
        const p = parseInt(paneerCount) || 0;
        const n = parseInt(nonVegCount) || 0;
        if (v + p + n !== total) return 'Veg + Paneer + Non-Veg counts must equal total guest count.';
      }
    }
    return null;
  };

  const handleReview = () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }
    setShowSummary(true);
  };

  const buildPayload = () => {
    const getSelfVeg = () => {
      if (isSpecialMeal) return 0;
      if (!showCategorySection) return 1;
      return mealCategory === 'Veg' ? 1 : 0;
    };
    const getSelfPaneer = () => {
      if (isSpecialMeal) return 0;
      if (!showCategorySection) return 0;
      return mealCategory === 'Paneer' ? 1 : 0;
    };
    const getSelfNonVeg = () => {
      if (isSpecialMeal) return 0;
      if (!showCategorySection) return 0;
      return mealCategory === 'Non-Veg' ? 1 : 0;
    };

    return {
      fromDate,
      toDate,
      canteenLocation: outlet,
      mealType,
      bookingFor,
      guestCount: bookingFor === 'Guests' ? parseInt(guestCount) : null,
      vegCount: bookingFor === 'Guests'
        ? (isSpecialMeal || !showCategorySection ? 0 : parseInt(vegCount) || 0)
        : getSelfVeg(),
      paneerCount: bookingFor === 'Guests'
        ? (isSpecialMeal || !showCategorySection ? 0 : parseInt(paneerCount) || 0)
        : getSelfPaneer(),
      nonVegCount: bookingFor === 'Guests'
        ? (isSpecialMeal || !showCategorySection ? 0 : parseInt(nonVegCount) || 0)
        : getSelfNonVeg(),
      isSpecialMeal,
    };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();

    try {
      setLoading(true);
      setNetworkError(false);
      const response = await api.post('/Bookings', payload);
      const bookingId = response.data.bookingID ?? response.data.bookingId ?? response.data.id;
      setShowSummary(false);
      Alert.alert('Booking Confirmed! 🎉', `Your Booking ID is: ${bookingId}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      if (!err.response) {
        setNetworkError(true);
        Alert.alert(
          'No Internet Connection',
          'Please check your network connection and try again.'
        );
      } else {
        Alert.alert('Error', err.response?.data?.message ?? 'Booking failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const summary = buildPayload();

  const getEstimatedCost = () => {
    if (!mealType) return null;
    const pricing = mealPricing.find((p) => p.mealType === mealType);
    if (!pricing) return null;
    const base = pricing.baseCost ?? 0;
    const paneerSurcharge = pricing.paneerSurcharge ?? 0;
    const nonVegSurcharge = pricing.nonVegSurcharge ?? 0;
    if (isSpecialMeal) return null; 
    if (bookingFor === 'Self') {
      if (!showCategorySection) return base;
      if (mealCategory === 'Paneer') return base + paneerSurcharge;
      if (mealCategory === 'Non-Veg') return base + nonVegSurcharge;
      return base;
    }

  // Guests
  if (!showCategorySection) {
    const count = parseInt(guestCount) || 0;
    return base * count;
  }
  const v = parseInt(vegCount) || 0;
  const p = parseInt(paneerCount) || 0;
  const n = parseInt(nonVegCount) || 0;
  return (v * base) + (p * (base + paneerSurcharge)) + (n * (base + nonVegSurcharge));
};

const estimatedCost = getEstimatedCost();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Book a Meal</Text>

      {networkError && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 No internet connection</Text>
        </View>
      )}

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
            onPress={() => {
              setMealType(m);
              setMealCategory(null);
              setIsSpecialMeal(false);
            }}
          >
            <Text style={[styles.optionText, mealType === m && styles.optionTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cutoff hint */}
      {mealType && (
        <Text style={[styles.cutoffHint, cutoffWarning && styles.cutoffHintWarning]}>
          {cutoffWarning
            ? `⚠ Today's booking window for ${mealType} (closes ${CUTOFF_DISPLAY[mealType]}) may have passed.`
            : `⏰ Booking for ${mealType} closes at ${CUTOFF_DISPLAY[mealType]} on the day of the meal.`}
        </Text>
      )}

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

      {/* Meal Category — only for Lunch and Dinner */}
      {!isSpecialMeal && bookingFor === 'Self' && showCategorySection && (
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
          {!isSpecialMeal && showCategorySection && (
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

      {/* Review button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleReview}
      >
        <Text style={styles.submitText}>Review Booking</Text>
      </TouchableOpacity>

      {/* Summary Modal */}
      <Modal
        visible={showSummary}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSummary(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Confirm Your Booking</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {summary.fromDate === summary.toDate
                  ? summary.fromDate
                  : `${summary.fromDate} → ${summary.toDate}`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Outlet</Text>
              <Text style={styles.summaryValue}>{summary.canteenLocation}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Meal</Text>
              <Text style={styles.summaryValue}>
                {summary.isSpecialMeal ? `🌟 ${summary.mealType} (Special)` : summary.mealType}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booked For</Text>
              <Text style={styles.summaryValue}>{summary.bookingFor}</Text>
            </View>
            {summary.bookingFor === 'Guests' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guests</Text>
                <Text style={styles.summaryValue}>{summary.guestCount} persons</Text>
              </View>
            )}
            {showCategorySection && !summary.isSpecialMeal && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Category</Text>
                <Text style={styles.summaryValue}>
                  {summary.bookingFor === 'Self'
                    ? mealCategory
                    : `${summary.vegCount} Veg · ${summary.paneerCount} Paneer · ${summary.nonVegCount} Non-Veg`}
                </Text>
              </View>
            )}

            {cutoffWarning && (
              <Text style={styles.modalWarning}>
                ⚠ This meal's booking window may have already closed today.
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSummary(false)}
                disabled={loading}
              >
                <Text style={styles.modalCancelText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalConfirmText}>Confirm</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
  {estimatedCost !== null && (
  <View style={styles.costBox}>
    <Text style={styles.costLabel}>Estimated Cost</Text>
    <Text style={styles.costValue}>₹{estimatedCost}</Text>
    </View>
    )}
  }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 11, color: '#888', marginTop: 4 },
  cutoffHint: {
    fontSize: 12, color: '#005f99', marginTop: 8,
    backgroundColor: '#e8f4fd', padding: 8, borderRadius: 6,
  },
  cutoffHintWarning: {
    color: '#c0392b', backgroundColor: '#fdecea',
  },
  offlineBanner: {
    backgroundColor: '#fdecea', borderRadius: 8,
    padding: 10, marginBottom: 16, alignItems: 'center',
  },
  offlineText: { color: '#c0392b', fontSize: 13, fontWeight: '600' },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalHeading: { fontSize: 19, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  summaryLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  summaryValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  modalWarning: {
    fontSize: 12, color: '#c0392b', marginTop: 14,
    backgroundColor: '#fdecea', padding: 10, borderRadius: 8,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#ccc',
  },
  modalCancelText: { color: '#555', fontWeight: '600', fontSize: 15 },
  modalConfirmBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#005f99',
  },
  modalConfirmText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  costBox: {
    backgroundColor: '#005f99', borderRadius: 12,
    padding: 16, marginTop: 20, alignItems: 'center',
  },
  costLabel: { fontSize: 12, color: '#cce5ff', marginBottom: 4 },
  costValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
});