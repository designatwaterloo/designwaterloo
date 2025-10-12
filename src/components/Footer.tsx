import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-screen px-12 py-12 bg-white flex flex-col gap-12 h-[699px]">
      <div className="flex gap-3 w-full">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="flex-1 flex flex-col gap-2">
            <div className="border-b-2 border-[dimgrey] pb-[10px]">
              <p className="text-black">Section</p>
            </div>
            <div className="flex flex-col gap-[10px]">
              {[1, 2, 3].map((item) => (
                <p key={item} className="text-[dimgrey]">
                  Content {item}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-black" />

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
          <a href="#" className="text-black">Instagram</a>
          <a href="#" className="text-black">Twitter</a>
          <a href="#" className="text-black">LinkedIn</a>
          <p className="text-black">Newsletter</p>
        </div>
        <div className="flex gap-4">
          <p className="text-black">Privacy Policy</p>
          <p className="text-black">© 2025 Design Waterloo</p>
        </div>
      </div>
    </footer>
  );
}
