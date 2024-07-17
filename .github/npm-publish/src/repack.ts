import NodeFS from "node:fs";
import { PassThrough, pipeline as legacyPipeline } from "node:stream";
import { callbackify, promisify } from "node:util";
import NodeZlib from "node:zlib";
import type { Callback, Headers, Pack } from "tar-stream";
import { extract as createExtract, pack as createPack } from "tar-stream";
import type { CanPipe } from "./helpers";
import { bufferToStream, canPipe, readAll } from "./helpers";

const pipeline = promisify(legacyPipeline);

export type Manifest = { name: string; version: string; [key: string]: any };

export interface ModifyTarballOptions {
  transformManifest?: (pkg: Manifest) => false | Manifest;
}

export async function modifyTarball(
  tarball: string | Buffer,
  opts: ModifyTarballOptions = {}
): Promise<{ tarball: NodeJS.ReadableStream; manifest: Manifest; modified: boolean }> {
  const { extract, pack, getManifest, isModified } = createRepack(opts);

  const source = createSource(tarball);

  await pipeline([source, NodeZlib.createGunzip(), extract]);
  const manifest = { ...getManifest()! };
  const modified = isModified();

  if (modified) {
    const gzip = NodeZlib.createGzip({ level: 9 });

    const fin = pack.pipe(gzip);
    return { manifest, modified, tarball: fin };
  } else {
    return { manifest, modified, tarball: createSource(tarball) };
  }
}

export function createRepack(opts: ModifyTarballOptions = {}) {
  const extract = createExtract({});
  const pack = createPack();

  const addEntry = getAddEntry(pack);

  let manifest: Manifest | undefined = undefined;
  let modified = false;

  extract.on(
    "entry",
    callbackify(async (header: Headers, stream: PassThrough) => {
      if (header.name === "package/package.json") {
        const buf = await readAll(stream);

        if (opts.transformManifest) {
          const newManifest = opts.transformManifest(JSON.parse(buf.toString()) as Manifest);
          if (newManifest) {
            manifest = newManifest;
            modified = true;
            await addEntry(header, Buffer.from(JSON.stringify(manifest, null, 2)));
            return;
          }
        }

        // in case transformManifest modifies the manifest in place
        manifest = JSON.parse(buf.toString());
        await addEntry(header, buf);
        return;
      }
      await addEntry(header, stream);
    })
  );

  extract.on("finish", () => {
    pack.finalize();
  });
  function getManifest() {
    return manifest;
  }
  function isModified() {
    return modified;
  }
  return { extract, pack, getManifest, isModified };
}

function createSource(tarball: string | Buffer): NodeJS.ReadableStream {
  return typeof tarball === "string" ? NodeFS.createReadStream(tarball) : bufferToStream(tarball);
}

function getAddEntry(p: Pack) {
  return (headers: Headers, buffer: string | Buffer | CanPipe): PromiseLike<void> => {
    return new Promise<void>((resolve, reject) => {
      const callback: Callback = (err) => {
        return err ? reject(err) : resolve();
      };
      if (canPipe<CanPipe>(buffer)) {
        const next = p.entry(headers, callback);
        buffer.pipe(next);
      } else {
        p.entry(headers, buffer, callback);
      }
    });
  };
}
