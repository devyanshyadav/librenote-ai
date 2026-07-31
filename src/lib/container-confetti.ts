import confetti from "canvas-confetti";

const PURPLE_SOFT = ["#b4a7ff", "#c4b8f2", "#d8d0f8"];

let activeCleanup: (() => void) | null = null;

export function fireContainerConfetti(container: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  activeCleanup?.();

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:50";
  container.appendChild(canvas);

  const fire = confetti.create(canvas, { resize: true });

  fire({
    particleCount: 18,
    angle: 60,
    spread: 55,
    startVelocity: 16,
    gravity: 0.75,
    ticks: 110,
    origin: { x: 0.16, y: 0.28 },
    colors: PURPLE_SOFT,
    scalar: 0.55,
    shapes: ["circle"],
  });

  fire({
    particleCount: 18,
    angle: 120,
    spread: 55,
    startVelocity: 16,
    gravity: 0.75,
    ticks: 110,
    origin: { x: 0.84, y: 0.28 },
    colors: PURPLE_SOFT,
    scalar: 0.55,
    shapes: ["circle"],
  });

  const cleanupMs = 1500;
  const timeoutId = window.setTimeout(() => {
    canvas.remove();
    if (activeCleanup === cleanup) {
      activeCleanup = null;
    }
  }, cleanupMs);

  const cleanup = () => {
    window.clearTimeout(timeoutId);
    canvas.remove();
    if (activeCleanup === cleanup) {
      activeCleanup = null;
    }
  };

  activeCleanup = cleanup;
  return cleanup;
}
