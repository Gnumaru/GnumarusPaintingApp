#!/bin/bash
# Build the user manual (English + Brazilian Portuguese) into dist/manual/.
# Used by `npm run docs:build` locally and by the GitHub Pages workflow.
# Warnings are errors (-W) so broken cross-references fail the build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/tmp/docsvenv"

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi
"$VENV/bin/pip" install -q -r "$ROOT/docs/requirements.txt"

rm -rf "$ROOT/dist/manual"
"$VENV/bin/python" -m sphinx -W -b html "$ROOT/docs/en" "$ROOT/dist/manual/en"
"$VENV/bin/python" -m sphinx -W -b html "$ROOT/docs/pt_BR" "$ROOT/dist/manual/pt_BR"
cp "$ROOT/docs/landing.html" "$ROOT/dist/manual/index.html"
echo "Manual built in dist/manual/ (en + pt_BR)."
