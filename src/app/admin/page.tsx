"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import Page from "@/components/shared/Page";
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

  if (verifyState !== "admin") {
    return (
      <Page>
        <div className="p-8">Verifying access…</div>
      </Page>
    );
  }

  return (
    <Page>
      <AdminDashboard />
    </Page>
  );
}
