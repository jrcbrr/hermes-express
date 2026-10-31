import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { accountMenuLinks } from "@/components/layout/nav-items";
import { ProfileForm } from "@/components/profile/profile-form";
import { BadgeList } from "@/components/rewards/badge-list";
import { Button } from "@/components/ui/button";
import { logOut } from "@/server/auth/actions";
import { requireUser } from "@/server/auth/session";
import { listEarnedBadges } from "@/server/rewards/queries";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 pb-28 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Your profile
      </h1>
      <Suspense
        fallback={
          <p className="mt-6 text-muted-foreground">Loading your profile…</p>
        }
      >
        <ProfileDetails />
      </Suspense>
    </div>
  );
}

async function ProfileDetails() {
  const user = await requireUser("/profile");
  // Profile itself is this page; the rest are shortcuts (useful on phones,
  // where the header account menu is hidden).
  const shortcuts = accountMenuLinks(user.role).filter(
    (link) => link.href !== "/profile",
  );

  const badges = await listEarnedBadges(user.id);

  return (
    <>
      <p className="mt-2 text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">{user.email}</span>
        {" · "}
        {user.pointsBalance ?? 0} points
      </p>

      <section
        aria-labelledby="details-heading"
        className="mt-8 rounded-2xl border bg-surface p-6"
      >
        <h2 id="details-heading" className="mb-4 text-lg font-bold">
          Contact details
        </h2>
        <ProfileForm
          initial={{
            name: user.name,
            phone: user.phone ?? "",
            defaultAddress: user.defaultAddress ?? "",
          }}
        />
      </section>

      <section aria-labelledby="badges-heading" className="mt-8">
        <h2 id="badges-heading" className="mb-3 text-lg font-bold">
          Badges
        </h2>
        <BadgeList earned={badges} />
      </section>

      <nav aria-label="Account" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {shortcuts.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form action={logOut} className="mt-8">
        <Button type="submit" variant="outline" size="lg" className="h-11 px-6">
          Log out
        </Button>
      </form>
    </>
  );
}
