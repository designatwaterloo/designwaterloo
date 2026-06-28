import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSchoolFromEmail } from "@/lib/supabase/auth-utils";
import { findClaimCandidates } from "@/lib/supabase/member-init";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClaimList from "./ClaimList";

export default async function ClaimPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/profile/edit");

  const fullName = (user.user_metadata?.full_name as string) || "";
  const school = getSchoolFromEmail(user.email!);
  const candidates = await findClaimCandidates(supabase, fullName, school);
  if (candidates.length === 0) redirect("/profile/edit");

  return (
    <div>
      <Header />
      <main className="w-full">
        <ClaimList candidates={candidates} />
      </main>
      <Footer />
    </div>
  );
}
