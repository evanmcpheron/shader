#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
prompt_dir="$project_root/docs/pixel-shading-studio/prompts"
progress_file="$project_root/docs/pixel-shading-studio/PROGRESS.md"
instructions_file="$project_root/AGENTS.md"
from=4
to=20
dry_run=false
codex_bin="${CODEX_BIN:-codex}"
codex_options=(
  --sandbox workspace-write
  --config sandbox_workspace_write.network_access=true
  --skip-git-repo-check
  --cd "$project_root"
  --color never
)

usage() {
  cat <<'HELP'
Usage: npm run prompts:run -- [options]

Runs prompts 04–20 sequentially, each in a new Codex conversation.
File changes persist in the same workspace between conversations.

Options:
  --from NUMBER    First prompt to run (default: 04)
  --to NUMBER      Last prompt to run (default: 20)
  --model MODEL    Override the configured Codex model
  --profile NAME   Use a Codex configuration profile
  --dry-run        Show the sequence without starting Codex or writing files
  -h, --help       Show this help

Stops on a command failure or if a task is not marked Complete in PROGRESS.md.
Logs and final responses are saved under logs/prompt-runs/.
Uses workspace-write, network access, and no interactive approval requests.
Includes AGENTS.md preferences: unattended decisions, local use, no deployment.
HELP
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from|--to|--model|--profile)
      [[ $# -ge 2 && -n "$2" ]] || fail "$1 requires a value."
      case "$1" in
        --from) from="$2" ;;
        --to) to="$2" ;;
        *) codex_options+=("$1" "$2") ;;
      esac
      shift 2
      ;;
    --dry-run) dry_run=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1. Use --help for usage." ;;
  esac
done

[[ "$from" =~ ^[0-9]{1,2}$ && "$to" =~ ^[0-9]{1,2}$ ]] || fail 'Prompt numbers must be integers from 04 through 20.'
from=$((10#$from))
to=$((10#$to))
(( from >= 4 && to <= 20 && from <= to )) || fail 'Expected 04 <= --from <= --to <= 20.'
[[ -r "$progress_file" ]] || fail "Cannot read $progress_file."
[[ -s "$instructions_file" && -r "$instructions_file" ]] || fail "Cannot read project instructions at $instructions_file."

shopt -s nullglob
prompts=()
for ((number = from; number <= to; number++)); do
  printf -v padded '%02d' "$number"
  matches=("$prompt_dir/$padded-"*.md)
  [[ ${#matches[@]} -eq 1 ]] || fail "Expected exactly one prompt for $padded; found ${#matches[@]}."
  [[ -s "${matches[0]}" && -r "${matches[0]}" ]] || fail "Prompt $padded is empty or unreadable."
  prompts+=("${matches[0]}")
done

printf 'Workspace: %s\n' "$project_root"
printf 'Sequence: %02d through %02d (fresh conversation per prompt)\n' "$from" "$to"
for prompt in "${prompts[@]}"; do
  printf '  %s\n' "${prompt#"$project_root/"}"
done

if "$dry_run"; then
  printf '\nDry run: no Codex sessions started and no files written.\n'
  exit 0
fi

command -v "$codex_bin" >/dev/null 2>&1 || fail 'Codex CLI was not found. Install it or set CODEX_BIN to its executable path.'

task_status() {
  awk -F '|' -v task="$1" '
    {
      id = $2
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", id)
      if (id == task) {
        state = $5
        gsub(/^[[:space:]*]+|[[:space:]*]+$/, "", state)
        print state
      }
    }
  ' "$progress_file"
}

mkdir -p "$project_root/logs/prompt-runs"
run_dir="$(mktemp -d "$project_root/logs/prompt-runs/$(date '+%Y%m%d-%H%M%S').XXXXXX")"
printf '\nLogs: %s\n' "$run_dir"

for prompt in "${prompts[@]}"; do
  name="$(basename -- "$prompt" .md)"
  padded="${name%%-*}"
  printf -v task 'PSS-%02d' "$((10#$padded))"
  printf -v dependency 'PSS-%02d' "$((10#$padded - 1))"
  [[ "$(task_status "$dependency")" == Complete ]] || fail "$dependency must be Complete before running $task. Check $progress_file."

  input_file="$run_dir/$name.prompt.md"
  log_file="$run_dir/$name.log"
  response_file="$run_dir/$name.final.md"
  cat "$prompt" > "$input_file"
  printf '\n\n' >> "$input_file"
  cat "$instructions_file" >> "$input_file"
  cat >> "$input_file" <<'INSTRUCTIONS'

## Sequential runner instructions

This is a new conversation for the single task above. Implement it now, using
the current workspace and its progress record as the source of truth. File
changes from preceding tasks are already present; no earlier conversation is
needed. Preserve user changes and follow the governing code-comment rule.
The project instructions above apply to this run. The user is unavailable:
make decisions autonomously for a robust personal pixel-art learning tool,
keep the application local, and do not deploy or publish anything.

Update this task's row in the Ordered implementation tasks table in
docs/pixel-shading-studio/PROGRESS.md. Keep the table columns intact. Mark it
Complete only when all required acceptance criteria and verification pass.
If blocked, incomplete, or unable to perform required browser checks, record
that accurately and finish with a concrete explanation. The runner will stop.
Do not execute another roadmap prompt or start the sequential runner yourself.
INSTRUCTIONS

  printf '\n[%s] Starting %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$task"
  if "$codex_bin" --ask-for-approval never exec \
    "${codex_options[@]}" \
    --output-last-message "$response_file" \
    - < "$input_file" 2>&1 | tee "$log_file"; then
    state="$(task_status "$task")"
    [[ "$state" == Complete ]] || fail "$task finished with status '${state:-missing}'. Stopping; see $log_file. Retry with --from $padded after resolving the issue."
    printf '[%s] %s Complete\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$task"
  else
    pipeline_status=("${PIPESTATUS[@]}")
    printf 'Stopped at %s (Codex exit: %s; log writer exit: %s).\nLog: %s\nRetry: npm run prompts:run -- --from %s --to %02d\n' \
      "$task" "${pipeline_status[0]}" "${pipeline_status[1]}" "$log_file" "$padded" "$to" >&2
    exit 1
  fi
done

printf '\nAll requested prompts completed. Logs: %s\n' "$run_dir"
