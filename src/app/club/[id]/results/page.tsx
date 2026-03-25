"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

// ✅ Proper types
type Result = {
  userId: string;
  userName: string;
  mealCount: number;
  amount: number;
};

type Club = {
  id: string;
  name: string;
  adminId: string;
};

type Bill = {
  totalAmount: number;
};

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = searchParams.get("month");

  const [club, setClub] = useState<Club | null>(null);
  const [adminName, setAdminName] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!month) {
      router.push(`/club/${params.id}`);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);
      await loadResults(params.id, month, user.uid);
    });

    return () => unsubscribe();
  }, [router, params.id, month]);

  const loadResults = async (clubId: string, targetMonth: string, currentUid: string) => {
    setLoading(true);

    // Load club
    const clubSnap = await getDoc(doc(db, "clubs", clubId));
    if (!clubSnap.exists()) {
      router.push("/dashboard");
      return;
    }

    const clubData = clubSnap.data();
    setClub({
      id: clubSnap.id,
      name: clubData.name,
      adminId: clubData.adminId,
    });

    // Load admin name
    const adminSnap = await getDoc(doc(db, "users", clubData.adminId));
    if (adminSnap.exists()) {
      setAdminName(adminSnap.data().name);
    }

    // Load bill
    const billSnap = await getDoc(doc(db, "bills", `${clubId}_${targetMonth}`));
    if (billSnap.exists()) {
      const billData = billSnap.data();
      setBill({
        totalAmount: billData.totalAmount,
      });
    }

    // Load results
    const resultsRef = collection(db, "results");
    const q = query(
      resultsRef,
      where("clubId", "==", clubId),
      where("month", "==", targetMonth)
    );

    const resultsSnap = await getDocs(q);

    const loadedResults: Result[] = [];

    for (const d of resultsSnap.docs) {
      const data = d.data();

      // Fetch user name
      const userSnap = await getDoc(doc(db, "users", data.userId));
      const userName = userSnap.exists()
        ? userSnap.data().name
        : "Unknown User";

      loadedResults.push({
        userId: data.userId,
        userName,
        mealCount: data.mealCount,
        amount: data.amount,
      });
    }

    // Sort safely
    setResults(loadedResults.sort((a, b) => b.amount - a.amount));
    setLoading(false);
  };

  if (loading) return <div className="p-8">Loading results...</div>;

  const totalMeals = results.reduce((sum, r) => sum + r.mealCount, 0);
  const perMealCost =
    totalMeals > 0 && bill ? bill.totalAmount / totalMeals : 0;

  const currentUserResult = results.find(
    (r) => r.userId === currentUser?.uid
  );

  const isAdmin = club?.adminId === currentUser?.uid;

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <Link
        href={`/club/${params.id}`}
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Back to Club
      </Link>

      <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Bill Split Results</h2>
        <p className="text-gray-600 mb-6">
          {club?.name} - {month}
        </p>

        {currentUserResult && bill && (
          <div
            className={`p-6 rounded-xl mb-8 border-2 ${
              isAdmin
                ? "bg-green-50 border-green-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <h3 className="text-lg font-bold mb-1">
              {isAdmin
                ? `You are owed ₹${(
                    bill.totalAmount - currentUserResult.amount
                  ).toFixed(2)}`
                : `You owe ${adminName} ₹${currentUserResult.amount.toFixed(
                    2
                  )}`}
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
              <p className="text-xs text-gray-500 font-bold uppercase">
                Total Bill
              </p>
              <p className="text-xl font-bold">
                ₹{bill.totalAmount.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Total Meals
              </p>
              <p className="text-xl font-bold">{totalMeals}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Cost / Meal
              </p>
              <p className="text-xl font-bold">
                ₹{perMealCost.toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-red-500 mb-4">
            Bill information not found for this month.
          </p>
        )}

        <h3 className="text-lg font-semibold mb-4">Member Breakdown</h3>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-xs text-gray-400 uppercase">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4 text-right">Meals</th>
              <th className="py-3 px-4 text-right">Settlement</th>
            </tr>
          </thead>

          <tbody>
            {results.map((result, idx) => (
              <tr key={idx}>
                <td className="py-4 px-4">
                  {result.userName}
                </td>
                <td className="py-4 px-4 text-right">
                  {result.mealCount}
                </td>
                <td className="py-4 px-4 text-right">
                  {result.userId === club?.adminId
                    ? "Paid Bill"
                    : `Owes ₹${result.amount.toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}