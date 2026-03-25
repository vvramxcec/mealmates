"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import Link from "next/link";

export default function BillPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [totalBill, setTotalBill] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !club || !totalBill) return;
    
    setCalculating(true);
    const amount = parseFloat(totalBill);
    const billId = `${club.id}_${month}`;

    try {
      // 1. Save Bill
      await setDoc(doc(db, "bills", billId), {
        clubId: club.id,
        month,
        totalAmount: amount,
        createdBy: user.uid
      });

      // 2. Fetch all "ate" meals for this club and month
      const mealsRef = collection(db, "meals");
      const q = query(mealsRef, where("clubId", "==", club.id), where("status", "==", "ate"));
      const mealsSnap = await getDocs(q);
      
      // Filter by month (date starts with YYYY-MM)
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

      // 4. Save results
      for (const [userId, mealCount] of Object.entries(userMealCounts)) {
        const resultId = `${club.id}_${month}_${userId}`;
        const userAmount = mealCount * perMealCost;
        
        await setDoc(doc(db, "results", resultId), {
          clubId: club.id,
          month,
          userId,
          mealCount,
          amount: userAmount
        });
      }

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
        <h2 className="text-2xl font-bold mb-4">Submit Monthly Bill</h2>
        <p className="text-sm text-gray-500 mb-6">Enter the total mess bill. The system will automatically calculate the split based on the number of meals each member ate.</p>
        
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
          
          <button 
            type="submit" 
            disabled={calculating}
            className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 disabled:opacity-50 mt-4"
          >
            {calculating ? "Calculating..." : "Submit & Calculate Split"}
          </button>
        </form>
      </div>
    </div>
  );
}
