/* ============================================================
   Echo EAPK Loader — Saavn-Only API Bridge v2.0
   Provides window.EchoEapk with JioSaavn adapter
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Configuration ---------- */
  var JIOSAAVN_BASE = 'https://www.jiosaavn.com/api.php';
  var SAAVN_PROXY   = 'https://jiosaavn-api-privatecvc2.vercel.app';
  var FETCH_TIMEOUT = 12000;

  /* Quality tiers (kbps) ordered low to high */
  var QUALITY_MAP = {
    low:    ['12kbps', '48kbps', '96kbps'],
    medium: ['96kbps', '160kbps', '48kbps'],
    high:   ['320kbps', '160kbps', '96kbps']
  };

  var EAPK_REGISTRY = [
    {
      id:   'saavn',
      name: 'JioSaavn',
      file: 'assets/eapks/saavn.eapk',
      adapter: 'saavn'
    }
  ];

  /* ---------- Fetch helpers ---------- */
  function fetchJSON(url, timeout) {
    timeout = timeout || FETCH_TIMEOUT;
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () { done = true; reject(new Error('Timeout')); }, timeout);
      fetch(url).then(function (r) {
        if (done) return;
        clearTimeout(timer);
        if (!r.ok) return reject(new Error('HTTP ' + r.status));
        return r.json().then(resolve, reject);
      }).catch(function (e) {
        if (!done) { clearTimeout(timer); reject(e); }
      });
    });
  }

  function saavnUrl(call, extra) {
    return JIOSAAVN_BASE + '?__call=' + call + '&api_version=4&_format=json&_marker=0&ctx=web6dot0' + (extra || '');
  }

  /* ---------- Image helpers ---------- */
  function extractImage(item) {
    if (!item) return '';
    var img = '';
    if (typeof item.image === 'string') img = item.image;
    else if (Array.isArray(item.image) && item.image.length) {
      var last = item.image[item.image.length - 1];
      img = (typeof last === 'string') ? last : (last.link || last.url || '');
    }
    if (!img && typeof item.icon === 'string') img = item.icon;
    if (!img && item.more_info) {
      if (typeof item.more_info.image === 'string') img = item.more_info.image;
      if (!img && typeof item.more_info.album_url === 'string') img = item.more_info.album_url;
    }
    return img ? img.replace(/150x150/g, '500x500').replace(/50x50/g, '500x500') : '';
  }

  function extractArtists(item) {
    if (!item) return 'Unknown';
    if (item.more_info) {
      if (item.more_info.artistMap && item.more_info.artistMap.primary_artists) {
        var pa = item.more_info.artistMap.primary_artists;
        if (Array.isArray(pa) && pa.length) return pa.map(function (a) { return a.name || a; }).join(', ');
      }
      if (typeof item.more_info.music === 'string' && item.more_info.music) return item.more_info.music;
      if (typeof item.more_info.primary_artists === 'string' && item.more_info.primary_artists) return item.more_info.primary_artists;
      if (typeof item.more_info.singers === 'string' && item.more_info.singers) return item.more_info.singers;
    }
    if (typeof item.subtitle === 'string' && item.subtitle) {
      var parts = item.subtitle.split(' - ');
      return parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];
    }
    if (typeof item.primary_artists === 'string') return item.primary_artists;
    return 'Unknown';
  }

  /* ---------- Normalize track ---------- */
  function normalizeSaavnTrack(item) {
    if (!item) return null;
    return {
      id:       item.id || '',
      title:    (item.title || item.song || item.name || 'Untitled').replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
      artist:   extractArtists(item),
      album:    (item.more_info && item.more_info.album) || item.album || '',
      cover:    extractImage(item),
      image:    extractImage(item),
      duration: Number(item.more_info && item.more_info.duration || item.duration) || 0,
      type:     item.type || 'song',
      source:   'saavn'
    };
  }

  /* ---------- Saavn Adapter ---------- */
  var adapters = {};

  adapters.saavn = {
    /* Search */
    search: function (query, page) {
      page = page || 1;
      var url = saavnUrl('search.getResults', '&q=' + encodeURIComponent(query) + '&p=' + page + '&n=20');
      return fetchJSON(url).then(function (data) {
        var results = (data && data.results) || [];
        return results.map(normalizeSaavnTrack).filter(Boolean);
      }).catch(function () {
        return fetchJSON(SAAVN_PROXY + '/search/songs?query=' + encodeURIComponent(query) + '&page=' + page + '&limit=20').then(function (data) {
          var results = (data && data.data && data.data.results) || [];
          return results.map(normalizeSaavnTrack).filter(Boolean);
        });
      });
    },

    /* Home feed */
    getFeed: function () {
      var url = saavnUrl('content.getHomepageData');
      return fetchJSON(url).then(function (data) {
        var sections = [];

        /* Trending (charts) */
        if (data.charts && Array.isArray(data.charts)) {
          sections.push({
            title: 'Trending Now',
            items: data.charts.map(normalizeSaavnTrack).filter(Boolean)
          });
        }

        /* New Releases */
        if (data.new_albums && Array.isArray(data.new_albums)) {
          sections.push({
            title: 'New Releases',
            items: data.new_albums.map(normalizeSaavnTrack).filter(Boolean)
          });
        }

        /* Featured Playlists */
        if (data.featured_playlists && Array.isArray(data.featured_playlists)) {
          sections.push({
            title: 'Featured Playlists',
            items: data.featured_playlists.map(normalizeSaavnTrack).filter(Boolean)
          });
        }

        /* Top playlists (fallback section) */
        if (data.top_playlists && Array.isArray(data.top_playlists)) {
          sections.push({
            title: 'Top Playlists',
            items: data.top_playlists.map(normalizeSaavnTrack).filter(Boolean)
          });
        }

        /* City Mod (editor picks) */
        if (data.city_mod && Array.isArray(data.city_mod)) {
          sections.push({
            title: 'Editor Picks',
            items: data.city_mod.map(normalizeSaavnTrack).filter(Boolean)
          });
        }

        if (sections.length === 0) throw new Error('No feed data');
        return sections;
      }).catch(function (err) {
        console.warn('[EAPK] Official feed failed:', err.message, '— trying proxy');
        return fetchJSON(SAAVN_PROXY + '/modules?language=hindi,english').then(function (data) {
          var sections = [];
          var d = data.data || data;
          if (d.trending && d.trending.data) {
            sections.push({ title: 'Trending Now', items: d.trending.data.map(normalizeSaavnTrack).filter(Boolean) });
          }
          if (d.albums && d.albums.data) {
            sections.push({ title: 'New Releases', items: d.albums.data.map(normalizeSaavnTrack).filter(Boolean) });
          }
          if (d.playlists && d.playlists.data) {
            sections.push({ title: 'Featured Playlists', items: d.playlists.data.map(normalizeSaavnTrack).filter(Boolean) });
          }
          if (d.charts && d.charts.data) {
            sections.push({ title: 'Charts', items: d.charts.data.map(normalizeSaavnTrack).filter(Boolean) });
          }
          return sections;
        });
      });
    },

    /* Stream URL with quality preference */
    getStreamUrl: function (trackId, quality) {
      quality = quality || 'high';
      var tiers = QUALITY_MAP[quality] || QUALITY_MAP.high;

      return fetchJSON(SAAVN_PROXY + '/songs?id=' + encodeURIComponent(trackId)).then(function (resp) {
        var songs = (resp && resp.data) || [];
        if (!songs.length) throw new Error('No data for ' + trackId);
        var song = songs[0];
        var urls = song.downloadUrl || [];
        if (!Array.isArray(urls) || urls.length === 0) throw new Error('No download URLs');

        /* Pick best quality match */
        for (var t = 0; t < tiers.length; t++) {
          for (var u = 0; u < urls.length; u++) {
            if (urls[u].quality === tiers[t] && urls[u].link) {
              return { url: urls[u].link, quality: tiers[t] };
            }
          }
        }
        /* Fallback: last (highest) available */
        var last = urls[urls.length - 1];
        return { url: last.link || last.url, quality: last.quality || 'unknown' };
      });
    },

    /* Get song/album details */
    getDetails: function (id, type) {
      type = type || 'song';
      if (type === 'song') {
        return adapters.saavn.getStreamUrl(id, 'high').then(function (result) {
          return { id: id, streamUrl: result.url, quality: result.quality };
        });
      }
      /* Album / playlist details */
      var call = type === 'album' ? 'content.getAlbumDetails' : 'content.getPlaylistDetails';
      var param = type === 'album' ? '&albumid=' : '&listid=';
      var url = saavnUrl(call, param + encodeURIComponent(id));
      return fetchJSON(url).then(function (data) {
        var list = data.list || data.songs || [];
        return {
          id:    data.id || id,
          title: data.title || data.name || '',
          cover: extractImage(data),
          items: list.map(normalizeSaavnTrack).filter(Boolean)
        };
      });
    },

    /* Recently / popular (proxy endpoint) */
    getRecent: function () {
      return fetchJSON(SAAVN_PROXY + '/modules?language=hindi,english').then(function (data) {
        var d = data.data || data;
        if (d.trending && d.trending.data) {
          return d.trending.data.slice(0, 20).map(normalizeSaavnTrack).filter(Boolean);
        }
        return [];
      }).catch(function () { return []; });
    }
  };

  /* ---------- EAPK ZIP validation (stub — kept for compat) ---------- */
  function validateEapk(buffer) {
    try {
      var view = new Uint8Array(buffer);
      if (view[0] !== 0x50 || view[1] !== 0x4B) return false;
      return true;
    } catch (e) { return false; }
  }

  /* ---------- EchoEapk Bridge ---------- */
  var loadedModules = {};
  var initialized = false;

  window.EchoEapk = {
    call: function (moduleId, method, args) {
      var adapter = adapters[moduleId];
      if (!adapter) return Promise.reject(new Error('Module not loaded: ' + moduleId));
      if (typeof adapter[method] !== 'function') return Promise.reject(new Error('No method: ' + method));
      return adapter[method].apply(adapter, args || []);
    },

    isLoaded: function (moduleId) {
      return !!adapters[moduleId];
    },

    getModule: function (moduleId) {
      return adapters[moduleId] || null;
    },

    getLoadedModules: function () {
      return Object.keys(adapters);
    },

    getQualityMap: function () {
      return QUALITY_MAP;
    },

    init: function () {
      if (initialized) return Promise.resolve(Object.keys(adapters));
      initialized = true;

      console.log('[EAPK] Initializing Saavn adapter');
      EAPK_REGISTRY.forEach(function (entry) {
        loadedModules[entry.id] = { id: entry.id, name: entry.name, adapter: entry.adapter };
      });

      return Promise.resolve(Object.keys(adapters));
    }
  };

  console.log('[EAPK] Echo EAPK Loader v2.0 ready (Saavn-only)');
})();
