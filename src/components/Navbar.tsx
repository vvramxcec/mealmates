"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Don't show Navbar on login page
  if (pathname === "/login") return null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            MealMates
          </Link>
          {user && (
            <nav className="hidden md:flex gap-4">
              <Link 
                href="/dashboard" 
                className={`text-sm font-medium ${pathname === "/dashboard" ? "text-blue-600" : "text-gray-500 hover:text-gray-900"}`}
              >
                Dashboard
              </Link>
            </nav>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-gray-500">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
