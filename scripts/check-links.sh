#!/usr/bin/env bash
# Checks every link in a built site with lychee.
#   scripts/check-links.sh dist            internal + external
#   scripts/check-links.sh dist --offline  internal only (blocking in CI)
# Absolute links to https://glideslopepartners.com/ are checked against the
# build itself, so they pass before the domain is cut over.
set -euo pipefail
dir="${1:-dist}"; shift || true
root="$(cd "$dir" && pwd)"
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) root_uri="file:///$(cygpath -m "$root")"; root_arg="$(cygpath -w "$root")";; *) root_uri="file://$root"; root_arg="$root";; esac
lychee --config lychee.toml --no-progress --root-dir "$root_arg" \
  --remap "^https://glideslopepartners\.com/(.*)$ ${root_uri}/\$1" \
  "$@" "$dir/**/*.html"
