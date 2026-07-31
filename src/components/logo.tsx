import Image from "next/image";
import Link from "next/link";
import { BrandName } from "@/components/brand-name";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  href?: string;
  title?: boolean;
}

export function Logo({
  size = 40,
  className,
  href = "/",
  title = true,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("flex text-primary! items-center gap-2", className)}
    >
      <div className="bg-black rounded-full">
        <Image
          src="/logo.png"
          alt={`${APP_NAME} logo`}
          className="scale-105"
          width={size}
          height={size}
        />
      </div>
      {title && (
        <BrandName
          as="h3"
          className="text-xl font-semibold"
          suffixClassName="font-semibold"
          scriptClassName="font-bold text-2xl"
        />
      )}
    </Link>
  );
}
export default Logo;
