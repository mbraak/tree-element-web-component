import "@testing-library/jest-dom/vitest";

interface JsdomError {
  message: string;
}

interface JsdomErrorEmitter {
  listeners(name: string): ((error: JsdomError) => void)[];
  on(name: string, listener: (error: JsdomError) => void): void;
  removeAllListeners(name: string): void;
}

// jsdom cannot parse the @layer rule in the injected stylesheet, and reports
// that on every test through its virtual console. The css is not used by the
// tests, so drop that one message and forward everything else as before.
const virtualConsole = (
  window as unknown as { jsdom?: { virtualConsole: JsdomErrorEmitter } }
).jsdom?.virtualConsole;

if (virtualConsole) {
  const forward = virtualConsole.listeners("jsdomError");
  virtualConsole.removeAllListeners("jsdomError");

  virtualConsole.on("jsdomError", (error) => {
    if (error.message.includes("Could not parse CSS stylesheet")) {
      return;
    }

    for (const listener of forward) {
      listener(error);
    }
  });
}
