import { PartialBaseBuildConfig, defineConfig, moduleTools } from "@modern-js/module-tools";

const base: PartialBaseBuildConfig = {
  buildType: "bundle",
  target: "es2020",
  platform: "node",
  input: { index: "src/index.ts" },
  outDir: "dist",
};
export default defineConfig({
  plugins: [moduleTools()],
  buildConfig: [
    {
      ...base,
      format: "cjs",
      dts: false,
      externals: ["bluebird", /^node-gyp\/?/],
    },
  ],
});
