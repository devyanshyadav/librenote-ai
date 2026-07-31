export function NotebookChatBackground() {
  return (
    <>
      <div
        className="absolute inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage: `
              linear-gradient(45deg, transparent 49%, var(--color-primary) 49%, var(--color-primary) 51%, transparent 51%),
              linear-gradient(-45deg, transparent 49%, var(--color-primary) 49%, var(--color-primary) 51%, transparent 51%)
            `,
          backgroundSize: "40px 40px",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-0 opacity-15"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 90%, transparent 40%, var(--color-primary) 100%)",
        }}
      />
    </>
  );
}
