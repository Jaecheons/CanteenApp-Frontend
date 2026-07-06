// screens/MealPricingScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import api from '../services/api';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

export default function MealPricingScreen() {
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const response = await api.get('/MealPricing');
      const map = {};
      (response.data ?? []).forEach((p) => {
        map[p.mealType] = {
          baseCost: String(p.baseCost ?? 0),
          paneerSurcharge: String(p.paneerSurcharge ?? 0),
          nonVegSurcharge: String(p.nonVegSurcharge ?? 0),
        };
      });
      MEAL_TYPES.forEach((m) => {
        if (!map[m]) {
          map[m] = { baseCost: '0', paneerSurcharge: '0', nonVegSurcharge: '0' };
        }
      });
      setPricing(map);
      setError(null);
    } catch (err) {
      console.log('PRICING LOAD ERROR:', err.response?.status);
      setError('Failed to load meal pricing.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (mealType, field, value) => {
    if (!/^\d*$/.test(value)) return;
    setPricing((prev) => ({
      ...prev,
      [mealType]: { ...prev[mealType], [field]: value },
    }));
  };

  const validate = () => {
    for (const meal of MEAL_TYPES) {
      const p = pricing[meal];
      if (!p || p.baseCost.trim() === '') {
        return `Please enter a base cost for ${meal}.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }

    const payload = MEAL_TYPES.map((meal) => ({
      mealType: meal,
      baseCost: parseInt(pricing[meal].baseCost) || 0,
      paneerSurcharge: parseInt(pricing[meal].paneerSurcharge) || 0,
      nonVegSurcharge: parseInt(pricing[meal].nonVegSurcharge) || 0,
    }));

    try {
      setSaving(true);
      console.log('PRICING PAYLOAD:', JSON.stringify(payload));
      await api.put('/MealPricing', payload);
      Alert.alert('Saved!', 'Meal pricing has been updated.');
    } catch (err) {
      console.log('PRICING SAVE ERROR:', err.response?.status, JSON.stringify(err.response?.data));
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to save pricing.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
        <Text style={styles.loadingText}>Loading pricing...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={fetchPricing}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Manage Meal Pricing</Text>
      <Text style={styles.subheading}>
        Set a base cost per meal type. Add extra surcharges for Paneer or Non-Veg options where applicable.
      </Text>

      {MEAL_TYPES.map((meal) => (
        <View key={meal} style={styles.mealBlock}>
          <Text style={styles.mealTitle}>{meal}</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Base Cost</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                value={pricing[meal]?.baseCost}
                onChangeText={(v) => updateField(meal, 'baseCost', v)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Paneer Surcharge</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                value={pricing[meal]?.paneerSurcharge}
                onChangeText={(v) => updateField(meal, 'paneerSurcharge', v)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Non-Veg Surcharge</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                value={pricing[meal]?.nonVegSurcharge}
                onChangeText={(v) => updateField(meal, 'nonVegSurcharge', v)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Pricing</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#c0392b', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subheading: { fontSize: 13, color: '#888', marginBottom: 24 },
  mealBlock: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 14, elevation: 2,
  },
  mealTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  fieldLabel: { fontSize: 14, color: '#555' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 10,
  },
  currencySymbol: { fontSize: 15, color: '#555', marginRight: 4 },
  input: {
    width: 70, paddingVertical: 10, fontSize: 15, color: '#111',
  },
  saveBtn: {
    backgroundColor: '#005f99', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { backgroundColor: '#aaa' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});