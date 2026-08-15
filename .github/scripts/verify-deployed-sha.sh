#!/usr/bin/env bash
#
# Proves that the deployed site is serving the commit we just published.
#
# Canonical plan section 33: no phase may be called GREEN while Preview is
# behind that phase's verified checkpoint, and every handoff must report both
# the checkpoint SHA and the deployed Preview SHA.
#
# Usage: verify-deployed-sha.sh <build-info-url> <expected-sha>

set -euo pipefail

url="${1:?build-info.json URL is required}"
expected="${2:?expected SHA is required}"

attempts=30
delay=10

for attempt in $(seq 1 "$attempts"); do
  body="$(curl -fsSL -H 'Cache-Control: no-cache' "${url}?t=$(date +%s)" 2>/dev/null || true)"
  actual="$(printf '%s' "$body" | sed -n 's/.*"commitSha"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

  if [ "$actual" = "$expected" ]; then
    echo "Deployed SHA matches: $actual"
    exit 0
  fi

  echo "Attempt ${attempt}/${attempts}: deployed='${actual:-unreachable}' expected='${expected}'"
  if [ "$attempt" -lt "$attempts" ]; then sleep "$delay"; fi
done

echo "Deployed SHA never matched ${expected} after $((attempts * delay))s." >&2
echo "Preview is behind the checkpoint — this must be resolved before phone testing." >&2
exit 1
