import imageUrlBuilder from "@sanity/image-url";
import { client } from "./client";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import type { SanityImage } from "../types";

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source).format('webp');
}

export function getBlurDataURL(image: SanityImage | null | undefined): string | undefined {
  if (!image?.asset?.metadata?.lqip) {
    return undefined;
  }
  return image.asset.metadata.lqip;
}
