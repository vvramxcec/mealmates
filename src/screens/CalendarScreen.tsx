import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { isFirebaseConfigured, db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Info, Calendar as CalendarIcon } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40) / 7;

const CalendarScreen = () => {
  const { activeClub, user } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealHistory, setMealHistory] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    fetchMonthHistory();
  }, [selectedDate, activeClub, user]);

  const fetchMonthHistory = async () => {
    if (!activeClub || !user) return;

    setLoading(true);
    try {
      const history: Record<string, boolean> = {};
      
      if (!isFirebaseConfigured) {
        // MOCK DATA: Generate random history for the month
        console.log("Calendar: Generating Mock History");
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          // Randomly assign ate (60%), skipped (30%), or no entry (10%)
          const rand = Math.random();
          if (rand > 0.4) history[dateStr] = true;
          else if (rand > 0.1) history[dateStr] = false;
        }
      } else {
        // REAL FIREBASE LOGIC
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];

        const q = query(
          collection(db, 'mealEntries'),
          where('uid', '==', user.uid),
          where('clubId', '==', activeClub.clubId),
          where('date', '>=', startOfMonth),
          where('date', '<=', endOfMonth)
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          history[data.date] = data.ate;
        });
      }
      setMealHistory(history);
    } catch (error) {
      console.error("Error fetching calendar history:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1);
    setSelectedDate(newDate);
  };

  const renderDay = (day: number | null) => {
    if (day === null) return <View style={styles.dayCell} />;

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = mealHistory[dateStr];
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    return (
      <View style={styles.dayCell}>
        <View style={[
          styles.dayCircle,
          status === true && styles.ateCircle,
          status === false && styles.skippedCircle,
          isToday && styles.todayCircle
        ]}>
          <Text style={[
            styles.dayText,
            status !== undefined && styles.activeDayText,
            isToday && styles.todayText
          ]}>
            {day}
          </Text>
        </View>
      </View>
    );
  };

  // Generate calendar grid (including leading empty cells)
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  if (!activeClub) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <CalendarIcon color="#CED4DA" size={60} style={{ marginBottom: 20 }} />
          <Text style={styles.header}>No Active Club</Text>
          <Text style={styles.subtitle}>Join a club to track your meal history.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.containerFull}>
      {!isFirebaseConfigured && (
        <View style={styles.devNotice}>
          <Info color="#856404" size={16} />
          <Text style={styles.devNoticeText}>Mock Mode: Showing randomized history.</Text>
        </View>
      )}

      <View style={styles.headerCard}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <ChevronLeft color="#FF6B6B" size={28} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <ChevronRight color="#FF6B6B" size={28} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : (
        <FlatList
          data={calendarDays}
          keyExtractor={(_, index) => index.toString()}
          numColumns={7}
          renderItem={({ item }) => renderDay(item)}
          contentContainerStyle={styles.grid}
        />
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.ateDot]} />
          <Text style={styles.legendText}>Ate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.skippedDot]} />
          <Text style={styles.legendText}>Skipped</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.todayDot]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
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
  headerCard: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ADB5BD',
    width: COLUMN_WIDTH,
    textAlign: 'center',
  },
  grid: {
    padding: 15,
  },
  dayCell: {
    width: COLUMN_WIDTH,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ateCircle: {
    backgroundColor: '#4CAF50',
  },
  skippedCircle: {
    backgroundColor: '#FF6B6B',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  dayText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  activeDayText: {
    color: 'white',
    fontWeight: '700',
  },
  todayText: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 25,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ateDot: { backgroundColor: '#4CAF50' },
  skippedDot: { backgroundColor: '#FF6B6B' },
  todayDot: { borderWidth: 2, borderColor: '#FF6B6B' },
  legendText: {
    fontSize: 13,
    color: '#6C757D',
    fontWeight: '500',
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
});

export default CalendarScreen;
