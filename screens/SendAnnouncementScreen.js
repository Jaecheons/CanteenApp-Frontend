// screens/SendAnnouncementScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function SendAnnouncementScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/Announcements');
      setAnnouncements(response.data ?? []);
    } catch (err) {
      console.log('ANNOUNCEMENTS LOAD ERROR:', err.response?.status);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAnnouncements();
    }, [])
  );

  const validate = () => {
    if (!title.trim()) return 'Please enter a title.';
    return null;
  };

  const handleSend = async () => {
    await api.post('/Announcements', {
    title: title.trim(),
    message: message.trim(),
});

    try {
      setSending(true);
      await api.post('/Announcements', {
        title: title.trim(),
        message: message.trim(),
      });
      Alert.alert('Sent! ', 'Announcement has been sent to all employees.', [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setMessage('');
            fetchAnnouncements();
          }
        }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to send announcement.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Announcement',
      `Delete "${item.title}"? Employees will no longer see this.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => confirmDelete(item.announcementID),
        },
      ]
    );
  };

  const confirmDelete = async (id) => {
    try {
      setDeletingId(id);
      await api.delete(`/Announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.announcementID !== id));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not delete announcement.');
    } finally {
      setDeletingId(null);
    }
  };

  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Send Announcement</Text>
      <Text style={styles.subheading}>This will be sent to all employees as a notification.</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Canteen Closed Tomorrow"
      />

      <Text style={styles.label}>Message <Text style={styles.optionalTag}>(optional)</Text></Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={message}
        onChangeText={setMessage}
        placeholder="Write your announcement here..."
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.sendBtn, sending && styles.btnDisabled]}
        onPress={handleSend}
        disabled={sending}
      >
        {sending
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.sendBtnText}> Send to All Employees</Text>
        }
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Past Announcements</Text>

      {loading ? (
        <ActivityIndicator size="small" color="#005f99" style={{ marginTop: 20 }} />
      ) : announcements.length === 0 ? (
        <Text style={styles.emptyText}>No announcements sent yet.</Text>
      ) : (
        announcements.map((item) => (
          <View key={item.announcementID} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                disabled={deletingId === item.announcementID}
              >
                {deletingId === item.announcementID
                  ? <ActivityIndicator size="small" color="#c0392b" />
                  : <Text style={styles.deleteIcon}>🗑</Text>
                }
              </TouchableOpacity>
            </View>
            <Text style={styles.cardMessage}>{item.message}</Text>
            <Text style={styles.cardMeta}>
              {item.publishedBy ? `By ${item.publishedBy} · ` : ''}{timeAgo(item.createdAt)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  optionalTag: { fontSize: 12, color: '#aaa', fontWeight: '400' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subheading: { fontSize: 13, color: '#888', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  sendBtn: {
    backgroundColor: '#005f99', padding: 16,
    borderRadius: 10, alignItems: 'center', marginBottom: 30,
  },
  btnDisabled: { backgroundColor: '#aaa' },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 12, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#005f99',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', flex: 1, marginRight: 10 },
  deleteIcon: { fontSize: 16 },
  cardMessage: { fontSize: 13, color: '#555', marginBottom: 8 },
  cardMeta: { fontSize: 11, color: '#aaa' },
});