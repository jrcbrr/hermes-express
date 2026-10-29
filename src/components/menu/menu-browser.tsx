"use client";

import { useMemo, useState, type ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { branchCookieString, type MenuSection } from "@/lib/catalog";
import { BranchPicker } from "./branch-picker";
import { MenuSections } from "./menu-sections";
import { MenuUnavailable } from "./menu-unavailable";

/**
 * The interactive part of /menu. The server sends the sold-out list of every
 * branch up front, so switching branches only re-labels the cards here in the
 * browser: no network request, no waiting. The choice is saved in a cookie so
 * the server shows the same branch after a reload.
 */
export function MenuBrowser({
  initialBranch,
  sections,
  soldOutByBranch,
  children,
}: {
  initialBranch: string;
  /** Null when the catalog could not be loaded. */
  sections: MenuSection[] | null;
  soldOutByBranch: Record<string, string[]>;
  /** Shown between the branch picker and the menu. */
  children?: ReactNode;
}) {
  const [branch, setBranch] = useState(initialBranch);

  const shown = useMemo(() => {
    if (!sections) return null;
    const soldOut = new Set(soldOutByBranch[branch] ?? []);
    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        isSoldOut: soldOut.has(item.slug),
      })),
    }));
  }, [sections, soldOutByBranch, branch]);

  function choose(slug: string) {
    setBranch(slug);
    document.cookie = branchCookieString(
      slug,
      window.location.protocol === "https:",
    );
  }

  const branchName = siteConfig.branches.find((b) => b.slug === branch)?.name;

  return (
    <>
      <div className="mt-6">
        <BranchPicker selected={branch} onSelect={choose} />
      </div>
      {/* Tells screen reader users the labels below have changed. */}
      <p aria-live="polite" className="sr-only">
        Showing availability at {branchName}.
      </p>
      {children}
      {shown ? <MenuSections sections={shown} /> : <MenuUnavailable />}
    </>
  );
}
