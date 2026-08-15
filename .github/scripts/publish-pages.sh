#!/usr/bin/env bash
#
# Publishes a built site into one path of the gh-pages branch.
#
# Canonical plan section 33 requires preview and production to be separate
# deployment targets, and requires that production is not updated merely
# because preview changed. That separation is enforced here: the preview target
# only ever replaces the preview/ subtree, and the production target only ever
# replaces the root while leaving preview/ alone.
#
# Usage: publish-pages.sh <preview|production> <source-dir>

set -euo pipefail

target="${1:?target must be 'preview' or 'production'}"
source_dir="${2:?source directory is required}"

case "$target" in
preview | production) ;;
*)
  echo "Unknown target: $target" >&2
  exit 1
  ;;
esac

if [ ! -f "$source_dir/index.html" ]; then
  echo "No index.html in $source_dir — refusing to publish an empty site." >&2
  exit 1
fi

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

src="$(cd "$source_dir" && pwd)"
root="$(cd "$(dirname "$0")/../.." && pwd)"
remote="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
work="$(mktemp -d)"

# --- Get gh-pages, creating it on first run -----------------------------------
if git ls-remote --exit-code --heads "$remote" gh-pages >/dev/null 2>&1; then
  git clone --depth 1 --branch gh-pages "$remote" "$work"
else
  echo "gh-pages does not exist yet — creating it."
  git clone --depth 1 "$remote" "$work"
  git -C "$work" checkout --orphan gh-pages
  git -C "$work" rm -rf . >/dev/null 2>&1 || true
fi

cd "$work"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# --- Write only this target's path --------------------------------------------
if [ "$target" = "preview" ]; then
  rm -rf preview
  mkdir -p preview
  cp -R "$src/." preview/
else
  # Replace the root, but never the preview subtree.
  find . -mindepth 1 -maxdepth 1 ! -name .git ! -name preview -exec rm -rf {} +
  cp -R "$src/." .
fi

# Pages must not run Jekyll over a built bundle.
touch .nojekyll

# Until the release phase promotes a real production build, the root explains
# itself rather than serving a 404.
if [ ! -f index.html ]; then
  cp "$root/.github/pages-root/index.html" index.html
fi

# --- Guard: each target must have left the other one intact -------------------
if [ "$target" = "preview" ] && [ ! -f index.html ]; then
  echo "Refusing to push: the production root went missing." >&2
  exit 1
fi
if [ "$target" = "production" ] && [ ! -d preview ]; then
  echo "Refusing to push: the preview path went missing." >&2
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "No changes to publish for $target."
  exit 0
fi

git commit -m "${target}: ${GITHUB_SHA}"
git push origin gh-pages
echo "Published $target from ${GITHUB_SHA}."
