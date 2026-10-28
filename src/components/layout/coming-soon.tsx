import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";

type ComingSoonProps = {
  /** This page's path, so logged-out visitors return here after login. */
  path: string;
  title: string;
  message: string;
};

/**
 * A signed-in page whose feature arrives in a later stage. It still checks
 * the session on the server, like the finished page will.
 */
export function ComingSoon({ path, title, message }: ComingSoonProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 pb-28 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        {title}
      </h1>
      <Suspense>
        <SignedInMessage path={path} message={message} />
      </Suspense>
    </div>
  );
}

async function SignedInMessage({
  path,
  message,
}: Pick<ComingSoonProps, "path" | "message">) {
  await requireUser(path);
  return (
    <>
      <p className="mt-3 text-muted-foreground">{message}</p>
      <Link
        href="/"
        className={buttonVariants({
          variant: "outline",
          size: "lg",
          className: "mt-6 px-5",
        })}
      >
        Back to home
      </Link>
    </>
  );
}
