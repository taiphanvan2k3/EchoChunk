import { NextRequest, NextResponse } from "next/server";
import { getAdminInstances } from "@/lib/server/admin";

// 14 days in milliseconds (Firebase maximum session cookie duration)
const SESSION_EXPIRES_IN = 14 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing or invalid idToken" }, { status: 400 });
    }

    const { auth } = getAdminInstances();
    if (!auth) {
      return NextResponse.json({ error: "Firebase Admin not configured on server" }, { status: 503 });
    }

    // Verify token and create a cryptographically signed session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 14 * 24 * 60 * 60
    });

    return res;
  } catch (error) {
    console.error("[Session API] Error creating session cookie:", error);
    return NextResponse.json({ error: "Failed to create session cookie" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.delete("__session");
    return res;
  } catch (error) {
    console.error("[Session API] Error clearing session cookie:", error);
    return NextResponse.json({ error: "Failed to clear session" }, { status: 500 });
  }
}
