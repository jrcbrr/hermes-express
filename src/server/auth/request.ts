/**
 * The client IP for rate limiting. Vercel sets x-forwarded-for (first entry is
 * the client); locally it may be missing, so everyone shares one bucket.
 */
export function clientIp(requestHeaders: Headers): string {
  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || requestHeaders.get("x-real-ip") || "unknown";
}

/** Reads a string field from a form, treating missing values as "". */
export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
