/* ============================================================
   Echo Player — Pointer / Magic Remote Navigation Module
   ============================================================
   Handles LG Magic Remote pointer interactions:
   - Hover  → visual focus (same as D-pad focus)
   - Click  → action trigger
   - Scroll → content scrolling
   Works cooperatively with D-pad navigation.
   ============================================================ */

(function () {
  'use strict';

  let pointerActive = false;
  let lastHovered = null;

  /* ------- Hover Focus ------- */

  function onPointerMove() {
    if (!pointerActive) {
      pointerActive = true;
      document.body.classList.add('pointer-active');
    }
  }

  function onMouseEnter(e) {
    var el = e.currentTarget;
    if (!el.classList.contains('focusable')) return;

    // Clear any D-pad focus
    if (window.DpadNav) window.DpadNav.clearFocus();

    // Remove previous hover focus
    if (lastHovered && lastHovered !== el) {
      lastHovered.classList.remove('focused');
    }

    el.classList.add('focused');
    lastHovered = el;
  }

  function onMouseLeave(e) {
    var el = e.currentTarget;
    el.classList.remove('focused');
    if (lastHovered === el) lastHovered = null;
  }

  /* ------- Click Handler ------- */

  function onClick(e) {
    var el = e.currentTarget;
    // Clicks on focusable elements are handled naturally
    // Just ensure focus state is correct
    if (el.classList.contains('focusable')) {
      el.classList.add('focused');
    }
  }

  /* ------- Scroll Handling ------- */

  function onWheel(e) {
    var contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    // Check if we're scrolling inside content area
    if (contentArea.contains(e.target) || e.target === contentArea) {
      // Allow natural scroll
      return;
    }

    // For card rows, handle horizontal scroll on vertical wheel
    var cardRow = e.target.closest('.card-row');
    if (cardRow) {
      e.preventDefault();
      cardRow.scrollLeft += e.deltaY * 2;
    }
  }

  /* ------- Attach / Detach Listeners ------- */

  function attachListeners() {
    // Listen globally for pointer movement
    document.addEventListener('mousemove', onPointerMove, { passive: true });
    document.addEventListener('wheel', onWheel, { passive: false });

    // We use event delegation for focusable elements
    document.addEventListener('mouseover', function (e) {
      var focusable = e.target.closest('.focusable');
      if (focusable) onMouseEnter({ currentTarget: focusable });
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      var focusable = e.target.closest('.focusable');
      if (focusable) {
        // Check if we're leaving to a child
        var related = e.relatedTarget;
        if (related && focusable.contains(related)) return;
        onMouseLeave({ currentTarget: focusable });
      }
    }, { passive: true });

    document.addEventListener('click', function (e) {
      var focusable = e.target.closest('.focusable');
      if (focusable) onClick({ currentTarget: focusable });
    }, { passive: true });
  }

  /* ------- Deactivate pointer when D-pad pressed ------- */

  function onKeyDown() {
    if (pointerActive) {
      pointerActive = false;
      document.body.classList.remove('pointer-active');
      // Clear hover focus so D-pad takes over
      if (lastHovered) {
        lastHovered.classList.remove('focused');
        lastHovered = null;
      }
    }
  }

  /* ------- Public API ------- */

  window.PointerNav = {
    init: function () {
      attachListeners();
      document.addEventListener('keydown', onKeyDown, { passive: true });
    },

    isActive: function () {
      return pointerActive;
    },

    clearHover: function () {
      if (lastHovered) {
        lastHovered.classList.remove('focused');
        lastHovered = null;
      }
    }
  };
})();
