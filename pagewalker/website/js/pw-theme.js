(function () {
  "use strict";
  var STORAGE_KEY = "pw-theme";
  var VALID = ["light", "dark", "system"];
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
    }
    applyLogoTheme(resolved);
  }

  function labelFor(mode) {
    if (window.pwT) return window.pwT("toolbar.themeAria." + mode);
    if (mode === "light") return "Light theme — click to switch to dark";
    if (mode === "dark") return "Dark theme — click to switch to system";
    return "System theme — click to switch to light";
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
              p[i + 3] = 255;
            }
          }
          ctx.putImageData(data, 0, 0);
          logoCache.dark = canvas.toDataURL("image/png");

          var dataLight = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var pl = dataLight.data;
          for (var j = 0; j < pl.length; j += 4) {
            if (pl[j + 3] === 0) continue;
            var lum = 0.299 * pl[j] + 0.587 * pl[j + 1] + 0.114 * pl[j + 2];
            var ink = Math.max(16, Math.min(68, Math.round(20 + lum * 0.1)));
            pl[j] = ink;
            pl[j + 1] = ink;
            pl[j + 2] = ink + 2;
          }
          ctx.putImageData(dataLight, 0, 0);
          logoCache.light = canvas.toDataURL("image/png");
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
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
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
      toggles[i].addEventListener("click", cycle);
    }
    apply(getMode());
  });

  document.addEventListener("pw:i18n-ready", function () {
    apply(getMode());
  });
})();
