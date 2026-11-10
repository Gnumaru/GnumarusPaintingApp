#!/bin/bash
# Build the libwebp <-> JS bridge (third_party/webp-shim/webp_shim.cc) with
# Emscripten and place webp_shim.js + webp_shim.wasm in src/codec/webp/.
#
# Requires: emsdk_env.sh sourced, and a configured libwebp WASM build
# (see third_party/build-webp-wasm.sh; BUILD_DIR defaults to ./tmp/webp-build-wasm).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$ROOT/tmp/webp-build-wasm}"
OUT_DIR="$ROOT/src/codec/webp"

if [[ -z "${EMSDK:-}" ]]; then
  echo "emsdk_env.sh is not sourced (EMSDK is empty)" >&2
  exit 1
fi
if [[ ! -f "$BUILD_DIR/libwebp.a" ]]; then
  echo "libwebp.a not found in $BUILD_DIR; run third_party/build-webp-wasm.sh first" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
em++ "$ROOT/third_party/webp-shim/webp_shim.cc" \
  -I "$ROOT/third_party/libwebp/src" \
  -O3 -msimd128 -lembind \
  "$BUILD_DIR/libwebpmux.a" \
  "$BUILD_DIR/libwebpdemux.a" \
  "$BUILD_DIR/libwebp.a" \
  "$BUILD_DIR/libsharpyuv.a" \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sEXPORT_NAME=createWebpModule \
  -sENVIRONMENT=web,worker,node \
  -sALLOW_MEMORY_GROWTH=1 \
  -o "$OUT_DIR/webp_shim.js"

ls -la "$OUT_DIR/webp_shim.js" "$OUT_DIR/webp_shim.wasm"
echo "webp shim build finished"
