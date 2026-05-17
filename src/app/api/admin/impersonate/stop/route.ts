import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST /api/admin/impersonate/stop
//
// Restore the admin's original sb-* cookies from the dw-imp-stash-*
// snapshot taken by the start endpoint.  No admin gate — anyone with a
// stash should be able to recover their own session (it just hands them
// back what was theirs).
export async function POST() {
  const cookieStore = await cookies();

  // Collect stashed entries first.  We need the names+values BEFORE we
  // start mutating cookies, since cookieStore reads may reflect the latest
  // sets within the same handler.
  const stashed: { restoredName: string; value: string }[] = [];
  const allNames: string[] = [];
  cookieStore.getAll().forEach((c) => {
    allNames.push(c.name);
    if (c.name.startsWith("dw-imp-stash-")) {
      stashed.push({
        restoredName: c.name.replace(/^dw-imp-stash-/, ""),
        value: c.value,
      });
    }
  });

  if (stashed.length === 0) {
    return NextResponse.json(
      { error: "No impersonation session to stop" },
      { status: 400 },
    );
  }

  // Delete the impersonated user's sb-* cookies (current session).
  for (const name of allNames) {
    if (name.startsWith("sb-")) {
      cookieStore.set(name, "", { maxAge: 0, path: "/" });
    }
  }

  // Restore admin's original sb-* cookies.
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  for (const { restoredName, value } of stashed) {
    cookieStore.set(restoredName, value, cookieOptions);
  }

  // Clear stash and marker cookies.
  for (const name of allNames) {
    if (name.startsWith("dw-imp-stash-") || name === "dw-imp-as" || name === "dw-imp-by") {
      cookieStore.set(name, "", { maxAge: 0, path: "/" });
    }
  }

  return NextResponse.json({ ok: true, redirectTo: "/admin" });
}
