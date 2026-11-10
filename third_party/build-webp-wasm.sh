#!/bin/bash
# Static WebAssembly build of the libwebp submodule.
#
# Usage (from the repo root):
#   source ~/emsdk/emsdk_env.sh
#   ./third_party/build-webp-wasm.sh        # configure + build
#   BUILD_DIR=./tmp/webp-build-wasm SKIP_CONFIGURE=1 ./third_party/build-webp-wasm.sh
#
# Notes:
# - Single-threaded WASM (WEBP_USE_THREAD=OFF): no pthreads, no
#   SharedArrayBuffer / COOP-COEP requirement, so the app keeps working on
#   any static host. Scalar C only (WEBP_ENABLE_SIMD=OFF): the encoder and
#   decoder fall back to portable code, avoiding x86 SIMD intrinsics under
#   Emscripten.
# - Libraries only (encoder + decoder + demux + mux for animated WebP);
#   all command line tools, examples and extras are off.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/third_party/libwebp"
BUILD_DIR="${BUILD_DIR:-$ROOT/tmp/webp-build-wasm}"

if [[ ! -f "$SRC/CMakeLists.txt" ]]; then
  echo "libwebp submodule missing at $SRC" >&2
  exit 1
fi
if [[ -z "${EMSDK:-}" ]]; then
  echo "emsdk_env.sh is not sourced (EMSDK is empty)" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"
if [[ "${SKIP_CONFIGURE:-0}" != "1" ]]; then
  emcmake cmake -S "$SRC" -B "$BUILD_DIR" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DBUILD_TESTING=OFF \
    -DWEBP_LINK_STATIC=ON \
    -DWEBP_ENABLE_SIMD=OFF \
    -DWEBP_USE_THREAD=OFF \
    -DWEBP_NEAR_LOSSLESS=ON \
    -DWEBP_BUILD_ANIM_UTILS=OFF \
    -DWEBP_BUILD_CWEBP=OFF \
    -DWEBP_BUILD_DWEBP=OFF \
    -DWEBP_BUILD_GIF2WEBP=OFF \
    -DWEBP_BUILD_IMG2WEBP=OFF \
    -DWEBP_BUILD_VWEBP=OFF \
    -DWEBP_BUILD_WEBPINFO=OFF \
    -DWEBP_BUILD_LIBWEBPMUX=ON \
    -DWEBP_BUILD_WEBPMUX=OFF \
    -DWEBP_BUILD_EXTRAS=OFF
fi

cmake --build "$BUILD_DIR" -- -j"$(nproc --all || echo 8)"
echo "libwebp WASM build finished in $BUILD_DIR"
