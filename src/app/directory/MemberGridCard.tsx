import Image from "next/image";
import Link from "@/components/Link";
import { Member } from "@/sanity/types";
import { urlFor, getBlurDataURL } from "@/sanity/lib/image";

interface MemberGridCardProps {
  member: Member;
  onClick?: () => void;
}

/**
 * MemberGridCard - Grid card component for displaying a member
 *
 * Displays member profile image (4:5 aspect ratio), name, program, and graduating class
 */
export default function MemberGridCard({ member, onClick }: MemberGridCardProps) {
  return (
    <Link
      href={`/directory/${member.slug.current}`}
      className="flex flex-col gap-4 group"
      underline={false}
      onClick={onClick}
    >
      {member.profileImage ? (
        <Image
          src={urlFor(member.profileImage).width(400).height(500).url()}
          alt={`${member.firstName} ${member.lastName}`}
          width={400}
          height={400}
          className="aspect-[4/5] w-full object-cover rounded grayscale group-hover:grayscale-0 transition-all duration-300"
          placeholder={getBlurDataURL(member.profileImage) ? "blur" : "empty"}
          blurDataURL={getBlurDataURL(member.profileImage)}
        />
      ) : (
        <div className="aspect-[4/5] bg-[#d9d9d9] rounded" />
      )}
      <div className="flex flex-col gap-0">
        <p className="text-[var(--foreground)]">
          {member.firstName} {member.lastName}
        </p>
        <p>{member.program}</p>
        <p className="py-2">{member.graduatingClass}</p>
      </div>
    </Link>
  );
}
