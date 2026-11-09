#!/bin/bash
# Build the libjxl <-> JS bridge (third_party/jxl-shim/jxl_shim.cc) with
# Emscripten and place jxl_shim.js + jxl_shim.wasm in src/codec/jxl/.
#
# Requires: emsdk_env.sh sourced, and a configured libjxl WASM build
# (see third_party/build-jxl-wasm.sh; BUILD_DIR defaults to ./tmp/jxl-build-wasm).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$ROOT/tmp/jxl-build-wasm}"
OUT_DIR="$ROOT/src/codec/jxl"

if [[ -z "${EMSDK:-}" ]]; then
  echo "emsdk_env.sh is not sourced (EMSDK is empty)" >&2
  exit 1
fi
if [[ ! -f "$BUILD_DIR/lib/libjxl.a" ]]; then
  echo "libjxl.a not found in $BUILD_DIR; run third_party/build-jxl-wasm.sh first" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
em++ "$ROOT/third_party/jxl-shim/jxl_shim.cc" \
  -I "$ROOT/third_party/libjxl/lib/include" \
  -I "$BUILD_DIR/lib/include" \
  -O3 -msimd128 -lembind \
  "$BUILD_DIR/lib/libjxl.a" \
  "$BUILD_DIR/lib/libjxl_cms.a" \
  "$BUILD_DIR/third_party/highway/libhwy.a" \
  "$BUILD_DIR/third_party/brotli/libbrotlienc.a" \
  "$BUILD_DIR/third_party/brotli/libbrotlidec.a" \
  "$BUILD_DIR/third_party/brotli/libbrotlicommon.a" \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sEXPORT_NAME=createJxlModule \
  -sENVIRONMENT=web,worker,node \
  -sALLOW_MEMORY_GROWTH=1 \
  -o "$OUT_DIR/jxl_shim.js"

ls -la "$OUT_DIR/jxl_shim.js" "$OUT_DIR/jxl_shim.wasm"
echo "jxl shim build finished"
