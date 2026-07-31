import { BrandName } from "@/components/brand-name";
import { APP_TAGLINE } from "@/lib/constants";

export function NotebooksIntro() {
  return (
    <header className="space-y-2">
      <BrandName
        as="h1"
        className="text-3xl font-semibold tracking-tight"
        suffixClassName="font-semibold"
        scriptClassName="text-4xl"
      />
      <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base">
        {APP_TAGLINE}
      </p>
    </header>
  );
}
