// screens/AdminMenuScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native';
import api from '../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

export default function AdminMenuScreen({ navigation }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [changes, setChanges] = useState([]);
  const [preview, setPreview] = useState(null);
  const [confirmationToken, setConfirmationToken] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addDay, setAddDay] = useState(DAYS[0]);
  const [addMealType, setAddMealType] = useState(MEAL_TYPES[0]);
  const [addItemName, setAddItemName] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addDisplayOrder, setAddDisplayOrder] = useState('');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await api.get('/Menu');
      setMenu(response.data ?? []);
      setError(null);
    } catch (err) {
      console.log('MENU LOAD ERROR:', err.response?.status);
      setError('Failed to load menu.');
    } finally {
      setLoading(false);
    }
  };

  const addChange = (change) => {
    setChanges((prev) => {
      if (change.menuItemID) {
        const exists = prev.find(
          (c) => c.menuItemID === change.menuItemID && c.action === change.action
        );
        if (exists) return prev.map((c) =>
          c.menuItemID === change.menuItemID && c.action === change.action ? change : c
        );
      }
      return [...prev, change];
    });
  };

  const removeChange = (index) => {
    setChanges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (!addItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }

    // Description is optional — send empty string if not provided
    addChange({
      action: 'Add',
      newItem: {
        dayOfWeek: addDay,
        mealType: addMealType,
        itemName: addItemName.trim(),
        description: addDescription.trim() || '',
        photoUrl: null,
        displayOrder: parseInt(addDisplayOrder) || 99,
      },
    });

    const addedName = addItemName.trim();
    setAddItemName('');
    setAddDescription('');
    setAddDisplayOrder('');
    setShowAddForm(false);
    Alert.alert('Added ✅', `"${addedName}" added to pending changes. Tap Preview to confirm.`);
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Delete "${item.itemName}" from the menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            addChange({ action: 'Delete', menuItemID: item.menuItemID });
            Alert.alert('Marked 🗑', `"${item.itemName}" marked for deletion. Tap Preview to confirm.`);
          }
        },
      ]
    );
  };

  const handlePreview = async () => {
    if (changes.length === 0) {
      Alert.alert('No Changes', 'Please add or delete items first.');
      return;
    }
    try {
      setPreviewing(true);
      console.log('PREVIEW PAYLOAD:', JSON.stringify({ changes }));
      const response = await api.post('/menu/admin/preview', { changes });
      setPreview(response.data.preview ?? []);
      setConfirmationToken(response.data.confirmationToken);
    } catch (err) {
      console.log('PREVIEW ERROR:', err.response?.status, JSON.stringify(err.response?.data));
      Alert.alert('Error', err.response?.data?.message ?? 'Preview failed. Please try again.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await api.post('/menu/admin/confirm', {
        confirmationToken,
        changes,
      });
      Alert.alert('Success! ✅', 'Menu changes applied successfully.', [
        {
          text: 'OK', onPress: () => {
            setChanges([]);
            setPreview(null);
            setConfirmationToken(null);
            fetchMenu();
          }
        }
      ]);
    } catch (err) {
      console.log('CONFIRM ERROR:', err.response?.status, JSON.stringify(err.response?.data));
      Alert.alert('Error', err.response?.data?.message ?? 'Could not apply changes.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={fetchMenu}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Manage Weekly Menu</Text>

      {/* Pending Changes */}
      {changes.length > 0 && (
        <View style={styles.changesBox}>
          <Text style={styles.changesTitle}>📝 Pending Changes ({changes.length})</Text>
          {changes.map((c, index) => (
            <View key={index} style={styles.changeRow}>
              <Text style={styles.changeText}>
                {c.action === 'Add'
                  ? `➕ Add "${c.newItem?.itemName}" to ${c.newItem?.dayOfWeek} ${c.newItem?.mealType}`
                  : `🗑 Delete item #${c.menuItemID}`}
              </Text>
              <TouchableOpacity onPress={() => removeChange(index)}>
                <Text style={styles.removeChange}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.previewBtn, previewing && styles.btnDisabled]}
            onPress={handlePreview}
            disabled={previewing}
          >
            {previewing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.previewBtnText}>Preview Changes</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Preview Result */}
      {preview && (
        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>👁 Preview</Text>
          {preview.map((p, index) => (
            <View key={index} style={styles.previewRow}>
              <Text style={styles.previewAction}>{p.action}</Text>
              <Text style={styles.previewDetail}>
                {p.dayOfWeek} · {p.mealType}
              </Text>
              {p.oldValue ? <Text style={styles.previewOld}>Was: {p.oldValue}</Text> : null}
              {p.newValue ? <Text style={styles.previewNew}>Now: {p.newValue}</Text> : null}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.confirmBtn, confirming && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            {confirming
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>Apply Changes</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.discardBtn}
            onPress={() => { setPreview(null); setConfirmationToken(null); }}
          >
            <Text style={styles.discardBtnText}>Discard Preview</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Item Button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setShowAddForm(!showAddForm)}
      >
        <Text style={styles.addBtnText}>
          {showAddForm ? '✕ Cancel' : '➕ Add New Item'}
        </Text>
      </TouchableOpacity>

      {/* Add Item Form */}
      {showAddForm && (
        <View style={styles.card}>
          <Text style={styles.formTitle}>New Menu Item</Text>

          <Text style={styles.fieldLabel}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.buttonRow}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.optionBtn, addDay === d && styles.optionBtnSelected]}
                  onPress={() => setAddDay(d)}
                >
                  <Text style={[styles.optionText, addDay === d && styles.optionTextSelected]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>Meal Type</Text>
          <View style={styles.buttonRow}>
            {MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.optionBtn, addMealType === m && styles.optionBtnSelected]}
                onPress={() => setAddMealType(m)}
              >
                <Text style={[styles.optionText, addMealType === m && styles.optionTextSelected]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Item Name</Text>
          <TextInput
            style={styles.input}
            value={addItemName}
            onChangeText={setAddItemName}
            placeholder="e.g. Idli"
          />

          <Text style={styles.fieldLabel}>Description
            <Text style={styles.optionalTag}> (optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={addDescription}
            onChangeText={setAddDescription}
            placeholder="Brief description (optional)"
          />

          <Text style={styles.fieldLabel}>Display Order
            <Text style={styles.optionalTag}> (optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={addDisplayOrder}
            onChangeText={setAddDisplayOrder}
            keyboardType="numeric"
            placeholder="e.g. 5 (leave blank for default)"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleAddItem}>
            <Text style={styles.submitText}>Add to Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Menu */}
      <Text style={styles.sectionTitle}>Current Menu</Text>
      {menu.map((dayObj) => (
        <View key={dayObj.day} style={styles.dayBlock}>
          <Text style={styles.dayTitle}>{dayObj.day}</Text>
          {dayObj.meals?.map((mealObj) => (
            <View key={mealObj.mealType} style={styles.mealTypeBlock}>
              <Text style={styles.mealTypeTitle}>{mealObj.mealType}</Text>
              {mealObj.items?.map((item) => (
                <View key={item.menuItemID} style={styles.menuItemRow}>
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.itemName}</Text>
                    {item.description ? (
                      <Text style={styles.menuItemDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteItemBtn}
                    onPress={() => handleDeleteItem(item)}
                  >
                    <Text style={styles.deleteItemText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#c0392b', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  changesBox: {
    backgroundColor: '#e8f4fd', borderRadius: 12,
    padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#005f99',
  },
  changesTitle: { fontSize: 15, fontWeight: 'bold', color: '#005f99', marginBottom: 10 },
  changeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  changeText: { fontSize: 13, color: '#333', flex: 1 },
  removeChange: { fontSize: 16, color: '#c0392b', paddingLeft: 10 },
  previewBtn: {
    backgroundColor: '#005f99', padding: 12,
    borderRadius: 8, alignItems: 'center', marginTop: 10,
  },
  previewBtnText: { color: '#fff', fontWeight: 'bold' },
  previewBox: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 16, elevation: 2,
  },
  previewTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10 },
  previewRow: {
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  previewAction: { fontSize: 12, fontWeight: 'bold', color: '#e67e22', textTransform: 'uppercase' },
  previewDetail: { fontSize: 13, color: '#555', marginTop: 2 },
  previewOld: { fontSize: 13, color: '#c0392b', marginTop: 2 },
  previewNew: { fontSize: 13, color: '#27ae60', marginTop: 2 },
  confirmBtn: {
    backgroundColor: '#27ae60', padding: 12,
    borderRadius: 8, alignItems: 'center', marginTop: 14,
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  discardBtn: {
    padding: 12, borderRadius: 8,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#ccc',
  },
  discardBtnText: { color: '#888', fontWeight: '600' },
  addBtn: {
    backgroundColor: '#27ae60', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 16, elevation: 2,
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  optionalTag: { fontSize: 12, color: '#aaa', fontWeight: '400' },
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
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  submitBtn: {
    backgroundColor: '#005f99', padding: 14,
    borderRadius: 10, alignItems: 'center', marginTop: 16,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  dayBlock: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 16, elevation: 2,
  },
  dayTitle: {
    fontSize: 17, fontWeight: 'bold', color: '#005f99',
    marginBottom: 12, borderBottomWidth: 1,
    borderBottomColor: '#eee', paddingBottom: 8,
  },
  mealTypeBlock: { marginBottom: 12 },
  mealTypeTitle: {
    fontSize: 13, fontWeight: '600', color: '#888',
    textTransform: 'uppercase', marginBottom: 8,
  },
  menuItemRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  menuItemInfo: { flex: 1 },
  menuItemName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  menuItemDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteItemBtn: { padding: 6 },
  deleteItemText: { fontSize: 18 },
  btn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { backgroundColor: '#aaa' },
});