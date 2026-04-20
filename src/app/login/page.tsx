import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[--text]">
      <Suspense fallback={<div className="min-h-screen bg-[#0a141f]" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
