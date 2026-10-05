import Image from "next/image";

export function CompanyLogo({ size = 40 }: { size?: number }) {
  return <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1" style={{width:size,height:size}}>
    <Image src="/logo.webp" alt="Red Shadow Designs logo" width={size} height={size} className="h-full w-full object-contain" priority unoptimized/>
  </span>;
}
