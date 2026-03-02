import { createClient } from "@sanity/client";

// Server-side only client with write access
// This should only be used in API routes, never in client components
export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-01-01",
  useCdn: false, // Must be false for mutations
  token: process.env.SANITY_API_TOKEN, // Write token
});
