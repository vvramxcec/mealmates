import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Dimensions,
  Alert 
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { isFirebaseConfigured, db } from '../services/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Info, Calendar as CalendarIcon } from 'lucide-react-native';
import { MealEntry } from '../types';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40) / 7;

type MealType = 'breakfast' | 'lunch' | 'dinner';
type MealStatus = boolean | null;
type MealsState = Record<MealType, MealStatus>;

const DEFAULT_MEALS: MealsState = {
  breakfast: null,
  lunch: null,
  dinner: null,
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const createMealsState = (): MealsState => ({ ...DEFAULT_MEALS });

const normalizeMeals = (meals: Partial<MealsState> | undefined): MealsState => ({
  breakfast: meals?.breakfast ?? null,
  lunch: meals?.lunch ?? null,
  dinner: meals?.dinner ?? null,
});

const getMealCount = (meals: MealsState): number =>
  (meals.breakfast ? 1 : 0) + (meals.lunch ? 1 : 0) + (meals.dinner ? 1 : 0);

const CalendarScreen = () => {
  const { activeClub, user } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealHistory, setMealHistory] = useState<Record<string, MealsState>>({});
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingDate, setTogglingDate] = useState<string | null>(null);

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
      const history: Record<string, MealsState> = {};
      
      if (!isFirebaseConfigured) {
        // MOCK DATA: Generate random history for the month if none exists
        if (Object.keys(mealHistory).length === 0) {
          for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            history[dateStr] = {
              breakfast: Math.random() > 0.5 ? true : false,
              lunch: Math.random() > 0.5 ? true : false,
              dinner: Math.random() > 0.5 ? true : false,
            };
          }
          setMealHistory(history);
        }
      } else {
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
        const fetchedHistory: Record<string, MealsState> = {};
        querySnapshot.forEach((entryDoc) => {
          const data = entryDoc.data();
          fetchedHistory[data.date] = normalizeMeals(data.meals);
        });
        setMealHistory(fetchedHistory);
      }
    } catch (error) {
      console.error("Error fetching calendar history:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateMealForDate = async (dateStr: string, mealType: MealType, status: boolean) => {
    if (!user || !activeClub) return;

    setTogglingDate(dateStr);
    const currentMeals = mealHistory[dateStr] ?? createMealsState();
    const nextMeals = {
      ...currentMeals,
      [mealType]: currentMeals[mealType] === status ? null : status,
    };

    try {
      if (isFirebaseConfigured) {
        const entryId = `${user.uid}_${activeClub.clubId}_${dateStr}`;
        const entry: MealEntry = {
          uid: user.uid,
          clubId: activeClub.clubId,
          date: dateStr,
          meals: nextMeals,
        };
        await setDoc(doc(db, 'mealEntries', entryId), entry, { merge: true });
      }

      setMealHistory(prev => {
        return {
          ...prev,
          [dateStr]: nextMeals,
        };
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update meal status.");
    } finally {
      setTogglingDate(null);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1);
    setSelectedDate(newDate);
    setSelectedDateKey(null);
    if (!isFirebaseConfigured) setMealHistory({}); // Reset mock for new month
  };

  const handleSelectDate = (day: number) => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateKey(dateStr);
  };

  const renderDay = (day: number | null) => {
    if (day === null) return <View style={styles.dayCell} />;

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const meals = mealHistory[dateStr] ?? createMealsState();
    const mealCount = getMealCount(meals);
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const isToggling = togglingDate === dateStr;
    const isSelected = selectedDateKey === dateStr;

    return (
      <TouchableOpacity 
        style={[styles.dayCell, isSelected && styles.selectedDayCell]} 
        onPress={() => handleSelectDate(day)}
        disabled={isToggling}
      >
        <View style={[
          styles.dayCircle,
          mealCount > 0 && styles.ateCircle,
          mealCount === 0 && Object.values(meals).some((status) => status === false) && styles.skippedCircle,
          isToday && mealCount === 0 && styles.todayCircle,
          isToday && mealCount > 0 && [styles.ateCircle, { borderWidth: 2, borderColor: '#fff' }],
        ]}>
          {isToggling ? (
            <ActivityIndicator size="small" color={mealCount === 0 ? "#FF6B6B" : "#fff"} />
          ) : (
            <View style={styles.dayLabelWrap}>
              <Text style={[
                styles.dayText,
                mealCount > 0 && styles.activeDayText,
                isToday && mealCount === 0 && styles.todayText
              ]}>
                {day}
              </Text>
              <Text style={[
                styles.mealCountText,
                mealCount > 0 && styles.activeDayText,
                isToday && mealCount === 0 && styles.todayText
              ]}>
                {mealCount}/3
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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

      {selectedDateKey && (
        <View style={styles.editorCard}>
          <Text style={styles.editorTitle}>
            {new Date(selectedDateKey).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          {(Object.keys(MEAL_LABELS) as MealType[]).map((mealType) => {
            const status = (mealHistory[selectedDateKey] ?? createMealsState())[mealType];
            return (
              <View key={mealType} style={styles.editorRow}>
                <Text style={styles.editorMealLabel}>{MEAL_LABELS[mealType]}</Text>
                <View style={styles.editorButtons}>
                  <TouchableOpacity
                    style={[styles.editorButton, status === true && styles.ateButton]}
                    onPress={() => updateMealForDate(selectedDateKey, mealType, true)}
                    disabled={togglingDate === selectedDateKey}
                  >
                    <Text style={[styles.editorButtonText, status === true && styles.activeButtonText]}>Ate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editorButton, status === false && styles.skippedButton]}
                    onPress={() => updateMealForDate(selectedDateKey, mealType, false)}
                    disabled={togglingDate === selectedDateKey}
                  >
                    <Text style={[styles.editorButtonText, status === false && styles.activeButtonText]}>Skipped</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.ateDot]} />
          <Text style={styles.legendText}>1-3 meals eaten</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.skippedDot]} />
          <Text style={styles.legendText}>Meals skipped only</Text>
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
  selectedDayCell: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  dayCircle: {
    width: 36,
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
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
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  dayLabelWrap: {
    alignItems: 'center',
  },
  mealCountText: {
    fontSize: 9,
    color: '#6C757D',
    marginTop: -1,
  },
  activeDayText: {
    color: 'white',
    fontWeight: '700',
  },
  todayText: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  editorCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  editorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 10,
  },
  editorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editorMealLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  editorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editorButton: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    minWidth: 74,
    alignItems: 'center',
  },
  editorButtonText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '600',
  },
  ateButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  skippedButton: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  activeButtonText: {
    color: 'white',
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
