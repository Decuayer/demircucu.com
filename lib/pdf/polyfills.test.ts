// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(__dirname, "polyfills.js"), "utf8");

/** A realm like Safari's: streams without async iteration, no Promise.withResolvers. */
function oldRealm() {
  class Stream<T> extends NodeReadableStream<T> {}
  Object.defineProperty(Stream.prototype, "values", { value: undefined, configurable: true });
  Object.defineProperty(Stream.prototype, Symbol.asyncIterator, {
    value: undefined,
    configurable: true,
  });
  const context = { ReadableStream: Stream, Promise: class extends Promise<unknown> {} };
  Object.defineProperty(context.Promise, "withResolvers", { value: undefined, configurable: true });
  const sandbox = { ...context, globalThis: undefined as unknown };
  sandbox.globalThis = sandbox;
  runInNewContext(source, sandbox);
  return context as unknown as {
    ReadableStream: typeof NodeReadableStream;
    Promise: PromiseConstructor;
  };
}

const streamOf = (Stream: typeof NodeReadableStream, chunks: number[], onCancel?: () => void) =>
  new Stream<number>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      if (!onCancel) controller.close();
    },
    cancel: onCancel,
  });

describe("pdf.js polyfills", () => {
  it("makes streams async iterable and releases the reader at the end", async () => {
    const { ReadableStream } = oldRealm();
    const stream = streamOf(ReadableStream, [1, 2, 3]);
    const seen: number[] = [];
    for await (const chunk of stream) seen.push(chunk);
    expect(seen).toEqual([1, 2, 3]);
    expect(stream.locked).toBe(false);
  });

  it("cancels the stream when the loop exits early, unless preventCancel", async () => {
    const { ReadableStream } = oldRealm();
    let cancelled = 0;
    const stream = streamOf(ReadableStream, [1, 2], () => cancelled++);
    for await (const chunk of stream) if (chunk === 1) break;
    expect(cancelled).toBe(1);
    expect(stream.locked).toBe(false);

    const kept = streamOf(ReadableStream, [1, 2], () => cancelled++);
    for await (const chunk of kept.values({ preventCancel: true })) if (chunk === 1) break;
    expect(cancelled).toBe(1);
  });

  it("adds Promise.withResolvers", async () => {
    const { Promise: P } = oldRealm();
    const { promise, resolve } = P.withResolvers<string>();
    resolve("ok");
    await expect(promise).resolves.toBe("ok");
  });

  it("keeps native implementations", () => {
    const sandbox = {
      ReadableStream: NodeReadableStream,
      Promise,
      globalThis: undefined as unknown,
    };
    sandbox.globalThis = sandbox;
    const native = NodeReadableStream.prototype[Symbol.asyncIterator];
    const withResolvers = Promise.withResolvers;
    runInNewContext(source, sandbox);
    expect(NodeReadableStream.prototype[Symbol.asyncIterator]).toBe(native);
    expect(Promise.withResolvers).toBe(withResolvers);
  });
});
