#!/bin/bash
# PreToolUse guard for all three agent sessions. Blocks catastrophic commands;
# FAIL-OPEN on any parsing problem so a broken hook never blocks work.
input=$(cat 2>/dev/null) || exit 0
if printf '%s' "$input" | grep -qiE 'rm -rf[[:space:]]+[/~"]|git push[^|]*--force|git push[^|]* -f |drop database|drop table|truncate table'; then
  echo "Blocked: destructive command (force-push / rm -rf on root / DROP / TRUNCATE). If truly intended, the MAIN agent or founder runs it manually." >&2
  exit 2
fi
exit 0
