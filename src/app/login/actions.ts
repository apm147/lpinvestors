"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, isValidPassword } from "@/lib/auth";

export async function login(_prevState: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");

  if (!isValidPassword(password)) {
    return "Incorrect password.";
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}
