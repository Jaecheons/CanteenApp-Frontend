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

const CUTOFF_TIMES = {
  Breakfast: { h: 8, m: 30 },
  Lunch: { h: 10, m: 30 },
  'Evening Snacks': { h: 15, m: 0 },
  Dinner: { h: 17, m: 0 },
};

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function emptyMealState() {
  return {
    selected: false,
    mealCategory: null,   // Self + category meal types
    isSpecialMeal: false,
    vegCount: '',
    paneerCount: '',
    nonVegCount: '',
  };
}

export default function BookMealScreen({ navigation }) {
  const today = new Date();

  const [fromDate, setFromDate] = useState(formatDate(today));
  const [toDate, setToDate] = useState(formatDate(today));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [outlet, setOutlet] = useState(null);
  const [bookingFor, setBookingFor] = useState('Self');
  const [guestCount, setGuestCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [specials, setSpecials] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [mealPricing, setMealPricing] = useState([]);

  // Per-meal-type selection + details
  const [meals, setMeals] = useState(() => {
    const init = {};
    MEAL_TYPES.forEach((m) => { init[m] = emptyMealState(); });
    return init;
  });

  // Errors from a failed all-or-nothing submit, keyed by mealType
  const [mealErrors, setMealErrors] = useState({});

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

  useEffect(() => {
    api.get('/MealPricing')
      .then((res) => setMealPricing(res.data ?? []))
      .catch(() => setMealPricing([]));
  }, []);

  const getSpecialFor = (mealType) =>
    specials.find((s) => s.mealType === mealType && s.applicableOutlets?.includes(outlet));

  // Clear special selection if outlet changes and special no longer applies
  useEffect(() => {
    setMeals((prev) => {
      const next = { ...prev };
      MEAL_TYPES.forEach((m) => {
        if (!getSpecialFor(m) && next[m].isSpecialMeal) {
          next[m] = { ...next[m], isSpecialMeal: false };
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet, specials]);

  const isTodaySelected = fromDate === formatDate(today);

  const isCutoffPassed = (mealType) => {
    if (!isTodaySelected) return false;
    const c = CUTOFF_TIMES[mealType];
    if (!c) return false;
    const cutoffDate = new Date();
    cutoffDate.setHours(c.h, c.m, 0, 0);
    return new Date() > cutoffDate;
  };

  const updateMeal = (mealType, patch) => {
    setMeals((prev) => ({ ...prev, [mealType]: { ...prev[mealType], ...patch } }));
  };

  const toggleMealSelected = (mealType) => {
    // Clear any prior server error for this meal once the user interacts again
    setMealErrors((prev) => {
      if (!prev[mealType]) return prev;
      const next = { ...prev };
      delete next[mealType];
      return next;
    });
    updateMeal(mealType, { selected: !meals[mealType].selected });
  };

  const selectedMealTypes = MEAL_TYPES.filter((m) => meals[m].selected);

  const validate = () => {
    if (!fromDate || !toDate) return 'Please select both From and To dates.';
    if (fromDate > toDate) return 'From Date cannot be after To Date.';
    if (!outlet) return 'Please select a canteen outlet.';
    if (selectedMealTypes.length === 0) return 'Please select at least one meal type.';

    if (bookingFor === 'Guests') {
      const total = parseInt(guestCount) || 0;
      if (total < 1) return 'Please enter number of guests.';
    }

    for (const mealType of selectedMealTypes) {
      const state = meals[mealType];
      const showCategorySection = CATEGORY_MEAL_TYPES.includes(mealType);

      if (bookingFor === 'Self' && !state.isSpecialMeal && showCategorySection && !state.mealCategory) {
        return `Please select a meal category for ${mealType}.`;
      }

      if (bookingFor === 'Guests' && !state.isSpecialMeal && showCategorySection) {
        const total = parseInt(guestCount) || 0;
        const v = parseInt(state.vegCount) || 0;
        const p = parseInt(state.paneerCount) || 0;
        const n = parseInt(state.nonVegCount) || 0;
        if (v + p + n !== total) {
          return `${mealType}: Veg + Paneer + Non-Veg counts must equal total guest count.`;
        }
      }
    }
    return null;
  };

  const handleReview = () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }
    setShowSummary(true);
  };

  const buildMealPayload = (mealType) => {
    const state = meals[mealType];
    const showCategorySection = CATEGORY_MEAL_TYPES.includes(mealType);

    let vegCount = 0, paneerCount = 0, nonVegCount = 0;

    if (bookingFor === 'Self') {
      if (state.isSpecialMeal) {
        vegCount = 0; paneerCount = 0; nonVegCount = 0;
      } else if (!showCategorySection) {
        vegCount = 1;
      } else {
        vegCount = state.mealCategory === 'Veg' ? 1 : 0;
        paneerCount = state.mealCategory === 'Paneer' ? 1 : 0;
        nonVegCount = state.mealCategory === 'Non-Veg' ? 1 : 0;
      }
    } else {
      // Guests
      if (state.isSpecialMeal || !showCategorySection) {
        vegCount = 0; paneerCount = 0; nonVegCount = 0;
      } else {
        vegCount = parseInt(state.vegCount) || 0;
        paneerCount = parseInt(state.paneerCount) || 0;
        nonVegCount = parseInt(state.nonVegCount) || 0;
      }
    }

    return {
      mealType,
      vegCount,
      paneerCount,
      nonVegCount,
      isSpecialMeal: state.isSpecialMeal,
    };
  };

  const buildPayload = () => ({
    fromDate,
    toDate,
    canteenLocation: outlet,
    bookingFor,
    guestCount: bookingFor === 'Guests' ? parseInt(guestCount) || 0 : null,
    meals: selectedMealTypes.map(buildMealPayload),
  });

  // Map a backend error string like "Breakfast: Cutoff time has passed." to its meal type
  const parseErrorsToMealMap = (errors) => {
    const map = {};
    errors.forEach((e) => {
      const match = MEAL_TYPES.find((m) => e.startsWith(`${m}:`));
      if (match) {
        map[match] = e.slice(match.length + 1).trim();
      }
    });
    return { map, unmatched: errors.filter((e) => !MEAL_TYPES.some((m) => e.startsWith(`${m}:`))) };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();

    try {
      setLoading(true);
      setNetworkError(false);
      const response = await api.post('/Bookings', payload);
      const { bookingIDs } = response.data ?? {};
      setShowSummary(false);
      setMealErrors({});
      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your booking is confirmed.${bookingIDs?.length ? ` Booking IDs: ${bookingIDs.join(', ')}` : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      if (!err.response) {
        setNetworkError(true);
        Alert.alert('No Internet Connection', 'Please check your network connection and try again.');
      } else {
        const data = err.response?.data;
        if (data?.errors?.length) {
          const { map, unmatched } = parseErrorsToMealMap(data.errors);
          setMealErrors(map);
          setShowSummary(false);
          const extra = unmatched.length ? `\n${unmatched.join('\n')}` : '';
          Alert.alert(
            data.message ?? 'Booking failed.',
            `${data.errors.join('\n')}${extra}\n\nThe failed meals are highlighted below — deselect them or fix the issue and try again.`
          );
        } else {
          Alert.alert('Error', data?.message ?? 'Booking failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getEstimatedCostFor = (mealType) => {
    const state = meals[mealType];
    if (state.isSpecialMeal) return null;
    const pricing = mealPricing.find((p) => p.mealType === mealType);
    if (!pricing) return null;
    const base = pricing.baseCost ?? 0;
    const paneerSurcharge = pricing.paneerSurcharge ?? 0;
    const nonVegSurcharge = pricing.nonVegSurcharge ?? 0;
    const showCategorySection = CATEGORY_MEAL_TYPES.includes(mealType);

    if (bookingFor === 'Self') {
      if (!showCategorySection) return base;
      if (state.mealCategory === 'Paneer') return base + paneerSurcharge;
      if (state.mealCategory === 'Non-Veg') return base + nonVegSurcharge;
      return base;
    }

    // Guests
    if (!showCategorySection) {
      const count = parseInt(guestCount) || 0;
      return base * count;
    }
    const v = parseInt(state.vegCount) || 0;
    const p = parseInt(state.paneerCount) || 0;
    const n = parseInt(state.nonVegCount) || 0;
    return (v * base) + (p * (base + paneerSurcharge)) + (n * (base + nonVegSurcharge));
  };

  const estimatedTotal = selectedMealTypes.reduce((sum, m) => {
    const c = getEstimatedCostFor(m);
    return sum + (c ?? 0);
  }, 0);

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
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
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
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
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
            if (selectedDate) setToDate(formatDate(selectedDate));
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
        </>
      )}

      {/* Meal Types — multi-select */}
      <Text style={styles.label}>Meal Types (select one or more)</Text>
      {MEAL_TYPES.map((mealType) => {
        const state = meals[mealType];
        const showCategorySection = CATEGORY_MEAL_TYPES.includes(mealType);
        const cutoffPassed = isCutoffPassed(mealType);
        const special = getSpecialFor(mealType);
        const errorForMeal = mealErrors[mealType];

        return (
          <View
            key={mealType}
            style={[
              styles.mealCard,
              state.selected && styles.mealCardSelected,
              errorForMeal && styles.mealCardError,
            ]}
          >
            <TouchableOpacity style={styles.mealCardHeader} onPress={() => toggleMealSelected(mealType)}>
              <View style={[styles.checkbox, state.selected && styles.checkboxChecked]}>
                {state.selected && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.mealCardTitle}>{mealType}</Text>
              <Text style={[styles.cutoffTag, cutoffPassed && styles.cutoffTagPassed]}>
                {cutoffPassed ? 'Cutoff passed' : `Closes ${CUTOFF_DISPLAY[mealType]}`}
              </Text>
            </TouchableOpacity>

            {errorForMeal && (
              <Text style={styles.mealErrorText}>⚠ {errorForMeal}</Text>
            )}

            {state.selected && (
              <View style={styles.mealCardBody}>
                {/* Today's Special toggle */}
                {special && (
                  <View style={styles.specialBox}>
                    <Text style={styles.specialTitle}>🌟 Today's Special Available</Text>
                    {special.localImage ? (
                      <Image source={{ uri: special.localImage }} style={styles.specialImage} resizeMode="cover" />
                    ) : null}
                    <Text style={styles.specialName}>{special.specialName}</Text>
                    {special.description ? <Text style={styles.specialDesc}>{special.description}</Text> : null}
                    <View style={[styles.buttonRow, { marginTop: 10 }]}>
                      <TouchableOpacity
                        style={[styles.optionBtn, !state.isSpecialMeal && styles.optionBtnSelected]}
                        onPress={() => updateMeal(mealType, { isSpecialMeal: false })}
                      >
                        <Text style={[styles.optionText, !state.isSpecialMeal && styles.optionTextSelected]}>Regular Meal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.optionBtn, state.isSpecialMeal && styles.specialBtnSelected]}
                        onPress={() => updateMeal(mealType, { isSpecialMeal: true })}
                      >
                        <Text style={[styles.optionText, state.isSpecialMeal && styles.optionTextSelected]}>Today's Special</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Meal Category — Self, Lunch/Dinner only */}
                {bookingFor === 'Self' && !state.isSpecialMeal && showCategorySection && (
                  <>
                    <Text style={styles.subLabel}>Meal Category</Text>
                    <View style={styles.buttonRow}>
                      {MEAL_CATEGORIES.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[styles.optionBtn, state.mealCategory === c && styles.optionBtnSelected]}
                          onPress={() => updateMeal(mealType, { mealCategory: c })}
                        >
                          <Text style={[styles.optionText, state.mealCategory === c && styles.optionTextSelected]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Guest counts per meal */}
                {bookingFor === 'Guests' && !state.isSpecialMeal && showCategorySection && (
                  <>
                    <Text style={styles.subLabel}>Veg Count</Text>
                    <TextInput
                      style={styles.input}
                      value={state.vegCount}
                      onChangeText={(v) => updateMeal(mealType, { vegCount: v })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Text style={styles.subLabel}>Paneer Count</Text>
                    <TextInput
                      style={styles.input}
                      value={state.paneerCount}
                      onChangeText={(v) => updateMeal(mealType, { paneerCount: v })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Text style={styles.subLabel}>Non-Veg Count</Text>
                    <TextInput
                      style={styles.input}
                      value={state.nonVegCount}
                      onChangeText={(v) => updateMeal(mealType, { nonVegCount: v })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </>
                )}

                {getEstimatedCostFor(mealType) !== null && (
                  <Text style={styles.mealCostHint}>Estimated: ₹{getEstimatedCostFor(mealType)}</Text>
                )}
              </View>
            )}
          </View>
        );
      })}

      {estimatedTotal > 0 && (
        <View style={styles.costBox}>
          <Text style={styles.costLabel}>Estimated Total</Text>
          <Text style={styles.costValue}>₹{estimatedTotal}</Text>
        </View>
      )}

      {/* Review button */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleReview}>
        <Text style={styles.submitText}>Review Booking</Text>
      </TouchableOpacity>

      {/* Summary Modal */}
      <Modal visible={showSummary} animationType="slide" transparent onRequestClose={() => setShowSummary(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Confirm Your Booking</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Outlet</Text>
              <Text style={styles.summaryValue}>{outlet}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booked For</Text>
              <Text style={styles.summaryValue}>{bookingFor}</Text>
            </View>
            {bookingFor === 'Guests' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guests</Text>
                <Text style={styles.summaryValue}>{guestCount} persons</Text>
              </View>
            )}

            <Text style={[styles.summaryLabel, { marginTop: 14, marginBottom: 4 }]}>Meals</Text>
            {selectedMealTypes.map((mealType) => {
              const p = buildMealPayload(mealType);
              const showCategorySection = CATEGORY_MEAL_TYPES.includes(mealType);
              return (
                <View style={styles.summaryRow} key={mealType}>
                  <Text style={styles.summaryLabel}>
                    {p.isSpecialMeal ? `🌟 ${mealType} (Special)` : mealType}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {p.isSpecialMeal
                      ? '—'
                      : !showCategorySection
                        ? (bookingFor === 'Guests' ? `${guestCount} persons` : 'Veg')
                        : bookingFor === 'Self'
                          ? meals[mealType].mealCategory
                          : `${p.vegCount} Veg · ${p.paneerCount} Paneer · ${p.nonVegCount} Non-Veg`}
                  </Text>
                </View>
              );
            })}

            {selectedMealTypes.some(isCutoffPassed) && (
              <Text style={styles.modalWarning}>
                ⚠ One or more selected meals' booking windows may have already closed today.
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSummary(false)} disabled={loading}>
                <Text style={styles.modalCancelText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  subLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 11, color: '#888', marginTop: 4 },
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
  mealCard: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0',
    padding: 14, marginBottom: 10,
  },
  mealCardSelected: { borderColor: '#005f99' },
  mealCardError: { borderColor: '#c0392b', backgroundColor: '#fdecea' },
  mealCardHeader: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#aaa',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  checkboxChecked: { backgroundColor: '#005f99', borderColor: '#005f99' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  mealCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  cutoffTag: {
    fontSize: 11, color: '#005f99', backgroundColor: '#e8f4fd',
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, fontWeight: '600',
  },
  cutoffTagPassed: { color: '#c0392b', backgroundColor: '#fdecea' },
  mealErrorText: { color: '#c0392b', fontSize: 12, fontWeight: '600', marginTop: 8, marginLeft: 32 },
  mealCardBody: { marginTop: 12, paddingLeft: 32 },
  mealCostHint: { fontSize: 12, color: '#005f99', marginTop: 10, fontWeight: '600' },
  specialBox: {
    backgroundColor: '#fff8e1', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#f39c12',
  },
  specialTitle: { fontSize: 13, fontWeight: 'bold', color: '#e67e22', marginBottom: 6 },
  specialImage: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10 },
  specialName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  specialDesc: { fontSize: 13, color: '#555', marginBottom: 10 },
  submitBtn: {
    backgroundColor: '#005f99', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 20,
  },
  submitBtnDisabled: { backgroundColor: '#aaa' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36, maxHeight: '85%',
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
    padding: 16, marginTop: 8, alignItems: 'center',
  },
  costLabel: { fontSize: 12, color: '#cce5ff', marginBottom: 4 },
  costValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
});
