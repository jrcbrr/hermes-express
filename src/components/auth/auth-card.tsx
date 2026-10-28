import type { ReactNode } from "react";

/** Centered card used by the login and sign-up pages. */
export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 pb-28 md:items-center md:py-16">
      <section
        aria-labelledby="auth-heading"
        className="w-full max-w-md rounded-2xl border bg-surface p-6 shadow-sm md:p-8"
      >
        <h1
          id="auth-heading"
          className="font-heading text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          {title}
        </h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">{intro}</p>
        {children}
      </section>
    </div>
  );
}
