import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import serve from "rollup-plugin-serve";

import { getBanner } from "./banner.mjs";

const devServer = Boolean(process.env.SERVE);

const plugins = [
  resolve(),
  terser({
    compress: { passes: 3, pure_getters: true },
    // tree-element prefixes its private members with an underscore.
    mangle: { properties: { regex: /^_/ } },
    output: { comments: /@license/ },
  }),
];

if (devServer) {
  plugins.push(serve({ contentBase: ["./devserver", "./"], port: 8081 }));
}

export default {
  // The lib is built first by tsc; the bundle wraps it together with tree-element.
  input: "lib/bundle.js",
  output: {
    banner: getBanner(),
    file: "tree_element_web_component.js",
    // The bundle registers the element and exports nothing, so a plain iife
    // works from both a classic script tag and a module script tag.
    format: "iife",
    sourcemap: true,
  },
  plugins,
};
