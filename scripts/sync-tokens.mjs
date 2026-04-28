// Mirrors docs/design/design-system/colors_and_type.css to src/styles/tokens.css.
// Run via `pnpm sync:tokens`. The mirror is what production CSS imports — the
// docs file remains canonical. See docs/TECH_DECISIONS.md ("Token strategy").

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CANONICAL = "docs/design/design-system/colors_and_type.css";
const MIRROR = "src/styles/tokens.css";
const HEADER =
  "/* Mirror of docs/design/design-system/colors_and_type.css.\n" +
  "   Run `pnpm sync:tokens` to refresh. Do not hand-edit. */\n\n";

const source = readFileSync(resolve(CANONICAL), "utf8");
writeFileSync(resolve(MIRROR), HEADER + source);
console.log(`synced ${CANONICAL} -> ${MIRROR}`);
