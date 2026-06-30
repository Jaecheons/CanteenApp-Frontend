// context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const lightColors = {
  background: '#f5f5f5',
  card: '#fff',
  text: '#1a1a1a',
  textSecondary: '#555',
  textMuted: '#888',
  border: '#ddd',
  borderLight: '#f0f0f0',
  primary: '#005f99',
  primaryLight: '#e8f4fd',
  success: '#27ae60',
  danger: '#c0392b',
  dangerLight: '#fdecea',
  warning: '#e67e22',
  warningLight: '#fff8e1',
  inputBackground: '#fff',
  statusBarStyle: 'dark-content',
};

const darkColors = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#f0f0f0',
  textSecondary: '#bbb',
  textMuted: '#888',
  border: '#333',
  borderLight: '#2a2a2a',
  primary: '#3b9fe0',
  primaryLight: '#1a2e3d',
  success: '#2ecc71',
  danger: '#e74c3c',
  dangerLight: '#3d2020',
  warning: '#f39c12',
  warningLight: '#3d3420',
  inputBackground: '#262626',
  statusBarStyle: 'light-content',
};

const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem('themePreference');
        if (stored === 'dark') {
          setIsDark(true);
        } else if (stored === 'light') {
          setIsDark(false);
        } else {
          // No preference saved — fall back to system setting
          const systemScheme = Appearance.getColorScheme();
          setIsDark(systemScheme === 'dark');
        }
      } catch {
        setIsDark(false);
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newValue = !isDark;
    setIsDark(newValue);
    await AsyncStorage.setItem('themePreference', newValue ? 'dark' : 'light');
  };

  const colors = isDark ? darkColors : lightColors;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);