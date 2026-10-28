import type { Role } from "@/lib/roles";
import { requireRole } from "@/server/auth/session";

type StaffPlaceholderProps = {
  roles: readonly Role[];
  path: string;
  title: string;
  stage: string;
};

/** Guards a staff area and shows a short "coming soon" note. */
export async function StaffPlaceholder({
  roles,
  path,
  title,
  stage,
}: StaffPlaceholderProps) {
  const user = await requireRole(roles, path);
  return (
    <>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        {title}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Welcome, {user.name}. This area arrives in {stage}.
      </p>
    </>
  );
}
