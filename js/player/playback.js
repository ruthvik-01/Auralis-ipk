/* ============================================================
   Echo Player — Playback Controller v2.0
   Saavn-only, quality-aware, recently-played tracking
   ============================================================ */
(function () {
  'use strict';

  var RECENTLY_PLAYED_KEY = 'echo_recent';
  var MAX_RECENT = 50;

  /* ---------- State ---------- */
  var audio = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';

  var state = {
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    shuffle: false,
    repeat: 'none',          /* none | one | all */
    duration: 0,
    currentTime: 0,
    volume: 1,
    qualityPreference: 'high', /* low | medium | high */
    currentQuality: '',
    currentTrack: null
  };

  /* ---------- Event emitter ---------- */
  var listeners = {};

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (f) { return f !== fn; });
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { console.error('[Playback] Listener error:', e); }
    });
  }

  /* ---------- Recently played ---------- */
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveRecent(list) {
    try { localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function addToRecent(track) {
    if (!track || !track.id) return;
    var list = loadRecent();
    list = list.filter(function (t) { return t.id !== track.id; });
    list.unshift({
      id: track.id, title: track.title, artist: track.artist,
      cover: track.cover || track.image, source: track.source,
      playedAt: Date.now()
    });
    if (list.length > MAX_RECENT) list.length = MAX_RECENT;
    saveRecent(list);
    emit('recentupdate', list);
  }

  /* ---------- Quality preference ---------- */
  function setQuality(q) {
    if (['low', 'medium', 'high'].indexOf(q) === -1) return;
    state.qualityPreference = q;
    try { localStorage.setItem('echo_quality', q); } catch (e) {}
    emit('qualityprefchange', q);
  }

  function loadQualityPref() {
    try {
      var q = localStorage.getItem('echo_quality');
      if (q && ['low', 'medium', 'high'].indexOf(q) !== -1) state.qualityPreference = q;
    } catch (e) {}
  }

  /* ---------- Stream URL resolution ---------- */
  function resolveStreamUrl(track) {
    if (!track || !track.id) return Promise.reject(new Error('No track'));

    return window.EchoEapk.call('saavn', 'getStreamUrl', [track.id, state.qualityPreference])
      .then(function (result) {
        state.currentQuality = result.quality || '';
        emit('qualitychange', { quality: result.quality, url: result.url });
        return result.url;
      });
  }

  /* ---------- Load & play track ---------- */
  function loadTrack(index, autoplay) {
    if (index < 0 || index >= state.queue.length) return;

    state.currentIndex = index;
    state.currentTrack = state.queue[index];
    state.duration = 0;
    state.currentTime = 0;
    autoplay = autoplay !== false;

    var track = state.currentTrack;
    emit('trackchange', track);

    /* Media Session API */
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Unknown',
          artist: track.artist || 'Unknown',
          album: track.album || '',
          artwork: track.cover ? [
            { src: track.cover, sizes: '512x512', type: 'image/jpeg' }
          ] : []
        });
      } catch (e) {}
    }

    resolveStreamUrl(track).then(function (url) {
      audio.src = url;
      if (autoplay) {
        audio.play().then(function () {
          state.isPlaying = true;
          emit('statechange', { isPlaying: true });
          addToRecent(track);
        }).catch(function (e) {
          console.warn('[Playback] Play failed:', e.message);
          emit('error', { message: 'Playback failed', error: e });
        });
      }
    }).catch(function (e) {
      console.error('[Playback] Stream resolve failed:', e.message);
      emit('error', { message: 'Could not load stream', error: e });
      /* Try next track */
      if (state.queue.length > 1) next();
    });
  }

  /* ---------- Audio events ---------- */
  audio.addEventListener('timeupdate', function () {
    state.currentTime = audio.currentTime;
    state.duration = audio.duration || 0;
    emit('timeupdate', { currentTime: audio.currentTime, duration: audio.duration || 0 });
  });

  audio.addEventListener('loadedmetadata', function () {
    state.duration = audio.duration || 0;
    emit('durationchange', audio.duration || 0);
  });

  audio.addEventListener('ended', function () {
    if (state.repeat === 'one') {
      audio.currentTime = 0;
      audio.play().catch(function () {});
      return;
    }
    next();
  });

  audio.addEventListener('error', function (e) {
    console.error('[Playback] Audio error:', e);
    emit('error', { message: 'Audio playback error', error: e });
  });

  audio.addEventListener('waiting', function () { emit('buffering', true); });
  audio.addEventListener('canplay', function () { emit('buffering', false); });

  /* ---------- Controls ---------- */
  function play() {
    if (!audio.src && state.queue.length > 0) {
      loadTrack(state.currentIndex >= 0 ? state.currentIndex : 0);
      return;
    }
    audio.play().then(function () {
      state.isPlaying = true;
      emit('statechange', { isPlaying: true });
    }).catch(function () {});
  }

  function pause() {
    audio.pause();
    state.isPlaying = false;
    emit('statechange', { isPlaying: false });
  }

  function togglePlay() {
    state.isPlaying ? pause() : play();
  }

  function next() {
    if (state.queue.length === 0) return;
    var nextIndex;
    if (state.shuffle) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
      if (nextIndex === state.currentIndex && state.queue.length > 1) {
        nextIndex = (nextIndex + 1) % state.queue.length;
      }
    } else {
      nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        if (state.repeat === 'all') nextIndex = 0;
        else { pause(); return; }
      }
    }
    loadTrack(nextIndex);
  }

  function previous() {
    if (audio.currentTime > 3) { seek(0); return; }
    if (state.queue.length === 0) return;
    var prevIndex = state.currentIndex - 1;
    if (prevIndex < 0) prevIndex = state.repeat === 'all' ? state.queue.length - 1 : 0;
    loadTrack(prevIndex);
  }

  function seek(time) {
    if (isNaN(time)) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }

  function seekPercent(pct) {
    if (!audio.duration) return;
    seek(pct * audio.duration);
  }

  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    audio.volume = state.volume;
    emit('volumechange', state.volume);
  }

  function toggleShuffle() {
    state.shuffle = !state.shuffle;
    emit('shufflechange', state.shuffle);
  }

  function toggleRepeat() {
    var modes = ['none', 'all', 'one'];
    var idx = modes.indexOf(state.repeat);
    state.repeat = modes[(idx + 1) % 3];
    emit('repeatchange', state.repeat);
  }

  /* ---------- Queue management ---------- */
  function setQueue(tracks, startIndex) {
    state.queue = tracks || [];
    if (typeof startIndex === 'number') {
      loadTrack(startIndex);
    }
    emit('queuechange', state.queue);
  }

  function addToQueue(track) {
    state.queue.push(track);
    emit('queuechange', state.queue);
  }

  function clearQueue() {
    state.queue = [];
    state.currentIndex = -1;
    state.currentTrack = null;
    audio.src = '';
    state.isPlaying = false;
    emit('queuechange', state.queue);
    emit('statechange', { isPlaying: false });
  }

  /* ---------- Media Session ---------- */
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('nexttrack', next);
      navigator.mediaSession.setActionHandler('previoustrack', previous);
    } catch (e) {}
  }

  /* ---------- Init ---------- */
  loadQualityPref();

  /* ---------- Public API ---------- */
  window.EchoPlayback = {
    /* State */
    getState:       function () { return Object.assign({}, state); },
    getQueue:       function () { return state.queue.slice(); },
    getCurrentTrack: function () { return state.currentTrack; },
    getAudio:       function () { return audio; },

    /* Controls */
    play:           play,
    pause:          pause,
    togglePlay:     togglePlay,
    next:           next,
    previous:       previous,
    seek:           seek,
    seekPercent:    seekPercent,
    setVolume:      setVolume,
    toggleShuffle:  toggleShuffle,
    toggleRepeat:   toggleRepeat,

    /* Queue */
    setQueue:       setQueue,
    addToQueue:     addToQueue,
    clearQueue:     clearQueue,
    loadTrack:      loadTrack,
    playAt:         function (index) { if (index >= 0 && index < state.queue.length) loadTrack(index); },

    /* Quality */
    setQuality:     setQuality,
    getQuality:     function () { return state.qualityPreference; },
    getCurrentQuality: function () { return state.currentQuality; },

    /* Recently played */
    getRecentlyPlayed: loadRecent,

    /* Events */
    on:  on,
    off: off
  };

  console.log('[Playback] Echo Playback v2.0 ready');
})();
