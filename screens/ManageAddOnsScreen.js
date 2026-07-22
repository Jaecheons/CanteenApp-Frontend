// screens/ManageAddOnsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function ManageAddOnsScreen() {
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingAddOn, setEditingAddOn] = useState(null); // the addOn being edited
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingID, setTogglingID] = useState(null);

  // Admin view needs ALL add-ons, but GET /AddOns only returns available ones per the API contract. We fetch what's available and merge in any
  // previously-known disabled ones we already have in state so they don't disappear from view after being disabled here.
  const fetchAddOns = async () => {
    try {
      const res = await api.get('/AddOns');
      const fetched = res.data ?? [];
      setAddOns((prev) => {
        const disabledStillKnown = prev.filter(
          (p) => !p.isAvailable && !fetched.some((f) => f.addOnID === p.addOnID)
        );
        return [...fetched, ...disabledStillKnown].sort((a, b) => a.addOnID - b.addOnID);
      });
      setError(null);
    } catch (err) {
      setError('Failed to load add-ons.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAddOns();
    }, [])
  );

  const openCreateModal = () => {
    setNewName('');
    setNewCost('');
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('Validation Error', 'Please enter a name.'); return; }
    const cost = parseFloat(newCost);
    if (isNaN(cost) || cost < 0) { Alert.alert('Validation Error', 'Please enter a valid cost.'); return; }

    try {
      setCreating(true);
      await api.post('/AddOns', { name: newName.trim(), costPerUnit: cost });
      setShowCreateModal(false);
      fetchAddOns();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not create add-on.');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (addOn) => {
    setEditingAddOn(addOn);
    setEditName(addOn.name);
    setEditCost(String(addOn.costPerUnit));
    setEditAvailable(addOn.isAvailable);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) { Alert.alert('Validation Error', 'Please enter a name.'); return; }
    const cost = parseFloat(editCost);
    if (isNaN(cost) || cost < 0) { Alert.alert('Validation Error', 'Please enter a valid cost.'); return; }

    try {
      setSaving(true);
      await api.put(`/AddOns/${editingAddOn.addOnID}`, {
        name: editName.trim(),
        costPerUnit: cost,
        isAvailable: editAvailable,
      });
      setEditingAddOn(null);
      fetchAddOns();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not update add-on.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (addOn) => {
    try {
      setTogglingID(addOn.addOnID);
      await api.put(`/AddOns/${addOn.addOnID}`, { isAvailable: !addOn.isAvailable });
      fetchAddOns();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not update add-on.');
    } finally {
      setTogglingID(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={[styles.card, !item.isAvailable && styles.cardDisabled]}>
      <View style={styles.cardTop}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.isAvailable ? '#27ae60' : '#888' }]}>
          <Text style={styles.statusText}>{item.isAvailable ? 'Available' : 'Disabled'}</Text>
        </View>
      </View>
      <Text style={styles.cost}>₹{item.costPerUnit} / unit</Text>
      {!item.isAvailable && (
        <Text style={styles.disabledHint}>Won't appear on the booking screen for users.</Text>
      )}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, item.isAvailable ? styles.toggleBtnDisable : styles.toggleBtnEnable]}
          onPress={() => handleQuickToggle(item)}
          disabled={togglingID === item.addOnID}
        >
          {togglingID === item.addOnID
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.toggleBtnText}>{item.isAvailable ? 'Disable' : 'Enable'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Manage Add-Ons</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={addOns}
        keyExtractor={(item) => String(item.addOnID)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No add-ons yet.</Text>}
      />

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>New Add-On</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="e.g. Extra Roti" />
            <Text style={styles.fieldLabel}>Cost per Unit (₹)</Text>
            <TextInput style={styles.input} value={newCost} onChangeText={setNewCost} keyboardType="numeric" placeholder="5" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateModal(false)} disabled={creating}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editingAddOn} animationType="slide" transparent onRequestClose={() => setEditingAddOn(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Edit Add-On</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
            <Text style={styles.fieldLabel}>Cost per Unit (₹)</Text>
            <TextInput style={styles.input} value={editCost} onChangeText={setEditCost} keyboardType="numeric" />
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Available to users</Text>
              <Switch value={editAvailable} onValueChange={setEditAvailable} />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingAddOn(null)} disabled={saving}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveEdit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 10,
  },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  addBtn: { backgroundColor: '#005f99', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 10 },
  listContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 30 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 2,
  },
  cardDisabled: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cost: { fontSize: 14, color: '#555', marginTop: 6 },
  disabledHint: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#005f99', alignItems: 'center',
  },
  editBtnText: { color: '#005f99', fontWeight: '600', fontSize: 13 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnDisable: { backgroundColor: '#c0392b' },
  toggleBtnEnable: { backgroundColor: '#27ae60' },
  toggleBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalHeading: { fontSize: 19, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 22 },
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
});
