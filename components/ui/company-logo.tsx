import Image from "next/image";

export function CompanyLogo({ size = 40 }: { size?: 40 | 44 }) {
  return (
    <span className={`company-logo company-logo--${size}`}>
      <Image
        src="/logo.webp"
        alt="Red Shadow Designs logo"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority
        unoptimized
      />
    </span>
  );
}
