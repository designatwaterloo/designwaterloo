import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@sanity/client";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    // Check for Sanity token
    const token = process.env.SANITY_API_TOKEN;
    if (!token) {
      console.error("SANITY_API_TOKEN is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Debug: Log token info (first/last few chars only for security)
    console.log("Sanity config:", {
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      tokenPrefix: token.substring(0, 10),
      tokenLength: token.length,
    });

    // Verify user is authenticated
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create Sanity client with write access
    const sanityClient = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
      apiVersion: "2024-01-01",
      useCdn: false,
      token: token,
    });

    // Upload to Sanity
    const asset = await sanityClient.assets.upload("image", buffer, {
      filename: file.name,
      contentType: file.type,
    });

    // Generate the CDN URL from the asset
    // Asset ID format: image-{hash}-{dimensions}-{format}
    // We need to convert to: {hash}-{dimensions}.{format}
    const idParts = asset._id.replace("image-", "").split("-");
    const format = idParts.pop(); // Get the format (jpg, png, etc.)
    const hashAndDimensions = idParts.join("-");
    const imageUrl = `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/${hashAndDimensions}.${format}`;

    // Persist the new image URL on the member record. If this fails — error
    // OR zero rows matched (RLS denial / missing member row) — the upload did
    // NOT stick, and saying "success" here makes the photo silently revert on
    // reload. Verified 10/10 reproducible before this fix. Report the truth.
    let slug: string | null = null;
    try {
      const { data: updatedMember, error: updateError } = await supabase
        .from("members")
        .update({ profile_image_url: imageUrl })
        .eq("auth_user_id", user.id)
        .select("slug")
        .maybeSingle();

      if (updateError) {
        console.error("Failed to update member profile_image_url:", updateError);
        return NextResponse.json(
          { error: "Your photo was uploaded but couldn't be saved to your profile. Please try again." },
          { status: 500 },
        );
      }
      if (!updatedMember) {
        console.error(
          `Image upload persisted nothing: no member row matched auth_user_id ${user.id}`,
        );
        return NextResponse.json(
          { error: "Your photo couldn't be saved — we couldn't find your profile. Try refreshing the page." },
          { status: 409 },
        );
      }
      slug = updatedMember.slug;
    } catch (err) {
      console.error("Unexpected error updating member profile_image_url:", err);
      return NextResponse.json(
        { error: "Your photo was uploaded but couldn't be saved to your profile. Please try again." },
        { status: 500 },
      );
    }

    if (slug) {
      try {
        revalidatePath(`/directory/${slug}`);
        revalidatePath("/directory");
      } catch {}
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      assetId: asset._id,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to upload image: ${message}` },
      { status: 500 }
    );
  }
}
