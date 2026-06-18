// screens/PublishSpecialScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import api from '../services/api';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];
const MEAL_CATEGORIES = ['Veg', 'Paneer', 'Non-Veg'];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function PublishSpecialScreen({ navigation }) {
  const today = new Date();

  const [date, setDate] = useState(formatDate(today));
  const [mealType, setMealType] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!date) return 'Please enter a date.';
    if (!mealType) return 'Please select a meal type.';
    if (!name.trim()) return 'Please enter the meal name.';
    if (!category) return 'Please select a meal category.';
    return null;
  };

  const handlePublish = async () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }

    const payload = {
      date,
      mealType,
      name: name.trim(),
      description: description.trim(),
      category,
      photoUrl: photoUrl.trim() || null,
      isSpecialMeal: true,
    };

    try {
      setLoading(true);
      await api.post('/api/menu/special', payload);
      Alert.alert('Published! 🎉', 'Special meal has been published successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to publish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Publish Special Meal</Text>

      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>Meal Type</Text>
      <View style={styles.buttonRow}>
        {MEAL_TYPES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.optionBtn, mealType === m && styles.optionBtnSelected]}
            onPress={() => setMealType(m)}
          >
            <Text style={[styles.optionText, mealType === m && styles.optionTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Meal Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Paneer Butter Masala"
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description of the meal..."
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Meal Category</Text>
      <View style={styles.buttonRow}>
        {MEAL_CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.optionBtn, category === c && styles.optionBtnSelected]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.optionText, category === c && styles.optionTextSelected]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Photo URL (optional)</Text>
      <TextInput
        style={styles.input}
        value={photoUrl}
        onChangeText={setPhotoUrl}
        placeholder="https://example.com/image.jpg"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handlePublish}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Publish Special Meal</Text>
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
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
  },
  optionBtnSelected: { backgroundColor: '#005f99', borderColor: '#005f99' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#005f99', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 30,
  },
  submitBtnDisabled: { backgroundColor: '#aaa' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});