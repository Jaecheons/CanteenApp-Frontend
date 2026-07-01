// screens/NotificationsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    try {
      const [notifRes, announcementsRes] = await Promise.all([
        api.get('/Notifications/my').catch(() => ({ data: [] })),
        api.get('/Announcements').catch(() => ({ data: [] })),
      ]);

      // Load which announcements have already been read locally
      const readIdsRaw = await AsyncStorage.getItem('readAnnouncementIds');
      const readIds = readIdsRaw ? JSON.parse(readIdsRaw) : [];

      const bookingNotifs = (notifRes.data ?? []).map((n) => ({
        id: `notif-${n.notificationID}`,
        rawId: n.notificationID,
        type: 'booking',
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
        relatedBookingID: n.relatedBookingID,
      }));

      const announcementNotifs = (announcementsRes.data ?? []).map((a) => ({
        id: `announce-${a.announcementID}`,
        rawId: a.announcementID,
        type: 'announcement',
        title: a.title,
        message: a.message,
        isRead: readIds.includes(a.announcementID),
        createdAt: a.createdAt,
        publishedBy: a.publishedBy,
      }));

      const combined = [...bookingNotifs, ...announcementNotifs].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setItems(combined);
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
      fetchAll();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const markBookingAsRead = async (notificationID) => {
    try {
      await api.put(`/Notifications/${notificationID}/read`);
      setItems((prev) =>
        prev.map((n) =>
          n.type === 'booking' && n.rawId === notificationID ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.log('MARK READ ERROR:', err.response?.status);
    }
  };

  const markAnnouncementAsRead = async (announcementID) => {
    try {
      const readIdsRaw = await AsyncStorage.getItem('readAnnouncementIds');
      const readIds = readIdsRaw ? JSON.parse(readIdsRaw) : [];
      if (!readIds.includes(announcementID)) {
        readIds.push(announcementID);
        await AsyncStorage.setItem('readAnnouncementIds', JSON.stringify(readIds));
      }
      setItems((prev) =>
        prev.map((n) =>
          n.type === 'announcement' && n.rawId === announcementID ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.log('MARK ANNOUNCEMENT READ ERROR:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/Notifications/mark-all-read').catch(() => {});
      const allAnnouncementIds = items
        .filter((n) => n.type === 'announcement')
        .map((n) => n.rawId);
      await AsyncStorage.setItem('readAnnouncementIds', JSON.stringify(allAnnouncementIds));
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.log('MARK ALL READ ERROR:', err);
    }
  };

  const handlePress = (item) => {
    if (!item.isRead) {
      if (item.type === 'booking') markBookingAsRead(item.rawId);
      else markAnnouncementAsRead(item.rawId);
    }
    if (item.relatedBookingID) {
      navigation.navigate('MyBookings');
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

  const unreadCount = items.filter((n) => !n.isRead).length;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.cardTop}>
        {!item.isRead && <View style={styles.unreadDot} />}
        <Text style={styles.typeTag}>
          {item.type === 'announcement' ? '📢 ANNOUNCEMENT' : '🔔 BOOKING'}
        </Text>
      </View>
      <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
        {item.title}
      </Text>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.time}>
        {item.publishedBy ? `By ${item.publishedBy} · ` : ''}{timeAgo(item.createdAt)}
      </Text>
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
        <TouchableOpacity style={styles.btn} onPress={fetchAll}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
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
  typeTag: { fontSize: 10, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 },
  title: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  titleUnread: { fontWeight: 'bold', color: '#1a1a1a' },
  message: { fontSize: 13, color: '#555', marginBottom: 6 },
  time: { fontSize: 11, color: '#aaa' },
});