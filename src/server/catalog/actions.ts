"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { BRANCH_COOKIE, BRANCH_COOKIE_MAX_AGE_SECONDS } from "@/lib/catalog";

const branchSlugs = siteConfig.branches.map((b) => b.slug);

const selectBranchSchema = z.object({
  branch: z
    .string()
    .refine((slug) => branchSlugs.includes(slug), "Unknown branch."),
});

/**
 * Remembers which branch the customer is browsing (used for sold-out labels
 * now, and as the default branch at checkout later). Once JavaScript has
 * loaded, the branch picker switches instantly in the browser instead; this
 * action is the fallback before then. Anyone may call it: it only stores a
 * public preference on the caller's own browser.
 */
export async function selectBranch(formData: FormData): Promise<void> {
  const parsed = selectBranchSchema.safeParse({
    branch: formData.get("branch"),
  });
  if (!parsed.success) return;

  const store = await cookies();
  store.set(BRANCH_COOKIE, parsed.data.branch, {
    path: "/",
    maxAge: BRANCH_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    // The browser rewrites this cookie itself when switching branches.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
