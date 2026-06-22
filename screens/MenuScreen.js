// screens/MenuScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import api from '../services/api';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

export default function MenuScreen() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await api.get('/Menu');
        setMenu(response.data);

        // Auto expand today's day
        const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
        setExpandedDay(todayName);
      } catch (err) {
        console.log('MENU ERROR:', err.response?.status, err.response?.data);
        setError('Failed to load menu. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const toggleDay = (day) => {
    setExpandedDay((prev) => (prev === day ? null : day));
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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Weekly Menu</Text>

      {menu.map((dayObj) => {
        const isExpanded = expandedDay === dayObj.day;
        const isToday = dayObj.day === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

        return (
          <View key={dayObj.day} style={styles.dayBlock}>

            {/* Day Header — tappable */}
            <TouchableOpacity
              style={[styles.dayHeader, isToday && styles.dayHeaderToday]}
              onPress={() => toggleDay(dayObj.day)}
              activeOpacity={0.8}
            >
              <View style={styles.dayHeaderLeft}>
                {isToday && <Text style={styles.todayBadge}>TODAY</Text>}
                <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>
                  {dayObj.day}
                </Text>
              </View>
              <Text style={[styles.chevron, isToday && styles.dayTitleToday]}>
                {isExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {/* Dropdown content */}
            {isExpanded && (
              <View style={styles.dayContent}>
                {dayObj.meals?.length === 0 && (
                  <Text style={styles.emptyText}>No items for this day.</Text>
                )}
                {dayObj.meals?.map((mealObj) => (
                  <View key={mealObj.mealType} style={styles.mealTypeBlock}>
                    <Text style={styles.mealTypeTitle}>{mealObj.mealType}</Text>
                    {mealObj.items?.map((item) => (
                      <View key={item.menuItemID} style={styles.menuItem}>
                        <View style={styles.itemDot} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.itemName}</Text>
                          {item.description ? (
                            <Text style={styles.itemDesc}>{item.description}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#c0392b', fontSize: 15 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  dayBlock: {
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 10, elevation: 2, overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16,
    backgroundColor: '#fff',
  },
  dayHeaderToday: {
    backgroundColor: '#005f99',
  },
  dayHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  todayBadge: {
    backgroundColor: '#fff',
    color: '#005f99',
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  dayTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#1a1a1a',
  },
  dayTitleToday: {
    color: '#fff',
  },
  chevron: {
    fontSize: 12, color: '#888', fontWeight: 'bold',
  },
  dayContent: {
    padding: 16,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center' },
  mealTypeBlock: { marginBottom: 14 },
  mealTypeTitle: {
    fontSize: 12, fontWeight: '700', color: '#005f99',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#005f99', marginTop: 6, marginRight: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  itemDesc: { fontSize: 13, color: '#888', marginTop: 2 },
});