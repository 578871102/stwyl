// ===== 功能：桌面音乐播放器（真实播放） =====
// 默认播放网易云《Moonlit Dream》（id 2613048732）
// 音频源用网易云外链接口，<audio> 自动跟随 302 到实时直链，真实可播放
(function () {
  const audio = document.getElementById('m-audio');
  const widget = document.getElementById('music-widget');
  if (!audio || !widget) return;

  // 歌曲列表（默认：Moonlit Dream；可追加更多网易云 id）
  const SONGS = [
    { id: 2613048732, name: 'Moonlit Dream', artist: 'DLSS · shell（月光梦）' },
    { id: 2613048732, name: 'Moonlit Dream', artist: 'DLSS · shell（月光梦）' }
  ];
  let idx = 0;

  // 封面：网易云专辑图
  const COVER = 'https://p2.music.126.net/cXuoNwFzgFoQF7bGvC2mIQ==/109951169832660411.jpg';

  const playBtn = document.getElementById('mw-play');
  const playIco = document.getElementById('mw-play-ico');
  const prevBtn = document.getElementById('mw-prev');
  const nextBtn = document.getElementById('mw-next');
  const heartBtn = document.getElementById('mw-heart');
  const bar = document.getElementById('mw-bar');
  const fill = document.getElementById('mw-fill');
  const knob = document.getElementById('mw-knob');
  const curEl = document.getElementById('mw-cur');
  const durEl = document.getElementById('mw-dur');
  const songEl = document.getElementById('mw-song');
  const artistEl = document.getElementById('mw-artist');
  const vinyl = document.getElementById('mw-vinyl');
  const coverBox = document.getElementById('mw-cover');
  const bars = document.getElementById('mw-bars');

  // 网易云外链接口：audio 自动跟随 302 到实时直链
  function loadSong(i) {
    const song = SONGS[i];
    idx = i;
    audio.src = 'https://music.163.com/song/media/outer/url?id=' + song.id + '.mp3';
    if (songEl) songEl.textContent = song.name;
    if (artistEl) artistEl.textContent = song.artist;
    if (durEl) durEl.textContent = '0:00';
    // 封面
    if (coverBox) {
      coverBox.style.backgroundImage = 'url(' + COVER + ')';
      coverBox.style.backgroundSize = 'cover';
      coverBox.style.backgroundPosition = 'center';
    }
  }

  function fmt(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : '' + s);
  }

  function setPlaying(p) {
    if (playIco) {
      playIco.innerHTML = p
        ? '<path d="M7 5.5h3.5v13H7zM13.5 5.5H17v13h-3.5z"/>'
        : '<path d="M8 5.5v13l11-6.5z"/>';
    }
    if (vinyl) vinyl.style.animationPlayState = p ? 'running' : 'paused';
    if (bars) bars.style.opacity = p ? '1' : '.3';
  }

  function toggle() {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  // 事件
  if (playBtn) playBtn.addEventListener('click', toggle);
  if (prevBtn) prevBtn.addEventListener('click', () => loadSong(Math.max(0, idx - 1)));
  if (nextBtn) nextBtn.addEventListener('click', () => loadSong(Math.min(SONGS.length - 1, idx + 1)));
  if (heartBtn) {
    heartBtn.addEventListener('click', () => {
      const name = songEl ? songEl.textContent : '';
      const liked = window.toggleMusicFav ? window.toggleMusicFav(name) : !heartBtn.classList.contains('liked');
      heartBtn.classList.toggle('liked', liked);
    });
  }
  // 初始化收藏状态
  if (heartBtn && window.musicFavState) {
    const n = songEl ? songEl.textContent : '';
    if (window.musicFavState(n)) heartBtn.classList.add('liked');
  }
  audio.addEventListener('play', () => {
    setPlaying(true);
    if (window.recordMusicHistory) window.recordMusicHistory(songEl ? songEl.textContent : '');
  });
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => {
    if (idx < SONGS.length - 1) loadSong(idx + 1);
    else loadSong(0);
    audio.play().catch(() => {});
  });
  audio.addEventListener('loadedmetadata', () => {
    if (durEl) durEl.textContent = fmt(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (fill) fill.style.width = pct + '%';
    if (knob) knob.style.left = pct + '%';
    if (curEl) curEl.textContent = fmt(audio.currentTime);
  });
  // 点击/拖动进度条
  if (bar) {
    bar.addEventListener('click', (e) => {
      const r = bar.getBoundingClientRect();
      const pct = (e.clientX - r.left) / r.width;
      if (audio.duration) audio.currentTime = pct * audio.duration;
    });
  }

  loadSong(0);
})();
