import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";

export default function WorkDetail({ params }: { params: { slug: string } }) {
  return (
    <div>
      <Header />

      <main>
        <section className="grid-section !gap-y-[var(--small)]">
          <h1 className="project-name col-span-full">{params.slug}</h1>

          {/* Project Info */}
          <div className="col-span-full grid grid-cols-12 gap-x-[var(--gap)] gap-y-1">
            <p className="uppercase text-[#7f7f7f] col-span-2 col-start-1">Client</p>
            <p className="col-span-2 col-start-3">Placeholder Client</p>

            <p className="uppercase text-[#7f7f7f] col-span-2 col-start-1">Date</p>
            <p className="col-span-2 col-start-3">Spring 2025</p>

            <p className="uppercase text-[#7f7f7f] col-span-2 col-start-1">Category</p>
            <p className="col-span-2 col-start-3">Design</p>
          </div>
        </section>
      </main>

      {/* Full Width Image Section */}
      <section className="relative max-h-screen overflow-hidden p-0">
        <Image
          src="/NYA00500-3.png"
          alt="Project showcase"
          width={1920}
          height={1080}
          className="w-full h-auto max-h-screen object-cover bg-gray-200"
          style={{ display: 'block' }}
          priority
          sizes="100vw"
        />
      </section>

      {/* Sticky Sidebar Section */}
      <section className="grid-section">
        {/* Sticky Left Sidebar */}
        <div className="col-span-4 sticky top-[calc(var(--small)*4)] self-start pr-[var(--smaller)]">
          <div className="flex flex-col gap-[var(--small)]">
            <h1>{params.slug}</h1>
            <div>
              <p className="uppercase text-[#7f7f7f] mb-2">Year</p>
              <p>20XX</p>
            </div>

            <div>
              <p className="uppercase text-[#7f7f7f] mb-2">About</p>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>

            <div>
              <p className="uppercase text-[#7f7f7f] mb-2">Services</p>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>
          </div>
        </div>

        {/* Right Scrollable Images */}
        <div className="col-span-8 flex flex-col gap-[var(--gap)]">
          <Image
            src="/NYA00500-3.png"
            alt="Project image"
            width={1920}
            height={1080}
            className="w-full h-auto bg-gray-200"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
          <Image
            src="/NYA00500-3.png"
            alt="Project image"
            width={1920}
            height={1080}
            className="w-full h-auto bg-gray-200"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
          <Image
            src="/NYA00500-3.png"
            alt="Project image"
            width={1920}
            height={1080}
            className="w-full h-auto bg-gray-200"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
          <Image
            src="/NYA00500-3.png"
            alt="Project image"
            width={1920}
            height={1080}
            className="w-full h-auto bg-gray-200"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
          <Image
            src="/NYA00500-3.png"
            alt="Project image"
            width={1920}
            height={1080}
            className="w-full h-auto bg-gray-200"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
        </div>
      </section>

      {/* Credits Section */}
      <section className="grid-section">
        {/* Sticky Left Sidebar */}
        <div className="col-span-4 sticky top-[calc(var(--small)*4)] self-start pr-[var(--smaller)]">
          <div className="flex flex-col gap-[var(--small)]">
            <h1>Credits</h1>
            <div>
              <p className="uppercase text-[#7f7f7f] mb-2">Design</p>
              <p>Sheffield Wong</p>
              <p>Brayden Petersen</p>
            </div>
          </div>
        </div>

        {/* Right People Grid */}
        <div className="col-span-8 grid grid-cols-6 gap-[var(--gap)]">
          {/* Person 1 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Product Designer</p>
          </div>

          {/* Person 2 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 3 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 4 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 5 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>

          {/* Person 6 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/NYA00500-3.png"
              alt="Sheffield Wong"
              width={300}
              height={400}
              className="w-full aspect-[3/4] object-cover rounded bg-gray-200"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 12vw"
            />
            <p className="font-semibold">Sheffield Wong</p>
            <p className="text-[#7f7f7f]">Design</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
