export function ChatDateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-4">
      <span className="rounded-full bg-muted px-3 py-1 text-[11px] shadow-sm font-medium tracking-wide text-muted-foreground shadow-xs">
        {label}
      </span>
    </div>
  );
}
