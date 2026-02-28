/* ============================================================
   Echo Player — Saavn Source Bridge v2.0
   Thin wrapper over EchoEapk saavn adapter
   ============================================================ */
(function () {
  'use strict';

  var MODULE_ID = 'saavn';

  function callAdapter(method, args) {
    return window.EchoEapk.call(MODULE_ID, method, args || []);
  }

  function normalizeTrack(item) {
    if (!item) return null;
    return {
      id:     item.id || '',
      title:  item.title || 'Untitled',
      artist: item.artist || 'Unknown',
      album:  item.album || '',
      cover:  item.cover || item.image || '',
      image:  item.image || item.cover || '',
      duration: item.duration || 0,
      type:   item.type || 'song',
      source: 'saavn'
    };
  }

  window.SaavnSource = {
    id: MODULE_ID,
    name: 'JioSaavn',

    search: function (query, page) {
      return callAdapter('search', [query, page]).then(function (results) {
        return (results || []).map(normalizeTrack).filter(Boolean);
      });
    },

    getFeed: function () {
      return callAdapter('getFeed', []);
    },

    getStreamUrl: function (trackId, quality) {
      return callAdapter('getStreamUrl', [trackId, quality]);
    },

    getDetails: function (id, type) {
      return callAdapter('getDetails', [id, type]);
    },

    getRecent: function () {
      return callAdapter('getRecent', []);
    },

    normalizeTrack: normalizeTrack
  };

  console.log('[Source] Saavn bridge v2.0 ready');
})();
