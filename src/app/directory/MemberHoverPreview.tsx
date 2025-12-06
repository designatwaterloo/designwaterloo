import Image from "next/image";
import { Member } from "@/sanity/types";
import { urlFor, getBlurDataURL } from "@/sanity/lib/image";

interface MemberHoverPreviewProps {
  member: Member;
}

/**
 * MemberHoverPreview - Hover preview image for table rows
 *
 * Displays member profile image when hovering over table row
 */
export default function MemberHoverPreview({ member }: MemberHoverPreviewProps) {
  if (!member.profileImage) {
    return null;
  }

  return (
    <Image
      src={urlFor(member.profileImage).width(300).height(375).url()}
      alt={`${member.firstName} ${member.lastName}`}
      width={300}
      height={375}
      style={{ width: "100%", height: "auto", aspectRatio: "4/5", objectFit: "cover", borderRadius: "4px" }}
      placeholder={getBlurDataURL(member.profileImage) ? "blur" : "empty"}
      blurDataURL={getBlurDataURL(member.profileImage)}
    />
  );
}
