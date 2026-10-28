import { siteConfig } from "@/config/site";

// Placeholder home page for Stage 0. The full landing page arrives in Stage 1.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{siteConfig.name}</h1>
      <p className="text-lg text-muted-foreground">{siteConfig.tagline}</p>
      <p className="text-sm text-muted-foreground">{siteConfig.demoNotice}</p>
    </main>
  );
}
