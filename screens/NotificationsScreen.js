// screens/NotificationsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/Notifications/my');
      setNotifications(response.data ?? []);
      setError(null);
    } catch (err) {
      console.log('NOTIFICATIONS ERROR:', err.response?.status);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationID) => {
    try {
      await api.put(`/Notifications/${notificationID}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationID === notificationID ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.log('MARK READ ERROR:', err.response?.status);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/Notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.log('MARK ALL READ ERROR:', err.response?.status);
    }
  };

  const handlePress = (item) => {
    if (!item.isRead) markAsRead(item.notificationID);
    if (item.relatedBookingID) {
      navigation.navigate('MyBookings');
    }
  };

  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.cardTop}>
        {!item.isRead && <View style={styles.unreadDot} />}
        <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
          {item.title}
        </Text>
      </View>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#005f99" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={fetchNotifications}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={notifications}
      keyExtractor={(item) => String(item.notificationID)}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#005f99']} />
      }
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No notifications yet.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#c0392b', fontSize: 15, marginBottom: 12 },
  btn: {
    backgroundColor: '#005f99', paddingVertical: 10,
    paddingHorizontal: 24, borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  markAllText: { fontSize: 13, color: '#005f99', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 12, elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#e8f4fd',
    borderLeftWidth: 4, borderLeftColor: '#005f99',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#005f99', marginRight: 8,
  },
  title: { fontSize: 15, fontWeight: '600', color: '#333' },
  titleUnread: { fontWeight: 'bold', color: '#1a1a1a' },
  message: { fontSize: 13, color: '#555', marginBottom: 6 },
  time: { fontSize: 11, color: '#aaa' },
});