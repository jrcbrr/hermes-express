import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      intro="Save your favorite drinks, track orders and earn points with every cup."
    >
      {/* The form reads ?next= from the URL, which is only known per request. */}
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthCard>
  );
}
