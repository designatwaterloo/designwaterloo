import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
export interface MemberInitResult {
  outcome: "linked" | "created";
  slug: string;
  onboardingCompleted: boolean;
}

export async function findOrInitMember(
  supabase: SupabaseClient<Database>,
): Promise<MemberInitResult> {
  // Only verified server-side identity can link an account to an existing profile.
  const { data, error } = await supabase.rpc("ensure_member", {});
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profile setup did not return a result. Please retry.");
  return data as MemberInitResult;
}
