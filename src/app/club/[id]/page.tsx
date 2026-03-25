"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import Link from "next/link";

export default function ClubPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [mealStatus, setMealStatus] = useState<"ate" | "skipped" | "">("");
  const [memberStatuses, setMemberStatuses] = useState<Record<string, "ate" | "skipped"> | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<Record<string, "ate" | "skipped">>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      await loadClubData(params.id, currentUser.uid, date);
    });
    return () => unsubscribe();
  }, [router, params.id, date]);

  const loadClubData = async (clubId: string, uid: string, selectedDate: string) => {
    setLoading(true);
    
    // Load Club
    const clubSnap = await getDoc(doc(db, "clubs", clubId));
    if (!clubSnap.exists()) {
      router.push("/dashboard");
      return;
    }
    const clubData = clubSnap.data();
    setClub({ id: clubSnap.id, ...clubData });

    // Load Members
    const loadedMembers = [];
    for (const memberId of clubData.members) {
      const userSnap = await getDoc(doc(db, "users", memberId));
      if (userSnap.exists()) {
        loadedMembers.push({ id: userSnap.id, ...userSnap.data() });
      }
    }
    setMembers(loadedMembers);

    // Load all member statuses for selected date
    const statuses: Record<string, "ate" | "skipped"> = {};
    const mealsRef = collection(db, "meals");
    const q = query(mealsRef, where("clubId", "==", clubId), where("date", "==", selectedDate));
    const mealsSnap = await getDocs(q);
    
    mealsSnap.forEach(doc => {
      const data = doc.data();
      statuses[data.userId] = data.status;
    });
    
    setMemberStatuses(statuses);
    setMealStatus(statuses[uid] || "");

    // Load user's monthly history
    const monthPrefix = selectedDate.substring(0, 7);
    const historyQ = query(
      mealsRef, 
      where("clubId", "==", clubId), 
      where("userId", "==", uid)
    );
    const historySnap = await getDocs(historyQ);
    const history: Record<string, "ate" | "skipped"> = {};
    historySnap.forEach(doc => {
      const data = doc.data();
      if (data.date.startsWith(monthPrefix)) {
        history[data.date] = data.status;
      }
    });
    setMonthlyHistory(history);
    
    setLoading(false);
  };

  const handleStatusChange = async (status: "ate" | "skipped") => {
    if (!user || !club) return;
    
    const mealId = `${club.id}_${user.uid}_${date}`;
    await setDoc(doc(db, "meals", mealId), {
      clubId: club.id,
      userId: user.uid,
      date,
      status
    });
    setMealStatus(status);
    setMemberStatuses(prev => ({ ...prev, [user.uid]: status }));
    setMonthlyHistory(prev => ({ ...prev, [date]: status }));
  };

  const renderCalendar = () => {
    const selectedMonth = new Date(date);
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Add empty slots for days of week before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }
    
    // Add actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const status = monthlyHistory[dateStr];
      const isSelected = date === dateStr;
      
      days.push(
        <button
          key={d}
          onClick={() => setDate(dateStr)}
          className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-medium transition-all ${
            status === "ate" 
              ? "bg-green-500 text-white" 
              : status === "skipped" 
                ? "bg-red-500 text-white" 
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          } ${isSelected ? "ring-2 ring-blue-600 ring-offset-2" : ""}`}
        >
          {d}
        </button>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="h-10 w-10 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  if (loading) return <div className="p-8">Loading club data...</div>;

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Dashboard
          </Link>
          <h2 className="text-3xl font-bold">{club.name}</h2>
          <p className="text-gray-500 text-sm mt-1">Club ID: {club.id}</p>
        </div>
        
        <div className="flex gap-2">
          <Link 
            href={`/club/${club.id}/results?month=${date.substring(0, 7)}`}
            className="bg-blue-50 text-blue-600 px-4 py-2 rounded shadow-sm hover:bg-blue-100 font-medium"
          >
            View Monthly Split
          </Link>
          {club.adminId === user?.uid && (
            <Link 
              href={`/club/${club.id}/bill`}
              className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 font-medium"
            >
              Submit Bill
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Meal Entry</h3>
              
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected: {new Date(date).toLocaleDateString(undefined, { dateStyle: "long" })}</p>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleStatusChange("ate")}
                      className={`flex-1 py-3 rounded-lg font-medium border-2 transition-colors ${
                        mealStatus === "ate" 
                          ? "bg-green-50 border-green-500 text-green-700" 
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      I Ate
                    </button>
                    <button 
                      onClick={() => handleStatusChange("skipped")}
                      className={`flex-1 py-3 rounded-lg font-medium border-2 transition-colors ${
                        mealStatus === "skipped" 
                          ? "bg-red-50 border-red-500 text-red-700" 
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      I Skipped
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Monthly History</h3>
              <div className="flex justify-center">
                {renderCalendar()}
              </div>
              <div className="mt-4 flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span>Ate</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                  <span>Skipped</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-gray-100 rounded-full"></div>
                  <span>No Entry</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Group Status - {new Date(date).toLocaleDateString()}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {members.map(member => {
                const status = memberStatuses?.[member.id];
                return (
                  <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-sm">{member.name} {member.id === user?.uid && "(You)"}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      status === "ate" 
                        ? "bg-green-100 text-green-700" 
                        : status === "skipped" 
                          ? "bg-red-100 text-red-700" 
                          : "bg-gray-200 text-gray-500"
                    }`}>
                      {status === "ate" ? "Ate" : status === "skipped" ? "Skipped" : "Missing"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Club Members</h3>
            <ul className="divide-y divide-gray-100">
              {members.map(member => (
                <li key={member.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  {member.id === club.adminId && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Admin</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
