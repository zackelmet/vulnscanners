"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/lib/context/AuthContext";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useAuth();
  const [verifyState, setVerifyState] = useState<
    "checking" | "admin" | "denied"
  >("checking");

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!currentUser) {
      router.replace("/login?next=/admin");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/auth/isAdmin", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({ isAdmin: false }));
        if (res.ok && data.isAdmin === true) {
          setVerifyState("admin");
        } else {
          setVerifyState("denied");
          router.replace("/app/dashboard");
        }
      } catch {
        if (!cancelled) {
          setVerifyState("denied");
          router.replace("/app/dashboard");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isLoadingAuth, router]);

  return (
    <DashboardLayout>
      {verifyState === "admin" ? (
        <AdminDashboard />
      ) : (
        <div className="p-8 text-[#9aa5b6] bg-[#07090d] min-h-screen">
          Verifying access…
        </div>
      )}
    </DashboardLayout>
  );
}
