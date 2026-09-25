import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  getFamilyPasscode,
  safeEqual,
  sessionTokenFor,
} from "@/lib/auth/session";

// Slows down guessing. Not a real rate limit (serverless instances don't
// share memory), so pick a passcode that isn't trivially short.
const FAILURE_DELAY_MS = 800;

// POST /api/unlock - Exchange the family passcode for a session cookie
export async function POST(request: NextRequest) {
  try {
    const passcode = getFamilyPasscode();
    if (!passcode) {
      // Gate is switched off; nothing to unlock.
      return NextResponse.json({ ok: true });
    }

    const body = await request.json().catch(() => ({}));
    const attempt = typeof body?.passcode === "string" ? body.passcode.trim() : "";

    const [expected, given] = await Promise.all([
      sessionTokenFor(passcode),
      sessionTokenFor(attempt),
    ]);

    if (!attempt || !safeEqual(given, expected)) {
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, expected, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Error unlocking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
