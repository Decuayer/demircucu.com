/**
 * Built-ins that pdf.js 6 (even its legacy build) calls without polyfilling them:
 *
 * - `ReadableStream.prototype[Symbol.asyncIterator]` / `values()`: `for await` over a stream in
 *   `getTextContent()` (text layer) and signature decompression. Missing in Safari, Chrome < 124.
 * - `Promise.withResolvers`: everywhere. Missing in Safari < 17.4, Chrome < 119.
 *
 * Plain script (no imports/exports): imported by the viewer before pdf.js, and prepended to the
 * worker by scripts/copy-pdfjs-assets.mjs. Idempotent; native implementations are kept.
 */
(function installPdfPolyfills(global) {
  if (typeof Promise.withResolvers !== "function") {
    Object.defineProperty(Promise, "withResolvers", {
      configurable: true,
      writable: true,
      value: function withResolvers() {
        let resolve;
        let reject;
        const promise = new this((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      },
    });
  }

  const Stream = global.ReadableStream;
  if (typeof Stream !== "function") return;
  const proto = Stream.prototype;

  if (typeof proto.values !== "function") {
    Object.defineProperty(proto, "values", {
      configurable: true,
      writable: true,
      value: function values(options) {
        const reader = this.getReader();
        const preventCancel = Boolean(options && options.preventCancel);
        let finished = false;
        const finish = () => {
          finished = true;
          reader.releaseLock();
        };
        return {
          next() {
            if (finished) return Promise.resolve({ done: true, value: undefined });
            return reader.read().then(
              (result) => {
                if (result.done) finish();
                return result.done ? { done: true, value: undefined } : result;
              },
              (error) => {
                finish();
                throw error;
              },
            );
          },
          return(value) {
            if (finished) return Promise.resolve({ done: true, value });
            const cancelled = preventCancel ? Promise.resolve() : reader.cancel(value);
            finish();
            return cancelled.then(() => ({ done: true, value }));
          },
          [Symbol.asyncIterator]() {
            return this;
          },
        };
      },
    });
  }

  if (typeof proto[Symbol.asyncIterator] !== "function") {
    Object.defineProperty(proto, Symbol.asyncIterator, {
      configurable: true,
      writable: true,
      value: proto.values,
    });
  }
})(globalThis);
