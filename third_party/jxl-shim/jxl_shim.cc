// Minimal embind bridge over the public libjxl decoder/encoder API.
//
// Exposes still-image decode (any JXL still -> 8-bit RGBA) and encode
// (8-bit RGBA -> JXL bytes, lossless or lossy). Single-threaded by design:
// no parallel runner is set, so everything runs synchronously on the
// calling thread. Only the first frame of animated files is decoded.
//
// This file is our own code; it only *uses* the libjxl public headers and
// links the static libraries built from the third_party/libjxl submodule
// (BSD-3-Clause).
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "jxl/decode.h"
#include "jxl/decode_cxx.h"
#include "jxl/encode.h"
#include "jxl/encode_cxx.h"

namespace {

constexpr size_t kChunkSize = 65536;

int g_last_error_stage = 0;

bool DecodeOneShot(const uint8_t* data, size_t len, uint32_t* out_w, uint32_t* out_h,
                   std::vector<uint8_t>* out_rgba) {
  JxlDecoderPtr dec = JxlDecoderMake(nullptr);
  if (!dec) {
    g_last_error_stage = 101;
    return false;
  }
  if (JxlDecoderSubscribeEvents(dec.get(), JXL_DEC_BASIC_INFO | JXL_DEC_FULL_IMAGE) != JXL_DEC_SUCCESS) {
    g_last_error_stage = 102;
    return false;
  }
  JxlPixelFormat format = {4, JXL_TYPE_UINT8, JXL_NATIVE_ENDIAN, 0};
  if (JxlDecoderSetInput(dec.get(), data, len) != JXL_DEC_SUCCESS) {
    g_last_error_stage = 103;
    return false;
  }
  JxlDecoderCloseInput(dec.get());

  JxlBasicInfo info = {};
  bool have_info = false;
  std::vector<uint8_t> pixels;
  for (;;) {
    JxlDecoderStatus status = JxlDecoderProcessInput(dec.get());
    if (status == JXL_DEC_ERROR) {
      g_last_error_stage = 104;
      return false;
    }
    if (status == JXL_DEC_NEED_MORE_INPUT) {
      g_last_error_stage = 105;
      return false;
    }
    if (status == JXL_DEC_BASIC_INFO) {
      if (JxlDecoderGetBasicInfo(dec.get(), &info) != JXL_DEC_SUCCESS) {
        g_last_error_stage = 106;
        return false;
      }
      if (info.xsize == 0 || info.ysize == 0 || info.xsize > 65536 || info.ysize > 65536) {
        g_last_error_stage = 107;
        return false;
      }
      have_info = true;
    } else if (status == JXL_DEC_NEED_IMAGE_OUT_BUFFER) {
      size_t buffer_size = 0;
      if (JxlDecoderImageOutBufferSize(dec.get(), &format, &buffer_size) != JXL_DEC_SUCCESS) {
        g_last_error_stage = 108;
        return false;
      }
      pixels.resize(buffer_size);
      if (JxlDecoderSetImageOutBuffer(dec.get(), &format, pixels.data(), pixels.size()) != JXL_DEC_SUCCESS) {
        g_last_error_stage = 109;
        return false;
      }
    } else if (status == JXL_DEC_FULL_IMAGE) {
      // Single still frame decoded; ignore any further frames.
      break;
    } else if (status == JXL_DEC_SUCCESS) {
      break;
    }
  }
  if (!have_info || pixels.empty()) {
    g_last_error_stage = 110;
    return false;
  }
  *out_w = info.xsize;
  *out_h = info.ysize;
  out_rgba->assign(pixels.begin(), pixels.end());
  if (out_rgba->size() != static_cast<size_t>(info.xsize) * info.ysize * 4) {
    g_last_error_stage = 111;
    return false;
  }
  return true;
}

emscripten::val ToUint8Array(const uint8_t* data, size_t len) {
  emscripten::val js_array = emscripten::val::global("Uint8Array").new_(len);
  js_array.call<void>("set", emscripten::val(emscripten::typed_memory_view(len, data)));
  return js_array;
}

}  // namespace

emscripten::val jxl_decode_js(emscripten::val data) {
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
  if (!DecodeOneShot(input.data(), input.size(), &w, &h, &rgba)) {
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

emscripten::val jxl_encode_js(emscripten::val pixels, int w, int h, bool lossless, float quality) {
  emscripten::val result = emscripten::val::object();
  std::vector<uint8_t> input = emscripten::convertJSArrayToNumberVector<uint8_t>(pixels);
  if (w <= 0 || h <= 0 || w > 65536 || h > 65536 || input.size() != static_cast<size_t>(w) * h * 4) {
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
  JxlEncoderPtr enc = JxlEncoderMake(nullptr);
  if (!enc) {
    result.set("ok", false);
    result.set("stage", 3);
    return result;
  }
  JxlBasicInfo info;
  JxlEncoderInitBasicInfo(&info);
  info.xsize = static_cast<uint32_t>(w);
  info.ysize = static_cast<uint32_t>(h);
  info.bits_per_sample = 8;
  info.exponent_bits_per_sample = 0;
  info.num_color_channels = 3;
  info.num_extra_channels = 1;
  info.alpha_bits = 8;
  info.alpha_exponent_bits = 0;
  // Lossless requires the original profile (modular mode); lossy uses XYB.
  info.uses_original_profile = lossless ? JXL_TRUE : JXL_FALSE;
  if (JxlEncoderSetBasicInfo(enc.get(), &info) != JXL_ENC_SUCCESS) {
    result.set("ok", false);
    result.set("stage", 4);
    return result;
  }
  JxlColorEncoding color;
  JxlColorEncodingSetToSRGB(&color, JXL_FALSE);
  if (JxlEncoderSetColorEncoding(enc.get(), &color) != JXL_ENC_SUCCESS) {
    result.set("ok", false);
    result.set("stage", 5);
    return result;
  }
  JxlEncoderFrameSettings* opts = JxlEncoderFrameSettingsCreate(enc.get(), nullptr);
  if (!opts) {
    result.set("ok", false);
    result.set("stage", 6);
    return result;
  }
  if (lossless) {
    if (JxlEncoderSetFrameLossless(opts, JXL_TRUE) != JXL_ENC_SUCCESS) {
      result.set("ok", false);
      result.set("stage", 7);
      return result;
    }
  } else {
    float distance = (100.0f - quality) * 0.15f;
    if (distance < 0.5f) distance = 0.5f;
    if (JxlEncoderSetFrameDistance(opts, distance) != JXL_ENC_SUCCESS) {
      result.set("ok", false);
      result.set("stage", 8);
      return result;
    }
  }
  JxlPixelFormat format = {4, JXL_TYPE_UINT8, JXL_NATIVE_ENDIAN, 0};
  size_t stride = static_cast<size_t>(w) * 4;
  if (JxlEncoderAddImageFrame(opts, &format, input.data(), stride * static_cast<size_t>(h)) != JXL_ENC_SUCCESS) {
    result.set("ok", false);
    result.set("stage", 9);
    return result;
  }
  JxlEncoderCloseInput(enc.get());

  std::vector<uint8_t> compressed(kChunkSize);
  size_t used = 0;
  for (;;) {
    uint8_t* next_out = compressed.data() + used;
    size_t avail_out = compressed.size() - used;
    JxlEncoderStatus status = JxlEncoderProcessOutput(enc.get(), &next_out, &avail_out);
    used = static_cast<size_t>(next_out - compressed.data());
    if (status == JXL_ENC_SUCCESS) break;
    if (status != JXL_ENC_NEED_MORE_OUTPUT) {
      result.set("ok", false);
      result.set("stage", 10);
      return result;
    }
    compressed.resize(compressed.size() * 2);
  }
  result.set("ok", true);
  result.set("data", ToUint8Array(compressed.data(), used));
  return result;
}

EMSCRIPTEN_BINDINGS(jxl_bridge) {
  emscripten::function("jxl_decode_js", &jxl_decode_js);
  emscripten::function("jxl_encode_js", &jxl_encode_js);
}
