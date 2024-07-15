import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { Minipass } from "minipass";
import * as tar from "tar";

const f = NodePath.resolve(__dirname, "../../../rsbuild-plugin-mass-svg-0.0.0-PLACEHOLDER.tgz");
class TransformBuffer extends Minipass {
  buf?: Buffer;
  constructor(private transform: (buf: Buffer) => Buffer) {
    super();
  }

  write(chunk: Minipass.ContiguousData, cb?: () => void): boolean;
  write(chunk: Minipass.ContiguousData, encoding?: Minipass.Encoding, cb?: () => void): boolean;
  write(
    _chunk: Minipass.ContiguousData,
    _encoding?: Minipass.Encoding | (() => void),
    _cb?: () => void
  ): boolean {
    const [encoding, cb] = (() => {
      if (typeof _encoding === "function") {
        return [null, _encoding] as const;
      }
      return [_encoding || null, _cb] as const;
    })();
    const chunk = Buffer.from(_chunk as any, encoding as BufferEncoding);

    if (this.buf) {
      this.buf = Buffer.concat([this.buf, chunk]);
    } else {
      this.buf = chunk;
    }
    if (cb) {
      cb();
    }
    return this.flowing;
  }
  // @ts-ignore
  end(chunk: any, encoding: any, cb: any): this {
    if (typeof encoding === "function") (cb = encoding), (encoding = null);
    if (typeof chunk === "function") (cb = chunk), (chunk = null);
    if (chunk) this.write(chunk, encoding);
    if (this.buf) {
      super.write(this.transform(this.buf));
    }
    return super.end(cb);
  }
}

async function run() {
  NodeFS.createReadStream(f).pipe(
    tar.extract({
      transform: (entry) => {
        if (entry.path === "package/package.json") {
          return new TransformBuffer((buf) =>
            Buffer.from(JSON.stringify({ name: "rsbuild-plugin-mass-svg", version: "0.0.0" }))
          );
        }
        return entry;
      },
    })
  );
}

run();
