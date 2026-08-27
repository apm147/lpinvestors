import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "lpi_session";

export function isValidPassword(password: string): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    throw new Error("AUTH_PASSWORD is not set");
  }
  return password === expected;
}

// The whole app is one shared-password admin tool, not multi-user auth,
// so the cookie value is just the password itself (same simplification
// dtfunding/founderfluence use) -- there's no per-user session to
// distinguish.
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return !!session && isValidPassword(session);
}

// The proxy check is optimistic only, not a real security boundary on its
// own -- Server Functions are reachable directly via POST even if a proxy
// matcher excludes their route. Every mutating Server Function must call
// this itself.
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}
