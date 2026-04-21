(function () {
  "use strict";
  var STORAGE_KEY = "pw-theme";
  var VALID = ["light", "dark", "system"];
  var root = document.documentElement;
  var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

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
    root.setAttribute("data-theme", resolve(mode));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolve(mode) === "dark" ? "#0a0a0a" : "#ff6b1a");
    }
    var toggles = document.querySelectorAll(".pw-theme-toggle");
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute("data-mode", mode);
      toggles[i].setAttribute("aria-label", labelFor(mode));
    }
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
