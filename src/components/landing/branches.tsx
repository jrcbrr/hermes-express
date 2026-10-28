import { Clock, MapPin } from "lucide-react";
import { siteConfig, type BranchService } from "@/config/site";
import { formatTime } from "@/lib/format";
import { Section } from "./section";

const serviceLabels: Record<BranchService, string> = {
  pickup: "Pickup",
  delivery: "Delivery",
};

export function Branches() {
  return (
    <Section
      id="branches"
      title="Visit a branch"
      intro="Three branches across Taguig, ready for pickup or delivery."
    >
      <ul className="grid gap-5 md:grid-cols-3">
        {siteConfig.branches.map((branch) => (
          <li
            key={branch.slug}
            className="rounded-2xl border bg-surface p-6 shadow-sm"
          >
            <h3 className="text-xl font-bold">{branch.name}</h3>
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {branch.address}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              {formatTime(branch.opensAt)} – {formatTime(branch.closesAt)}
            </p>
            <ul className="mt-4 flex gap-2" aria-label="Services">
              {branch.services.map((service) => (
                <li
                  key={service}
                  className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold"
                >
                  {serviceLabels[service]}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}
