import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  // Directory approval does not opt a member into sitemap discovery.
  return ["/", "/about", "/directory"].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));
}
