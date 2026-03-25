"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  
  const [newClubName, setNewClubName] = useState("");
  const [joinClubId, setJoinClubId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      await loadUserData(currentUser.uid);
    });
    return () => unsubscribe();
  }, [router]);

  const loadUserData = async (uid: string) => {
    setLoading(true);
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      setUserData(data);
      
      // Load clubs
      const loadedClubs = [];
      for (const clubId of data.clubs || []) {
        const clubSnap = await getDoc(doc(db, "clubs", clubId));
        if (clubSnap.exists()) {
          loadedClubs.push({ id: clubSnap.id, ...clubSnap.data() });
        }
      }
      setClubs(loadedClubs);
    }
    setLoading(false);
  };

  const createClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName || !user) return;
    
    const clubId = Math.random().toString(36).substring(2, 9);
    
    await setDoc(doc(db, "clubs", clubId), {
      name: newClubName,
      adminId: user.uid,
      members: [user.uid]
    });
    
    await updateDoc(doc(db, "users", user.uid), {
      clubs: arrayUnion(clubId)
    });
    
    setNewClubName("");
    loadUserData(user.uid);
  };

  const joinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinClubId || !user) return;
    
    const clubRef = doc(db, "clubs", joinClubId);
    const clubSnap = await getDoc(clubRef);
    
    if (clubSnap.exists()) {
      await updateDoc(clubRef, {
        members: arrayUnion(user.uid)
      });
      await updateDoc(doc(db, "users", user.uid), {
        clubs: arrayUnion(joinClubId)
      });
      setJoinClubId("");
      loadUserData(user.uid);
    } else {
      alert("Club not found!");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Welcome, {userData?.name}</h2>
        <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">
          Log Out
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Your Clubs</h3>
          {clubs.length === 0 ? (
            <p className="text-gray-500 bg-gray-100 p-4 rounded">You haven't joined any clubs yet.</p>
          ) : (
            <ul className="space-y-3">
              {clubs.map((club) => (
                <li key={club.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{club.name}</h4>
                    <p className="text-xs text-gray-500">ID: {club.id} • {club.members?.length || 0} members</p>
                  </div>
                  <Link 
                    href={`/club/${club.id}`}
                    className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-100"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Create a Club</h3>
            <form onSubmit={createClub} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Club Name" 
                value={newClubName}
                onChange={e => setNewClubName(e.target.value)}
                required
                className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                Create
              </button>
            </form>
          </div>

          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Join a Club</h3>
            <form onSubmit={joinClub} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Club ID" 
                value={joinClubId}
                onChange={e => setJoinClubId(e.target.value)}
                required
                className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
              />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700">
                Join
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
