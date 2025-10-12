import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-screen px-12 pt-[var(--big)] pb-[var(--small)] bg-black flex flex-col gap-12">
      <div className="flex gap-3 w-full">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="flex-1 flex flex-col gap-2">
            <div className="pb-[10px] ">
              <p className="text-white !font-bold">Section</p>
            </div>
            <div className="flex flex-col gap-[10px]">
              {[1, 2, 3].map((item) => (
                <p key={item} className="text-[#aaaaaa]">
                  Content {item}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-white" />

      <div className="w-full flex justify-center">
        <Image
          src="/Design Waterloo Lockup.svg"
          alt="Design Waterloo"
          width={930}
          height={234}
          className="w-full h-auto"
          priority
        />
      </div>

      <div className="flex justify-between items-start w-full">
        <div className="flex gap-4 items-center">
          <a href="https://www.instagram.com/designwaterloo/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://www.twitter.com/designwaterloo/" target="_blank" rel="noopener noreferrer">Twitter</a>
          <a href="https://www.linkedin.com/company/designwaterloo/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="#" target="_blank" rel="noopener noreferrer">Newsletter</a>
        </div>
        <div className="flex gap-4">
          <p className="text-white">Privacy Policy</p>
          <p className="text-white">© 2025 Design Waterloo</p>
        </div>
      </div>
    </footer>
  );
}
