"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = searchParams.get("month");
  
  const [club, setClub] = useState<any>(null);
  const [adminName, setAdminName] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bill, setBill] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!month) return router.push(`/club/${params.id}`);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/login");
      setCurrentUser(user);
      await loadResults(params.id, month, user.uid);
    });
    return () => unsubscribe();
  }, [router, params.id, month]);

  const loadResults = async (clubId: string, targetMonth: string, currentUid: string) => {
    setLoading(true);
    
    // Load club
    const clubSnap = await getDoc(doc(db, "clubs", clubId));
    if (!clubSnap.exists()) return router.push("/dashboard");
    const clubData = clubSnap.data();
    setClub({ id: clubSnap.id, ...clubData });

    // Load admin name
    const adminSnap = await getDoc(doc(db, "users", clubData.adminId));
    if (adminSnap.exists()) setAdminName(adminSnap.data().name);

    // Load bill
    const billSnap = await getDoc(doc(db, "bills", `${clubId}_${targetMonth}`));
    if (billSnap.exists()) {
      setBill(billSnap.data());
    }

    // Load results
    const resultsRef = collection(db, "results");
    const q = query(resultsRef, where("clubId", "==", clubId), where("month", "==", targetMonth));
    const resultsSnap = await getDocs(q);
    
    const loadedResults = [];
    for (const d of resultsSnap.docs) {
      const data = d.data();
      // Fetch user name
      const userSnap = await getDoc(doc(db, "users", data.userId));
      const userName = userSnap.exists() ? userSnap.data().name : "Unknown User";
      loadedResults.push({ ...data, userName });
    }
    
    setResults(loadedResults.sort((a, b) => b.amount - a.amount));
    setLoading(false);
  };

  if (loading) return <div className="p-8">Loading results...</div>;

  const totalMeals = results.reduce((sum, r) => sum + r.mealCount, 0);
  const perMealCost = totalMeals > 0 && bill ? bill.totalAmount / totalMeals : 0;
  
  const currentUserResult = results.find(r => r.userId === currentUser?.uid);
  const isAdmin = club?.adminId === currentUser?.uid;

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <Link href={`/club/${params.id}`} className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Club
      </Link>
      
      <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Bill Split Results</h2>
        <p className="text-gray-600 mb-6">{club?.name} - {month}</p>

        {currentUserResult && (
          <div className={`p-6 rounded-xl mb-8 border-2 ${
            isAdmin ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
          }`}>
            <h3 className="text-lg font-bold mb-1">
              {isAdmin 
                ? `You are owed ₹${(bill?.totalAmount - currentUserResult.amount).toFixed(2)}`
                : `You owe ${adminName} ₹${currentUserResult.amount.toFixed(2)}`
              }
            </h3>
            <p className="text-sm opacity-80">
              {isAdmin 
                ? "Total from all members except you."
                : "Based on your actual meal consumption."}
            </p>
          </div>
        )}

        {bill ? (
          <div className="bg-gray-50 p-4 rounded-lg mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border border-gray-200">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Bill</p>
              <p className="text-xl font-bold text-gray-900">₹{bill.totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Meals</p>
              <p className="text-xl font-bold text-gray-900">{totalMeals}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Cost / Meal</p>
              <p className="text-xl font-bold text-gray-900">₹{perMealCost.toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <p className="text-red-500 mb-4">Bill information not found for this month.</p>
        )}

        <h3 className="text-lg font-semibold mb-4">Member Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase tracking-widest">
                <th className="py-3 px-4 font-bold">Member</th>
                <th className="py-3 px-4 font-bold text-right">Meals</th>
                <th className="py-3 px-4 font-bold text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((result, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 ${result.userId === currentUser?.uid ? "bg-blue-50/30" : ""}`}>
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">{result.userName}</span>
                    {result.userId === currentUser?.uid && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                    {result.userId === club?.adminId && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-600">{result.mealCount}</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">
                    {result.userId === club?.adminId 
                      ? <span className="text-gray-400">Paid Bill</span>
                      : `Owes ₹${result.amount.toFixed(2)}`
                    }
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">No results found for this month.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
