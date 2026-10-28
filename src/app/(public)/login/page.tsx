import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LogInForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LogInPage() {
  return (
    <AuthCard
      title="Welcome back"
      intro="Log in to order, track your drinks and collect points."
    >
      {/* The form reads ?next= from the URL, which is only known per request. */}
      <Suspense>
        <LogInForm />
      </Suspense>
    </AuthCard>
  );
}
