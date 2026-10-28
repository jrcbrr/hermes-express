"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { BRANCH_COOKIE } from "@/lib/catalog";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const branchSlugs = siteConfig.branches.map((b) => b.slug);

const selectBranchSchema = z.object({
  branch: z
    .string()
    .refine((slug) => branchSlugs.includes(slug), "Unknown branch."),
});

/**
 * Remembers which branch the customer is browsing (used for sold-out labels
 * now, and as the default branch at checkout later). Anyone may call it: it
 * only stores a public preference on the caller's own browser.
 */
export async function selectBranch(formData: FormData): Promise<void> {
  const parsed = selectBranchSchema.safeParse({
    branch: formData.get("branch"),
  });
  if (!parsed.success) return;

  const store = await cookies();
  store.set(BRANCH_COOKIE, parsed.data.branch, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
