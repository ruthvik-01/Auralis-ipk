/* ============================================================
   Echo Player — Main Application Controller v2.0
   Full rewrite: playlists, full player, themes, quality, animations
   ============================================================ */
(function () {
  'use strict';

  /* ========== Constants ========== */
  var SPLASH_DURATION = 2200;
  var SEARCH_DEBOUNCE = 200;
  var PLAYLISTS_KEY   = 'echo_playlists';
  var LIKED_KEY       = 'echo_liked';
  var THEME_KEY       = 'echo_theme';

  /* ========== DOM Refs ========== */
  var $  = function (id) { return document.getElementById(id); };
  var el = {
    splash:           $('splash-screen'),
    app:              $('app'),
    /* Top bar */
    qualityBadge:     $('quality-badge'),
    qualityLabel:     $('quality-label'),
    /* Tabs */
    tabHome:          $('tab-home'),
    tabSearch:        $('tab-search'),
    tabLibrary:       $('tab-library'),
    /* Home rows */
    trendingRow:      $('trending-row'),
    newReleasesRow:   $('new-releases-row'),
    topAlbumsRow:     $('top-albums-row'),
    featuredRow:      $('featured-row'),
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
    fullBtnLike:      $('full-btn-like'),
    fullBtnAddPlaylist: $('full-btn-add-playlist'),
    fullBtnQueue:     $('full-btn-queue'),
    /* Queue overlay */
    queueOverlay:     $('queue-overlay'),
    queueList:        $('queue-list'),
    queueTrackCount:  $('queue-track-count'),
    /* Overlays */
    settingsOverlay:  $('settings-overlay'),
    themeGrid:        $('theme-grid'),
    qualityOptions:   $('quality-options'),
    playlistOverlay:  $('playlist-overlay'),
    playlistNameInput: $('playlist-name-input'),
    btnPlaylistCreate: $('btn-playlist-create'),
    addToPlaylistOverlay: $('add-to-playlist-overlay'),
    addPlaylistList:  $('add-playlist-list'),
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
      onCardClick(track);
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
      '</div>';

    card.addEventListener('click', function () {
      var tracks = PlaylistManager.getTracks(playlist.id);
      if (tracks.length > 0) {
        /* Ensure tracks have source property */
        tracks = tracks.map(function (t) { t.source = t.source || 'saavn'; return t; });
        window.EchoPlayback.setQueue(tracks, 0);
        toast('Playing ' + playlist.name);
      } else {
        toast('Playlist is empty');
      }
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
  function loadHomeFeed() {
    /* Show skeletons */
    [el.trendingRow, el.newReleasesRow, el.topAlbumsRow, el.featuredRow].forEach(function (row) {
      row.innerHTML = '';
      row.appendChild(createSkeletonCards(8));
    });

    window.SaavnSource.getFeed().then(function (sections) {
      var rowMap = {
        'Trending Now': el.trendingRow,
        'New Releases': el.newReleasesRow,
        'Top Albums': el.topAlbumsRow,
        'Top Playlists': el.topAlbumsRow,
        'Featured Playlists': el.featuredRow,
        'Charts': el.trendingRow,
        'Editor Picks': el.featuredRow
      };

      /* Clear rows */
      [el.trendingRow, el.newReleasesRow, el.topAlbumsRow, el.featuredRow].forEach(function (row) {
        row.innerHTML = '';
      });

      sections.forEach(function (section) {
        var row = rowMap[section.title];
        if (!row) {
          /* Put in first empty row */
          if (!el.trendingRow.children.length) row = el.trendingRow;
          else if (!el.newReleasesRow.children.length) row = el.newReleasesRow;
          else if (!el.topAlbumsRow.children.length) row = el.topAlbumsRow;
          else row = el.featuredRow;
        }
        (section.items || []).forEach(function (item) {
          row.appendChild(createMusicCard(item));
        });
      });

      feedLoaded = true;
      if (window.DpadNav) window.DpadNav.refresh();
      console.log('[App] Feed loaded:', sections.length, 'sections');
    }).catch(function (err) {
      console.error('[App] Feed load failed:', err);
      [el.trendingRow, el.newReleasesRow, el.topAlbumsRow, el.featuredRow].forEach(function (row) {
        row.innerHTML = '<p style="color:var(--fg-tertiary);padding:20px;">Failed to load — check connection</p>';
      });
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
      results.forEach(function (track) {
        el.searchResults.appendChild(createSongItem(track));
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
      liked.forEach(function (track) {
        el.likedSongsList.appendChild(createSongItem(track));
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
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function closeFullPlayer() {
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
      var art = track.image || track.artwork || '';
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

  /* ========== Overlay helpers ========== */
  function openOverlay(overlayEl) {
    overlayEl.classList.remove('hidden');
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function closeOverlay(overlayEl) {
    overlayEl.classList.add('hidden');
    if (window.DpadNav) window.DpadNav.refresh();
  }

  function isAnyOverlayOpen() {
    return !el.settingsOverlay.classList.contains('hidden') ||
           !el.playlistOverlay.classList.contains('hidden') ||
           !el.addToPlaylistOverlay.classList.contains('hidden') ||
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
      var qualityBtn = e.target.closest('.quality-option');
      if (qualityBtn) {
        var q = qualityBtn.getAttribute('data-quality');
        window.EchoPlayback.setQuality(q);
        syncQualityOptionUI();
        toast('Quality set to ' + q);
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
    el.fullPlayerClose.addEventListener('click', closeFullPlayer);
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
      openQueueOverlay();
    });

    /* -- Player bar right controls -- */
    var barQueueBtn = document.getElementById('btn-queue');
    if (barQueueBtn) barQueueBtn.addEventListener('click', function () { openQueueOverlay(); });
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

    /* -- Close overlay buttons -- */
    document.querySelectorAll('[data-action="close-playlist-overlay"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.playlistOverlay); });
    });
    document.querySelectorAll('[data-action="close-add-playlist"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.addToPlaylistOverlay); });
    });
    document.querySelectorAll('[data-action="close-queue"]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeOverlay(el.queueOverlay); });
    });

    /* -- Playback events -- */
    window.EchoPlayback.on('trackchange', function (track) {
      updatePlayerUI(track);
      updateFullPlayerQueue();
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
    });

    /* -- D-Pad back handler -- */
    if (window.DpadNav) {
      window.DpadNav.onBack(function () {
        if (!el.addToPlaylistOverlay.classList.contains('hidden')) {
          closeOverlay(el.addToPlaylistOverlay);
        } else if (!el.queueOverlay.classList.contains('hidden')) {
          closeOverlay(el.queueOverlay);
        } else if (!el.settingsOverlay.classList.contains('hidden')) {
          closeOverlay(el.settingsOverlay);
        } else if (!el.playlistOverlay.classList.contains('hidden')) {
          closeOverlay(el.playlistOverlay);
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

    /* Splash → App transition */
    setTimeout(function () {
      el.splash.classList.add('fade-out');
      el.app.classList.remove('hidden');

      setTimeout(function () {
        el.splash.style.display = 'none';

        /* Load home feed */
        loadHomeFeed();

        /* Init navigation */
        if (window.DpadNav) window.DpadNav.init();
        if (window.PointerNav) window.PointerNav.init();

      }, 600);
    }, SPLASH_DURATION);
  }

  /* Start when DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[App] Echo Player app.js v2.0 loaded');
})();
