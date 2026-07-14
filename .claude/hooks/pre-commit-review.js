#!/usr/bin/env node
/**
 * PreToolUse hook: blocks `git commit` until the code-reviewer agent has
 * approved the currently staged diff.
 *
 * Modes:
 *   (no args)   Hook mode — reads the PreToolUse JSON from stdin. Exits 0 to
 *               allow the tool call, exits 2 (message on stderr) to block it.
 *   --hash      Prints the SHA-256 of the staged diff and exits.
 *   --approve   Records the current staged-diff hash as approved. Run by the
 *               code-reviewer agent after a review with no blockers.
 *
 * Approval is keyed to the exact staged diff: any change to what is staged
 * invalidates it, forcing a fresh review.
 */
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MARKER = path.join(__dirname, "..", "review-reports", ".approved-staged-hash");

function stagedDiff() {
  return execFileSync("git", ["diff", "--cached"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function stagedHash() {
  return crypto.createHash("sha256").update(stagedDiff()).digest("hex");
}

function block(message) {
  process.stderr.write(message);
  process.exit(2);
}

const mode = process.argv[2];

if (mode === "--hash") {
  process.stdout.write(stagedHash() + "\n");
  process.exit(0);
}

if (mode === "--approve") {
  fs.mkdirSync(path.dirname(MARKER), { recursive: true });
  fs.writeFileSync(MARKER, stagedHash() + "\n");
  process.stdout.write("Staged diff approved for commit.\n");
  process.exit(0);
}

// --- Hook mode ---
let input = "";
try {
  input = fs.readFileSync(0, "utf8");
} catch {
  process.exit(0);
}

let command = "";
try {
  command = JSON.parse(input).tool_input?.command || "";
} catch {
  process.exit(0);
}

// Only gate actual `git commit` invocations (allowing global flags like
// `-C <dir>` / `--no-pager` between "git" and "commit").
const commitRe = /\bgit(\.exe)?\s+(?:-C\s+\S+\s+|--?\S+\s+)*commit\b/;
if (!commitRe.test(command)) process.exit(0);

// `git commit -a` commits files that aren't in the staged diff we review.
const afterCommit = command.split(commitRe).pop() || "";
const tokens = afterCommit.trim().split(/\s+/);
if (tokens.some((t) => t === "--all" || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(t))) {
  block(
    "Pre-commit review: `git commit -a/--all` bypasses the staged-diff review. " +
      "Stage the changes with `git add` first, then commit without -a."
  );
}

const diff = stagedDiff();
if (diff.trim() === "") process.exit(0); // nothing staged to review

let approved = "";
try {
  approved = fs.readFileSync(MARKER, "utf8").trim();
} catch {}

if (approved === stagedHash()) process.exit(0);

block(
  "Pre-commit review required: the staged diff has not been approved by the " +
    "code-reviewer agent (or it changed since the last approval). Launch the " +
    "code-reviewer agent to review the staged changes; it records the approval " +
    "when the review passes, after which this commit will be allowed."
);
