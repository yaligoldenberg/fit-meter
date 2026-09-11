#!/usr/bin/env node
/**
 * PreToolUse hook: refuse any Bash command that touches a real .env file.
 *
 * Claude has no reason to read the secrets in .env — DATABASE_URL and JWT_SECRET
 * live there, and the Read tool is already blocked by permissions.deny in
 * settings.json. This closes the shell route (cat/sed/grep/head/source/...).
 *
 * .env.example is explicitly allowed: it holds placeholders, not secrets.
 */

const ALLOWED = new Set([".env.example", ".env.sample", ".env.template"]);

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let command = "";
  try {
    command = (JSON.parse(raw).tool_input || {}).command || "";
  } catch {
    // Unparseable input: stay out of the way rather than blocking blindly.
  }

  // Grab every .env-ish token, then keep only exact env-file names (so words
  // like ".environment" or "environment.ts" never trigger a block).
  const hits = (command.match(/\.env[A-Za-z0-9_.-]*/g) || []).filter(
    (token) => /^\.env(\.[A-Za-z0-9_-]+)?$/.test(token) && !ALLOWED.has(token)
  );

  if (hits.length > 0) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Blocked by project policy: this command touches ${hits[0]}, which holds secrets. Ask the user to read or change it instead. (.env.example is fine.)`,
        },
      })
    );
  }
});
