// screens/PublishSpecialScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const MEAL_TYPES = ['Lunch', 'Dinner'];
const OUTLETS = ['Central Canteen', 'Administrative Building', 'Central Control Room', 'Central Workshop'];

export default function PublishSpecialScreen({ route, navigation }) {
  const existingSpecial = route.params?.special ?? null;
  const isEditing = existingSpecial !== null;

  const [date, setDate] = useState(
    existingSpecial?.date?.split('T')[0] ?? new Date().toISOString().split('T')[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mealType, setMealType] = useState(existingSpecial?.mealType ?? null);
  const [name, setName] = useState(existingSpecial?.specialName ?? '');
  const [description, setDescription] = useState(existingSpecial?.description ?? '');
  const [localImage, setLocalImage] = useState(null);
  const [selectedOutlets, setSelectedOutlets] = useState(
    existingSpecial?.applicableOutlets ?? []
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleOutlet = (outlet) => {
    setSelectedOutlets((prev) =>
      prev.includes(outlet)
        ? prev.filter((o) => o !== outlet)
        : [...prev, outlet]
    );
  };

  const handlePickImage = async () => {
    Alert.alert(
      'Upload Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleCamera },
        { text: 'Choose from Gallery', onPress: handleGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setLocalImage(base64Image);
    }
  };

  const handleGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setLocalImage(base64Image);
    }
  };

  const removeImage = () => setLocalImage(null);

  const validate = () => {
    if (!date) return 'Please select a date.';
    if (!mealType) return 'Please select a meal type.';
    if (!name.trim()) return 'Please enter the special meal name.';
    if (selectedOutlets.length === 0) return 'Please select at least one outlet.';
    return null;
  };

  const handlePublish = async () => {
    console.log('PUBLISH BUTTON PRESSED');
    console.log('FORM STATE:', { date, mealType, name, selectedOutlets, description });
    const error = validate();
    console.log('VALIDATION ERROR:', error);
    if (error) { Alert.alert('Validation Error', error); return; }

    console.log('SENDING TO:', isEditing ? `/Specials/${existingSpecial.specialID}` : '/Specials');

    const payload = {
      specialName: name.trim(),
      description: description.trim() || '',
      photoUrl: null,
      mealType,
      date,
      applicableOutlets: selectedOutlets,
    };

    console.log('PAYLOAD:', JSON.stringify(payload));

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/Specials/${existingSpecial.specialID}`, payload);
        if (localImage) {
          await AsyncStorage.setItem(`special_image_${existingSpecial.specialID}`, localImage);
        } else {
          await AsyncStorage.removeItem(`special_image_${existingSpecial.specialID}`);
        }
        Alert.alert('Updated! ✅', 'Special meal has been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const response = await api.post('/Specials', payload);
        console.log('PUBLISH RESPONSE:', JSON.stringify(response.data));
        const specialID = response.data?.specialID
          ?? response.data?.SpecialID
          ?? response.data?.id;
        console.log('SAVING IMAGE FOR SPECIAL ID:', specialID);
        if (localImage && specialID) {
          await AsyncStorage.setItem(`special_image_${specialID}`, localImage);
          console.log('IMAGE SAVED SUCCESSFULLY');
        }
        Alert.alert('Published! 🎉', 'Special meal has been published successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      console.log('PUBLISH ERROR STATUS:', err.response?.status);
      console.log('PUBLISH ERROR DATA:', JSON.stringify(err.response?.data));
      console.log('PUBLISH ERROR URL:', err.config?.baseURL + err.config?.url);
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to publish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Special',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/Specials/${existingSpecial.specialID}`);
      await AsyncStorage.removeItem(`special_image_${existingSpecial.specialID}`);
      Alert.alert('Deleted', 'Special meal has been deleted.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not delete special.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>
        {isEditing ? 'Edit Special Meal' : 'Publish Special Meal'}
      </Text>

      {/* Date */}
      <Text style={styles.label}>Date</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateBtnText}>📅 {date}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate.toISOString().split('T')[0]);
          }}
        />
      )}

      {/* Meal Type */}
      <Text style={styles.label}>Meal Type</Text>
      <Text style={styles.hint}>Special meals are only available for Lunch and Dinner</Text>
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

      {/* Special Name */}
      <Text style={styles.label}>Special Meal Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Mutton Biryani"
      />

      {/* Description */}
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description of the special meal..."
        multiline
        numberOfLines={3}
      />

      {/* Photo Upload */}
      <Text style={styles.label}>Photo (optional)</Text>
      {localImage ? (
        <View style={styles.imagePreviewBox}>
          <Image source={{ uri: localImage }} style={styles.imagePreview} resizeMode="cover" />
          <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
            <Text style={styles.removeImageText}>✕ Remove Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
          <Text style={styles.uploadBtnText}>📷 Take Photo or Choose from Gallery</Text>
        </TouchableOpacity>
      )}

      {/* Applicable Outlets */}
      <Text style={styles.label}>Applicable Outlets</Text>
      <Text style={styles.hint}>Select all outlets where this special is available</Text>
      <View style={styles.buttonRow}>
        {OUTLETS.map((o) => (
          <TouchableOpacity
            key={o}
            style={[styles.optionBtn, selectedOutlets.includes(o) && styles.optionBtnSelected]}
            onPress={() => toggleOutlet(o)}
          >
            <Text style={[styles.optionText, selectedOutlets.includes(o) && styles.optionTextSelected]}>
              {selectedOutlets.includes(o) ? '✓ ' : ''}{o}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Publish / Update Button */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.btnDisabled]}
        onPress={handlePublish}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>
              {isEditing ? 'Update Special' : 'Publish Special Meal'}
            </Text>
        }
      </TouchableOpacity>

      {/* Delete Button */}
      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && styles.btnDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.deleteText}>Delete Special</Text>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 11, color: '#888', marginBottom: 6 },
  dateBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 13, flexDirection: 'row', alignItems: 'center',
  },
  dateBtnText: { fontSize: 15, color: '#111' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  uploadBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#005f99',
    borderRadius: 8, borderStyle: 'dashed',
    padding: 20, alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnText: { fontSize: 14, color: '#005f99', fontWeight: '600' },
  imagePreviewBox: { alignItems: 'center' },
  imagePreview: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  removeImageBtn: {
    backgroundColor: '#c0392b', paddingVertical: 8,
    paddingHorizontal: 20, borderRadius: 8,
  },
  removeImageText: { color: '#fff', fontWeight: '600', fontSize: 13 },
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
  deleteBtn: {
    backgroundColor: '#c0392b', padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 10,
  },
  btnDisabled: { backgroundColor: '#aaa' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});