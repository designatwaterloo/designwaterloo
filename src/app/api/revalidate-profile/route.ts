import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { slug?: string } | null;
    const slug = body?.slug;
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    // Only allow revalidation for your own profile page
    const { data: member } = await supabase
      .from("members")
      .select("slug")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!member || member.slug !== slug) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    revalidatePath(`/directory/${slug}`);
    revalidatePath("/directory");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

