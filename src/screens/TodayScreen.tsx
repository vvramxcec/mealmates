import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { MealEntry } from '../types';
import { Utensils, Info } from 'lucide-react-native';

const TodayScreen = () => {
  const { user, activeClub, isLoading: storeLoading } = useAppStore();
  const [ate, setAte] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const userId = user?.uid;
  const clubId = activeClub?.clubId;

  useEffect(() => {
    const fetchTodayStatus = async () => {
      if (!userId || !clubId) {
        setLoading(false);
        return;
      }

      if (!isFirebaseConfigured) {
        console.log("TodayScreen: Firebase not configured. Skipping fetch.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = doc(db, 'mealEntries', `${userId}_${clubId}_${today}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAte(docSnap.data().ate);
        } else {
          setAte(null);
        }
      } catch (error) {
        console.error("Error fetching status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayStatus();
  }, [clubId, today, userId]);

  const handleToggle = async (status: boolean) => {
    if (!userId || !clubId) {
      Alert.alert('Join a Club', 'Please join or create a club first!');
      return;
    }

    setAte(status);

    if (!isFirebaseConfigured) {
      console.log("TodayScreen: Firebase not configured. Saved status locally (Mock).");
      return;
    }

    try {
      const entry: MealEntry = {
        uid: userId,
        clubId,
        date: today,
        ate: status,
      };
      const docRef = doc(db, 'mealEntries', `${userId}_${clubId}_${today}`);
      await setDoc(docRef, entry, { merge: true });
    } catch (error) {
      console.error("Error saving status:", error);
      Alert.alert('Error', 'Failed to save status');
    }
  };

  if (loading || storeLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.containerFull}>
      {!isFirebaseConfigured && (
        <View style={styles.devNotice}>
          <Info color="#856404" size={16} />
          <Text style={styles.devNoticeText}>
            Firebase not configured. Running in Mock Mode.
          </Text>
        </View>
      )}

      <View style={styles.container}>
        {!activeClub ? (
          <View style={styles.card}>
            <Utensils color="#CED4DA" size={60} style={{ marginBottom: 20 }} />
            <Text style={styles.header}>No Active Club</Text>
            <Text style={styles.subtitle}>
              Please go to the Club tab to join or create a club with your roommates.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.clubLabel}>{activeClub.name}</Text>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            <Text style={styles.header}>Did you eat at the mess today?</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, ate === true && styles.ateButton]} 
                onPress={() => handleToggle(true)}
              >
                <Text style={[styles.buttonText, ate === true && styles.activeButtonText]}>Ate</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, ate === false && styles.skippedButton]} 
                onPress={() => handleToggle(false)}
              >
                <Text style={[styles.buttonText, ate === false && styles.activeButtonText]}>Skipped</Text>
              </TouchableOpacity>
            </View>

            {ate !== null && (
              <Text style={styles.statusInfo}>
                Status: {ate ? "Marked as Ate" : "Marked as Skipped"}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerFull: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devNotice: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  devNoticeText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  clubLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#212529',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 15,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    minWidth: 120,
    alignItems: 'center',
  },
  ateButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  skippedButton: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
  },
  activeButtonText: {
    color: 'white',
  },
  statusInfo: {
    marginTop: 20,
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic',
  },
});

export default TodayScreen;
