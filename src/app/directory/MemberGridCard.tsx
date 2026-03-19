import Link from "@/components/Link";
import ScrollReveal from "@/components/ScrollReveal";
import SkeletonImage from "@/components/SkeletonImage";
import { Member } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";

interface MemberGridCardProps {
  member: Member;
  index?: number;
}

export default function MemberGridCard({ member, index = 0 }: MemberGridCardProps) {
  return (
    <ScrollReveal index={index}>
      <Link
        href={`/directory/${member.slug.current}`}
        className="flex flex-col gap-4 group"
        underline={false}
      >
        {member.profileImage ? (
          <SkeletonImage
            src={urlFor(member.profileImage).width(400).height(500).url()}
            alt={`${member.firstName} ${member.lastName}`}
            width={400}
            height={500}
            className="aspect-[4/5] w-full object-cover rounded grayscale [@media(hover:hover)]:group-hover:grayscale-0 transition-[filter,opacity] duration-300"
            style={{ aspectRatio: "4 / 5" }}
          />
        ) : (
          <div className="aspect-[4/5] bg-skeleton rounded" />
        )}
        <div className="flex flex-col gap-0">
          <p className="text-[var(--foreground)]">
            {member.firstName} {member.lastName}
          </p>
          <p>{member.program}</p>
          <p className="py-2">{member.graduatingClass}</p>
        </div>
      </Link>
    </ScrollReveal>
  );
}
