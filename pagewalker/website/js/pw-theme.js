(function () {
  "use strict";
  var STORAGE_KEY = "pw-theme";
  var VALID = ["light", "dark", "system"];
  // Must match `styles.css` --primary (#ff6b1a) and Flutter `AppColors.webLogoOrange`.
  var BRAND_ORANGE = { r: 255, g: 107, b: 26 };
  // Light header mark: `styles.css` --text (#0a0a0a) and Flutter `AppColors.webLogoInk`.
  var LOGO_INK = { r: 10, g: 10, b: 10 };
  var root = document.documentElement;
  var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var logoPromise = null;
  var logoCache = { dark: null, light: null };

  function getMode() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return VALID.indexOf(v) !== -1 ? v : "system";
    } catch (_) {
      return "system";
    }
  }

  function resolve(mode) {
    if (mode === "dark") return "dark";
    if (mode === "light") return "light";
    return mql && mql.matches ? "dark" : "light";
  }

  function apply(mode) {
    var resolved = resolve(mode);
    root.setAttribute("data-theme", resolved);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolved === "dark" ? "#0a0a0a" : "#ff6b1a");
    }
    var toggles = document.querySelectorAll(".pw-theme-toggle");
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute("data-mode", mode);
      toggles[i].setAttribute("aria-label", labelFor(mode));
      var labelNode = toggles[i].querySelector(".pw-theme-toggle-label");
      if (labelNode) labelNode.textContent = modeLabel(mode);
    }
    applyLogoTheme(resolved);
  }

  function labelFor(mode) {
    if (window.pwT) return window.pwT("toolbar.themeAria." + mode);
    if (mode === "light") return "Light theme — click to switch to dark";
    if (mode === "dark") return "Dark theme — click to switch to system";
    return "System theme — click to switch to light";
  }

  function modeLabel(mode) {
    if (window.pwT) return window.pwT("toolbar.themeMode." + mode);
    if (mode === "light") return "Light mode";
    if (mode === "dark") return "Dark mode";
    return "System mode";
  }

  function setMode(mode) {
    if (VALID.indexOf(mode) === -1) mode = "system";
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (_) {}
    apply(mode);
  }

  function cycle() {
    var cur = getMode();
    var next = cur === "light" ? "dark" : cur === "dark" ? "system" : "light";
    setMode(next);
  }

  function buildLogoVariants() {
    if (logoPromise) return logoPromise;
    logoPromise = new Promise(function (resolvePromise) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          var ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var p = data.data;
          for (var i = 0; i < p.length; i += 4) {
            var r = p[i];
            var g = p[i + 1];
            var b = p[i + 2];
            // Chroma key: treat near-black as transparent.
            if (r < 26 && g < 26 && b < 26) {
              p[i + 3] = 0;
            } else {
              p[i] = BRAND_ORANGE.r;
              p[i + 1] = BRAND_ORANGE.g;
              p[i + 2] = BRAND_ORANGE.b;
              p[i + 3] = 255;
            }
          }
          ctx.putImageData(data, 0, 0);
          var croppedDark = cropCanvasToOpaque(canvas);
          logoCache.dark = croppedDark.toDataURL("image/png");

          var dataLight = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var pl = dataLight.data;
          for (var j = 0; j < pl.length; j += 4) {
            if (pl[j + 3] === 0) continue;
            // Light mode: black mark on light header (dark mode keeps brand orange above).
            pl[j] = LOGO_INK.r;
            pl[j + 1] = LOGO_INK.g;
            pl[j + 2] = LOGO_INK.b;
          }
          ctx.putImageData(dataLight, 0, 0);
          var croppedLight = cropCanvasToOpaque(canvas);
          logoCache.light = croppedLight.toDataURL("image/png");
          resolvePromise(true);
        } catch (_) {
          resolvePromise(false);
        }
      };
      img.onerror = function () {
        resolvePromise(false);
      };
      img.src = "/logo-source.png";
    });
    return logoPromise;
  }

  function cropCanvasToOpaque(sourceCanvas) {
    var w = sourceCanvas.width;
    var h = sourceCanvas.height;
    var ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    var imgData = ctx.getImageData(0, 0, w, h).data;
    var minX = w;
    var minY = h;
    var maxX = 0;
    var maxY = 0;
    var found = false;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var a = imgData[(y * w + x) * 4 + 3];
        if (a > 0) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return sourceCanvas;
    var padX = Math.round((maxX - minX + 1) * 0.04);
    var padY = Math.round((maxY - minY + 1) * 0.08);
    minX = Math.max(0, minX - padX);
    minY = Math.max(0, minY - padY);
    maxX = Math.min(w - 1, maxX + padX);
    maxY = Math.min(h - 1, maxY + padY);
    var outW = maxX - minX + 1;
    var outH = maxY - minY + 1;
    var out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    var octx = out.getContext("2d");
    octx.drawImage(sourceCanvas, minX, minY, outW, outH, 0, 0, outW, outH);
    return out;
  }

  function applyLogoTheme(resolvedTheme) {
    if (!logoCache.dark || !logoCache.light) return;
    var logos = document.querySelectorAll(".pw-logo-image");
    var src = resolvedTheme === "dark" ? logoCache.dark : logoCache.light;
    for (var i = 0; i < logos.length; i++) {
      logos[i].src = src;
      logos[i].hidden = false;
    }
  }

  function setupLogos() {
    var nodes = document.querySelectorAll(".logo");
    if (!nodes.length) return;
    var isWebAppShell = root.getAttribute("data-pw-page") === "web-app";
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      // Keep logo/icon behavior consistent: always return to home.
      node.setAttribute("href", "/");
      if (isWebAppShell) {
        node.setAttribute("data-link-route", "/");
      }
      if (node.querySelector(".pw-logo-image")) continue;
      node.classList.add("logo-has-image");
      var label = node.textContent.trim() || "Pagewalker";
      node.textContent = "";
      var img = document.createElement("img");
      img.className = "pw-logo-image";
      img.alt = label;
      img.hidden = true;
      var text = document.createElement("span");
      text.className = "pw-logo-fallback";
      text.textContent = label;
      node.appendChild(img);
      node.appendChild(text);
    }
    buildLogoVariants().then(function () {
      applyLogoTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    });
  }

  apply(getMode());

  if (mql) {
    var listener = function () {
      if (getMode() === "system") apply("system");
    };
    if (mql.addEventListener) mql.addEventListener("change", listener);
    else if (mql.addListener) mql.addListener(listener);
  }

  window.pwTheme = {
    get: getMode,
    set: setMode,
    cycle: cycle,
    apply: apply,
  };

  document.addEventListener("DOMContentLoaded", function () {
    setupLogos();
    var toggles = document.querySelectorAll(".pw-theme-toggle");
    for (var i = 0; i < toggles.length; i++) {
      if (!toggles[i].querySelector(".pw-theme-toggle-label")) {
        var text = document.createElement("span");
        text.className = "pw-theme-toggle-label";
        text.textContent = modeLabel(getMode());
        toggles[i].appendChild(text);
      }
      toggles[i].addEventListener("click", cycle);
    }
    apply(getMode());
  });

  document.addEventListener("pw:i18n-ready", function () {
    apply(getMode());
  });
})();
