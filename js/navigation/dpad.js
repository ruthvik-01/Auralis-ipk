/* ============================================================
   Echo Player — D-Pad Navigation Module (LG webOS Remote)
   ============================================================
   Manages spatial navigation for standard LG remote (arrow keys).
   Maintains a focus index within a focusable element collection.
   ============================================================ */

(function () {
  'use strict';

  const KEYS = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    OK: 13,
    BACK: 461,    // LG webOS back button
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406
  };

  let focusableElements = [];
  let currentIndex = -1;
  let enabled = true;
  let onBackCallback = null;

  /* ------- Helpers ------- */

  function collectFocusables() {
    // Collect visible focusable elements, respecting overlay and full-player state
    // Check overlays FIRST (they render above full player at higher z-index)
    const visibleOverlay = document.querySelector('.overlay:not(.hidden)');
    if (visibleOverlay) {
      focusableElements = Array.from(visibleOverlay.querySelectorAll('.focusable'));
      return;
    }

    // Then check full player
    const fullPlayer = document.getElementById('full-player');
    if (fullPlayer && !fullPlayer.classList.contains('hidden')) {
      focusableElements = Array.from(fullPlayer.querySelectorAll('.focusable'));
      return;
    }

    // Normal app navigation
    focusableElements = Array.from(
      document.querySelectorAll('#app .focusable:not(.hidden)')
    ).filter(function (el) {
      // Exclude elements inside hidden parents / tabs
      let parent = el.closest('.tab-panel');
      if (parent && !parent.classList.contains('active')) return false;
      let overlay = el.closest('.overlay');
      if (overlay && overlay.classList.contains('hidden')) return false;
      return el.offsetParent !== null; // visible
    });
  }

  function clearFocus() {
    focusableElements.forEach(function (el) {
      el.classList.remove('focused');
    });
  }

  function setFocus(index) {
    clearFocus();
    if (index < 0 || index >= focusableElements.length) return;
    currentIndex = index;
    var el = focusableElements[currentIndex];
    el.classList.add('focused');
    scrollIntoViewIfNeeded(el);
  }

  function scrollIntoViewIfNeeded(el) {
    var contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    var rect = el.getBoundingClientRect();
    var containerRect = contentArea.getBoundingClientRect();
    if (rect.bottom > containerRect.bottom) {
      contentArea.scrollTop += rect.bottom - containerRect.bottom + 40;
    } else if (rect.top < containerRect.top) {
      contentArea.scrollTop -= containerRect.top - rect.top + 40;
    }
  }

  function getRect(el) {
    return el.getBoundingClientRect();
  }

  function findNearest(direction) {
    if (currentIndex < 0 || focusableElements.length === 0) return 0;

    var current = getRect(focusableElements[currentIndex]);
    var cx = current.left + current.width / 2;
    var cy = current.top + current.height / 2;
    var best = -1;
    var bestDist = Infinity;

    for (var i = 0; i < focusableElements.length; i++) {
      if (i === currentIndex) continue;
      var r = getRect(focusableElements[i]);
      var rx = r.left + r.width / 2;
      var ry = r.top + r.height / 2;

      var valid = false;
      switch (direction) {
        case 'left':  valid = rx < cx - 10; break;
        case 'right': valid = rx > cx + 10; break;
        case 'up':    valid = ry < cy - 10; break;
        case 'down':  valid = ry > cy + 10; break;
      }
      if (!valid) continue;

      var dx = rx - cx;
      var dy = ry - cy;
      // Weight: prioritize same-axis movement
      var dist;
      if (direction === 'left' || direction === 'right') {
        dist = Math.abs(dx) + Math.abs(dy) * 3;
      } else {
        dist = Math.abs(dy) + Math.abs(dx) * 3;
      }

      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }

    return best >= 0 ? best : currentIndex;
  }

  /* ------- Key Handler ------- */

  function onKeyDown(e) {
    if (!enabled) return;

    collectFocusables();
    if (focusableElements.length === 0) return;

    // Ensure we have valid focus
    if (currentIndex < 0 || currentIndex >= focusableElements.length) {
      setFocus(0);
    }

    switch (e.keyCode) {
      case KEYS.LEFT:
        e.preventDefault();
        setFocus(findNearest('left'));
        break;
      case KEYS.RIGHT:
        e.preventDefault();
        setFocus(findNearest('right'));
        break;
      case KEYS.UP:
        e.preventDefault();
        setFocus(findNearest('up'));
        break;
      case KEYS.DOWN:
        e.preventDefault();
        setFocus(findNearest('down'));
        break;
      case KEYS.OK:
        e.preventDefault();
        if (focusableElements[currentIndex]) {
          focusableElements[currentIndex].click();
        }
        break;
      case KEYS.BACK:
        e.preventDefault();
        if (typeof onBackCallback === 'function') {
          onBackCallback();
        }
        break;
    }
  }

  /* ------- Public API ------- */

  window.DpadNav = {
    init: function () {
      document.addEventListener('keydown', onKeyDown, false);
      // Initial focus after short delay
      setTimeout(function () {
        collectFocusables();
        if (focusableElements.length > 0) setFocus(0);
      }, 100);
    },

    refresh: function () {
      collectFocusables();
      // Keep focus on current element if still present, else reset
      if (currentIndex >= 0 && currentIndex < focusableElements.length) {
        setFocus(currentIndex);
      } else if (focusableElements.length > 0) {
        setFocus(0);
      }
    },

    focusElement: function (el) {
      collectFocusables();
      var idx = focusableElements.indexOf(el);
      if (idx >= 0) setFocus(idx);
    },

    clearFocus: clearFocus,

    setEnabled: function (val) {
      enabled = !!val;
    },

    onBack: function (cb) {
      onBackCallback = cb;
    },

    getCurrentElement: function () {
      return focusableElements[currentIndex] || null;
    },

    KEYS: KEYS
  };
})();
