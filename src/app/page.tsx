import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import Link from "@/components/Link";
import SkeletonImage from "@/components/SkeletonImage";
import ScrollReveal from "@/components/ScrollReveal";
import { createClient } from "@/lib/supabase/server";
import { Member } from "@/types/database";

export const revalidate = 30;

export default async function Home() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("members")
    .select("id, member_id, first_name, last_name, slug, profile_image_url")
    .eq("onboarding_completed", true)
    .eq("is_approved", true);

  const allMembers = (data || []) as Pick<Member, "id" | "member_id" | "first_name" | "last_name" | "slug" | "profile_image_url">[];

  // Show random 24 members (will be different on each build)
  const members = allMembers
    .sort(() => Math.random() - 0.5)
    .slice(0, 24);

  return (
    <div className="w-full">
      <Header />

      {/* Main Content */}
      <main className="w-full">
        {/* Hero Section */}
        <section className="w-full px-[var(--margin)] pb-12 sm:pb-0 flex flex-col gap-8 sm:gap-12">
          {/* Wordmark */}
          <div className="w-full">
            <img 
              src="/Design Waterloo Wordmark Horizontal.svg" 
              alt="Design Waterloo" 
              className="w-full h-auto"
            />
          </div>

          {/* Mobile: Heading */}
          <h1 className="hero-heading sm:hidden">
            The home for design talent at Waterloo, and where to find them.
          </h1>

          <div className="flex flex-col items-start sm:grid sm:grid-cols-12 gap-[var(--gap)] w-full sm:items-center">
            <h1 className="hero-heading hidden sm:block sm:col-span-6">
              The home for design talent at Waterloo, and where to find them.
            </h1>
            <div className="flex flex-row-reverse sm:flex-row gap-[var(--tinier)] sm:gap-[var(--gap)] justify-start sm:col-span-6 sm:justify-end">
              <Button href="https://docs.google.com/forms/d/e/1FAIpQLSe39IpLj1jdWg54ZTnOlKrcDbitAfCq3G1Y7r7YPoFL1vyJCw/viewform?usp=sharing&ouid=111313787204079300834" variant="secondary" target="_blank">Get involved</Button>
              <Button href="/directory" variant="primary" icon="/Search.svg" iconAlt="Search">Find talent</Button>
            </div>
          </div>

          <div 
            className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative bg-[var(--black)]"
            style={{
              backgroundImage: 'url(https://vumbnail.com/1146446016.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <iframe
              src="https://player.vimeo.com/video/1146446016?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              title="BYODP | Design Waterloo & Figma"
            />
          </div>

          <p className="jumbo">
            Design Waterloo is an open collective dedicated to nurturing <span>exceptional</span> designers*, artists, filmmakers, engineers, and creatives at the <a href="https://uwaterloo.ca?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className="underline decoration-solid [text-underline-offset:8%]">University of Waterloo</a> and <a href="https://wlu.ca?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className="underline decoration-solid [text-underline-offset:8%]">Wilfrid Laurier University</a>. We&apos;re committed to advancing design excellence at Waterloo, and letting the world know about it.
          </p>
          
        </section>

        {/* Description Section - Desktop Only Spacing */}
        <section className="w-full px-[var(--margin)] py-[120px] pb-0 hidden sm:block"></section>

        {/* Directory Section */}
        <section id="directory" className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="section-divider">
            <p className="section-label">Directory</p>
          </div>

          <div className="flex gap-[var(--gap)] w-full max-lg:flex-col max-lg:gap-6">
            <div className="flex-1">
              <h2>The biggest design family on campus.</h2>
            </div>
            <p className="flex-1">
              Browse our directory to discover exceptional designers, developers, and creatives. Find talent for your next project or connect with fellow designers in the Waterloo community.
            </p>
          </div>

          <div className="grid grid-cols-8 gap-[var(--gap)] w-full max-lg:grid-cols-4">
            {members.map((member, index) => (
              <ScrollReveal key={member.id} index={index}>
                <Link
                  href={`/directory/${member.slug}`}
                  className="group"
                  underline={false}
                  data-cursor="internal-link"
                  data-cursor-label={`${member.first_name} ${member.last_name} →`}
                >
                  {member.profile_image_url ? (
                    <SkeletonImage
                      src={member.profile_image_url}
                      alt={`${member.first_name} ${member.last_name}`}
                      width={400}
                      height={500}
                      className="aspect-[4/5] w-full object-cover rounded grayscale [@media(hover:hover)]:group-hover:grayscale-0 transition-[filter] duration-300"
                    />
                  ) : (
                    <div className="aspect-[4/5] bg-skeleton rounded" />
                  )}
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <div className="flex justify-center">
            <Button href="/directory" variant="secondary">View directory</Button>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
