import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  getFamilyPasscode,
  isValidSession,
} from "@/lib/auth/session";

const PUBLIC_PATHS = new Set(["/unlock", "/api/unlock"]);

// Keeps strangers who find the deployment URL out of the app and, more
// importantly, out of the paid AI routes. Switched off until
// FAMILY_PASSCODE is set so a deploy can never lock the family out.
export async function proxy(request: NextRequest) {
  const passcode = getFamilyPasscode();
  if (!passcode) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSession(token, passcode)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals and static files (anything with an
  // extension: sw.js, manifest.json, icons, images), which the PWA needs
  // to load before the kid has unlocked.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
