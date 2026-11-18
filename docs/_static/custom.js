/* Language switcher for the self-hosted manual (see _templates/layout.html).
 * Jumps to the same page in the other language by rewriting the
 * /manual/<lang>/ prefix in place, so switching is immediate. */
(function () {
  function onReady() {
    var sel = document.getElementById("manual-language");
    if (!sel) {
      return;
    }
    // Pre-select from the URL (works on any host path and file://).
    var here = window.location.pathname.match(/\/manual\/(en|pt_BR)(\/|$)/);
    if (here) {
      sel.value = here[1];
    }
    sel.addEventListener("change", function () {
      var target = sel.value === "pt_BR" ? "pt_BR" : "en";
      var path = window.location.pathname;
      var next = path.replace(/\/manual\/(en|pt_BR)(\/|$)/, "/manual/" + target + "/");
      if (next === path) {
        next = "/manual/" + target + "/";
      }
      window.location.href = next + window.location.search + window.location.hash;
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
