/**
 * Migration script: Sanity → Supabase
 *
 * Run with: npx tsx scripts/migrate-sanity-to-supabase.ts
 *
 * This script:
 * 1. Fetches all members from Sanity
 * 2. Inserts them into Supabase (without auth_user_id - they'll claim profiles later)
 * 3. Migrates experience and leadership data
 */

import { createClient as createSanityClient } from "@sanity/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const sanityClient = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for migration
);

// Convert Sanity portable text to plain text
function portableTextToPlain(blocks: any[]): string | null {
  if (!blocks || !Array.isArray(blocks)) return null;

  return blocks
    .map((block) => {
      if (block._type !== "block" || !block.children) return "";
      return block.children.map((child: any) => child.text || "").join("");
    })
    .filter(Boolean)
    .join("\n\n");
}

async function migrate() {
  console.log("🚀 Starting Sanity → Supabase migration...\n");

  // Fetch all members from Sanity with full data
  const sanityMembers = await sanityClient.fetch(`
    *[_type == "member"] {
      _id,
      memberId,
      firstName,
      lastName,
      "slug": slug.current,
      profileImage {
        asset-> {
          _id,
          url
        }
      },
      school,
      program,
      graduatingClass,
      bio,
      publicEmail,
      schoolEmail,
      instagram,
      twitter,
      linkedin,
      github,
      portfolio,
      behance,
      dribbble,
      specialties,
      workSchedule,
      experience[] {
        positionTitle,
        company,
        startMonth,
        startYear,
        isCurrent
      },
      leadership[] {
        positionTitle,
        "org": organization->name,
        startMonth,
        startYear,
        isCurrent
      }
    }
  `);

  console.log(`Found ${sanityMembers.length} members in Sanity\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const member of sanityMembers) {
    // Check if member already exists in Supabase (by slug or school_email)
    const { data: existing } = await supabase
      .from("members")
      .select("id, slug")
      .or(`slug.eq.${member.slug},school_email.eq.${member.schoolEmail || ""}`)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  Skipping ${member.firstName} ${member.lastName} (already exists)`);
      skipCount++;
      continue;
    }

    // Convert bio from portable text to plain text
    const bioText = portableTextToPlain(member.bio);

    // Get profile image URL (keep Sanity CDN URL for now)
    const profileImageUrl = member.profileImage?.asset?.url || null;

    // Insert member
    const { data: insertedMember, error: memberError } = await supabase
      .from("members")
      .insert({
        // No auth_user_id - they'll claim via email match later
        first_name: member.firstName,
        last_name: member.lastName,
        slug: member.slug,
        profile_image_url: profileImageUrl,
        school: member.school,
        program: member.program || null,
        graduating_class: member.graduatingClass || null,
        bio: bioText,
        public_email: member.publicEmail || null,
        school_email: member.schoolEmail || `${member.slug}@placeholder.edu`,
        instagram: member.instagram || null,
        twitter: member.twitter || null,
        linkedin: member.linkedin || null,
        github: member.github || null,
        portfolio: member.portfolio || null,
        behance: member.behance || null,
        dribbble: member.dribbble || null,
        specialties: member.specialties || [],
        work_schedule: member.workSchedule || [],
        onboarding_completed: true, // Existing members are complete
      })
      .select()
      .single();

    if (memberError) {
      console.error(`❌ Failed to insert ${member.firstName} ${member.lastName}:`, memberError.message);
      errorCount++;
      continue;
    }

    // Insert experiences
    if (member.experience?.length) {
      const { error: expError } = await supabase.from("member_experiences").insert(
        member.experience.map((exp: any) => ({
          member_id: insertedMember.id,
          position_title: exp.positionTitle || null,
          company: exp.company,
          start_month: exp.startMonth || null,
          start_year: exp.startYear || null,
          is_current: exp.isCurrent || false,
        }))
      );

      if (expError) {
        console.warn(`  ⚠️  Failed to insert experiences for ${member.firstName}:`, expError.message);
      }
    }

    // Insert leadership
    if (member.leadership?.length) {
      const { error: leadError } = await supabase.from("member_leadership").insert(
        member.leadership.map((lead: any) => ({
          member_id: insertedMember.id,
          position_title: lead.positionTitle || null,
          organization: lead.org || "Unknown",
          start_month: lead.startMonth || null,
          start_year: lead.startYear || null,
          is_current: lead.isCurrent || false,
        }))
      );

      if (leadError) {
        console.warn(`  ⚠️  Failed to insert leadership for ${member.firstName}:`, leadError.message);
      }
    }

    console.log(`✅ Migrated: ${member.firstName} ${member.lastName}`);
    successCount++;
  }

  console.log("\n📊 Migration Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log("\n🎉 Migration complete!");
}

migrate().catch(console.error);
