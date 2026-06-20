// screens/MenuScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Image, TouchableOpacity
} from 'react-native';
import api from '../services/api';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'];

export default function MenuScreen() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await api.get('/Menu');
        setMenu(response.data);
      } catch (err) {
        console.log('MENU ERROR:', err.response?.status, err.response?.data);
        setError('Failed to load menu. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

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

      {menu.map((dayObj) => (
        <View key={dayObj.day} style={styles.dayBlock}>
          <Text style={styles.dayTitle}>{dayObj.day}</Text>

          {dayObj.meals?.map((mealObj) => (
            <View key={mealObj.mealType} style={styles.mealTypeBlock}>
              <Text style={styles.mealTypeTitle}>{mealObj.mealType}</Text>

              {mealObj.items?.map((item) => (
                <View key={item.menuItemID} style={styles.menuItem}>
                  {item.photoUrl ? (
                    <Image
                      source={{ uri: item.photoUrl }}
                      style={styles.itemImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>🍽</Text>
                    </View>
                  )}
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
      ))}
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
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemImage: { width: 56, height: 56, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: {
    width: 56, height: 56, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  imagePlaceholderText: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  itemDesc: { fontSize: 13, color: '#888', marginTop: 2 },
});