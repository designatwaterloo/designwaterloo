"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "@/components/Link";
import type { ProjectMember } from "@/sanity/types";

interface CreditsGridProps {
  members: ProjectMember[];
}

export default function CreditsGrid({ members }: CreditsGridProps) {
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

  // Group members by role for the sidebar
  const membersByRole = members.reduce((acc, { role, member }) => {
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, typeof members[0]["member"][]>);

  return (
    <section className="grid-section">
      {/* Sticky Left Sidebar */}
      <div className="col-span-4 sticky top-[calc(var(--small)*4)] self-start pr-[var(--smaller)] max-lg:col-span-full max-lg:static max-lg:pr-0 max-lg:mb-[var(--small)]">
        <div className="flex flex-col gap-[var(--small)]">
          <p className="text-[#7f7f7f]">Credits</p>

          {/* Group members by role */}
          {Object.entries(membersByRole).map(([role, roleMembers]) => (
            <div key={role} className="flex flex-col gap-1">
              <p className="text-[#7f7f7f]">{role}</p>
              {roleMembers.map((member) => (
                <Link
                  key={member._id}
                  href={`/directory/${member.slug?.current}`}
                  underline={false}
                  className="w-fit"
                  style={{ color: "var(--foreground)" }}
                  onMouseEnter={() => setHoveredMemberId(member._id)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                >
                  {member.firstName} {member.lastName}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right People Grid */}
      <div className="col-span-8 grid grid-cols-6 gap-[var(--gap)] max-lg:col-span-full max-lg:grid-cols-3">
        {members.map(({ role, member }) => {
          const memberImageUrl = member.profileImage?.asset?.url;
          const memberLqip = member.profileImage?.asset?.metadata?.lqip;
          const isHovered = hoveredMemberId === member._id;
          const isDimmed = hoveredMemberId && hoveredMemberId !== member._id;

          return (
            <Link
              key={member._id}
              href={`/directory/${member.slug?.current}`}
              className="flex flex-col gap-4 group transition-opacity duration-200"
              underline={false}
              onMouseEnter={() => setHoveredMemberId(member._id)}
              onMouseLeave={() => setHoveredMemberId(null)}
              style={{
                opacity: isDimmed ? 0.3 : 1,
              }}
            >
              {memberImageUrl ? (
                <Image
                  src={memberImageUrl}
                  alt={`${member.firstName} ${member.lastName}`}
                  width={300}
                  height={400}
                  className={`w-full aspect-[4/5] object-cover rounded bg-[#d9d9d9] transition-all duration-300 ${
                    isHovered ? "grayscale-0" : "grayscale"
                  } [@media(hover:hover)]:group-hover:grayscale-0`}
                  sizes="(max-width: 768px) 33vw, 12vw"
                  placeholder={memberLqip ? "blur" : "empty"}
                  blurDataURL={memberLqip}
                />
              ) : (
                <div className="w-full aspect-[4/5] rounded bg-[#d9d9d9]" />
              )}
              <div className="flex flex-col gap-0">
                <p className="text-[var(--foreground)]">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-[#7f7f7f]">{role}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
