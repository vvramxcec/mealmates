import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { isFirebaseConfigured, db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Receipt, Info, Calculator, CheckCircle2 } from 'lucide-react-native';
import { BillSplit } from '../types';

const BillSplitScreen = () => {
  const { activeClub, user, isLoading: storeLoading } = useAppStore();
  const [billAmount, setBillAmount] = useState('');
  const [splits, setSplits] = useState<BillSplit[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calculateSplits = async () => {
    if (!billAmount || isNaN(Number(billAmount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid total bill amount.');
      return;
    }

    if (!activeClub) return;

    setLoading(true);
    try {
      let mealCounts: Record<string, number> = {};
      let totalMealsEaten = 0;

      if (!isFirebaseConfigured) {
        // MOCK DATA for calculation testing
        console.log("BillSplit: Using Mock Meal Counts");
        activeClub.members.forEach((uid, index) => {
          const mockCount = 20 + (index * 5); // 20, 25, 30...
          mealCounts[uid] = mockCount;
          totalMealsEaten += mockCount;
        });
      } else {
        // REAL FIREBASE LOGIC
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        
        const q = query(
          collection(db, 'mealEntries'),
          where('clubId', '==', activeClub.clubId),
          where('date', '>=', firstDay),
          where('ate', '==', true)
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          mealCounts[data.uid] = (mealCounts[data.uid] || 0) + 1;
          totalMealsEaten++;
        });
      }

      const totalBill = Number(billAmount);
      const perMealCost = totalMealsEaten > 0 ? totalBill / totalMealsEaten : 0;

      const calculatedSplits: BillSplit[] = activeClub.members.map(uid => ({
        uid,
        userName: uid === user?.uid ? 'You' : `Member ${uid.slice(-3)}`,
        mealCount: mealCounts[uid] || 0,
        amount: (mealCounts[uid] || 0) * perMealCost
      }));

      setSplits(calculatedSplits);
      setCalculated(true);
    } catch (error) {
      console.error("Error calculating splits:", error);
      Alert.alert('Error', 'Failed to calculate bill splits.');
    } finally {
      setLoading(false);
    }
  };

  if (storeLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (!activeClub) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Receipt color="#CED4DA" size={60} style={{ marginBottom: 20 }} />
          <Text style={styles.header}>No Active Club</Text>
          <Text style={styles.subtitle}>
            Join or create a club first to see bill reports.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.containerFull}>
      {!isFirebaseConfigured && (
        <View style={styles.devNotice}>
          <Info color="#856404" size={16} />
          <Text style={styles.devNoticeText}>
            Mock Mode: Using simulated meal counts for this month.
          </Text>
        </View>
      )}

      <View style={styles.headerSection}>
        <Text style={styles.monthText}>{currentMonth}</Text>
        <Text style={styles.clubName}>{activeClub.name}</Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Total Mess Bill (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 5000"
          keyboardType="numeric"
          value={billAmount}
          onChangeText={(val) => {
            setBillAmount(val);
            setCalculated(false);
          }}
        />
        <TouchableOpacity 
          style={styles.calculateButton} 
          onPress={calculateSplits}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Calculator color="white" size={20} />
              <Text style={styles.buttonText}>Calculate Splits</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {calculated && (
        <View style={styles.resultSection}>
          <View style={styles.summaryHeader}>
            <Text style={styles.sectionTitle}>Individual Breakdown</Text>
            <View style={styles.perMealBadge}>
              <Text style={styles.perMealText}>
                ₹{(Number(billAmount) / splits.reduce((acc, s) => acc + s.mealCount, 0)).toFixed(2)} / meal
              </Text>
            </View>
          </View>
          
          <FlatList
            data={splits}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.splitItem}>
                <View>
                  <Text style={styles.memberName}>{item.userName}</Text>
                  <Text style={styles.mealCount}>{item.mealCount} meals eaten</Text>
                </View>
                <Text style={styles.amountText}>₹{item.amount.toFixed(2)}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          <TouchableOpacity 
            style={styles.settleButton} 
            onPress={() => Alert.alert('Success', 'Bill report generated and sent to all members!')}
          >
            <CheckCircle2 color="white" size={20} />
            <Text style={styles.buttonText}>Finalize & Send Report</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerSection: {
    padding: 25,
    backgroundColor: 'white',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  monthText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  clubName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginTop: 5,
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
  inputCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    gap: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  input: {
    backgroundColor: '#F1F3F5',
    padding: 15,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  calculateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  perMealBadge: {
    backgroundColor: '#E7F5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  perMealText: {
    color: '#1971C2',
    fontWeight: '700',
    fontSize: 12,
  },
  splitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  mealCount: {
    fontSize: 13,
    color: '#6C757D',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  settleButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    marginTop: 10,
  },
});

export default BillSplitScreen;
