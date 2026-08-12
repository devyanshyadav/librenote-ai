/**
 * Long-lived Mermaid validation worker.
 *
 * Validates by calling mermaid.render() (not mermaid.parse()) so that
 * server-side validation catches the same failures the client viewer does.
 * parse() only checks grammar; render() runs layout, which is where bad
 * C4 Rel() aliases and cyclic Sankey flows actually blow up.
 *
 * Protocol (JSON lines on stdin/stdout):
 *   Request:  {"id":1,"code":"flowchart TD\\n  A --> B"}
 *   Response: {"id":1,"valid":true}
 *   Response: {"id":1,"valid":false,"error":"Cannot read properties of undefined (reading 'x')"}
 *
 * No diagram-type-specific validation logic lives here — every diagram
 * type goes through the same mermaid.render() call. The polyfills below
 * exist purely to let Mermaid's real render path run in Node instead of a
 * browser; they don't know or care what diagram type they're serving.
 */
import { createInterface } from "node:readline";
import { parseHTML } from "linkedom";

function setupBrowserGlobals() {
  const { window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
  window.location = new URL("https://localhost/");

  globalThis.window = window;
  globalThis.document = window.document;

  // Node 21+ defines a read-only `navigator` global of its own. Mermaid
  // reads navigator off `window`, not `globalThis`, so we only need this
  // to succeed on older Node — swallow the failure otherwise.
  try {
    Object.defineProperty(globalThis, "navigator", {
      value: window.navigator,
      configurable: true,
    });
  } catch {
    // already defined and non-configurable — fine, window.navigator covers it
  }

  // --- SVG geometry -------------------------------------------------
  // linkedom has no layout engine, so every SVG element reports
  // undefined/zero size by default. Mermaid uses these numbers to place
  // nodes and edges; for validation we don't need them to be *accurate*,
  // just present and non-zero so downstream math doesn't divide by zero
  // or dereference `undefined`.
  const getBBoxStub = function () {
    return { x: 0, y: 0, width: 100, height: 100, w: 100, h: 100 };
  };
  window.SVGElement.prototype.getBBox = getBBoxStub;
  if (window.SVGGraphicsElement) {
    window.SVGGraphicsElement.prototype.getBBox = getBBoxStub;
  }
  window.SVGElement.prototype.getComputedTextLength = function () {
    return (this.textContent || "").length * 8;
  };
  window.SVGElement.prototype.getScreenCTM = function () {
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  };

  // linkedom leaves clientWidth/clientHeight/offsetWidth/offsetHeight as
  // `undefined`. Cytoscape (mermaid's mindmap layout engine) computes a
  // bounding box from these via parseFloat(getComputedStyle(...)), and
  // undefined/NaN there makes cytoscape's makeBoundingBox() silently
  // return undefined, crashing with "reading 'h' of undefined".
  for (const prop of ["clientWidth", "clientHeight", "offsetWidth", "offsetHeight"]) {
    Object.defineProperty(window.HTMLElement.prototype, prop, {
      configurable: true,
      get() {
        return 1000;
      },
    });
  }

  // --- getComputedStyle ----------------------------------------------
  // Must expose getPropertyValue (mindmap/cytoscape calls it directly)
  // and must NOT return "" for numeric-ish properties — cytoscape does
  // parseFloat(style.getPropertyValue('padding-left')), and parseFloat("")
  // is NaN, which cascades into the bounding-box bug above.
  const computedStyleStub = new Proxy(
    { getPropertyValue: () => "0px" },
    { get: (target, prop) => (prop in target ? target[prop] : "") },
  );
  window.getComputedStyle = () => computedStyleStub;
  globalThis.getComputedStyle = window.getComputedStyle;

  // --- CSSStyleSheet ---------------------------------------------------
  // Mermaid injects a <style> tag and reads back `.sheet` to insert rules.
  class FakeCSSStyleSheet {
    cssRules = [];
    insertRule(rule, index = this.cssRules.length) {
      this.cssRules.splice(index, 0, rule);
      return index;
    }
    deleteRule(index) {
      this.cssRules.splice(index, 1);
    }
  }
  globalThis.CSSStyleSheet = FakeCSSStyleSheet;
  window.CSSStyleSheet = FakeCSSStyleSheet;
  Object.defineProperty(window.HTMLStyleElement.prototype, "sheet", {
    configurable: true,
    get() {
      this._sheet ??= new FakeCSSStyleSheet();
      return this._sheet;
    },
  });

  // --- misc browser globals mermaid touches during render -------------
  window.screen = { width: 1920, height: 1080, availWidth: 1920, availHeight: 1080 };
  globalThis.screen = window.screen;

  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  // --- canvas 2D --------------------------------------------------------
  // Used for text measurement, and (for mindmap) by cytoscape's canvas
  // renderer. Importantly, cytoscape keeps a render loop going on a timer
  // *after* mermaid.render() has already resolved — any method it calls
  // that isn't stubbed throws asynchronously and, since this runs inside
  // a long-lived worker, takes the whole process down mid-service. Cover
  // the full drawing surface cytoscape touches, not just what today's
  // fixtures happen to hit.
  const noop = () => {};
  const fakeCanvasContext = {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    measureText(text) {
      return { width: (text || "").length * 7 };
    },
    fillText: noop,
    strokeText: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    save: noop,
    restore: noop,
    scale: noop,
    translate: noop,
    rotate: noop,
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    drawImage: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    getImageData: () => ({ data: [] }),
    putImageData: noop,
    setLineDash: noop,
    getLineDash: () => [],
  };
  window.HTMLCanvasElement.prototype.getContext = function (type) {
    return type === "2d" ? fakeCanvasContext : null;
  };
}

async function bootstrapMermaid() {
  setupBrowserGlobals();
  await import("dompurify");

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    // Render throws the real error instead of drawing an error diagram
    // into the DOM — which would need even more polyfills to not crash.
    suppressErrorRendering: true,
  });

  return mermaid;
}

function writeResponse(response) {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

// Defensive net: cytoscape's background render loop (see canvas comment
// above) or any other stray async callback from a diagram type we
// haven't hit in testing should not be allowed to kill a worker that may
// have other in-flight or future requests. Log and keep going instead.
process.on("uncaughtException", (error) => {
  console.error("[mermaid-validator] uncaught exception (worker staying alive):", error);
});
process.on("unhandledRejection", (reason) => {
  console.error("[mermaid-validator] unhandled rejection (worker staying alive):", reason);
});

const mermaid = await bootstrapMermaid();
const input = createInterface({ input: process.stdin });
let renderCounter = 0;

input.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch {
    writeResponse({
      id: null,
      valid: false,
      error: "Invalid validation request.",
    });
    return;
  }

  const { id, code } = request;

  if (typeof id !== "number" || typeof code !== "string") {
    writeResponse({
      id: id ?? null,
      valid: false,
      error: "Invalid validation request.",
    });
    return;
  }

  const diagram = code.trim();

  if (!diagram) {
    writeResponse({ id, valid: false, error: "Diagram code is empty." });
    return;
  }

  try {
    // A unique id per render call — mermaid.render() is keyed by id, and
    // this worker serves many requests over its lifetime.
    await mermaid.render(`validate-${renderCounter++}`, diagram);
    writeResponse({ id, valid: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeResponse({ id, valid: false, error: message });
  }
});

input.on("close", () => {
  process.exit(0);
});