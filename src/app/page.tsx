"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex justify-center items-center h-64">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
