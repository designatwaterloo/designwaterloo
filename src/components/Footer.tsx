import Image from "next/image";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={`${styles.footer} bg-black flex flex-col gap-12`}>
      <div className="flex gap-3 w-full max-lg:flex-col max-lg:gap-6">
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
          className="w-full h-auto max-[430.98px]:hidden"
          priority
        />
        <Image
          src="/Design Waterloo Wordmark.svg"
          alt="Design Waterloo"
          width={200}
          height={36}
          className="w-auto h-auto min-[431px]:hidden"
          priority
        />
      </div>

      <div className="flex justify-between items-start w-full max-lg:flex-col max-lg:gap-4">
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
