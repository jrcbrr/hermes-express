import { AtSign, Mail, Phone } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { siteConfig } from "@/config/site";
import { formatTime } from "@/lib/format";

const linkClass =
  "inline-flex items-center gap-2 rounded-sm text-accent underline-offset-4 hover:underline";

export function SiteFooter() {
  const { contacts, branches } = siteConfig;

  return (
    // Extra bottom padding on phones so the fixed tab bar never covers the footer.
    <footer className="border-t bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1.6fr] md:px-6">
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-heading text-lg font-extrabold">
            <LogoMark className="size-7 text-primary" />
            {siteConfig.name}
          </p>
          <p className="text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>

        <section aria-labelledby="footer-contact" className="space-y-3">
          <h2 id="footer-contact" className="text-base font-bold">
            Contact us
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href={contacts.instagram.url}
                className={linkClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                <AtSign className="size-4" aria-hidden="true" />
                <span>
                  Instagram {contacts.instagram.handle}
                  <span className="sr-only"> (opens in a new tab)</span>
                </span>
              </a>
            </li>
            <li>
              <a href={`tel:${contacts.phone.raw}`} className={linkClass}>
                <Phone className="size-4" aria-hidden="true" />
                {contacts.phone.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${contacts.email}`} className={linkClass}>
                <Mail className="size-4" aria-hidden="true" />
                {contacts.email}
              </a>
            </li>
          </ul>
        </section>

        <section aria-labelledby="footer-branches" className="space-y-3">
          <h2 id="footer-branches" className="text-base font-bold">
            Our branches
          </h2>
          <ul className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {branches.map((branch) => (
              <li key={branch.slug}>
                <p className="font-semibold">{branch.name}</p>
                <p className="text-muted-foreground">{branch.address}</p>
                <p className="text-muted-foreground">
                  {formatTime(branch.opensAt)} – {formatTime(branch.closesAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between md:px-6">
          <p>© {siteConfig.name}</p>
          <p>{siteConfig.demoNotice}</p>
        </div>
      </div>
    </footer>
  );
}
