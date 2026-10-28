import { getAuth } from "@/lib/auth";

// Better Auth's HTTP endpoints (/api/auth/*). The app's own forms use server
// actions, but these stay available and are rate limited.
export function GET(request: Request) {
  return getAuth().handler(request);
}

export function POST(request: Request) {
  return getAuth().handler(request);
}
