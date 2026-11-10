// Minimal embind bridge over the public libwebp decoder/encoder/mux APIs.
//
// Exposes still-image decode (any WebP still -> 8-bit RGBA, first frame of
// animated files), encode (8-bit RGBA -> WebP bytes, lossless or lossy) and
// single-file animation encode (WebPAnimEncoder). Single-threaded by design:
// everything runs synchronously on the calling thread.
//
// This file is our own code; it only *uses* the libwebp public headers and
// links the static libraries built from the third_party/libwebp submodule
// (BSD-3-Clause).
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "webp/decode.h"
#include "webp/demux.h"
#include "webp/encode.h"
#include "webp/mux.h"
#include "webp/types.h"

namespace {

constexpr size_t kMaxDimension = 16384;
constexpr size_t kMaxFrames = 10000;

int g_last_error_stage = 0;

bool DecodeFirstFrame(const uint8_t* data, size_t len, uint32_t* out_w, uint32_t* out_h,
                      std::vector<uint8_t>* out_rgba) {
  WebPBitstreamFeatures features;
  if (WebPGetFeatures(data, len, &features) != VP8_STATUS_OK) {
    g_last_error_stage = 101;
    return false;
  }
  if (features.width <= 0 || features.height <= 0 || static_cast<size_t>(features.width) > kMaxDimension ||
      static_cast<size_t>(features.height) > kMaxDimension) {
    g_last_error_stage = 107;
    return false;
  }
  if (!features.has_animation) {
    // Still image: decode directly so fully-transparent pixels keep their
    // exact RGB (the animation decoder composites onto a canvas and zeroes
    // the color of transparent pixels).
    int w = 0;
    int h = 0;
    uint8_t* pixels = WebPDecodeRGBA(data, len, &w, &h);
    if (pixels == nullptr) {
      g_last_error_stage = 108;
      return false;
    }
    out_rgba->assign(pixels, pixels + static_cast<size_t>(w) * static_cast<size_t>(h) * 4);
    *out_w = static_cast<uint32_t>(w);
    *out_h = static_cast<uint32_t>(h);
    WebPFree(pixels);
    return true;
  }
  WebPData webp_data;
  WebPDataInit(&webp_data);
  webp_data.bytes = data;
  webp_data.size = len;
  WebPAnimDecoderOptions dec_options;
  if (!WebPAnimDecoderOptionsInit(&dec_options)) {
    g_last_error_stage = 102;
    return false;
  }
  dec_options.color_mode = MODE_RGBA;
  WebPAnimDecoder* dec = WebPAnimDecoderNew(&webp_data, &dec_options);
  if (dec == nullptr) {
    g_last_error_stage = 103;
    return false;
  }
  WebPAnimInfo anim_info;
  if (!WebPAnimDecoderGetInfo(dec, &anim_info)) {
    WebPAnimDecoderDelete(dec);
    g_last_error_stage = 104;
    return false;
  }
  const uint32_t canvas_w = anim_info.canvas_width;
  const uint32_t canvas_h = anim_info.canvas_height;
  if (canvas_w == 0 || canvas_h == 0 || canvas_w > kMaxDimension || canvas_h > kMaxDimension) {
    WebPAnimDecoderDelete(dec);
    g_last_error_stage = 105;
    return false;
  }
  uint8_t* frame = nullptr;
  int timestamp = 0;
  if (!WebPAnimDecoderGetNext(dec, &frame, &timestamp)) {
    WebPAnimDecoderDelete(dec);
    g_last_error_stage = 106;
    return false;
  }
  const size_t bytes = static_cast<size_t>(canvas_w) * static_cast<size_t>(canvas_h) * 4;
  out_rgba->assign(frame, frame + bytes);
  *out_w = static_cast<uint32_t>(canvas_w);
  *out_h = static_cast<uint32_t>(canvas_h);
  WebPAnimDecoderDelete(dec);
  return true;
}

int MethodFromEffort(int effort) {
  if (effort < 1 || effort > 10) {
    return 4;
  }
  // JXL-style effort 1 (fastest) .. 10 (smallest) maps onto WebP method 0..6.
  return (effort - 1) * 6 / 9;
}

bool EncodeStill(const uint8_t* rgba, int w, int h, bool lossless, float quality, int effort,
                 std::vector<uint8_t>* out_bytes) {
  WebPConfig config;
  if (!WebPConfigInit(&config)) {
    g_last_error_stage = 201;
    return false;
  }
  config.lossless = lossless ? 1 : 0;
  config.quality = quality;
  config.method = MethodFromEffort(effort);
  // Preserve the exact RGB values under transparent areas (the default
  // discards them for better compression). A paint app must round-trip
  // every channel bit-exactly, like PNG and JXL do.
  config.exact = 1;
  if (!WebPValidateConfig(&config)) {
    g_last_error_stage = 202;
    return false;
  }
  WebPPicture picture;
  if (!WebPPictureInit(&picture)) {
    g_last_error_stage = 203;
    return false;
  }
  picture.width = w;
  picture.height = h;
  // Lossless encodes the ARGB input bit-exactly; the YUVA conversion used
  // for lossy encoding is inherently inexact, so it must not back lossless.
  picture.use_argb = lossless ? 1 : 0;
  if (!WebPPictureAlloc(&picture)) {
    g_last_error_stage = 204;
    return false;
  }
  bool ok = false;
  WebPMemoryWriter writer;
  WebPMemoryWriterInit(&writer);
  if (!WebPPictureImportRGBA(&picture, rgba, w * 4)) {
    g_last_error_stage = 205;
  } else {
    picture.writer = WebPMemoryWrite;
    picture.custom_ptr = &writer;
    if (!WebPEncode(&config, &picture)) {
      g_last_error_stage = 206;
    } else {
      out_bytes->assign(writer.mem, writer.mem + writer.size);
      ok = true;
    }
  }
  WebPMemoryWriterClear(&writer);
  WebPPictureFree(&picture);
  return ok;
}

emscripten::val ToUint8Array(const uint8_t* data, size_t len) {
  emscripten::val js_array = emscripten::val::global("Uint8Array").new_(len);
  js_array.call<void>("set", emscripten::val(emscripten::typed_memory_view(len, data)));
  return js_array;
}

}  // namespace

emscripten::val webp_decode_js(emscripten::val data) {
  emscripten::val result = emscripten::val::object();
  std::vector<uint8_t> input = emscripten::convertJSArrayToNumberVector<uint8_t>(data);
  if (input.empty()) {
    result.set("ok", false);
    result.set("stage", 1);
    return result;
  }
  uint32_t w = 0, h = 0;
  std::vector<uint8_t> rgba;
  g_last_error_stage = 0;
  if (!DecodeFirstFrame(input.data(), input.size(), &w, &h, &rgba)) {
    result.set("ok", false);
    result.set("stage", g_last_error_stage);
    return result;
  }
  result.set("ok", true);
  result.set("width", w);
  result.set("height", h);
  result.set("buffer", ToUint8Array(rgba.data(), rgba.size()));
  return result;
}

emscripten::val webp_encode_js(emscripten::val pixels, int w, int h, bool lossless, float quality, int effort) {
  emscripten::val result = emscripten::val::object();
  std::vector<uint8_t> input = emscripten::convertJSArrayToNumberVector<uint8_t>(pixels);
  if (w <= 0 || h <= 0 || static_cast<size_t>(w) > kMaxDimension || static_cast<size_t>(h) > kMaxDimension ||
      input.size() != static_cast<size_t>(w) * h * 4) {
    result.set("ok", false);
    result.set("stage", 1);
    return result;
  }
  if (!lossless && (quality < 0.0f || quality > 100.0f)) {
    result.set("ok", false);
    result.set("stage", 2);
    return result;
  }
  g_last_error_stage = 0;
  std::vector<uint8_t> encoded;
  if (!EncodeStill(input.data(), w, h, lossless, quality, effort, &encoded) || encoded.empty()) {
    result.set("ok", false);
    result.set("stage", g_last_error_stage == 0 ? 200 : g_last_error_stage);
    return result;
  }
  result.set("ok", true);
  result.set("data", ToUint8Array(encoded.data(), encoded.size()));
  return result;
}

emscripten::val webp_encode_animation_js(emscripten::val allPixels, int w, int h, emscripten::val durationsMs,
                                         bool lossless, float quality, int numLoops, int effort) {
  emscripten::val result = emscripten::val::object();
  std::vector<uint8_t> input = emscripten::convertJSArrayToNumberVector<uint8_t>(allPixels);
  std::vector<uint32_t> durations = emscripten::convertJSArrayToNumberVector<uint32_t>(durationsMs);
  if (w <= 0 || h <= 0 || static_cast<size_t>(w) > kMaxDimension || static_cast<size_t>(h) > kMaxDimension ||
      durations.empty() || durations.size() > kMaxFrames) {
    result.set("ok", false);
    result.set("stage", 1);
    return result;
  }
  if (input.size() != durations.size() * static_cast<size_t>(w) * static_cast<size_t>(h) * 4) {
    result.set("ok", false);
    result.set("stage", 2);
    return result;
  }
  if (!lossless && (quality < 0.0f || quality > 100.0f)) {
    result.set("ok", false);
    result.set("stage", 3);
    return result;
  }
  WebPConfig config;
  if (!WebPConfigInit(&config)) {
    result.set("ok", false);
    result.set("stage", 4);
    return result;
  }
  config.lossless = lossless ? 1 : 0;
  config.quality = quality;
  config.method = MethodFromEffort(effort);
  // Preserve the exact RGB values under transparent areas (the default
  // discards them for better compression). A paint app must round-trip
  // every channel bit-exactly, like PNG and JXL do.
  config.exact = 1;
  if (!WebPValidateConfig(&config)) {
    result.set("ok", false);
    result.set("stage", 5);
    return result;
  }
  WebPAnimEncoderOptions enc_options;
  if (!WebPAnimEncoderOptionsInit(&enc_options)) {
    result.set("ok", false);
    result.set("stage", 6);
    return result;
  }
  enc_options.anim_params.bgcolor = 0;
  enc_options.anim_params.loop_count = numLoops < 0 ? 0 : numLoops;
  WebPAnimEncoder* enc = WebPAnimEncoderNew(w, h, &enc_options);
  if (enc == nullptr) {
    result.set("ok", false);
    result.set("stage", 7);
    return result;
  }
  bool ok = true;
  int stage = 0;
  int timestamp = 0;
  const size_t stride = static_cast<size_t>(w) * 4;
  const size_t frame_bytes = stride * static_cast<size_t>(h);
  for (size_t f = 0; f < durations.size() && ok; f += 1) {
    WebPPicture picture;
    if (!WebPPictureInit(&picture)) {
      ok = false;
      stage = 8;
      break;
    }
    picture.width = w;
    picture.height = h;
    picture.use_argb = lossless ? 1 : 0;
    if (!WebPPictureAlloc(&picture) || !WebPPictureImportRGBA(&picture, input.data() + f * frame_bytes, w * 4)) {
      WebPPictureFree(&picture);
      ok = false;
      stage = 9;
      break;
    }
    if (!WebPAnimEncoderAdd(enc, &picture, timestamp, &config)) {
      WebPPictureFree(&picture);
      ok = false;
      stage = 10;
      break;
    }
    WebPPictureFree(&picture);
    timestamp += static_cast<int>(durations[f] < 1 ? 1 : durations[f]);
  }
  WebPData assembled;
  WebPDataInit(&assembled);
  if (ok) {
    if (!WebPAnimEncoderAdd(enc, nullptr, timestamp, nullptr)) {
      ok = false;
      stage = 11;
    } else if (!WebPAnimEncoderAssemble(enc, &assembled) || assembled.size == 0) {
      ok = false;
      stage = 12;
    }
  }
  if (ok) {
    result.set("ok", true);
    result.set("data", ToUint8Array(assembled.bytes, assembled.size));
  } else {
    result.set("ok", false);
    result.set("stage", stage);
  }
  WebPDataClear(&assembled);
  WebPAnimEncoderDelete(enc);
  return result;
}

emscripten::val webp_frame_count_js(emscripten::val data) {
  emscripten::val result = emscripten::val::object();
  std::vector<uint8_t> input = emscripten::convertJSArrayToNumberVector<uint8_t>(data);
  if (input.empty()) {
    result.set("ok", false);
    return result;
  }
  WebPData webp_data;
  WebPDataInit(&webp_data);
  webp_data.bytes = input.data();
  webp_data.size = input.size();
  WebPAnimDecoderOptions dec_options;
  if (!WebPAnimDecoderOptionsInit(&dec_options)) {
    result.set("ok", false);
    return result;
  }
  WebPAnimDecoder* dec = WebPAnimDecoderNew(&webp_data, &dec_options);
  if (dec == nullptr) {
    result.set("ok", false);
    return result;
  }
  WebPAnimInfo anim_info;
  if (!WebPAnimDecoderGetInfo(dec, &anim_info)) {
    WebPAnimDecoderDelete(dec);
    result.set("ok", false);
    return result;
  }
  const uint32_t count = anim_info.frame_count;
  WebPAnimDecoderDelete(dec);
  if (count == 0 || count > 100000) {
    result.set("ok", false);
    return result;
  }
  result.set("ok", true);
  result.set("count", count);
  return result;
}

EMSCRIPTEN_BINDINGS(webp_bridge) {
  emscripten::function("webp_decode_js", &webp_decode_js);
  emscripten::function("webp_encode_js", &webp_encode_js);
  emscripten::function("webp_encode_animation_js", &webp_encode_animation_js);
  emscripten::function("webp_frame_count_js", &webp_frame_count_js);
}
