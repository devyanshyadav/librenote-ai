/**
 * Long-lived Mermaid validation worker.
 *
 * Protocol (JSON lines on stdin/stdout):
 *   Request:  {"id":1,"code":"flowchart TD\\n  A --> B"}
 *   Response: {"id":1,"valid":true}
 *   Response: {"id":1,"valid":false,"error":"Parse error on line 2: ..."}
 */
import { createInterface } from "node:readline";
import { parseHTML } from "linkedom";

function setupBrowserGlobals() {
  const { window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
  window.location = new URL("https://localhost/");
  globalThis.window = window;
  globalThis.document = window.document;
}

async function bootstrapMermaid() {
  setupBrowserGlobals();
  await import("dompurify");

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
  });

  return mermaid;
}

function writeResponse(response) {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

const mermaid = await bootstrapMermaid();
const input = createInterface({ input: process.stdin });

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
    await mermaid.parse(diagram);
    writeResponse({ id, valid: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeResponse({ id, valid: false, error: message });
  }
});

input.on("close", () => {
  process.exit(0);
});
