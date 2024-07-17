import { getInput } from "@actions/core";
import { create as createGlob } from "@actions/glob";
import { modifyTarball } from "./repack";

async function run() {
  const inputName = getInput("name");
  const inputVersion = getInput("version");
  const inputTarball = getInput("tarball");
  const globber = await createGlob(inputTarball, {});
  const tarballPath = (await globber.globGenerator().next()).value;

  const { tarball, modified, manifest } = await modifyTarball(tarballPath!, {
    transformManifest: (manifest) => {
      if (inputName) {
        manifest.name = inputName;
      }
      if (inputVersion) {
        manifest.version = inputVersion;
      }

      return manifest;
    },
  });

  console.log({ tarballPath, modified, manifest });
}

run();
