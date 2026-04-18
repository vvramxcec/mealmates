import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const calcBillSplit = functions.firestore
  .document('bills/{billId}')
  .onCreate(async (snap, context) => {
    const billData = snap.data();
    const { clubId, month, totalAmount } = billData;

    if (!clubId || !month || totalAmount === undefined) {
      console.error('Missing bill data');
      return null;
    }

    try {
      // Fetch all meal entries for the club and month
      const mealEntriesRef = admin.firestore().collection('mealEntries');
      const querySnapshot = await mealEntriesRef
        .where('clubId', '==', clubId)
        .get();

      // Filter by month in memory (Firestore range filters can be limited)
      const entries = querySnapshot.docs.filter(doc => doc.data().date.startsWith(month));

      const countEatenMeals = (meals: any): number => {
        if (!meals || typeof meals !== 'object') return 0;
        const values = [meals.breakfast, meals.lunch, meals.dinner];
        return values.filter(value => value === true).length;
      };

      const totalMealsEaten = entries.reduce((acc, entryDoc) => {
        return acc + countEatenMeals(entryDoc.data().meals);
      }, 0);

      if (totalMealsEaten === 0) {
        console.warn('No meals eaten in this period');
        return snap.ref.update({
          splits: [],
          status: 'settled', // or handled accordingly
        });
      }

      const perMealCost = totalAmount / totalMealsEaten;

      // Group meals by user
      const userMealCounts: Record<string, number> = {};
      entries.forEach(entryDoc => {
        const data = entryDoc.data();
        const mealsEaten = countEatenMeals(data.meals);
        if (mealsEaten > 0) {
          userMealCounts[data.uid] = (userMealCounts[data.uid] || 0) + mealsEaten;
        }
      });

      // Calculate splits
      const splits = Object.keys(userMealCounts).map(uid => ({
        uid,
        mealCount: userMealCounts[uid],
        amount: parseFloat((userMealCounts[uid] * perMealCost).toFixed(2)),
      }));

      // Update the bill document with splits and update status
      return snap.ref.update({
        splits,
        status: 'pending',
        calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error calculating bill split:', error);
      return null;
    }
  });
