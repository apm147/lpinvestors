import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isValidPassword } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!session || !isValidPassword(session)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/health|_next/static|_next/image|favicon.ico).*)"],
};
