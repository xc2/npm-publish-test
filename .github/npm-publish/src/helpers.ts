import { Readable } from "node:stream";
export function readAll(stream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    stream.on("data", (data) => {
      buffers.push(data);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
    stream.on("error", reject);
  });
}

export function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export type CanPipe = { pipe: NodeJS.ReadableStream["pipe"] };

export function canPipe<T extends { pipe: NodeJS.ReadableStream["pipe"] } = NodeJS.ReadableStream>(
  t: unknown
): t is T {
  return typeof t === "object" && t ? "pipe" in t : false;
}
