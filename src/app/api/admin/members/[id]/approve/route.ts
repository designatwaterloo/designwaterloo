import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("review");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("members")
    .update({ review_status: "approved", is_approved: true, rejection_feedback: null, rejected_at: null })
    .eq("id", id).eq("review_status", "pending_review").select("id,slug").maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({error:"This submission is no longer awaiting review."},{status:409});
  revalidatePath("/directory");
  revalidatePath("/@" + data.slug);
  revalidatePath("/directory/" + data.slug);
  return NextResponse.json({ ok: true, memberId: id, reviewStatus: "approved" });
}
