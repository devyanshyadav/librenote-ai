import { APP_NAME_LIBRE, APP_NAME_SUFFIX } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BrandNameProps = {
  className?: string;
  scriptClassName?: string;
  suffixClassName?: string;
  as?: "span" | "h1" | "h2" | "h3";
};

export function BrandName({
  className,
  scriptClassName,
  suffixClassName,
  as: Tag = "span",
}: BrandNameProps) {
  return (
    <Tag className={cn("text-nowrap", className)}>
      <span className={cn("font-script font-bold!", scriptClassName)}>
        {APP_NAME_LIBRE}
      </span>
      <span className={" italic"}>{APP_NAME_SUFFIX}</span>
    </Tag>
  );
}
