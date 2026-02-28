/* ============================================================
   Echo Player — Main Application Controller v2.0
   Full rewrite: playlists, full player, themes, quality, animations
   ============================================================ */
(function () {
  'use strict';

  /* ========== Constants ========== */
  var SEARCH_DEBOUNCE = 200;
  var PLAYLISTS_KEY   = 'echo_playlists';
  var LIKED_KEY       = 'echo_liked';
  var THEME_KEY       = 'echo_theme';
  var SIDEBAR_KEY     = 'echo_sidebar_size';

  /* ========== DOM Refs ========== */
  var $  = function (id) { return document.getElementById(id); };
  var el = {
    app:              $('app'),
    /* Top bar */
    qualityBadge:     $('quality-badge'),
    qualityLabel:     $('quality-label'),
    /* Tabs */
    tabHome:          $('tab-home'),
    tabSearch:        $('tab-search'),
    tabLibrary:       $('tab-library'),
    /* Home rows */
    newReleasesRow:   $('new-releases-row'),
    homeRecentRow:    $('home-recent-row'),
    homeRecentSection: $('home-recent-section'),
    homePlaylistsRow: $('home-playlists-row'),
    homePlaylistsSection: $('home-playlists-section'),
    /* Search */
    searchInput:      $('search-input'),
    searchClear:      $('search-clear'),
    searchResults:    $('search-results'),
    /* Library */
    recentRow:        $('recent-row'),
    playlistsRow:     $('playlists-row'),
    likedSongsList:   $('liked-songs-list'),
    likedCount:       $('liked-count'),
    btnCreatePlaylist: $('btn-create-playlist'),
    /* Player bar */
    playerTrackInfo:  $('player-track-info'),
    playerCover:      $('player-cover'),
    playerTitle:      $('player-title'),
    playerArtist:     $('player-artist'),
    playerTimeCurrent: $('player-time-current'),
    playerTimeTotal:  $('player-time-total'),
    playerProgressBar: $('player-progress-bar'),
    progressFill:     $('player-progress-fill'),
    progressThumb:    $('player-progress-thumb'),
    btnPlay:          $('btn-play'),
    iconPlay:         $('icon-play'),
    iconPause:        $('icon-pause'),
    btnPrev:          $('btn-prev'),
    btnNext:          $('btn-next'),
    btnShuffle:       $('btn-shuffle'),
    btnRepeat:        $('btn-repeat'),
    btnLike:          $('btn-like'),
    heartOutline:     $('icon-heart-outline'),
    heartFilled:      $('icon-heart-filled'),
    /* Full player */
    fullPlayer:       $('full-player'),
    fullPlayerBg:     $('full-player-bg'),
    fullPlayerClose:  $('full-player-close'),
    fullPlayerCover:  $('full-player-cover'),
    fullPlayerTitle:  $('full-player-title'),
    fullPlayerArtist: $('full-player-artist'),
    fullProgressBar:  $('full-player-progress-bar'),
    fullProgressFill: $('full-player-progress-fill'),
    fullProgressThumb: $('full-player-progress-thumb'),
    fullTimeCurrent:  $('full-player-time-current'),
    fullTimeTotal:    $('full-player-time-total'),
    fullBtnPlay:      $('full-btn-play'),
    fullIconPlay:     $('full-icon-play'),
    fullIconPause:    $('full-icon-pause'),
    fullBtnPrev:      $('full-btn-prev'),
    fullBtnNext:      $('full-btn-next'),
    fullBtnShuffle:   $('full-btn-shuffle'),
    fullBtnRepeat:    $('full-btn-repeat'),
    fullHeartOutline: $('full-icon-heart-outline'),
    fullHeartFilled:  $('full-icon-heart-filled'),
    fullBtnLike:      $('full-btn-like'),
    fullBtnAddPlaylist: $('full-btn-add-playlist'),
    fullBtnQueue:     $('full-btn-queue'),
    /* Queue overlay (fallback) */
    queueOverlay:     $('queue-overlay'),
    queueList:        $('queue-list'),
    queueTrackCount:  $('queue-track-count'),
    /* Queue side panel */
    queueSidePanel:   $('queue-side-panel'),
    qspTabQueue:      $('qsp-tab-queue'),
    qspTabRecent:     $('qsp-tab-recent'),
    qspClose:         $('qsp-close'),
    qspQueueView:     $('qsp-queue-view'),
    qspRecentView:    $('qsp-recent-view'),
    qspNowPlaying:    $('qsp-now-playing'),
    qspNextLabel:     $('qsp-next-label'),
    qspNextList:      $('qsp-next-list'),
    qspRecentList:    $('qsp-recent-list'),
    /* Context menu */
    qspContextMenu:   $('qsp-context-menu'),
    qspCtxPlayNext:   $('qsp-ctx-play-next'),
    qspCtxRemove:     $('qsp-ctx-remove'),
    /* Overlays */
    settingsOverlay:  $('settings-overlay'),
    themeGrid:        $('theme-grid'),
    qualityOptions:   $('quality-options'),
    playlistOverlay:  $('playlist-overlay'),
    playlistNameInput: $('playlist-name-input'),
    btnPlaylistCreate: $('btn-playlist-create'),
    addToPlaylistOverlay: $('add-to-playlist-overlay'),
    addPlaylistList:  $('add-playlist-list'),
    /* Playlist context menu */
    plCtxMenu:        $('pl-context-menu'),
    plCtxRename:      $('pl-ctx-rename'),
    plCtxDelete:      $('pl-ctx-delete'),
    /* Rename overlay */
    renameOverlay:    $('rename-playlist-overlay'),
    renameInput:      $('rename-playlist-input'),
    btnRenameSave:    $('btn-rename-save'),
    /* Delete confirm overlay */
    deleteOverlay:    $('delete-playlist-overlay'),
    deleteNameLabel:  $('delete-playlist-name'),
    btnDeleteConfirm: $('btn-delete-confirm'),
    /* Toast */
    toast:            $('toast'),
    contentArea:      $('content-area')
  };

  /* ========== State ========== */
  var activeTab = 'home';
  var searchTimer = null;
  var feedLoaded = false;
  var trackForPlaylistAdd = null;  /* track waiting to be added to playlist */
  var isDraggingProgress = false;
  var isDraggingFullProgress = false;
  var isQueuePanelOpen = false;
  var qspActiveTab = 'queue';
  var contextMenuTrack = null;
  var playlistCtxId = null;    /* playlist id for context menu */
  var playlistCtxName = null;  /* playlist name for context menu */
  var contextMenuIndex = -1;

  /* ========== Utility ========== */
  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    s = Math.floor(s);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function toast(msg, duration) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    el.toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      el.toast.classList.remove('visible');
      setTimeout(function () { el.toast.classList.add('hidden'); }, 300);
    }, duration || 2500);
  }

  function stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  }

  /* ========== Playlist Manager ========== */
  var PlaylistManager = {
    _load: function () {
      try { return JSON.parse(localStorage.getItem(PLAYLISTS_KEY)) || []; }
      catch (e) { return []; }
    },
    _save: function (list) {
      try { localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(list)); } catch (e) {}
    },
    getAll: function () { return PlaylistManager._load(); },
    create: function (name) {
      var list = PlaylistManager._load();
      var p = { id: 'pl_' + Date.now(), name: name, tracks: [], created: Date.now() };
      list.push(p);
      PlaylistManager._save(list);
      return p;
    },
    remove: function (id) {
      var list = PlaylistManager._load().filter(function (p) { return p.id !== id; });
      PlaylistManager._save(list);
    },
    addTrack: function (playlistId, track) {
      var list = PlaylistManager._load();
      var pl = list.find(function (p) { return p.id === playlistId; });
      if (!pl) return false;
      if (pl.tracks.some(function (t) { return t.id === track.id; })) return false;
      pl.tracks.push({ id: track.id, title: track.title, artist: track.artist, cover: track.cover || track.image, duration: track.duration });
      PlaylistManager._save(list);
      return true;
    },
    rename: function (id, newName) {
      var list = PlaylistManager._load();
      var pl = list.find(function (p) { return p.id === id; });
      if (!pl) return;
      pl.name = newName;
      PlaylistManager._save(list);
    },
    removeTrack: function (playlistId, trackId) {
      var list = PlaylistManager._load();
      var pl = list.find(function (p) { return p.id === playlistId; });
      if (!pl) return;
      pl.tracks = pl.tracks.filter(function (t) { return t.id !== trackId; });
      PlaylistManager._save(list);
    },
    getTracks: function (playlistId) {
      var pl = PlaylistManager._load().find(function (p) { return p.id === playlistId; });
      return pl ? pl.tracks : [];
    }
  };

  /* ========== Liked Songs Manager ========== */
  var LikedSongs = {
    _load: function () {
      try { return JSON.parse(localStorage.getItem(LIKED_KEY)) || []; }
      catch (e) { return []; }
    },
    _save: function (list) {
      try { localStorage.setItem(LIKED_KEY, JSON.stringify(list)); } catch (e) {}
    },
    getAll: function () { return LikedSongs._load(); },
    isLiked: function (trackId) {
      return LikedSongs._load().some(function (t) { return t.id === trackId; });
    },
    toggle: function (track) {
      if (!track || !track.id) return false;
      var list = LikedSongs._load();
      var idx = list.findIndex(function (t) { return t.id === track.id; });
      if (idx >= 0) {
        list.splice(idx, 1);
        LikedSongs._save(list);
        return false; /* unliked */
      } else {
        list.unshift({ id: track.id, title: track.title, artist: track.artist, cover: track.cover || track.image, duration: track.duration });
        LikedSongs._save(list);
        return true; /* liked */
      }
    },
    count: function () { return LikedSongs._load().length; }
  };

  /* ========== Theme Manager ========== */
  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t) applyTheme(t);
    } catch (e) {}
  }

  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    /* Update active swatch */
    var swatches = el.themeGrid.querySelectorAll('.theme-option');
    swatches.forEach(function (s) {
      s.classList.toggle('active', s.getAttribute('data-theme') === name);
    });
    try { localStorage.setItem(THEME_KEY, name); } catch (e) {}
  }

  /* ========== Sidebar Size Manager ========== */
  function loadSidebarSize() {
    try {
      var size = localStorage.getItem(SIDEBAR_KEY) || 'small';
      applySidebarSize(size);
    } catch (e) {}
  }

  function applySidebarSize(size) {
    el.app.classList.remove('nav-medium', 'nav-large');
    if (size === 'medium') el.app.classList.add('nav-medium');
    else if (size === 'large') el.app.classList.add('nav-large');
    /* Update active state in settings */
    var opts = document.querySelectorAll('#sidebar-size-options .quality-option');
    opts.forEach(function (o) {
      o.classList.toggle('active', o.getAttribute('data-sidebar') === size);
    });
    try { localStorage.setItem(SIDEBAR_KEY, size); } catch (e) {}
  }

  /* ========== Quality Badge ========== */
  function updateQualityBadge(quality) {
    if (!quality) { el.qualityBadge.classList.add('hidden'); return; }
    var label = 'SD';
    if (quality === '320kbps') label = 'HD';
    else if (quality === '160kbps') label = 'HQ';
    else if (quality === '96kbps') label = 'MQ';
    el.qualityLabel.textContent = label;
    el.qualityBadge.classList.remove('hidden');
  }

  function syncQualityOptionUI() {
    var pref = window.EchoPlayback.getQuality();
    var opts = el.qualityOptions.querySelectorAll('.quality-option');
    opts.forEach(function (o) {
      o.classList.toggle('active', o.getAttribute('data-quality') === pref);
    });
  }

  /* ========== Card / Item Rendering ========== */
  function createMusicCard(track) {
    var card = document.createElement('div');
    card.className = 'music-card focusable';
    card.tabIndex = 0;
    card.setAttribute('data-id', track.id);
    card.setAttribute('data-type', track.type || 'song');

    var cover = track.cover || track.image || '';

    card.innerHTML =
      '<div class="music-card-cover">' +
        (cover ? '<img src="' + cover + '" alt="" loading="lazy"/>' : '') +
        '<div class="play-overlay"><svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>' +
      '</div>' +
      '<div class="music-card-info">' +
        '<div class="music-card-title">' + stripHtml(track.title) + '</div>' +
        '<div class="music-card-subtitle">' + stripHtml(track.artist) + '</div>' +
      '</div>';

    card.addEventListener('click', function () {
      onCardClick(track);
    });

    return card;
  }

  function createSongItem(track, opts) {
    opts = opts || {};
    var item = document.createElement('div');
    item.className = 'song-item focusable';
    item.tabIndex = 0;
    item.setAttribute('data-id', track.id);

    var cover = track.cover || track.image || '';
    var dur = track.duration ? formatTime(track.duration) : '';

    var actionsHtml = '';
    if (!opts.hideActions) {
      actionsHtml =
        '<div class="song-item-actions">' +
          '<button class="song-item-action-btn focusable" data-action="like" aria-label="Like">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' +
          '</button>' +
          '<button class="song-item-action-btn focusable" data-action="add-to-playlist" aria-label="Add to playlist">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>' +
          '</button>' +
        '</div>';
    }

    item.innerHTML =
      '<div class="song-item-cover">' + (cover ? '<img src="' + cover + '" alt="" loading="lazy"/>' : '') + '</div>' +
      '<div class="song-item-text">' +
        '<div class="song-item-title">' + stripHtml(track.title) + '</div>' +
        '<div class="song-item-artist">' + stripHtml(track.artist) + '</div>' +
      '</div>' +
      (dur ? '<span class="song-item-duration">' + dur + '</span>' : '') +
      actionsHtml;

    item.addEventListener('click', function (e) {
      var actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        var action = actionBtn.getAttribute('data-action');
        if (action === 'like') {
          var liked = LikedSongs.toggle(track);
          toast(liked ? 'Liked!' : 'Removed from liked');
          refreshLibrary();
          updateLikeButtons();
        } else if (action === 'add-to-playlist') {
          openAddToPlaylist(track);
        }
        return;
      }
      /* If a queue context was provided, play as queue from this index */
      if (opts.queue && opts.queue.length > 0 && typeof opts.queueIndex === 'number') {
        var q = opts.queue.map(function (t) { t.source = t.source || 'saavn'; return t; });
        window.EchoPlayback.setQueue(q, opts.queueIndex);
      } else {
        onCardClick(track);
      }
    });

    return item;
  }

  function createSkeletonCards(count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var sk = document.createElement('div');
      sk.className = 'skeleton skeleton-card';
      frag.appendChild(sk);
    }
    return frag;
  }

  function createPlaylistCard(playlist) {
    var card = document.createElement('div');
    card.className = 'music-card focusable';
    card.tabIndex = 0;
    card.setAttribute('data-playlist-id', playlist.id);

    var count = playlist.tracks ? playlist.tracks.length : 0;
    var cover = count > 0 && playlist.tracks[0].cover ? playlist.tracks[0].cover : '';

    card.innerHTML =
      '<div class="music-card-cover">' +
        (cover
          ? '<img src="' + cover + '" alt="" loading="lazy"/>'
          : '<div class="playlist-card-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg></div>'
        ) +
        '<div class="play-overlay"><svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>' +
      '</div>' +
      '<div class="music-card-info">' +
        '<div class="music-card-title">' + stripHtml(playlist.name) + '</div>' +
        '<div class="music-card-subtitle">' + count + ' song' + (count !== 1 ? 's' : '') + '</div>' +
      '</div>' +
      '<button class="pl-card-more focusable" aria-label="More options">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>' +
      '</button>';

    /* 3-dot opens playlist context menu (click or Magic Remote) */
    var moreBtn = card.querySelector('.pl-card-more');
    moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openPlaylistContextMenu(playlist.id, playlist.name, card);
    });

    /* Long-press Enter/OK on D-pad opens context menu */
    var longPressTimer = null;
    var longPressed = false;
    card.addEventListener('keydown', function (e) {
      if (e.keyCode === 13 && !longPressTimer) {
        longPressed = false;
        longPressTimer = setTimeout(function () {
          longPressed = true;
          openPlaylistContextMenu(playlist.id, playlist.name, card);
        }, 600);
      }
    });
    card.addEventListener('keyup', function (e) {
      if (e.keyCode === 13) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (!longPressed) {
          /* Short press — play playlist */
          var tracks = PlaylistManager.getTracks(playlist.id);
          if (tracks.length === 0) { toast('Playlist is empty'); return; }
          tracks = tracks.map(function (t) { t.source = t.source || 'saavn'; return t; });
          window.EchoPlayback.setQueue(tracks, 0);
          toast('Playing ' + stripHtml(playlist.name));
        }
      }
    });

    card.addEventListener('click', function (e) {
      /* Ignore if long-press was triggered or if it came from the more button */
      if (longPressed) { longPressed = false; return; }
      var tracks = PlaylistManager.getTracks(playlist.id);
      if (tracks.length === 0) { toast('Playlist is empty'); return; }
      tracks = tracks.map(function (t) { t.source = t.source || 'saavn'; return t; });
      window.EchoPlayback.setQueue(tracks, 0);
      toast('Playing ' + stripHtml(playlist.name));
    });

    return card;
  }

  /* ========== Card Click Handler ========== */
  function onCardClick(track) {
    if (!track || !track.id) return;
    /* Set as single-track queue or find in current feed */
    track.source = track.source || 'saavn';
    window.EchoPlayback.setQueue([track], 0);
  }

  /* ========== Feed Loading ========== */
  function refreshHomePersonal() {
    /* Recently played on Home */
    var recent = window.EchoPlayback.getRecentlyPlayed();
    el.homeRecentRow.innerHTML = '';
    if (recent && recent.length > 0) {
      el.homeRecentSection.classList.remove('hidden');
      recent.slice(0, 12).forEach(function (track) {
        el.homeRecentRow.appendChild(createMusicCard(track));
      });
    } else {
      el.homeRecentSection.classList.add('hidden');
    }

    /* User playlists on Home */
    var playlists = PlaylistManager.getAll();
    el.homePlaylistsRow.innerHTML = '';
    if (playlists.length > 0) {
      el.homePlaylistsSection.classList.remove('hidden');
      playlists.forEach(function (pl) {
        el.homePlaylistsRow.appendChild(createPlaylistCard(pl));
      });
    } else {
      el.homePlaylistsSection.classList.add('hidden');
    }
  }

  function loadHomeFeed() {
    /* Show skeletons */
    el.newReleasesRow.innerHTML = '';
    el.newReleasesRow.appendChild(createSkeletonCards(8));

    /* Show personal sections immediately */
    refreshHomePersonal();

    window.SaavnSource.getFeed().then(function (sections) {
      /* Clear row */
      el.newReleasesRow.innerHTML = '';

      sections.forEach(function (section) {
        /* Skip any playlist sections from Saavn */
        var titleLower = (section.title || '').toLowerCase();
        if (titleLower.indexOf('playlist') !== -1 || titleLower.indexOf('editor') !== -1) return;

        (section.items || []).forEach(function (item) {
          /* Skip playlist-type items */
          if (item.type === 'playlist') return;
          el.newReleasesRow.appendChild(createMusicCard(item));
        });
      });

      feedLoaded = true;
      refreshHomePersonal();
      if (window.DpadNav) window.DpadNav.refresh();
      console.log('[App] Feed loaded:', sections.length, 'sections');
    }).catch(function (err) {
      console.error('[App] Feed load failed:', err);
      el.newReleasesRow.innerHTML = '<p style="color:var(--fg-tertiary);padding:20px;">Failed to load — check connection</p>';
    });
  }

  /* ========== Tab Switching ========== */
  function switchTab(tab) {
    activeTab = tab;
    /* Update nav buttons */
    document.querySelectorAll('.nav-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    /* Show/hide panels */
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'tab-' + tab);
    });
    /* Reset scroll */
    el.contentArea.scrollTop = 0;

    if (tab === 'library') refreshLibrary();
    if (tab === 'search') {
      setTimeout(function () { el.searchInput.focus(); }, 100);
    }
    if (window.DpadNav) window.DpadNav.refresh();
  }

  /* ========== Search ========== */
  function performSearch(query) {
    if (!query || query.trim().length < 2) {
      el.searchResults.innerHTML = '<p class="search-placeholder">Search for your favorite music</p>';
      return;
    }
    el.searchResults.innerHTML = '<p class="search-placeholder">Searching...</p>';
    el.searchClear.classList.remove('hidden');

    window.SaavnSource.search(query.trim()).then(function (results) {
      el.searchResults.innerHTML = '';
      if (!results || results.length === 0) {
        el.searchResults.innerHTML = '<p class="search-placeholder">No results found</p>';
        return;
      }
      results.forEach(function (track, idx) {
        el.searchResults.appendChild(createSongItem(track, { queue: results, queueIndex: idx }));
      });
      if (window.DpadNav) window.DpadNav.refresh();
    }).catch(function (err) {
      console.error('[App] Search failed:', err);
      el.searchResults.innerHTML = '<p class="search-placeholder">Search failed — try again</p>';
    });
  }

  /* ========== Library Tab ========== */
  function refreshLibrary() {
    /* Recently played */
    var recent = window.EchoPlayback.getRecentlyPlayed();
    el.recentRow.innerHTML = '';
    if (recent && recent.length > 0) {
      recent.slice(0, 20).forEach(function (track) {
        el.recentRow.appendChild(createMusicCard(track));
      });
    } else {
      el.recentRow.innerHTML = '<p style="color:var(--fg-tertiary);padding:20px;">Play some music to see it here</p>';
    }

    /* Playlists */
    var playlists = PlaylistManager.getAll();
    el.playlistsRow.innerHTML = '';
    if (playlists.length > 0) {
      playlists.forEach(function (pl) {
        el.playlistsRow.appendChild(createPlaylistCard(pl));
      });
    } else {
      el.playlistsRow.innerHTML = '<p style="color:var(--fg-tertiary);padding:20px;">No playlists yet — create one!</p>';
    }

    /* Liked songs */
    var liked = LikedSongs.getAll();
    el.likedSongsList.innerHTML = '';
    el.likedCount.textContent = liked.length > 0 ? liked.length + ' song' + (liked.length > 1 ? 's' : '') : '';
    if (liked.length > 0) {
      liked.forEach(function (track, idx) {
        el.likedSongsList.appendChild(createSongItem(track, { queue: liked, queueIndex: idx }));
      });
    } else {
      el.likedSongsList.innerHTML = '<p style="color:var(--fg-tertiary);padding:20px;">No liked songs yet</p>';
    }

    if (window.DpadNav) window.DpadNav.refresh();
  }

  /* ========== Player Bar UI ========== */
  function updatePlayerUI(track) {
    if (!track) return;
    var cover = track.cover || track.image || '';
    el.playerCover.src = cover;
    el.playerTitle.textContent = stripHtml(track.title);
    el.playerArtist.textContent = stripHtml(track.artist);

    /* Full player */
    el.fullPlayerCover.src = cover;
    el.fullPlayerTitle.textContent = stripHtml(track.title);
    el.fullPlayerArtist.textContent = stripHtml(track.artist);

    /* Album art background for full player */
    if (cover) {
      el.fullPlayerBg.style.backgroundImage = 'url(' + cover + ')';
    }

    updateLikeButtons();
  }

  function updatePlayState(isPlaying) {
    /* Player bar */
    el.iconPlay.classList.toggle('hidden', isPlaying);
    el.iconPause.classList.toggle('hidden', !isPlaying);
    /* Full player */
    el.fullIconPlay.classList.toggle('hidden', isPlaying);
    el.fullIconPause.classList.toggle('hidden', !isPlaying);
  }

  function updateProgress(currentTime, duration) {
    if (isDraggingProgress && isDraggingFullProgress) return;
    var pct = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!isDraggingProgress) {
      el.progressFill.style.width = pct + '%';
      el.progressThumb.style.left = pct + '%';
      el.playerTimeCurrent.textContent = formatTime(currentTime);
      el.playerTimeTotal.textContent = formatTime(duration);
    }

    if (!isDraggingFullProgress) {
      el.fullProgressFill.style.width = pct + '%';
      el.fullProgressThumb.style.left = pct + '%';
      el.fullTimeCurrent.textContent = formatTime(currentTime);
      el.fullTimeTotal.textContent = formatTime(duration);
    }
  }

  function updateLikeButtons() {
    var track = window.EchoPlayback.getCurrentTrack();
    if (!track) return;
    var liked = LikedSongs.isLiked(track.id);

    /* Player bar like button */
    el.btnLike.classList.toggle('liked', liked);
    el.heartOutline.classList.toggle('hidden', liked);
    el.heartFilled.classList.toggle('hidden', !liked);

    /* Full player like button */
    el.fullBtnLike.classList.toggle('liked', liked);
    el.fullHeartOutline.classList.toggle('hidden', liked);
    el.fullHeartFilled.classList.toggle('hidden', !liked);
  }

  function updateShuffleRepeatUI() {
    var state = window.EchoPlayback.getState();
    el.btnShuffle.classList.toggle('active', state.shuffle);
    el.fullBtnShuffle.classList.toggle('active', state.shuffle);
    el.btnRepeat.classList.toggle('active', state.repeat !== 'none');
    el.fullBtnRepeat.classList.toggle('active', state.repeat !== 'none');
  }

  /* ========== Seekbar Drag ========== */
  function setupSeekDrag(barEl, fillEl, thumbEl, isFullPlayer) {
    function calcPercent(e) {
      var rect = barEl.getBoundingClientRect();
      var x = (e.clientX || (e.touches && e.touches[0].clientX) || 0) - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    }

    function onDown(e) {
      e.preventDefault();
      if (isFullPlayer) isDraggingFullProgress = true;
      else isDraggingProgress = true;
      barEl.classList.add('dragging');
      var pct = calcPercent(e);
      fillEl.style.width = (pct * 100) + '%';
      thumbEl.style.left = (pct * 100) + '%';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    }

    function onMove(e) {
      e.preventDefault();
      var pct = calcPercent(e);
      fillEl.style.width = (pct * 100) + '%';
      thumbEl.style.left = (pct * 100) + '%';
    }

    function onUp(e) {
      var pct = calcPercent(e);
      window.EchoPlayback.seekPercent(pct);
      barEl.classList.remove('dragging');
      if (isFullPlayer) isDraggingFullProgress = false;
      else isDraggingProgress = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }

    barEl.addEventListener('mousedown', onDown);
    barEl.addEventListener('touchstart', onDown, { passive: false });

    /* Click to seek (non-drag) */
    barEl.addEventListener('click', function (e) {
      if (isDraggingProgress || isDraggingFullProgress) return;
      var pct = calcPercent(e);
      window.EchoPlayback.seekPercent(pct);
    });
  }

  /* ========== Full Player ========== */
  function openFullPlayer() {
    el.fullPlayer.classList.remove('hidden', 'closing');
    updateFullPlayerQueue();
    if (isQueuePanelOpen) renderQueuePanel();
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function closeFullPlayer() {
    if (isQueuePanelOpen) closeQueuePanel();
    el.fullPlayer.classList.add('closing');
    setTimeout(function () {
      el.fullPlayer.classList.add('hidden');
      el.fullPlayer.classList.remove('closing');
      if (window.DpadNav) window.DpadNav.refresh();
    }, 350);
  }

  function updateFullPlayerQueue() {
    var queue = window.EchoPlayback.getQueue();
    var state = window.EchoPlayback.getState();
    if (!el.queueList) return;
    el.queueList.innerHTML = '';
    if (queue.length === 0) {
      el.queueList.innerHTML = '<p style="color:var(--fg-tertiary);padding:12px;">Queue is empty</p>';
      el.queueTrackCount.textContent = '';
      return;
    }
    el.queueTrackCount.textContent = queue.length + ' track' + (queue.length !== 1 ? 's' : '');
    queue.forEach(function (track, i) {
      var item = document.createElement('div');
      item.className = 'queue-item focusable' + (i === state.currentIndex ? ' queue-item-active' : '');
      item.tabIndex = 0;
      var art = track.image || track.artwork || track.cover || '';
      var dur = track.duration ? formatTime(track.duration) : '';
      item.innerHTML =
        '<span class="queue-item-index">' + (i + 1) + '</span>' +
        '<img class="queue-item-art" src="' + art + '" alt="">' +
        '<div class="queue-item-info">' +
          '<div class="queue-item-title">' + (track.title || 'Unknown') + '</div>' +
          '<div class="queue-item-artist">' + (track.artist || track.artists || '') + '</div>' +
        '</div>' +
        (dur ? '<span class="queue-item-duration">' + dur + '</span>' : '');
      item.addEventListener('click', function () {
        window.EchoPlayback.playAt(i);
        closeOverlay(el.queueOverlay);
      });
      el.queueList.appendChild(item);
    });
  }

  function openQueueOverlay() {
    updateFullPlayerQueue();
    openOverlay(el.queueOverlay);
  }

  /* ========== Queue Side Panel (Spotify-style) ========== */
  function toggleQueuePanel() {
    if (isQueuePanelOpen) closeQueuePanel();
    else openQueuePanel();
  }

  function openQueuePanel() {
    isQueuePanelOpen = true;
    el.fullPlayer.classList.add('qsp-open');
    renderQueuePanel();
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function closeQueuePanel() {
    isQueuePanelOpen = false;
    el.fullPlayer.classList.remove('qsp-open');
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function switchQspTab(tab) {
    qspActiveTab = tab;
    el.qspTabQueue.classList.toggle('active', tab === 'queue');
    el.qspTabRecent.classList.toggle('active', tab === 'recent');
    el.qspQueueView.classList.toggle('hidden', tab !== 'queue');
    el.qspRecentView.classList.toggle('hidden', tab !== 'recent');
    if (tab === 'queue') renderQueuePanel();
    else renderRecentPanel();
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function createQspTrack(track, clickHandler, queueIndex) {
    var item = document.createElement('div');
    item.className = 'qsp-track focusable';
    item.tabIndex = 0;
    var art = track.cover || track.image || track.artwork || '';
    var artist = stripHtml(track.artist || track.artists || '');
    var html =
      '<img class="qsp-track-art" src="' + art + '" alt="">' +
      '<div class="qsp-track-info">' +
        '<div class="qsp-track-title">' + stripHtml(track.title || 'Unknown') + '</div>' +
        '<div class="qsp-track-meta">' +
          '<span class="qsp-track-indicator">' +
            '<svg width="12" height="12" viewBox="0 0 16 16" fill="var(--sp-green)"><circle cx="8" cy="8" r="4"/></svg>' +
          '</span>' +
          '<span class="qsp-track-artist">' + artist + '</span>' +
        '</div>' +
      '</div>';
    /* Add 3-dot more button for queue tracks (not now-playing) */
    if (typeof queueIndex === 'number') {
      html += '<button class="qsp-track-more focusable" tabindex="0" aria-label="More options">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
          '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>' +
        '</svg></button>';
    }
    item.innerHTML = html;
    if (clickHandler) {
      /* click on the track info plays it */
      var infoArea = item.querySelector('.qsp-track-info');
      var artArea = item.querySelector('.qsp-track-art');
      if (infoArea) infoArea.addEventListener('click', clickHandler);
      if (artArea) artArea.addEventListener('click', clickHandler);
    }
    /* Bind 3-dot button */
    if (typeof queueIndex === 'number') {
      var moreBtn = item.querySelector('.qsp-track-more');
      if (moreBtn) {
        moreBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          openTrackContextMenu(track, queueIndex, moreBtn);
        });
      }
    }
    return item;
  }

  /* Context menu for queue tracks */
  function openTrackContextMenu(track, queueIdx, anchorEl) {
    contextMenuTrack = track;
    contextMenuIndex = queueIdx;
    var rect = anchorEl.getBoundingClientRect();
    var menu = el.qspContextMenu;
    menu.classList.remove('hidden');
    /* Position near the button */
    var menuW = 220, menuH = 90;
    var left = rect.left - menuW - 8;
    if (left < 10) left = rect.right + 8;
    var top = rect.top;
    if (top + menuH > window.innerHeight - 20) top = window.innerHeight - menuH - 20;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function closeTrackContextMenu() {
    el.qspContextMenu.classList.add('hidden');
    contextMenuTrack = null;
    contextMenuIndex = -1;
    if (window.DpadNav) window.DpadNav.refresh();
  }

  /* ========== Playlist Context Menu ========== */
  function openPlaylistContextMenu(plId, plName, anchorEl) {
    playlistCtxId = plId;
    playlistCtxName = plName;
    var rect = anchorEl.getBoundingClientRect();
    var menu = el.plCtxMenu;
    menu.classList.remove('hidden');
    /* Position near the card — prefer right side, fallback left */
    var menuW = 240, menuH = 110;
    var left = rect.right + 12;
    if (left + menuW > window.innerWidth - 20) left = rect.left - menuW - 12;
    if (left < 10) left = 10;
    var top = rect.top + (rect.height / 2) - (menuH / 2);
    if (top + menuH > window.innerHeight - 20) top = window.innerHeight - menuH - 20;
    if (top < 20) top = 20;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function closePlaylistContextMenu() {
    el.plCtxMenu.classList.add('hidden');
    playlistCtxId = null;
    playlistCtxName = null;
    if (window.DpadNav) window.DpadNav.refresh();
  }

  /* ========== Rename Playlist ========== */
  function openRenamePlaylist(plId, plName) {
    playlistCtxId = plId;
    el.renameInput.value = plName;
    el.btnRenameSave.disabled = false;
    openOverlay(el.renameOverlay);
    setTimeout(function () { el.renameInput.focus(); el.renameInput.select(); }, 100);
  }

  function doRenamePlaylist() {
    var newName = el.renameInput.value.trim();
    if (!newName || !playlistCtxId) return;
    PlaylistManager.rename(playlistCtxId, newName);
    closeOverlay(el.renameOverlay);
    toast('Renamed to "' + newName + '"');
    refreshLibrary();
    refreshHomePersonal();
  }

  /* ========== Delete Playlist ========== */
  function openDeletePlaylist(plId, plName) {
    playlistCtxId = plId;
    el.deleteNameLabel.textContent = '"' + plName + '"';
    openOverlay(el.deleteOverlay);
  }

  function doDeletePlaylist() {
    if (!playlistCtxId) return;
    PlaylistManager.remove(playlistCtxId);
    closeOverlay(el.deleteOverlay);
    toast('Playlist deleted');
    refreshLibrary();
    refreshHomePersonal();
  }

  function renderQueuePanel() {
    var queue = window.EchoPlayback.getQueue();
    var state = window.EchoPlayback.getState();
    var currentTrack = window.EchoPlayback.getCurrentTrack();

    /* Now Playing */
    el.qspNowPlaying.innerHTML = '';
    if (currentTrack) {
      el.qspNowPlaying.appendChild(createQspTrack(currentTrack));
    } else {
      el.qspNowPlaying.innerHTML = '<p style="color:var(--fg-tertiary);padding:8px;font-size:13px;">Nothing playing</p>';
    }

    /* Next from */
    el.qspNextList.innerHTML = '';
    var nextTracks = [];
    for (var i = (state.currentIndex >= 0 ? state.currentIndex + 1 : 0); i < queue.length; i++) {
      nextTracks.push({ track: queue[i], index: i });
    }
    if (nextTracks.length === 0) {
      el.qspNextLabel.textContent = 'Next in queue';
      el.qspNextList.innerHTML = '<p style="color:var(--fg-tertiary);padding:8px;font-size:13px;">No upcoming tracks</p>';
    } else {
      el.qspNextLabel.textContent = 'Next from: Queue';
      nextTracks.forEach(function (entry) {
        var trackEl = createQspTrack(entry.track, function () {
          window.EchoPlayback.playAt(entry.index);
        }, entry.index);
        el.qspNextList.appendChild(trackEl);
      });
    }
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function renderRecentPanel() {
    var recent = window.EchoPlayback.getRecentlyPlayed();
    el.qspRecentList.innerHTML = '';
    if (!recent || recent.length === 0) {
      el.qspRecentList.innerHTML = '<p style="color:var(--fg-tertiary);padding:8px;font-size:13px;">No recently played tracks</p>';
      return;
    }
    recent.forEach(function (track) {
      var trackEl = createQspTrack(track, function () {
        track.source = track.source || 'saavn';
        window.EchoPlayback.setQueue([track], 0);
      });
      el.qspRecentList.appendChild(trackEl);
    });
    if (window.DpadNav) window.DpadNav.refresh();
  }

  /* ========== Overlay helpers ========== */
  function openOverlay(overlayEl) {
    overlayEl.classList.remove('hidden');
    /* Wait a frame so DOM settles before refreshing D-pad focus */
    requestAnimationFrame(function () {
      if (window.DpadNav) window.DpadNav.refresh();
    });
  }

  function closeOverlay(overlayEl) {
    overlayEl.classList.add('hidden');
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function isAnyOverlayOpen() {
    return !el.settingsOverlay.classList.contains('hidden') ||
           !el.playlistOverlay.classList.contains('hidden') ||
           !el.addToPlaylistOverlay.classList.contains('hidden') ||
           !el.renameOverlay.classList.contains('hidden') ||
           !el.deleteOverlay.classList.contains('hidden') ||
           !el.queueOverlay.classList.contains('hidden') ||
           !el.fullPlayer.classList.contains('hidden');
  }

  /* ========== Create Playlist ========== */
  function openCreatePlaylist() {
    el.playlistNameInput.value = '';
    el.btnPlaylistCreate.disabled = true;
    openOverlay(el.playlistOverlay);
    setTimeout(function () { el.playlistNameInput.focus(); }, 100);
  }

  function doCreatePlaylist() {
    var name = el.playlistNameInput.value.trim();
    if (!name) return;
    PlaylistManager.create(name);
    closeOverlay(el.playlistOverlay);
    toast('Playlist "' + name + '" created');
    refreshLibrary();
  }

  /* ========== Add to Playlist ========== */
  function openAddToPlaylist(track) {
    trackForPlaylistAdd = track;
    var playlists = PlaylistManager.getAll();
    el.addPlaylistList.innerHTML = '';
    if (playlists.length === 0) {
      el.addPlaylistList.innerHTML = '<p style="color:var(--fg-tertiary);padding:12px;">No playlists — create one first</p>';
    } else {
      playlists.forEach(function (pl) {
        var item = document.createElement('div');
        item.className = 'add-playlist-item focusable';
        item.tabIndex = 0;
        item.innerHTML =
          '<span class="add-playlist-item-name">' + stripHtml(pl.name) + '</span>' +
          '<span class="add-playlist-item-count">' + pl.tracks.length + ' songs</span>';
        item.addEventListener('click', function () {
          if (trackForPlaylistAdd) {
            var added = PlaylistManager.addTrack(pl.id, trackForPlaylistAdd);
            closeOverlay(el.addToPlaylistOverlay);
            toast(added ? 'Added to ' + pl.name : 'Already in ' + pl.name);
            refreshLibrary();
          }
        });
        el.addPlaylistList.appendChild(item);
      });
    }
    openOverlay(el.addToPlaylistOverlay);
  }

  /* ========== Event Binding ========== */
  function bindEvents() {
    /* -- Nav tabs -- */
    document.querySelectorAll('.nav-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    /* -- Top bar buttons -- */
    document.querySelectorAll('[data-action="settings"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncQualityOptionUI();
        openOverlay(el.settingsOverlay);
      });
    });

    /* -- Settings overlay -- */
    el.settingsOverlay.addEventListener('click', function (e) {
      var themeBtn = e.target.closest('.theme-option');
      if (themeBtn) {
        applyTheme(themeBtn.getAttribute('data-theme'));
        return;
      }
      var qualityBtn = e.target.closest('#quality-options .quality-option');
      if (qualityBtn) {
        var q = qualityBtn.getAttribute('data-quality');
        window.EchoPlayback.setQuality(q);
        syncQualityOptionUI();
        toast('Quality set to ' + q);
        return;
      }
      var sidebarBtn = e.target.closest('#sidebar-size-options .quality-option');
      if (sidebarBtn) {
        var sz = sidebarBtn.getAttribute('data-sidebar');
        applySidebarSize(sz);
        toast('Sidebar: ' + sz);
        return;
      }
      if (e.target.closest('[data-action="close-settings"]')) {
        closeOverlay(el.settingsOverlay);
      }
    });

    /* -- Search -- */
    el.searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var q = el.searchInput.value;
      el.searchClear.classList.toggle('hidden', !q);
      searchTimer = setTimeout(function () { performSearch(q); }, SEARCH_DEBOUNCE);
    });
    el.searchClear.addEventListener('click', function () {
      el.searchInput.value = '';
      el.searchClear.classList.add('hidden');
      el.searchResults.innerHTML = '<p class="search-placeholder">Search for your favorite music</p>';
      el.searchInput.focus();
    });

    /* -- Player bar controls -- */
    el.btnPlay.addEventListener('click', function () { window.EchoPlayback.togglePlay(); });
    el.btnPrev.addEventListener('click', function () { window.EchoPlayback.previous(); });
    el.btnNext.addEventListener('click', function () { window.EchoPlayback.next(); });
    el.btnShuffle.addEventListener('click', function () { window.EchoPlayback.toggleShuffle(); updateShuffleRepeatUI(); });
    el.btnRepeat.addEventListener('click', function () { window.EchoPlayback.toggleRepeat(); updateShuffleRepeatUI(); });

    /* -- Like button (player bar) -- */
    el.btnLike.addEventListener('click', function () {
      var track = window.EchoPlayback.getCurrentTrack();
      if (!track) return;
      var liked = LikedSongs.toggle(track);
      updateLikeButtons();
      /* Animate heart */
      el.heartFilled.classList.remove('heart-animate');
      if (liked) {
        void el.heartFilled.offsetWidth; /* force reflow */
        el.heartFilled.classList.add('heart-animate');
      }
      toast(liked ? 'Liked!' : 'Removed from liked');
      if (activeTab === 'library') refreshLibrary();
    });

    /* -- Open full player from track info -- */
    el.playerTrackInfo.addEventListener('click', function () {
      var track = window.EchoPlayback.getCurrentTrack();
      if (track) openFullPlayer();
    });

    /* -- Full player controls -- */
    if (el.fullPlayerClose) el.fullPlayerClose.addEventListener('click', closeFullPlayer);
    el.fullBtnPlay.addEventListener('click', function () { window.EchoPlayback.togglePlay(); });
    el.fullBtnPrev.addEventListener('click', function () { window.EchoPlayback.previous(); });
    el.fullBtnNext.addEventListener('click', function () { window.EchoPlayback.next(); });
    el.fullBtnShuffle.addEventListener('click', function () { window.EchoPlayback.toggleShuffle(); updateShuffleRepeatUI(); });
    el.fullBtnRepeat.addEventListener('click', function () { window.EchoPlayback.toggleRepeat(); updateShuffleRepeatUI(); });
    el.fullBtnLike.addEventListener('click', function () {
      var track = window.EchoPlayback.getCurrentTrack();
      if (!track) return;
      var liked = LikedSongs.toggle(track);
      updateLikeButtons();
      toast(liked ? 'Liked!' : 'Removed from liked');
    });
    el.fullBtnAddPlaylist.addEventListener('click', function () {
      var track = window.EchoPlayback.getCurrentTrack();
      if (track) openAddToPlaylist(track);
    });
    el.fullBtnQueue.addEventListener('click', function () {
      toggleQueuePanel();
    });

    /* -- Queue side panel tabs & close -- */
    el.qspTabQueue.addEventListener('click', function () { switchQspTab('queue'); });
    el.qspTabRecent.addEventListener('click', function () { switchQspTab('recent'); });
    el.qspClose.addEventListener('click', function () { closeQueuePanel(); });

    /* -- Context menu actions -- */
    el.qspCtxPlayNext.addEventListener('click', function () {
      if (contextMenuTrack) {
        window.EchoPlayback.playNext(contextMenuTrack);
        toast('Playing next: ' + stripHtml(contextMenuTrack.title || ''));
        closeTrackContextMenu();
        renderQueuePanel();
      }
    });
    el.qspCtxRemove.addEventListener('click', function () {
      if (contextMenuIndex >= 0) {
        window.EchoPlayback.removeFromQueue(contextMenuIndex);
        toast('Removed from queue');
        closeTrackContextMenu();
        renderQueuePanel();
      }
    });
    /* Close context menu on click outside */
    document.addEventListener('click', function (e) {
      if (!el.qspContextMenu.classList.contains('hidden') &&
          !el.qspContextMenu.contains(e.target) &&
          !e.target.classList.contains('qsp-track-more')) {
        closeTrackContextMenu();
      }
      if (!el.plCtxMenu.classList.contains('hidden') &&
          !el.plCtxMenu.contains(e.target) &&
          !e.target.closest('.pl-card-more')) {
        closePlaylistContextMenu();
      }
    });

    /* -- Playlist context menu actions -- */
    el.plCtxRename.addEventListener('click', function () {
      var id = playlistCtxId, name = playlistCtxName;
      closePlaylistContextMenu();
      if (id) openRenamePlaylist(id, name);
    });
    el.plCtxDelete.addEventListener('click', function () {
      var id = playlistCtxId, name = playlistCtxName;
      closePlaylistContextMenu();
      if (id) openDeletePlaylist(id, name);
    });

    /* -- Player bar right controls -- */
    var barQueueBtn = document.getElementById('btn-queue');
    if (barQueueBtn) barQueueBtn.addEventListener('click', function () {
      var track = window.EchoPlayback.getCurrentTrack();
      if (track) {
        openFullPlayer();
        setTimeout(function () { if (!isQueuePanelOpen) openQueuePanel(); }, 50);
      } else {
        openQueueOverlay();
      }
    });
    var barAddBtn = document.getElementById('btn-add-to-playlist');
    if (barAddBtn) barAddBtn.addEventListener('click', function () {
      var track = window.EchoPlayback.getCurrentTrack();
      if (track) openAddToPlaylist(track);
    });

    /* -- Seek bars -- */
    setupSeekDrag(el.playerProgressBar, el.progressFill, el.progressThumb, false);
    setupSeekDrag(el.fullProgressBar, el.fullProgressFill, el.fullProgressThumb, true);

    /* -- Create playlist -- */
    el.btnCreatePlaylist.addEventListener('click', openCreatePlaylist);
    el.playlistNameInput.addEventListener('input', function () {
      el.btnPlaylistCreate.disabled = !el.playlistNameInput.value.trim();
    });
    el.btnPlaylistCreate.addEventListener('click', doCreatePlaylist);
    el.playlistNameInput.addEventListener('keydown', function (e) {
      if (e.keyCode === 13 && !el.btnPlaylistCreate.disabled) doCreatePlaylist();
    });

    /* -- Rename playlist -- */
    el.renameInput.addEventListener('input', function () {
      el.btnRenameSave.disabled = !el.renameInput.value.trim();
    });
    el.btnRenameSave.addEventListener('click', doRenamePlaylist);
    el.renameInput.addEventListener('keydown', function (e) {
      if (e.keyCode === 13 && !el.btnRenameSave.disabled) doRenamePlaylist();
    });

    /* -- Delete playlist confirm -- */
    el.btnDeleteConfirm.addEventListener('click', doDeletePlaylist);

    /* -- Close overlay buttons -- */
    document.querySelectorAll('[data-action="close-playlist-overlay"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.playlistOverlay); });
    });
    document.querySelectorAll('[data-action="close-add-playlist"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.addToPlaylistOverlay); });
    });
    document.querySelectorAll('[data-action="close-rename-overlay"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.renameOverlay); });
    });
    document.querySelectorAll('[data-action="close-delete-overlay"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.deleteOverlay); });
    });
    document.querySelectorAll('[data-action="close-queue"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.queueOverlay); });
    });

    /* -- Playback events -- */
    window.EchoPlayback.on('trackchange', function (track) {
      updatePlayerUI(track);
      updateFullPlayerQueue();
      if (isQueuePanelOpen) renderQueuePanel();
    });
    window.EchoPlayback.on('statechange', function (data) {
      updatePlayState(data.isPlaying);
    });
    window.EchoPlayback.on('timeupdate', function (data) {
      updateProgress(data.currentTime, data.duration);
    });
    window.EchoPlayback.on('qualitychange', function (data) {
      updateQualityBadge(data.quality);
    });
    window.EchoPlayback.on('error', function (data) {
      toast(data.message || 'Playback error');
    });
    window.EchoPlayback.on('recentupdate', function () {
      if (activeTab === 'library') refreshLibrary();
      if (activeTab === 'home') refreshHomePersonal();
    });

    /* -- D-Pad back handler -- */
    if (window.DpadNav) {
      window.DpadNav.onBack(function () {
        if (!el.qspContextMenu.classList.contains('hidden')) {
          closeTrackContextMenu();
        } else if (!el.plCtxMenu.classList.contains('hidden')) {
          closePlaylistContextMenu();
        } else if (!el.renameOverlay.classList.contains('hidden')) {
          closeOverlay(el.renameOverlay);
        } else if (!el.deleteOverlay.classList.contains('hidden')) {
          closeOverlay(el.deleteOverlay);
        } else if (!el.addToPlaylistOverlay.classList.contains('hidden')) {
          closeOverlay(el.addToPlaylistOverlay);
        } else if (!el.queueOverlay.classList.contains('hidden')) {
          closeOverlay(el.queueOverlay);
        } else if (!el.settingsOverlay.classList.contains('hidden')) {
          closeOverlay(el.settingsOverlay);
        } else if (!el.playlistOverlay.classList.contains('hidden')) {
          closeOverlay(el.playlistOverlay);
        } else if (!el.fullPlayer.classList.contains('hidden') && isQueuePanelOpen) {
          closeQueuePanel();
        } else if (!el.fullPlayer.classList.contains('hidden')) {
          closeFullPlayer();
        } else if (activeTab !== 'home') {
          switchTab('home');
        }
      });
    }
  }

  /* ========== Initialization ========== */
  function init() {
    console.log('[App] Initializing Echo Player v2.0');

    /* Load saved theme */
    loadTheme();
    loadSidebarSize();

    /* Init EAPK bridge */
    window.EchoEapk.init().then(function (modules) {
      console.log('[App] EAPK modules:', modules);
    }).catch(function (e) {
      console.error('[App] EAPK init error:', e);
    });

    /* Bind all events */
    bindEvents();

    /* Init quality UI */
    syncQualityOptionUI();

    /* Load home feed */
    loadHomeFeed();

    /* Init navigation */
    if (window.DpadNav) window.DpadNav.init();
    if (window.PointerNav) window.PointerNav.init();
  }

  /* Start when DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[App] Echo Player app.js v2.0 loaded');
})();
