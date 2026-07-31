import { NotebooksEmptyState } from "@/components/dashboard/notebooks-empty-state";
import { NotebooksError } from "@/components/dashboard/notebooks-error";
import { NotebooksGrid } from "@/components/dashboard/notebooks-grid";
import { NotebooksHeader } from "@/components/dashboard/notebooks-header";
import { NotebooksIntro } from "@/components/dashboard/notebooks-intro";
import { NotebooksLoading } from "@/components/dashboard/notebooks-loading";

export default function page() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-6xl animate-in space-y-8 px-6 py-12 duration-500 fade-in">
        <NotebooksIntro />
        <NotebooksHeader />
        <NotebooksLoading />
        <NotebooksError />
        <NotebooksGrid />
        <NotebooksEmptyState />
      </div>
    </div>
  );
}
