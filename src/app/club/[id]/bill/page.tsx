"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import Link from "next/link";

export default function BillPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [totalBill, setTotalBill] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [existingBill, setExistingBill] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return router.push("/login");
      setUser(currentUser);
      
      const clubSnap = await getDoc(doc(db, "clubs", params.id));
      if (!clubSnap.exists() || clubSnap.data().adminId !== currentUser.uid) {
        return router.push(`/club/${params.id}`);
      }
      setClub({ id: clubSnap.id, ...clubSnap.data() });
    });
    return () => unsubscribe();
  }, [router, params.id]);

  useEffect(() => {
    if (!club || !month) return;
    
    const fetchBill = async () => {
      const billId = `${club.id}_${month}`;
      const billSnap = await getDoc(doc(db, "bills", billId));
      if (billSnap.exists()) {
        const data = billSnap.data();
        setExistingBill(data);
        setTotalBill(data.totalAmount.toString());
      } else {
        setExistingBill(null);
        setTotalBill("");
      }
    };
    
    fetchBill();
  }, [club, month]);

  const editBill = async (clubId: string, month: string, newAmount: number, adminId: string, currentUserId: string) => {
    if (adminId !== currentUserId) {
      alert("Unauthorized");
      return;
    }

    setCalculating(true);
    const batch = writeBatch(db);
    const billId = `${clubId}_${month}`;

    try {
      // 1. Update Bill
      const billRef = doc(db, "bills", billId);
      batch.update(billRef, { totalAmount: newAmount });

      // 2. Fetch meals to recalculate
      const mealsRef = collection(db, "meals");
      const q = query(mealsRef, where("clubId", "==", clubId), where("status", "==", "ate"));
      const mealsSnap = await getDocs(q);
      
      const validMeals = mealsSnap.docs
        .map(d => d.data())
        .filter(m => m.date.startsWith(month));

      const totalMeals = validMeals.length;
      if (totalMeals === 0) {
        alert("No meals found for this month. Cannot recalculate.");
        setCalculating(false);
        return;
      }

      const perMealCost = newAmount / totalMeals;

      // 3. Recalculate per user
      const userMealCounts: Record<string, number> = {};
      club.members.forEach((mId: string) => userMealCounts[mId] = 0);
      validMeals.forEach(meal => {
        if (userMealCounts[meal.userId] !== undefined) {
          userMealCounts[meal.userId]++;
        }
      });

      // 4. Update results in batch
      for (const [userId, mealCount] of Object.entries(userMealCounts)) {
        const resultId = `${clubId}_${month}_${userId}`;
        const resultRef = doc(db, "results", resultId);
        const userAmount = mealCount * perMealCost;
        
        batch.set(resultRef, {
          clubId,
          month,
          userId,
          mealCount,
          amount: userAmount
        }, { merge: true });
      }

      await batch.commit();
      alert("Bill updated and results recalculated.");
      router.push(`/club/${clubId}/results?month=${month}`);
    } catch (err) {
      console.error(err);
      alert("Error updating bill.");
    } finally {
      setCalculating(false);
    }
  };

  const deleteBill = async (clubId: string, month: string, adminId: string, currentUserId: string) => {
    if (adminId !== currentUserId) {
      alert("Unauthorized");
      return;
    }

    if (!confirm("Are you sure you want to delete this bill and all associated results? This action cannot be undone.")) {
      return;
    }

    setCalculating(true);
    const batch = writeBatch(db);
    const billId = `${clubId}_${month}`;

    try {
      // 1. Delete Bill
      batch.delete(doc(db, "bills", billId));

      // 2. Delete Results
      const resultsRef = collection(db, "results");
      const q = query(resultsRef, where("clubId", "==", clubId), where("month", "==", month));
      const resultsSnap = await getDocs(q);
      
      resultsSnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
      alert("Bill and results deleted.");
      setExistingBill(null);
      setTotalBill("");
    } catch (err) {
      console.error(err);
      alert("Error deleting bill.");
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !club || !totalBill) return;
    
    const amount = parseFloat(totalBill);
    
    if (existingBill) {
      await editBill(club.id, month, amount, club.adminId, user.uid);
      return;
    }

    setCalculating(true);
    const batch = writeBatch(db);
    const billId = `${club.id}_${month}`;

    try {
      // 1. Save Bill
      batch.set(doc(db, "bills", billId), {
        clubId: club.id,
        month,
        totalAmount: amount,
        createdBy: user.uid
      });

      // 2. Fetch all "ate" meals
      const mealsRef = collection(db, "meals");
      const q = query(mealsRef, where("clubId", "==", club.id), where("status", "==", "ate"));
      const mealsSnap = await getDocs(q);
      
      const validMeals = mealsSnap.docs
        .map(d => d.data())
        .filter(m => m.date.startsWith(month));

      const totalMeals = validMeals.length;
      
      if (totalMeals === 0) {
        alert("No meals tracked as 'Ate' for this month. Cannot calculate split.");
        setCalculating(false);
        return;
      }

      const perMealCost = amount / totalMeals;

      // 3. Calculate per-user meal count
      const userMealCounts: Record<string, number> = {};
      club.members.forEach((mId: string) => userMealCounts[mId] = 0);
      validMeals.forEach(meal => {
        if (userMealCounts[meal.userId] !== undefined) {
          userMealCounts[meal.userId]++;
        }
      });

      // 4. Save results in batch
      for (const [userId, mealCount] of Object.entries(userMealCounts)) {
        const resultId = `${club.id}_${month}_${userId}`;
        const userAmount = mealCount * perMealCost;
        
        batch.set(doc(db, "results", resultId), {
          clubId: club.id,
          month,
          userId,
          mealCount,
          amount: userAmount
        });
      }

      await batch.commit();
      router.push(`/club/${club.id}/results?month=${month}`);
    } catch (err) {
      console.error(err);
      alert("Error calculating bill.");
    } finally {
      setCalculating(false);
    }
  };

  if (!club) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-md mx-auto mt-8">
      <Link href={`/club/${club.id}`} className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Club
      </Link>
      
      <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">{existingBill ? "Edit Monthly Bill" : "Submit Monthly Bill"}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {existingBill 
            ? "A bill already exists for this month. Updating it will recalculate the split for all members." 
            : "Enter the total mess bill. The system will automatically calculate the split based on the number of meals each member ate."}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Month</label>
            <input 
              type="month" 
              required 
              value={month} 
              onChange={e => setMonth(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-purple-500 focus:ring-purple-500" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Bill Amount ($)</label>
            <input 
              type="number" 
              step="0.01"
              required 
              value={totalBill} 
              onChange={e => setTotalBill(e.target.value)}
              placeholder="e.g. 500.00"
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-purple-500 focus:ring-purple-500" 
            />
          </div>
          
          <div className="flex flex-col gap-3 mt-6">
            <button 
              type="submit" 
              disabled={calculating}
              className={`w-full text-white p-2 rounded-md disabled:opacity-50 ${existingBill ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {calculating ? "Processing..." : (existingBill ? "Update & Recalculate" : "Submit & Calculate Split")}
            </button>

            {existingBill && (
              <button 
                type="button"
                onClick={() => deleteBill(club.id, month, club.adminId, user.uid)}
                disabled={calculating}
                className="w-full bg-red-50 text-red-600 border border-red-200 p-2 rounded-md hover:bg-red-100 disabled:opacity-50"
              >
                Delete Bill
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
