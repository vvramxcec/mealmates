import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calendar, Utensils, Users, Receipt, User as UserIcon } from 'lucide-react-native';
import { useAppStore } from './src/store/useAppStore';
import { auth, db, isFirebaseConfigured } from './src/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { fetchClubDetails } from './src/utils/clubUtils';

import TodayScreen from './src/screens/TodayScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ClubScreen from './src/screens/ClubScreen';
import BillSplitScreen from './src/screens/BillSplitScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import { useNotifications } from './src/hooks/useNotifications';

const Tab = createBottomTabNavigator();

export default function App() {
  const { user, setUser, setActiveClub, isLoading, setLoading } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  // Initialize notifications
  useNotifications();

  useEffect(() => {
    console.log("App: Initializing... Firebase configured:", isFirebaseConfigured);
    
    // Initial mock user setup if not using Firebase
    if (!isFirebaseConfigured) {
      console.log("App: Mock mode detected.");
      setInitializing(false);
      return;
    }

    // Real Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("App: Auth state changed. User:", firebaseUser?.uid);
      setLoading(true);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            setUser(userData);

            if (userData.clubs && userData.clubs.length > 0) {
              const club = await fetchClubDetails(userData.clubs[0]);
              if (club) setActiveClub(club);
            }
          } else {
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              avatar: '',
              clubs: []
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setActiveClub(null);
      }
      setLoading(false);
      setInitializing(false);
    });

    // Fallback timer for initialization
    const timer = setTimeout(() => {
      if (initializing) {
        console.warn("App: Initialization timeout reached.");
        setInitializing(false);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        {!user ? (
          <LoginScreen />
        ) : (
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
                tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
              }}
            />
          </Tab.Navigator>
        )}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
