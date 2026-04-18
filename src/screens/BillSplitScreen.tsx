import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  ActivityIndicator,
  Alert,
  ScrollView 
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { isFirebaseConfigured, db } from '../services/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import { Receipt, Info, Calculator, CheckCircle2, History, TrendingUp } from 'lucide-react-native';
import { BillSplit } from '../types';
import { notifyRoommates } from '../utils/notificationUtils';

const BillSplitScreen = () => {
  const { activeClub, user, isLoading: storeLoading } = useAppStore();
  const [billAmount, setBillAmount] = useState('');
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [pastBills, setPastBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isAdmin = activeClub?.adminUid === user?.uid;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const displayMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!activeClub || !isFirebaseConfigured) return;

    // Listen for current month's bill
    const q = query(
      collection(db, 'bills'),
      where('clubId', '==', activeClub.clubId),
      where('month', '==', currentMonth),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentBill({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
      } else {
        setCurrentBill(null);
      }
    });

    // Fetch past bills
    const fetchPastBills = async () => {
      const qPast = query(
        collection(db, 'bills'),
        where('clubId', '==', activeClub.clubId),
        orderBy('month', 'desc'),
        limit(5)
      );
      const snap = await getDocs(qPast);
      setPastBills(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    };
    fetchPastBills();

    return () => unsubscribe();
  }, [activeClub?.clubId]);

  const handleSubmitBill = async () => {
    if (!billAmount || isNaN(Number(billAmount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid total bill amount.');
      return;
    }

    if (!activeClub || !user) return;

    setLoading(true);
    try {
      if (!isFirebaseConfigured) {
        // MOCK SUBMISSION
        const mockBill = {
          id: 'mock_bill_123',
          clubId: activeClub.clubId,
          month: currentMonth,
          totalAmount: Number(billAmount),
          status: 'calculating',
          splits: [],
          createdBy: user.uid
        };
        setCurrentBill(mockBill);
        
        // Simulate Cloud Function delay
        setTimeout(() => {
          const perMeal = Number(billAmount) / (activeClub.members.length * 20);
          const mockSplits = activeClub.members.map(uid => ({
            uid,
            userName: uid === user.uid ? 'You' : `Member ${uid.slice(-3)}`,
            mealCount: 20,
            amount: 20 * perMeal
          }));
          setCurrentBill({ ...mockBill, splits: mockSplits, status: 'pending' });
        }, 2000);
      } else {
        // REAL FIREBASE SUBMISSION
        await addDoc(collection(db, 'bills'), {
          clubId: activeClub.clubId,
          month: currentMonth,
          totalAmount: Number(billAmount),
          status: 'calculating',
          splits: [],
          createdBy: user.uid,
          createdAt: new Date().toISOString()
        });
      }
      setBillAmount('');
    } catch (error) {
      console.error("Error submitting bill:", error);
      Alert.alert('Error', 'Failed to submit bill.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemindRoommates = async () => {
    if (!activeClub || !currentBill) return;
    
    setLoading(true);
    try {
      const title = `New Bill: ${activeClub.name}`;
      const body = `Total amount ₹${currentBill.totalAmount} has been submitted for ${displayMonth}. Check your share!`;
      
      if (isFirebaseConfigured) {
        await notifyRoommates(activeClub.members, title, body);
        Alert.alert('Success', 'Payment notification sent to roommates!');
      } else {
        console.log('Mock: Sending notifications to:', activeClub.members);
        Alert.alert('Mock Mode', 'Push notifications only work on real devices with Firebase.');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      Alert.alert('Error', 'Failed to send notifications.');
    } finally {
      setLoading(false);
    }
  };

  const renderBillSplits = (bill: any) => {
    if (bill.status === 'calculating') {
      return (
        <View style={styles.calculatingContainer}>
          <ActivityIndicator color="#FF6B6B" />
          <Text style={styles.calculatingText}>Calculating splits based on meal entries...</Text>
        </View>
      );
    }

    return (
      <View style={styles.resultSection}>
        <View style={styles.summaryHeader}>
          <Text style={styles.sectionTitle}>Individual Breakdown</Text>
          <View style={styles.perMealBadge}>
            <Text style={styles.perMealText}>
              ₹{(bill.totalAmount / bill.splits.reduce((acc: number, s: any) => acc + s.mealCount, 0)).toFixed(2)} / meal
            </Text>
          </View>
        </View>
        
        {bill.splits.map((item: any) => (
          <View key={item.uid} style={styles.splitItem}>
            <View>
              <Text style={styles.memberName}>
                {item.uid === user?.uid ? 'You' : `Member ${item.uid.slice(-3)}`}
              </Text>
              <Text style={styles.mealCount}>{item.mealCount} meals eaten</Text>
            </View>
            <Text style={styles.amountText}>₹{item.amount.toFixed(2)}</Text>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.settleButton} 
          onPress={handleRemindRoommates}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CheckCircle2 color="white" size={20} />
              <Text style={styles.buttonText}>Remind Roommates</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
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
    <ScrollView style={styles.containerFull} contentContainerStyle={{ paddingBottom: 40 }}>
      {!isFirebaseConfigured && (
        <View style={styles.devNotice}>
          <Info color="#856404" size={16} />
          <Text style={styles.devNoticeText}>
            Mock Mode: Simulated bill processing.
          </Text>
        </View>
      )}

      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.monthText}>{displayMonth}</Text>
            <Text style={styles.clubName}>{activeClub.name}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.historyIcon, showHistory && styles.activeHistoryIcon]} 
            onPress={() => setShowHistory(!showHistory)}
          >
            <History color={showHistory ? "#FF6B6B" : "#6C757D"} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {showHistory ? (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Bills</Text>
          {pastBills.length === 0 ? (
            <Text style={styles.emptyText}>No past bills found.</Text>
          ) : (
            pastBills.map(bill => (
              <View key={bill.id} style={styles.historyCard}>
                <View>
                  <Text style={styles.historyMonth}>{bill.month}</Text>
                  <Text style={styles.historyAmount}>₹{bill.totalAmount}</Text>
                </View>
                <View style={styles.historyStatus}>
                  <TrendingUp color="#4CAF50" size={16} />
                  <Text style={styles.historyStatusText}>Settled</Text>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        <>
          {!currentBill ? (
            isAdmin ? (
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Enter Total Mess Bill for {displayMonth}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5000"
                  keyboardType="numeric"
                  value={billAmount}
                  onChangeText={setBillAmount}
                />
                <TouchableOpacity 
                  style={styles.calculateButton} 
                  onPress={handleSubmitBill}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Calculator color="white" size={20} />
                      <Text style={styles.buttonText}>Submit & Calculate</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.disclaimer}>
                  * This will calculate individual shares based on everyone's meal tracking for this month.
                </Text>
              </View>
            ) : (
              <View style={styles.cardMargin}>
                <View style={styles.card}>
                  <Calculator color="#CED4DA" size={60} style={{ marginBottom: 20 }} />
                  <Text style={styles.header}>No Bill Submitted</Text>
                  <Text style={styles.subtitle}>
                    Waiting for the club admin to submit this month's mess bill.
                  </Text>
                </View>
              </View>
            )
          ) : (
            <View style={styles.activeBillSection}>
              <View style={styles.billSummaryCard}>
                <Text style={styles.summaryLabel}>Total Bill Amount</Text>
                <Text style={styles.summaryAmount}>₹{currentBill.totalAmount}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{currentBill.status.toUpperCase()}</Text>
                </View>
              </View>

              {renderBillSplits(currentBill)}
              
              {isAdmin && (
                <TouchableOpacity 
                  style={styles.recalculateButton}
                  onPress={() => setCurrentBill(null)} // Local reset to allow re-entry
                >
                  <Text style={styles.recalculateText}>Edit Bill Amount</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  historyIcon: {
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  activeHistoryIcon: {
    backgroundColor: '#FFE3E3',
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
  cardMargin: {
    padding: 20,
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
    padding: 25,
    backgroundColor: 'white',
    borderRadius: 20,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F1F3F5',
    padding: 18,
    borderRadius: 15,
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
  calculateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: '#ADB5BD',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
  activeBillSection: {
    padding: 20,
  },
  billSummaryCard: {
    backgroundColor: '#FF6B6B',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 25,
  },
  summaryLabel: {
    color: 'white',
    opacity: 0.8,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryAmount: {
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 5,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  calculatingContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 15,
  },
  calculatingText: {
    color: '#6C757D',
    fontSize: 14,
    textAlign: 'center',
  },
  resultSection: {
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 5,
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
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
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
    marginTop: 20,
  },
  recalculateButton: {
    alignItems: 'center',
    padding: 15,
    marginTop: 10,
  },
  recalculateText: {
    color: '#ADB5BD',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  historySection: {
    padding: 20,
    gap: 15,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
  },
  historyMonth: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBFBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  historyStatusText: {
    color: '#2B8A3E',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#ADB5BD',
    marginTop: 40,
    fontSize: 16,
  }
});

export default BillSplitScreen;
