import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calendar, Utensils, Users, Receipt, User } from 'lucide-react-native';

import TodayScreen from './src/screens/TodayScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ClubScreen from './src/screens/ClubScreen';
import BillSplitScreen from './src/screens/BillSplitScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FF6B6B',
          tabBarInactiveTintColor: '#6C757D',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Tab.Screen 
          name="Today" 
          component={TodayScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} />,
          }}
        />
        <Tab.Screen 
          name="Calendar" 
          component={CalendarScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
          }}
        />
        <Tab.Screen 
          name="Club" 
          component={ClubScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tab.Screen 
          name="Bill Split" 
          component={BillSplitScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
