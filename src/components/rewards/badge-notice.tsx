import { badgeName } from "@/lib/badges";
import { requireUser } from "@/server/auth/session";
import { listUnseenBadges } from "@/server/rewards/badges";
import { BadgeToast } from "./badge-toast";

/** Shows the unlock toast when the signed-in customer has new badges. */
export async function BadgeNotice({ path }: { path: string }) {
  const user = await requireUser(path);
  const keys = await listUnseenBadges(user.id);
  if (keys.length === 0) return null;
  return <BadgeToast keys={keys} names={keys.map(badgeName)} />;
}
