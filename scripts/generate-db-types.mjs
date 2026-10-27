import { spawnSync } from "node:child_process";
import { writeFileSync, renameSync } from "node:fs";
const result = spawnSync(
  "supabase",
  ["gen", "types", "typescript", "--local"],
  { encoding: "utf8" },
);
if (result.status !== 0 || !result.stdout.includes("export type Database")) {
  process.stderr.write(
    result.stderr || "Type generation failed; existing contract preserved.\n",
  );
  process.exit(1);
}
const target = "src/lib/supabase/database.types.ts";
writeFileSync(`${target}.tmp`, result.stdout);
renameSync(`${target}.tmp`, target);
