import vercelPrettierConfig from "@vercel/style-guide/prettier";

/** @type {import("prettier").Config} */
export default {
  ...vercelPrettierConfig,
  singleQuote: true,
  printWidth: 80,
};
