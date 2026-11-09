#!/bin/bash
# Full-featured WebAssembly build of the libjxl submodule.
#
# Usage (from the repo root):
#   source ~/emsdk/emsdk_env.sh
#   ./third_party/build-jxl-wasm.sh        # configure + build
#   BUILD_DIR=./tmp/jxl-build-wasm SKIP_CONFIGURE=1 ./third_party/build-jxl-wasm.sh
#
# Notes:
# - Single-threaded WASM (JPEGXL_ENABLE_WASM_THREADS=OFF): no pthreads, no
#   SharedArrayBuffer / COOP-COEP requirement, so the app keeps working on
#   any static host. WASM SIMD stays on (universally supported in Chromium).
# - All codec features on (lossy/lossless, alpha, JPEG transcoding,
#   boxes, sjpeg, skcms). Tools (cjxl/djxl) and examples are built too;
#   benchmark/tests/docs/manpages are off (extra system deps not needed).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/third_party/libjxl"
BUILD_DIR="${BUILD_DIR:-$ROOT/tmp/jxl-build-wasm}"

if [[ ! -f "$SRC/CMakeLists.txt" ]]; then
  echo "libjxl submodule missing at $SRC" >&2
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
    -DJPEGXL_ENABLE_FUZZERS=OFF \
    -DJPEGXL_ENABLE_DEVTOOLS=OFF \
    -DJPEGXL_ENABLE_TOOLS=ON \
    -DJPEGXL_ENABLE_DOXYGEN=OFF \
    -DJPEGXL_ENABLE_MANPAGES=OFF \
    -DJPEGXL_ENABLE_BENCHMARK=OFF \
    -DJPEGXL_ENABLE_EXAMPLES=ON \
    -DJPEGXL_ENABLE_JNI=OFF \
    -DJPEGXL_ENABLE_SJPEG=ON \
    -DSJPEG_ENABLE_SIMD=OFF \
    -DJPEGXL_ENABLE_OPENEXR=OFF \
    -DJPEGXL_ENABLE_SKCMS=ON \
    -DJPEGXL_ENABLE_VIEWERS=OFF \
    -DJPEGXL_ENABLE_TCMALLOC=OFF \
    -DJPEGXL_ENABLE_PLUGINS=OFF \
    -DJPEGXL_ENABLE_TRANSCODE_JPEG=ON \
    -DJPEGXL_ENABLE_BOXES=ON \
    -DJPEGXL_ENABLE_WASM_THREADS=OFF \
    -DJPEGXL_ENABLE_LTO=OFF \
    -DJPEGXL_WARNINGS_AS_ERRORS=OFF \
    -DJPEGXL_TEST_TOOLS=OFF \
    -DCMAKE_C_FLAGS="-msimd128" \
    -DCMAKE_CXX_FLAGS="-msimd128" \
    -DCMAKE_EXE_LINKER_FLAGS="-msimd128"
fi

cmake --build "$BUILD_DIR" -- -j"$(nproc --all || echo 8)"
echo "libjxl WASM build finished in $BUILD_DIR"
