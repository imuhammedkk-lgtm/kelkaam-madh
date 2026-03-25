/* ================= MDH SONG APP LOGIC ================= */
let selectedSingerName = "";
let selectedSingerImg = "";
let currentSongIdx = 0;
let isLooping = false;
let history = JSON.parse(localStorage.getItem('mdh_history')) || [];
let isPremiumUser = false;
let currentStep = 'step0';
let playerVm = null;          // Vue mini-player instance (set in index.html)
let isTimerPlaying = false;   // fallback flag when using native audio

const langData = {
   ml: {
      welcome: "ഭാഷ തിരഞ്ഞെടുക്കുക",
      google: "Google വഴി ലോഗിൻ ചെയ്യുക",
      phone: "ഫോൺ നമ്പർ ഉപയോഗിക്കുക",
      instr: "ഗായകനെ തിരഞ്ഞെടുക്കുക",
      next: "Next",
      search: "തിരയുക...",
      back: "തിരികെ പോകുക",
      enter: "വെബ്സൈറ്റിലേക്ക് കയറുക",
      backLog: "തിരികെ",
      emailPl: "ഇമെയിൽ അഡ്രസ് നൽകുക",
      phonePl: "ഫോൺ നമ്പർ നൽകുക"
   },
   en: {
      welcome: "Select Language",
      google: "Login with Google",
      phone: "Continue with Phone",
      instr: "Select your Singer",
      next: "Next",
      search: "Search songs...",
      back: "Go Back",
      enter: "Enter Website",
      backLog: "Back",
      emailPl: "Enter Email Address",
      phonePl: "Enter Phone Number"
   },
   hi: {
      welcome: "भाषा चुनें",
      google: "गूगल से लॉगिन करें",
      phone: "फ़ोन नंबर का उपयोग करें",
      instr: "गायक चुनें",
      next: "अगला",
      search: "गाने खोजें...",
      back: "पीछे हटें",
      enter: "वेबसाइट दर्ज करें",
      backLog: "पीछे",
      emailPl: "ईमेल पता दर्ज करें",
      phonePl: "फ़ोन नंबर दर्ज करें"
   }
};

const audioPlayer = document.getElementById('audioPlayer');
const waveBox = document.getElementById('waveBox');

function changeLang() {
   const lang = document.getElementById('langSelect').value;
   const d = langData[lang] || langData['en'];
   const welcomeTxt = document.getElementById('welcomeTxt');
   if(welcomeTxt) welcomeTxt.innerText = d.welcome + " / Select Language";
   if(document.getElementById('googleBtnTxt')) document.getElementById('googleBtnTxt').innerText = d.google;
   if(document.getElementById('phoneBtnTxt')) document.getElementById('phoneBtnTxt').innerText = d.phone;
   if(document.getElementById('instructionTxt')) document.getElementById('instructionTxt').innerText = d.instr;
   if(document.getElementById('nextBtn')) document.getElementById('nextBtn').innerText = d.next;
   if(document.getElementById('songSearch')) document.getElementById('songSearch').placeholder = d.search;
   if(document.getElementById('backToSingers')) document.getElementById('backToSingers').innerText = "← " + d.back;
   if(document.getElementById('backToSongs')) document.getElementById('backToSongs').innerText = "← " + d.back;
}

function showInputArea(type) {
   const lang = document.getElementById('langSelect').value;
   const input = document.getElementById('userInput');
   if(input) {
      input.value = "";
      input.placeholder = (type === 'email') ? (langData[lang]?.emailPl || "Email") : (langData[lang]?.phonePl || "Phone");
   }
   document.getElementById('loginOptions').style.display = 'none';
   document.getElementById('inputArea').style.display = 'block';
}

function hideInputArea() {
   document.getElementById('loginOptions').style.display = 'block';
   document.getElementById('inputArea').style.display = 'none';
}

function validateUser() {
   localStorage.setItem("mdh_active", "true");
   showStep('step1');
   alert("Login Successful! 🎧");
}

function goHome() {
   if (confirm("Logout and go back to Login screen?")) {
      if(audioPlayer) audioPlayer.pause();
      showStep('step0');
   }
}

function selectSinger(element, name) {
   document.querySelectorAll('.singer-card').forEach(c => c.classList.remove('selected'));
   element.classList.add('selected');
   selectedSingerName = name;
   selectedSingerImg = element.querySelector('img').src;
   
   // Direct entry to Step 2
   toStep2();
}

function toStep2() {
   if (!selectedSingerName) return alert("Please select a singer!");
   document.getElementById('currentSingerTitle').innerText = selectedSingerName;
   const listDiv = document.getElementById('songDisplayList');
   listDiv.innerHTML = "";
   const songs = songData[selectedSingerName] || [];
   songs.forEach((song, index) => {
      const div = document.createElement('div');
      div.className = 'song-item';
      const thumbImg = song.img ? song.img : selectedSingerImg;
      div.innerHTML = `
         <img src="${thumbImg}">
         <div class="song-info">
            <span class="song-title">${song.title}</span>
            <span class="song-time">${selectedSingerName}</span>
         </div>
      `;
      div.onclick = () => {
         currentSongIdx = index;
         playSong(song.title, song.url, thumbImg, selectedSingerName);
      };
      listDiv.appendChild(div);
   });
   showStep('step2');
}

function playSong(songTitle, songUrl, thumb, artist) {
   // Build playlist from current singer songs for the Vue player
   const songs = songData[selectedSingerName] || [];
   const playlist = songs.map((song) => ({
      name: song.title,
      artist: artist,
      cover: song.img || thumb,
      lyrics: song.lyrics || "ഈ പാട്ടിന്റെ വരികൾ ഇപ്പോൾ ലഭ്യമല്ല...\n(Lyrics not available) \n♩ ♪ ♫ ♬",
      source: song.url,
      url: song.url,
      favorited: false
   }));

   if (window.playerVm && playlist.length) {
      const targetIndex = Math.max(0, playlist.findIndex(p => p.name === songTitle));
      window.playerVm.setPlaylist(playlist, targetIndex);
      window.playerVm.isTimerPlaying = true;
      if (window.playerVm.audio) window.playerVm.audio.play();
   } else if (audioPlayer) {
      audioPlayer.src = songUrl;
      audioPlayer.play();
      isTimerPlaying = true;
   }

   showStep('step3');
   addToHistory(songTitle, songUrl, thumb, artist);
}

function addToHistory(title, url, img, artist) {
   const now = new Date();
   const dateStr = now.toLocaleDateString();
   const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
   history = history.filter(item => item.title !== title);
   history.unshift({ title, url, img, artist, date: dateStr, time: timeStr });
   if (history.length > 30) history.pop();
   localStorage.setItem('mdh_history', JSON.stringify(history));
}

function showHistory() {
   const listDiv = document.getElementById('historyListDisplay');
   if(!listDiv) return;
   listDiv.innerHTML = "";
   if (history.length === 0) listDiv.innerHTML = "<p style='text-align:center;color:#666;'>No history found.</p>";
   else {
      history.forEach((item) => {
         const div = document.createElement('div');
         div.className = 'song-item';
         div.innerHTML = `<img src="${item.img}"><div class="song-info"><span class="song-title">${item.title}</span><span class="song-time">${item.artist} • ${item.date} | ${item.time}</span></div>`;
         div.onclick = () => playSong(item.title, item.url, item.img, item.artist);
         listDiv.appendChild(div);
      });
   }
   showStep('stepHistory');
}

function clearHistory() {
   if (confirm("Clear all history?")) {
      history = [];
      localStorage.removeItem('mdh_history');
      showHistory();
   }
}

function playNext() {
   if (window.playerVm) {
      window.playerVm.nextTrack();
      return;
   }
   const songs = songData[selectedSingerName] || [];
   if (songs.length === 0) return;
   currentSongIdx = (currentSongIdx + 1) % songs.length;
   const song = songs[currentSongIdx];
   playSong(song.title, song.url, song.img || selectedSingerImg, selectedSingerName);
}

function playPrev() {
   if (window.playerVm) {
      window.playerVm.prevTrack();
      return;
   }
   const songs = songData[selectedSingerName] || [];
   if (songs.length === 0) return;
   currentSongIdx = (currentSongIdx - 1 + songs.length) % songs.length;
   const song = songs[currentSongIdx];
   playSong(song.title, song.url, song.img || selectedSingerImg, selectedSingerName);
}

function toggleLoop() {
   isLooping = !isLooping;
   if(audioPlayer) audioPlayer.loop = isLooping;
   document.getElementById('loopBtn').classList.toggle('active-ctrl', isLooping);
}

function togglePlay() {
   if (window.playerVm) {
      window.playerVm.play();
      return;
   }
   if (audioPlayer && audioPlayer.paused) {
      audioPlayer.play();
      document.getElementById('playPauseBtn').innerText = "⏸";
   } else if (audioPlayer) {
      audioPlayer.pause();
      document.getElementById('playPauseBtn').innerText = "▶";
   }
}

if(audioPlayer) {
   audioPlayer.ontimeupdate = () => {
      const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      const fill = document.getElementById('progressFill');
      const currentBar = document.querySelector('.progress__current');
      
      if(fill) fill.style.width = progress + "%";
      if(currentBar) currentBar.style.width = progress + "%";
      
      const curTimeEl = document.getElementById('currentTime') || document.querySelector('.progress__time');
      const durTimeEl = document.getElementById('durationTime') || document.querySelector('.progress__duration');
      
      if(curTimeEl) curTimeEl.innerText = formatTime(audioPlayer.currentTime);
      if(durTimeEl && !isNaN(audioPlayer.duration)) {
         durTimeEl.innerText = formatTime(audioPlayer.duration);
      }
   };
}

function formatTime(seconds) {
   let min = Math.floor(seconds / 60);
   let sec = Math.floor(seconds % 60);
   return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function clickProgress(e) {
   if(!audioPlayer) return;
   const progressBar = document.getElementById('progressBar') || document.querySelector('.progress__bar');
   if(!progressBar) return;
   
   const width = progressBar.clientWidth;
   const rect = progressBar.getBoundingClientRect();
   const clickX = e.pageX - rect.left;
   const duration = audioPlayer.duration;
   audioPlayer.currentTime = (clickX / width) * duration;
}

function shareSong() {
   const title = document.getElementById('playingSongName').innerText;
   if (navigator.share) {
      navigator.share({ title: 'Kelkaam MDH', text: `Listening to ${title} on Kelkaam MDH!`, url: window.location.href });
   } else {
      alert("Sharing not supported in this browser.");
   }
}

if(audioPlayer) {
   audioPlayer.onplay = () => {
      if(waveBox) waveBox.classList.add('playing');
      document.getElementById('playPauseBtn').innerText = "⏸";
   };
   audioPlayer.onpause = () => {
      if(waveBox) waveBox.classList.remove('playing');
      document.getElementById('playPauseBtn').innerText = "▶";
   };
   audioPlayer.onended = function() {
      if (!isLooping) playNext();
   };
}

function showStep(id) {
   document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
   document.getElementById(id).classList.add('active');
   const magicNav = document.getElementById('magicNav');
   if (magicNav) {
      if (id === 'step0') {
         magicNav.style.display = 'none';
      } else {
         magicNav.style.display = 'flex';
         updateMagicNav(id);
      }
   }
}

function updateMagicNav(stepId) {
   const lists = document.querySelectorAll('.navigation ul li');
   lists.forEach(l => l.classList.remove('active'));
   if (stepId === 'step1') lists[0]?.classList.add('active');
   else if (stepId === 'stepHistory') lists[1]?.classList.add('active');
   else if (stepId === 'step2') lists[2]?.classList.add('active');
   else if (stepId === 'step3') lists[3]?.classList.add('active');
   else if (stepId === 'stepPremium') lists[4]?.classList.add('active');
}

function filterSongs() {
   let input = document.getElementById('songSearch').value.toLowerCase();
   let items = document.getElementsByClassName('song-item');
   for (let item of items) {
      item.style.display = item.innerText.toLowerCase().includes(input) ? "flex" : "none";
   }
}

function checkPremiumKey() {
   const key = document.getElementById('premiumKey').value.trim();
   const validKeys = ["MDH001PLUS", "MDH002PLUS", "MDH003PLUS", "MDH004PLUS", "MDH005PLUS", "MDH006PLUS", "MDH007PLUS", "MDH008PLUS", "MDH009PLUS", "MDH010PLUS"];
   if (validKeys.includes(key)) {
      isPremiumUser = true;
      document.getElementById('lockMessage').style.display = 'none';
      document.getElementById('premiumTools').style.display = 'block';
      alert("Premium Plus Activated Successfully! 👑");
   } else {
      alert("Invalid Key! Please contact 9048368870 to get a valid activation key.");
   }
}

function addPremiumSong() {
   const title = document.getElementById('upTitle').value;
   const url = document.getElementById('upUrl').value;
   if (title && url) {
      if (!songData["My Songs"]) songData["My Songs"] = [];
      songData["My Songs"].push({ title, url });
      if (!document.getElementById('mySongsCard')) {
         const singerList = document.getElementById('singerList');
         const div = document.createElement('div');
         div.id = "mySongsCard";
         div.className = 'singer-card';
         div.onclick = () => selectSinger(div, 'My Songs');
         div.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/461/461238.png"><div class="singer-name">My Songs</div>`;
         singerList?.prepend(div);
      }
      alert("Song Added Successfully!");
   }
}

/* ================= SONG DATA ================= */
const songData = {
   "Thwaha Thangal": [
      { title: "Mahathi Khadeeja Beevi", url: "https://image2url.com/r2/default/audio/1774250368262-a183a454-7b67-45c4-bd38-f466ff79d906.mp3", img: "https://i.ibb.co/7xXYyXvr/hqdefault.avif" },
      { title: "amina beevi chirikkunnu poomon muthu pirannu", url: "https://image2url.com/r2/default/audio/1769790042584-aab38f80-55c9-4ffc-8859-a4df2677be07.mp3", img: "https://i.postimg.cc/sgcwRsBR/hqdefault.jpg" },
      { title: "Balaghal Ula", url: "https://image2url.com/r2/default/audio/1769775923540-f267597d-c4a8-4b5d-9ae7-4b2b6c3a5381.mp3", img: "https://i.postimg.cc/3NX2CFpS/hqdefault-(1).avif" },
      { title: "ajaboli noor", url: "https://image2url.com/r2/default/audio/1769911250949-15e8c48e-c897-46aa-9762-0cfc02651e4c.mp3", img: "https://i.postimg.cc/JzSZW6NG/hqdefault.avif" },
      { title: " Chandran Pilarnna Sambavam", url: "https://image2url.com/r2/default/audio/1769911759009-bb4c0b88-8070-48f0-8173-854fee4fb86a.mp3", img: "https://i.postimg.cc/Bbtnbs35/hqdefault-(1).avif" },
      { title: "AAGAYE RASOOLULLAAH", url: "https://image2url.com/r2/default/audio/1769911990015-08f5ac77-31a5-4540-b184-e82f1b78e7cd.mp3", img: "https://i.postimg.cc/Vk9mY5MQ/hqdefault-(2).avif" },
      { title: "khabrakathe kaazchakal kaanan", url: "https://image2url.com/r2/default/audio/1769912464023-b1630074-615f-49be-9de6-09cd3f4b07c2.mp3", img: "https://i.postimg.cc/4NsTWsjd/hqdefault-(3).avif" },
      { title: "MADEENA PARANJU", url: "https://image2url.com/r2/default/audio/1769912634558-9fbb5174-7029-4e40-83d5-cf8d2077568c.mp3", img: "https://i.postimg.cc/Kc76kCjf/hqdefault-(4).avif" },
      { title: "sneha lokam", url: "https://image2url.com/r2/default/audio/1769912842292-5d3fa8e7-2258-4e3e-b8ac-97d6763b143d.mp3", img: "https://i.postimg.cc/jSD3X1xZ/hqdefault-(5).avif" },
      { title: "Vasantham Varunnu", url: "https://image2url.com/r2/default/audio/1769913271544-ed3e77bc-8246-4f1b-a43b-195a33ba2aba.mp3", img: "https://i.postimg.cc/63MCF9YX/hqdefault-(6).avif" },
      { title: "Hridhayathiloode vilikkum Habeeb", url: "https://image2url.com/r2/default/audio/1769913631426-b82f24ee-51b2-4a4e-82da-60b3a0d54095.mp3", img: "https://i.postimg.cc/44xGbKFKc/hqdefault-(8).avif" },
      { title: "Ahlu Badr", url: "https://image2url.com/r2/default/audio/1769913833919-67e6e2fe-9ea6-4f35-8f5f-0e22ad32fcb6.mp3", img: "https://i.postimg.cc/N0MXmhQf/hqdefault-(9).avif" },
      { title: "Prakasham Poy Maranju", url: "https://image2url.com/r2/default/audio/1769914025650-3ffde8f5-529a-44af-a09d-8b637d80cce1.mp3", img: "https://i.postimg.cc/kGdDjLPW/hqdefault-(10).avif" },
      { title: "Thiruppiravi", url: "https://image2url.com/r2/default/audio/1769998853629-f385f176-811c-4222-af0d-468a4e9f44ed.mp3", img: "https://i.postimg.cc/5yHsFRpp/hqdefault-(20).avif" },
      { title: "Sneham Marikkaruthe", url: "https://image2url.com/r2/default/audio/1770007065862-7b19d045-cd72-42f7-8914-d2aad14f9ea9.mp3", img: "https://i.postimg.cc/8CtrWdyd/hqdefault-(23).avif" },
      { title: "aaksha bhoomi thengi", url: "https://image2url.com/r2/default/audio/1770007278484-b295e111-aa90-48d4-81f3-099b39e9eaca.mp3", img: "https://i.postimg.cc/bNcHqT4L/hqdefault-(24).avif" },
      { title: "Habeebinte Kaalam", url: "https://image2url.com/r2/default/audio/1770007417761-66a58f8c-dbd8-4955-98ef-b694963f407d.mp3", img: "https://i.postimg.cc/3RG46M8z/hqdefault-(25).avif" }
   ],
   "Shahin Babu": [
      { title: "Mahathi Khadeeja Beevi", url: "https://image2url.com/r2/default/audio/1774250368262-a183a454-7b67-45c4-bd38-f466ff79d906.mp3", img: "https://i.ibb.co/7xXYyXvr/hqdefault.avif" },
      { title: "anuraagi madangidunne", url: "https://image2url.com/r2/default/audio/1769772557877-485f5bb4-be86-4124-bd85-5b37bee5b37e.mp3", img: "https://i.postimg.cc/MH6pN7NC/hq720.avif" },
      { title: "Umma Karalanumma", url: "https://image2url.com/r2/default/audio/1769776022685-166ece47-2832-44ff-b71b-1436c10d4a82.mp3", img: "https://i.postimg.cc/Dw9ynkRt/hq720-(1).avif" },
      { title: "ajaboli noor", url: "https://image2url.com/r2/default/audio/1769911250949-15e8c48e-c897-46aa-9762-0cfc02651e4c.mp3", img: "https://i.postimg.cc/JzSZW6NG/hqdefault.avif" },
      { title: "AAGAYE RASOOLULLAAH", url: "https://image2url.com/r2/default/audio/1769911990015-08f5ac77-31a5-4540-b184-e82f1b78e7cd.mp3", img: "https://i.postimg.cc/Vk9mY5MQ/hqdefault-(2).avif" },
      { title: "MUTH NABI", url: "https://image2url.com/r2/default/audio/1769929972824-33b99b7c-a7a4-492c-90f6-267dcdea43e8.mp3", img: "https://i.postimg.cc/tCr9L41h/hqdefault-(11).avif" },
      { title: "PRANAYAAVISHKARAM", url: "https://image2url.com/r2/default/audio/1769996634356-de5b3658-b09b-4c97-bac4-f63e7f28ac33.mp3", img: "https://i.postimg.cc/zB4BqyQ5/hqdefault-(12).avif" },
      { title: "Top 4 Songs", url: "https://image2url.com/r2/default/audio/1769997239646-b6e40db7-6002-4a01-b515-1d839ffdb434.mp3", img: "https://i.postimg.cc/sx3LQcbj/hqdefault-(13).avif" },
      { title: "Athishaya Noor", url: "https://image2url.com/r2/default/audio/1769997381727-f94795d3-9c8e-4b1a-90d9-2ed44b91b803.mp3", img: "https://i.postimg.cc/BZNY72ds/hqdefault-(14).avif" },
      { title: "Eid Al Adha Song", url: "https://image2url.com/r2/default/audio/1769997726287-40ac8566-6b65-4115-830c-e5214fda3241.mp3", img: "https://i.postimg.cc/CxCfJsQW/hqdefault-(15).avif" },
      { title: "Karunamrtham", url: "https://image2url.com/r2/default/audio/1769997987684-3e6c14d8-62dc-4546-be81-f58344159b9f.mp3", img: "https://i.postimg.cc/9XqPZZCn/hqdefault-(16).avif" },
      { title: "Snehageetham", url: "https://image2url.com/r2/default/audio/1769998137511-e4a91077-191c-4ef3-8135-99c74df4690a.mp3", img: "https://i.postimg.cc/NGTT5txG/hqdefault-(17).avif" },
      { title: "Muth Rasool (S)", url: "https://image2url.com/r2/default/audio/1769998403750-e153cbdf-cde9-44bf-9733-9e8b7e2b81b7.mp3", img: "https://i.postimg.cc/3J8RYQSN/hqdefault-(18).avif" },
      { title: "Habbeborude Mad'h", url: "https://image2url.com/r2/default/audio/1769998573336-2b7ad3f9-691b-4d6f-a8b5-2e9b347aa6ac.mp3", img: "https://i.postimg.cc/7ZpwCFVm/hqdefault-(19).avif" },
      { title: "Thiruppiravi", url: "https://image2url.com/r2/default/audio/1769998853629-f385f176-811c-4222-af0d-468a4e9f44ed.mp3", img: "https://i.postimg.cc/5yHsFRpp/hqdefault-(20).avif" },
      { title: "Madeenayude Namathil", url: "https://image2url.com/r2/default/audio/1769999083657-fc350f41-a63c-40e5-ad43-db7ee41fe28b.mp3", img: "https://i.postimg.cc/SsHvV4X4/hqdefault-(21).avif" }
   ],
   "Nasif Calicut": [
      { title: "KALLIYANAPPATTU", url: "https://image2url.com/r2/default/audio/1774251017106-6ea6f5df-5b38-43dc-a0db-7137cc4af6ea.mp3", img: "https://i.ibb.co/Z64fYHCF/hqdefault-1.avif" },
      { title: "noore noorul ameene", url: "https://image2url.com/r2/default/audio/1769773105324-7700ea9f-177a-4376-bcc4-e04829d3aa94.mp3", img: "https://i.postimg.cc/8c9xMDRt/hq720-(2).avif" },
      { title: "Sab Se Aula o Aala Hamara Nabi", url: "https://image2url.com/r2/default/audio/1769776128321-0e1810de-9de2-48a1-8ad6-81d7468197bd.mp3", img: "https://i.postimg.cc/jqDxwjt0/hqdefault-(2).avif" },
      { title: "ajaboli noor", url: "https://image2url.com/r2/default/audio/1769911250949-15e8c48e-c897-46aa-9762-0cfc02651e4c.mp3", img: "https://i.postimg.cc/JzSZW6NG/hqdefault.avif" },
      { title: "AAGAYE RASOOLULLAAH", url: "https://image2url.com/r2/default/audio/1769911990015-08f5ac77-31a5-4540-b184-e82f1b78e7cd.mp3", img: "https://i.postimg.cc/Vk9mY5MQ/hqdefault-(2).avif" },
      { title: "Athishaya Noor", url: "https://image2url.com/r2/default/audio/1769997381727-f94795d3-9c8e-4b1a-90d9-2ed44b91b803.mp3", img: "https://i.postimg.cc/BZNY72ds/hqdefault-(14).avif" },
      { title: "കരൾ പകുത്തോരാ", url: "https://image2url.com/r2/default/audio/1774260485040-d83dc572-8bb0-4b63-8454-ef378609a2e2.mp3", img: "https://i.ibb.co/s9ppNZdH/hqdefault-2.avif" },
      { title: "മുഹിബ്ബിൻ മനം", url: "https://image2url.com/r2/default/audio/1774260828051-a20899fa-7e8b-45bb-9f69-2809f9834a04.mp3", img: "https://i.ibb.co/7tHYvYQM/hqdefault-3.avif" },
      { title: "പ്രവാസിയുടെ മനസ്സാണീ പാട്ട്", url: "https://image2url.com/r2/default/audio/1774261743182-7ea761fb-9168-48ef-b27b-5ca2b25a9fe0.mp3", img: "https://i.ibb.co/nSgRLf0/hqdefault.avif" }
   ],
   "Azhar Kallur": [
      { title: "Chor Fikr Duniya Ki", url: "https://image2url.com/r2/default/audio/1769773241543-66cbcc00-472d-48a2-8a4f-cc6f44b57a48.mp3", img: "https://i.postimg.cc/fLxvBsQ8/hq720-(3).avif" },
      { title: "Meraj Ka Deewana", url: "https://image2url.com/r2/default/audio/1769776309832-82ee935c-ba9b-4795-ad0c-c821c660cf9d.mp3", img: "https://i.postimg.cc/QM7gdDCV/hqdefault-(3).avif" },
      { title: "Jashne Eid", url: "https://image2url.com/r2/default/audio/1774263375688-c36dc008-4f20-4de6-afac-d3e8d5f21cef.mp3", img: "https://i.ibb.co/RTmLKV2X/mqdefault-6s.webp" },
      { title: "Mahneeya Badar", url: "https://image2url.com/r2/default/audio/1774263616482-6386661b-afcd-4113-a30f-7e5386bc25ea.mp3", img: "https://i.ibb.co/nNKxL4nb/hqdefault-1.avif" },
      { title: "Nafeesath Mala", url: "https://files.catbox.moe/7t9qch.mp3", img: "https://i.ibb.co/cKGNYc95/hqdefault-2.avif" },
      { title: "New Manqabat Khadija Beevi", url: "https://files.catbox.moe/ve19d6.mp3", img: "https://i.ibb.co/FLy88bR7/hqdefault-3.avif" },
      { title: "New Fatima Beevi (R)", url: "https://files.catbox.moe/hu25xd.mp3", img: "https://i.ibb.co/fVMxf7Kj/hqdefault-4.avif" },
      { title: "New Ramzan Nasheed", url: "https://files.catbox.moe/94mx83.mp3", img: "https://i.ibb.co/MyPn0mxD/hqdefault-5.avif" },
      { title: "Samstha Song", url: "https://files.catbox.moe/hp8kjl.mp3", img: "https://i.ibb.co/ZppxvP6Y/hqdefault-6.avif" },
      { title: "Main Banda e Aasi Hoon", url: "https://files.catbox.moe/kzb8ne.mp3", img: "https://i.ibb.co/jZstdpPg/hqdefault-7.avif" }
   ],
   "Mahfooz Raihan": [
      { title: "sharafude attam bahretam mathi noora", url: "https://image2url.com/r2/default/audio/1769773491701-4961ae33-3a8e-4961-a68e-c527b6e611e0.mp3", img: "https://i.postimg.cc/fLK9VRN3/hq720-(4).avif" },
      { title: "thankatthen thirunabi tharul tharamaal", url: "https://image2url.com/r2/default/audio/1769776587181-3ba2d0a8-6a32-40ae-a2f6-3ff14e9ded56.mp3", img: "https://i.postimg.cc/Y2PSbWbK/hqdefault-(4).avif" }
   ],
   "Nasif Mon": [
      { title: "THAAJDHAARE NABI", url: "https://image2url.com/r2/default/audio/1769773621632-ca08e0e8-4c73-424c-9902-26d7ec5b5cfa.mp3", img: "https://i.postimg.cc/PrZ8DyhM/hq720-(5).avif" },
      { title: "QALBAN PONNUPPA", url: "https://image2url.com/r2/default/audio/1769776791932-435a9a21-326a-45b6-9e9b-6b534d9972b7.mp3", img: "https://i.postimg.cc/7PJCv9CZ/hq720-(6).avif" }
   ],
   "Samad Saqafi": [
      { title: "Innal tiya reeha ssaba", url: "https://image2url.com/r2/default/audio/1769773701393-0c345eb1-20d4-4e8f-851c-0436f9ed81bc.mp3", img: "https://i.postimg.cc/gjgkQBVn/download-(7).jpg" }
   ],
   "Rahoof Akode": [
      { title: "QALBILE MOHAM", url: "https://image2url.com/r2/default/audio/1769773828754-998a8f3e-8005-40e3-bdb2-eaf4003f93c6.mp3", img: "https://i.postimg.cc/BnLQ7pX5/download-(8).jpg" },
      { title: "AAGAYE RASOOLULLAAH", url: "https://image2url.com/r2/default/audio/1769911990015-08f5ac77-31a5-4540-b184-e82f1b78e7cd.mp3", img: "https://i.postimg.cc/Vk9mY5MQ/hqdefault-(2).avif" },
      { title: "New Fatima Beevi (R)", url: "https://files.catbox.moe/hu25xd.mp3", img: "https://i.ibb.co/fVMxf7Kj/hqdefault-4.avif" }
   ],
   "Mubashir Perinthattiri": [
      { title: "twaifinte veedikal", url: "https://image2url.com/r2/default/audio/1769771784287-ec008311-4cdd-419f-9545-4d2e8b86fc8d.mp3", img: "https://i.postimg.cc/ZKgJNNVz/download-(9).jpg" }
   ],
   "Ashad Pookkottur": [
      { title: "Sugandha Suma Sura", url: "https://image2url.com/r2/default/audio/1769773931214-b2719114-e8a2-4ded-bc79-dca736fff87f.mp3", img: "https://i.postimg.cc/brrjDYn0/images-(2).jpg" },
      { title: "New Manqabat Khadija Beevi", url: "https://files.catbox.moe/ve19d6.mp3", img: "https://i.ibb.co/FLy88bR7/hqdefault-3.avif" }
   ],
   "Hafiz Swadiq Ali Fazili": [
      { title: "Swahibul Buraq Baith", url: "https://image2url.com/r2/default/audio/1769774020642-677b2f99-43c2-43d3-963f-0f808ee1a36d.mp3", img: "https://i.postimg.cc/TPc8t5q1/images-(1).jpg" }
   ],
   "Murshid Elayoor": [
      { title: "snehaashru", url: "https://image2url.com/r2/default/audio/1769774135208-b43207a7-cec7-4092-b592-d1a2313aa2f7.mp3", img: "https://i.postimg.cc/x1KBdNZs/download-(10).jpg" }
   ],
   "Hafiz Jabir Omassery": [
      { title: "habeebinte mannu", url: "https://image2url.com/r2/default/audio/1769774693954-1834eae4-3423-4389-b99b-c8454ff1fb47.mp3", img: "https://i.postimg.cc/6qD2MpCD/download-(11).jpg" }
   ]
};

// Start logic
document.addEventListener('DOMContentLoaded', () => {
   const listItems = document.querySelectorAll('.navigation ul li');
   listItems.forEach((item) => {
      item.addEventListener('click', function() {
         listItems.forEach(i => i.classList.remove('active'));
         this.classList.add('active');
      });
   });
});
