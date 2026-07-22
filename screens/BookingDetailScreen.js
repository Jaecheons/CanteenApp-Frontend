// screens/BookingDetailScreen.js - To view and edit details of a booking group or a single booking.
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
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

const STATUS_COLORS = {
  confirmed: '#27ae60',
  cancelled: '#c0392b',
};

// Build editable per-meal state from a booking row
function mealStateFromBooking(m) {
  return {
    bookingID: m.bookingID,
    mealType: m.mealType,
    originalStatus: m.status?.toLowerCase() ?? 'confirmed',
    canModify: m.canModify,
    isCollected: m.isCollected,
    collectedAt: m.collectedAt,
    totalCost: m.totalCost,
    isSpecialMeal: m.isSpecialMeal,
    // keep — whether this meal stays in the updated array (unchecking = cancel)
    keep: (m.status?.toLowerCase() ?? 'confirmed') === 'confirmed',
    mealCategory: m.vegCount > 0 ? 'Veg' : m.paneerCount > 0 ? 'Paneer' : m.nonVegCount > 0 ? 'Non-Veg' : null,
    vegCount: String(m.vegCount ?? 0),
    paneerCount: String(m.paneerCount ?? 0),
    nonVegCount: String(m.nonVegCount ?? 0),
    addOns: m.addOns ?? [],
    addOnQuantities: (m.addOns ?? []).reduce((acc, a) => {
      acc[a.addOnID] = String(a.quantity);
      return acc;
    }, {}),
    error: null,
  };
}

export default function BookingDetailScreen({ route, navigation }) {
  const { group } = route.params;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outlet, setOutlet] = useState(group.canteenLocation);
  const [guestCount, setGuestCount] = useState(String(group.guestCount ?? ''));
  const [meals, setMeals] = useState(() => group.meals.map(mealStateFromBooking));
  const [loggedInName, setLoggedInName] = useState('');
  const [availableAddOns, setAvailableAddOns] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('name').then((n) => {
      if (n) setLoggedInName(n);
    });
  }, []);

  useEffect(() => {
    api.get('/AddOns')
      .then((res) => setAvailableAddOns(res.data ?? []))
      .catch(() => setAvailableAddOns([]));
  }, []);

  const hasGroupID = !!group.bookingGroupID;
  const anyConfirmed = meals.some((m) => m.originalStatus === 'confirmed');
  const overallStatus = anyConfirmed ? 'confirmed' : 'cancelled';
  const statusColor = STATUS_COLORS[overallStatus] ?? '#888';
  const totalCost = meals.reduce((sum, m) => sum + (m.totalCost ?? 0), 0);
  const anyEditable = meals.some((m) => m.canModify);

  const updateMeal = (bookingID, patch) => {
    setMeals((prev) => prev.map((m) => (m.bookingID === bookingID ? { ...m, ...patch } : m)));
  };

  const toggleKeep = (bookingID) => {
    updateMeal(bookingID, { keep: !meals.find((m) => m.bookingID === bookingID).keep, error: null });
  };

  const updateAddOnQuantity = (bookingID, addOnID, qty) => {
    setMeals((prev) => prev.map((m) =>
      m.bookingID === bookingID
        ? { ...m, addOnQuantities: { ...m.addOnQuantities, [addOnID]: qty } }
        : m
    ));
  };

  // Editable add-on options for a meal = currently-available add-ons, plus any
  // add-on already on this booking even if it's since been disabled.
  const addOnOptionsFor = (m) => {
    const options = [...availableAddOns];
    m.addOns.forEach((a) => {
      if (!options.some((o) => o.addOnID === a.addOnID)) {
        options.push({ addOnID: a.addOnID, name: a.name, costPerUnit: a.costPerUnit, isAvailable: false });
      }
    });
    return options;
  };

  const buildMealsPayload = () =>
    meals
      .filter((m) => m.keep)
      .map((m) => {
        const showCategorySection = CATEGORY_MEAL_TYPES.includes(m.mealType);
        let vegCount = 0, paneerCount = 0, nonVegCount = 0;

        if (m.isSpecialMeal) {
          // leave zeros
        } else if (group.bookingFor === 'Self') {
          if (!showCategorySection) {
            vegCount = 1;
          } else {
            vegCount = m.mealCategory === 'Veg' ? 1 : 0;
            paneerCount = m.mealCategory === 'Paneer' ? 1 : 0;
            nonVegCount = m.mealCategory === 'Non-Veg' ? 1 : 0;
          }
        } else {
          // Guests
          if (showCategorySection) {
            vegCount = parseInt(m.vegCount) || 0;
            paneerCount = parseInt(m.paneerCount) || 0;
            nonVegCount = parseInt(m.nonVegCount) || 0;
          }
        }

        const mealAddOns = Object.entries(m.addOnQuantities)
          .map(([addOnID, qty]) => ({ addOnID: parseInt(addOnID), quantity: parseInt(qty) || 0 }))
          .filter((a) => a.quantity > 0);

        return {
          mealType: m.mealType,
          vegCount,
          paneerCount,
          nonVegCount,
          isSpecialMeal: m.isSpecialMeal,
          addOns: mealAddOns,
        };
      });

  const parseErrorsToMealMap = (errors) => {
    const map = {};
    errors.forEach((e) => {
      const match = MEAL_TYPES.find((mt) => e.startsWith(`${mt}:`));
      if (match) map[match] = e.slice(match.length + 1).trim();
    });
    return map;
  };

  const handleSaveGroup = async () => {
    // Validate category selections for kept, non-special, category meals
    for (const m of meals) {
      if (!m.keep || m.isSpecialMeal) continue;
      const showCategorySection = CATEGORY_MEAL_TYPES.includes(m.mealType);
      if (!showCategorySection) continue;

      if (group.bookingFor === 'Self' && !m.mealCategory) {
        Alert.alert('Validation Error', `Please select a meal category for ${m.mealType}.`);
        return;
      }
      if (group.bookingFor === 'Guests') {
        const total = parseInt(guestCount) || 0;
        const v = parseInt(m.vegCount) || 0;
        const p = parseInt(m.paneerCount) || 0;
        const n = parseInt(m.nonVegCount) || 0;
        if (v + p + n !== total) {
          Alert.alert('Validation Error', `${m.mealType}: Veg + Paneer + Non-Veg must equal total guest count.`);
          return;
        }
      }
    }

    const payload = { meals: buildMealsPayload() };

    try {
      setSaving(true);
      await api.put(`/Bookings/group/${group.bookingGroupID}`, payload);
      setMeals((prev) => prev.map((m) => ({ ...m, error: null })));
      Alert.alert('Updated!', 'Your booking has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        const map = parseErrorsToMealMap(data.errors);
        setMeals((prev) => prev.map((m) => ({ ...m, error: map[m.mealType] ?? null })));
        Alert.alert(
          data.message ?? 'Update failed.',
          `${data.errors.join('\n')}\n\nLocked meals are highlighted below.`
        );
      } else {
        Alert.alert('Error', data?.message ?? 'Could not update booking.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Fallback for legacy bookings that predate bookingGroupID
  const handleSaveLegacy = async () => {
    const single = meals[0];
    const showCategorySection = CATEGORY_MEAL_TYPES.includes(single.mealType);
    const payload = { canteenLocation: outlet };

    if (group.bookingFor === 'Self' && !single.isSpecialMeal) {
      payload.vegCount = showCategorySection ? (single.mealCategory === 'Veg' ? 1 : 0) : 1;
      payload.paneerCount = showCategorySection ? (single.mealCategory === 'Paneer' ? 1 : 0) : 0;
      payload.nonVegCount = showCategorySection ? (single.mealCategory === 'Non-Veg' ? 1 : 0) : 0;
    }
    if (group.bookingFor === 'Guests') {
      const total = parseInt(guestCount) || 0;
      payload.guestCount = total;
      payload.vegCount = showCategorySection ? parseInt(single.vegCount) || 0 : 0;
      payload.paneerCount = showCategorySection ? parseInt(single.paneerCount) || 0 : 0;
      payload.nonVegCount = showCategorySection ? parseInt(single.nonVegCount) || 0 : 0;
    }

    try {
      setSaving(true);
      await api.put(`/Bookings/${single.bookingID}`, payload);
      Alert.alert('Updated!', 'Your booking has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not update booking.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => (hasGroupID ? handleSaveGroup() : handleSaveLegacy());

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
        <Text style={styles.heading}>
          {hasGroupID ? `Booking Group #${String(group.bookingGroupID).slice(0, 8)}` : `Booking #${meals[0].bookingID}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{overallStatus === 'confirmed' ? 'Confirmed' : 'Cancelled'}</Text>
        </View>
      </View>

      {/* User Details */}
      <Text style={styles.sectionLabel}>Booked By</Text>
      <View style={styles.card}>
        <Row label="User ID" value={String(group.userID ?? '—')} />
        <Row label="Name" value={loggedInName || '—'} />
      </View>

      {/* Booking Details */}
      <Text style={styles.sectionLabel}>Booking Details</Text>
      <View style={styles.card}>
        <Row label="From Date" value={group.fromDate?.split('T')[0]} />
        <Row label="To Date" value={group.toDate?.split('T')[0]} />
        <Row label="Outlet" value={group.canteenLocation} />
        <Row label="Booked For" value={group.bookingFor} />
        {group.bookingFor === 'Guests' && (
          <Row label="Total Guests" value={String(group.guestCount)} />
        )}
        <Row label="Total Cost" value={`₹${totalCost}`} />
      </View>

      {/* Meals in this booking */}
      <Text style={styles.sectionLabel}>Meals</Text>
      <View style={styles.card}>
        {meals.map((m, idx) => (
          <View key={m.bookingID} style={[styles.mealRow, idx === meals.length - 1 && styles.mealRowLast]}>
            <View style={styles.mealRowTop}>
              <Text style={styles.mealRowTitle}>
                {m.isSpecialMeal ? `🌟 ${m.mealType} (Special)` : m.mealType}
              </Text>
              <Text style={[styles.mealStatusTag, { color: m.originalStatus === 'cancelled' ? '#c0392b' : '#27ae60' }]}>
                {m.originalStatus === 'cancelled' ? 'Cancelled' : 'Confirmed'}
              </Text>
            </View>
            <Text style={styles.mealSubText}>
              {m.totalCost != null ? `₹${m.totalCost}` : '—'} ·{' '}
              {m.isCollected ? `Collected${m.collectedAt ? ' · ' + m.collectedAt.split('T')[0] : ''}` : 'Not yet collected'}
            </Text>
            {m.addOns.length > 0 && (
              <View style={styles.addOnDisplayList}>
                {m.addOns.map((a) => (
                  <Text key={a.addOnID} style={styles.addOnDisplayLine}>
                    {a.name} × {a.quantity} — ₹{a.totalCost}
                  </Text>
                ))}
              </View>
            )}
            {!m.canModify && m.originalStatus === 'confirmed' && (
              <Text style={styles.lockedText}>🔒 Cutoff passed — locked</Text>
            )}
          </View>
        ))}
      </View>

      {/* Editable section */}
      {anyEditable && (
        <>
          <View style={styles.editHeader}>
            <Text style={styles.sectionTitle}>Edit Booking</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editToggle}>{editing ? 'Cancel Edit' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {editing && (
            <View style={styles.card}>
              {hasGroupID && (
                <Text style={styles.hint}>
                  Uncheck a meal to cancel it. Locked meals (cutoff passed) can't be changed.
                </Text>
              )}

              {/* Outlet — legacy single-booking edit only */}
              {!hasGroupID && (
                <>
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
                </>
              )}

              {group.bookingFor === 'Guests' && (
                <>
                  <Text style={styles.fieldLabel}>Total Persons</Text>
                  <TextInput
                    style={styles.input}
                    value={guestCount}
                    onChangeText={setGuestCount}
                    keyboardType="numeric"
                  />
                </>
              )}

              {meals.map((m) => {
                const showCategorySection = CATEGORY_MEAL_TYPES.includes(m.mealType);
                const locked = !m.canModify;

                return (
                  <View key={m.bookingID} style={[styles.editMealCard, locked && styles.editMealCardLocked, m.error && styles.editMealCardError]}>
                    <View style={styles.editMealHeader}>
                      {hasGroupID ? (
                        <TouchableOpacity
                          style={styles.mealCheckboxRow}
                          onPress={() => !locked && toggleKeep(m.bookingID)}
                          disabled={locked}
                        >
                          <View style={[styles.checkbox, m.keep && styles.checkboxChecked, locked && styles.checkboxDisabled]}>
                            {m.keep && <Text style={styles.checkboxTick}>✓</Text>}
                          </View>
                          <Text style={styles.editMealTitle}>{m.mealType}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.editMealTitle}>{m.mealType}</Text>
                      )}
                      {locked && <Text style={styles.lockedTag}>Locked</Text>}
                    </View>

                    {m.error && <Text style={styles.mealErrorText}>⚠ {m.error}</Text>}

                    {m.keep && !locked && !m.isSpecialMeal && (
                      <>
                        {group.bookingFor === 'Self' && showCategorySection && (
                          <>
                            <Text style={styles.fieldLabel}>Meal Category</Text>
                            <View style={styles.buttonRow}>
                              {MEAL_CATEGORIES.map((c) => (
                                <TouchableOpacity
                                  key={c}
                                  style={[styles.optionBtn, m.mealCategory === c && styles.optionBtnSelected]}
                                  onPress={() => updateMeal(m.bookingID, { mealCategory: c })}
                                >
                                  <Text style={[styles.optionText, m.mealCategory === c && styles.optionTextSelected]}>{c}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </>
                        )}

                        {group.bookingFor === 'Guests' && showCategorySection && (
                          <>
                            <Text style={styles.fieldLabel}>Veg Count</Text>
                            <TextInput style={styles.input} value={m.vegCount} onChangeText={(v) => updateMeal(m.bookingID, { vegCount: v })} keyboardType="numeric" />
                            <Text style={styles.fieldLabel}>Paneer Count</Text>
                            <TextInput style={styles.input} value={m.paneerCount} onChangeText={(v) => updateMeal(m.bookingID, { paneerCount: v })} keyboardType="numeric" />
                            <Text style={styles.fieldLabel}>Non-Veg Count</Text>
                            <TextInput style={styles.input} value={m.nonVegCount} onChangeText={(v) => updateMeal(m.bookingID, { nonVegCount: v })} keyboardType="numeric" />
                          </>
                        )}

                        {addOnOptionsFor(m).length > 0 && (
                          <>
                            <Text style={styles.fieldLabel}>Add-Ons</Text>
                            {addOnOptionsFor(m).map((addOn) => {
                              const qty = m.addOnQuantities[addOn.addOnID] ?? '';
                              const qtyNum = parseInt(qty) || 0;
                              return (
                                <View key={addOn.addOnID} style={styles.addOnRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.addOnName}>
                                      {addOn.name}{!addOn.isAvailable ? ' (no longer offered)' : ''}
                                    </Text>
                                    <Text style={styles.addOnPrice}>₹{addOn.costPerUnit} each</Text>
                                  </View>
                                  <View style={styles.stepperRow}>
                                    <TouchableOpacity
                                      style={styles.stepperBtn}
                                      onPress={() => updateAddOnQuantity(m.bookingID, addOn.addOnID, String(Math.max(0, qtyNum - 1)))}
                                    >
                                      <Text style={styles.stepperBtnText}>−</Text>
                                    </TouchableOpacity>
                                    <TextInput
                                      style={styles.stepperInput}
                                      value={qty}
                                      onChangeText={(v) => updateAddOnQuantity(m.bookingID, addOn.addOnID, v)}
                                      keyboardType="numeric"
                                      placeholder="0"
                                    />
                                    <TouchableOpacity
                                      style={styles.stepperBtn}
                                      onPress={() => updateAddOnQuantity(m.bookingID, addOn.addOnID, String(qtyNum + 1))}
                                    >
                                      <Text style={styles.stepperBtnText}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </View>
                );
              })}

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
        </>
      )}

      {!anyEditable && (
        <Text style={styles.cannotModify}>
          {overallStatus === 'cancelled'
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
  heading: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', flex: 1, marginRight: 8 },
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
  mealRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  mealRowLast: { borderBottomWidth: 0 },
  mealRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealRowTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  mealStatusTag: { fontSize: 12, fontWeight: '600' },
  mealSubText: { fontSize: 12, color: '#888', marginTop: 4 },
  lockedText: { fontSize: 12, color: '#c0392b', marginTop: 4, fontWeight: '600' },
  addOnDisplayList: { marginTop: 4 },
  addOnDisplayLine: { fontSize: 12, color: '#555', marginTop: 2 },
  addOnRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  addOnName: { fontSize: 13, color: '#1a1a1a', fontWeight: '600' },
  addOnPrice: { fontSize: 11, color: '#888', marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperBtn: {
    width: 28, height: 28, borderRadius: 6, backgroundColor: '#e8f4fd',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 16, color: '#005f99', fontWeight: 'bold' },
  stepperInput: {
    width: 40, textAlign: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingVertical: 4, fontSize: 14,
  },
  editHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  editToggle: { fontSize: 14, color: '#005f99', fontWeight: '600' },
  hint: { fontSize: 12, color: '#888', marginBottom: 12 },
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
  editMealCard: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 12, marginTop: 12,
  },
  editMealCardLocked: { backgroundColor: '#f5f5f5' },
  editMealCardError: { borderColor: '#c0392b', backgroundColor: '#fdecea' },
  editMealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealCheckboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#aaa',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  checkboxChecked: { backgroundColor: '#005f99', borderColor: '#005f99' },
  checkboxDisabled: { borderColor: '#ddd' },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  editMealTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  lockedTag: {
    fontSize: 11, color: '#c0392b', backgroundColor: '#fdecea',
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, fontWeight: '600',
  },
  mealErrorText: { color: '#c0392b', fontSize: 12, fontWeight: '600', marginTop: 8 },
  saveBtn: {
    backgroundColor: '#27ae60', padding: 14,
    borderRadius: 10, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  btnDisabled: { backgroundColor: '#aaa' },
  cannotModify: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 10 },
});
