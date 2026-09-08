#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-}"
HEAD_REF="${HEAD_REF:-HEAD}"
OUT_DIR="${OUT_DIR:-patches}"

if [ -z "$BASE" ]; then
  BASE="$(git merge-base "$HEAD_REF" upstream/main)"
fi

group_paths() {
  case "$1" in
    0001-orocommerce-piece)
      echo "packages/pieces/community/orocommerce bun.lock" ;;
    0002-frontend-prefixed-path-embed)
      echo "packages/web" ;;
    0003-server-runtime-base-href)
      echo "packages/server/api/src/app/server.ts docker-entrypoint.sh" ;;
    0004-oro-docker-packaging)
      echo ".dockerignore .env.oro.example Dockerfile.oro docker-bake.hcl docker-compose.oro.yml healthcheck" ;;
    0005-ci)
      echo ".github/workflows Jenkinsfile turbo.json" ;;
    0006-docs-tooling)
      echo ".agents/skills scripts .nvmrc" ;;
  esac
}

PATCH_GROUPS="0001-orocommerce-piece 0002-frontend-prefixed-path-embed 0003-server-runtime-base-href 0004-oro-docker-packaging 0005-ci 0006-docs-tooling"

mkdir -p "$OUT_DIR"
echo "base: $BASE"
echo "head: $HEAD_REF ($(git rev-parse --short "$HEAD_REF"))"
echo

covered=""
for group in $PATCH_GROUPS; do
  paths="$(group_paths "$group")"
  # shellcheck disable=SC2086
  git diff "$BASE..$HEAD_REF" -- $paths > "$OUT_DIR/$group.patch"
  count="$(grep -c '^diff --git' "$OUT_DIR/$group.patch" || true)"
  printf '%-40s %3s files\n' "$group.patch" "$count"
  # shellcheck disable=SC2086
  covered="$covered$(git diff --name-only "$BASE..$HEAD_REF" -- $paths)
"
done

echo
all_changed="$(git diff --name-only "$BASE..$HEAD_REF" | sort -u)"
uncovered="$(comm -23 <(echo "$all_changed") <(echo "$covered" | sed '/^$/d' | sort -u))"

if [ -n "$uncovered" ]; then
  echo "UNCOVERED - these changed files are in no patch group:"
  echo "$uncovered" | sed 's/^/  /'
  echo
  echo "Add them to a group in group_paths() before shipping the stack."
  exit 1
fi

echo "coverage OK: all $(echo "$all_changed" | wc -l | tr -d ' ') changed files are in exactly one patch"
