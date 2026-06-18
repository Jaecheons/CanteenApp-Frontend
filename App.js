import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AdminDashboard from './screens/AdminDashboard';
import AdminBookingDetailScreen from './screens/AdminBookingDetailScreen';
import PublishSpecialScreen from './screens/PublishSpecialScreen';
import MenuScreen from './screens/MenuScreen';
import BookMealScreen from './screens/BookMealScreen';
import MyBookingsScreen from './screens/MyBookingsScreen';
import BookingDetailScreen from './screens/BookingDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="AdminBookingDetail" component={AdminBookingDetailScreen} options={{ headerShown: true, title: 'Booking Detail' }} />
        <Stack.Screen name="PublishSpecial" component={PublishSpecialScreen} options={{ headerShown: true, title: 'Publish Special Meal' }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: true, title: 'Weekly Menu' }} />
        <Stack.Screen name="BookMeal" component={BookMealScreen} options={{ headerShown: true, title: 'Book a Meal' }} />
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ headerShown: true, title: 'My Bookings' }} />
        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: true, title: 'Booking Detail' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}