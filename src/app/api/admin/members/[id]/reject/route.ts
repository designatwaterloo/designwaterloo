import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin-guard";

interface Body {
  feedback?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("review");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }
  const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
  if (!feedback) {
    return NextResponse.json(
      { error: "Rejection feedback is required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("members")
    .update({
      review_status: "rejected",
      is_approved: false,
      rejection_feedback: feedback,
      rejected_at: new Date().toISOString(),
    })
    .eq("id", id).eq("review_status", "pending_review").select("id,slug").maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({error:"This submission is no longer awaiting review."},{status:409});
  revalidatePath("/directory");
  revalidatePath("/@" + data.slug);
  revalidatePath("/directory/" + data.slug);
  return NextResponse.json({ ok: true, memberId: id, reviewStatus: "rejected" });
}
