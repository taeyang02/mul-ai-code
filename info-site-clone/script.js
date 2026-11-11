import { loadProfile } from './configDisplay.js?v=20260726';

// Font registration will be performed after the API fetch (API-first flow).

// Runtime variables (populated from the API). We keep safe defaults so the page
// doesn't completely break if the API is slow or unavailable.
let audioFiles = [];
let startMessage = '';
let name = ''; // Tên hiển thị
let bioMessages = [];
let avatarLink = '';
let badges = [];
let socialLinks = [];
// runtime-only values populated from API
let backgroundVideo = '';
let defaultVolume = 0.3;
let defaultTransparency = 0.7;
let fontFamily = 'Angel Wish';
let fontPath = null;
let fontCrossorigin = null;
let preferredFirstType = null;

let shuffledAudioFiles = [];
let currentAudioIndex = 0;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Chuẩn bị danh sách audio đã được xáo trộn, nhưng nếu preferredFirstType
// được đặt (không null/empty), thì tìm phần tử đầu tiên khớp với chuỗi đó và đẩy lên đầu.
function prepareShuffledAudioFiles() {
  try {
    const pref = preferredFirstType;
    // Nếu không có pref thì trả về mảng đã xáo
    if (!pref) return shuffleArray([...audioFiles]);

    const prefLower = String(pref).toLowerCase().trim();
    if (!prefLower) return shuffleArray([...audioFiles]);

    // Validate: kiểm tra xem có file nào trong audioFiles khớp pref không
    const existsInList = audioFiles.some(a => a && a.toLowerCase().includes(prefLower));
    if (!existsInList) {
      console.info(`preferredFirstType "${pref}" not found in audioFiles — using regular shuffle.`);
      return shuffleArray([...audioFiles]);
    }

    // Nếu có match, xáo rồi đẩy phần tử khớp đầu tiên (theo mảng đã xáo) lên đầu
    let arr = shuffleArray([...audioFiles]);
    const idx = arr.findIndex(a => a && a.toLowerCase().includes(prefLower));
    if (idx > 0) {
      const [item] = arr.splice(idx, 1);
      arr.unshift(item);
    }
    return arr;
  } catch (e) {
    console.warn('prepareShuffledAudioFiles error:', e);
    return shuffleArray([...audioFiles]);
  }
}

function playNextAudio() {
  if (currentAudioIndex >= shuffledAudioFiles.length) {
    shuffledAudioFiles = prepareShuffledAudioFiles(); // Reshuffle when all played
    currentAudioIndex = 0;
  }
  const backgroundMusic = document.getElementById('background-music');
  backgroundMusic.src = shuffledAudioFiles[currentAudioIndex];
  backgroundMusic.load(); // Load the new audio source
  backgroundMusic.play().catch(err => console.error("Failed to play next audio:", err));
  currentAudioIndex++;
}

/**
 * Hàm render động badges và social links
 */
function renderProfileElements() {
  // Render Avatar
  document.getElementById('profile-picture').src = avatarLink;

  // Render Badges
  const badgeGroup = document.getElementById('badge-group');
  if (badgeGroup) {
    badgeGroup.innerHTML = ''; // Xóa nội dung cũ
    (badges || []).forEach(badge => {
      const container = document.createElement('div');
      container.className = 'badge-container';
      container.innerHTML = `
        <img src="${badge.icon}" alt="badge" class="badge">
        <span class="tooltip">${badge.tooltip}</span>
      `;
      badgeGroup.appendChild(container);
    });
  }

  // Render Social Links
  const socialLinksContainer = document.getElementById('social-links');
  if (socialLinksContainer) {
    socialLinksContainer.innerHTML = ''; // Xóa nội dung cũ
    (socialLinks || []).forEach(link => {
      if (link && link.url) {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.innerHTML = `<img src="${link.icon}" alt="${(link.icon||'').split('/').pop()}" class="social-icon">`;
        socialLinksContainer.appendChild(a);
      } else if (link && link.icon) {
        const img = document.createElement('img');
        img.src = link.icon;
        img.alt = (link.icon||'').split('/').pop();
        img.className = 'social-icon';
        socialLinksContainer.appendChild(img);
      }
    });
  }

}
  document.addEventListener('DOMContentLoaded', async () => {
    // API-first: load profile data from backend and populate runtime variables
    try {
      const fetched = await loadProfile('lucas');
      if (fetched && typeof fetched === 'object') {
        audioFiles = Array.isArray(fetched.audioFiles) ? fetched.audioFiles : audioFiles;
        startMessage = fetched.startMessage || startMessage;
        name = fetched.profileName || name;
        bioMessages = Array.isArray(fetched.bioMessages) ? fetched.bioMessages : bioMessages;
        avatarLink = fetched.avatarLink || avatarLink;
        badges = Array.isArray(fetched.badges) ? fetched.badges : badges;
        socialLinks = Array.isArray(fetched.socialLinks) ? fetched.socialLinks : socialLinks;
        backgroundVideo = fetched.backgroundVideo || backgroundVideo;
        defaultVolume = (typeof fetched.defaultVolume === 'number') ? fetched.defaultVolume : defaultVolume;
        defaultTransparency = (typeof fetched.defaultTransparency === 'number') ? fetched.defaultTransparency : defaultTransparency;
        fontFamily = fetched.fontFamily || fontFamily;
        fontPath = fetched.fontPath || fontPath;
        fontCrossorigin = fetched.fontCrossorigin || fontCrossorigin;
        preferredFirstType = fetched.preferredFirstType || preferredFirstType;
      } else {
        console.warn('loadProfile returned empty/invalid payload; using runtime defaults');
      }
    } catch (err) {
      console.error('Failed to load profile from API; using runtime defaults.', err);
    }

    // Register font from fetched profile if provided
    try {
      if (fontPath) {
        // Preload the font for perceived performance
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.href = fontPath;
        if (fontCrossorigin) link.crossOrigin = fontCrossorigin;
        document.head.appendChild(link);

        const css = `@font-face { font-family: '${fontFamily}'; src: url('${fontPath}') format('truetype'); font-weight: normal; font-style: normal; font-display: swap; }`;
        const styleEl = document.createElement('style');
        styleEl.type = 'text/css';
        styleEl.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(styleEl);
      }
    } catch (e) {
      console.warn('Error registering font from profile:', e);
    }

    // Populate DOM from runtime values
    renderProfileElements();

  const startScreen = document.getElementById('start-screen');
  const startText = document.getElementById('start-text');
  const profileName = document.getElementById('profile-name');
  const profileBio = document.getElementById('profile-bio');
  const visitorCount = document.getElementById('visitor-count');
  const backgroundMusic = document.getElementById('background-music');
  const backgroundVideoEl = document.getElementById('background');
  const backgroundSource = document.getElementById('background-source');

  // Populate background video source from config if provided
  try {
    if (backgroundSource && backgroundVideo) {
      backgroundSource.src = backgroundVideo;
      backgroundSource.type = 'video/mp4';
      if (backgroundVideoEl) backgroundVideoEl.load();
    }
  } catch (err) {
    console.warn('Could not set background video from config:', err);
  }
  const volumeIcon = document.getElementById('volume-icon');
  const volumeSlider = document.getElementById('volume-slider');
  const transparencySlider = document.getElementById('transparency-slider');
  const profileBlock = document.getElementById('profile-block');
  const profilePicture = document.getElementById('profile-picture');
  const profileContainer = document.querySelector('.profile-container');
  const glitchOverlay = document.querySelector('.glitch-overlay');
  const socialIcons = document.querySelectorAll('#social-links .social-icon'); // Lấy lại social icons
  const badgesDOM = document.querySelectorAll('#badge-group .badge'); // Lấy lại badges

  // Initialize sliders and audio volume from runtime values (populated from API or fallback)
  try {
    if (typeof defaultVolume === 'number') {
      volumeSlider.value = defaultVolume;
      // Set background music volume immediately so UI and audio are in sync
      backgroundMusic.volume = defaultVolume;
    }

    if (typeof defaultTransparency === 'number') {
      transparencySlider.value = defaultTransparency;
      // Apply the same visual mapping as the input handler so initial state matches
      const opacityInit = Number(defaultTransparency);
      if (opacityInit === 0) {
        profileBlock.style.background = 'rgba(0, 0, 0, 0)';
        profileBlock.style.borderOpacity = '0';
        profileBlock.style.borderColor = 'transparent';
        profileBlock.style.backdropFilter = 'none';
      } else {
        profileBlock.style.background = `rgba(0, 0, 0, ${opacityInit})`;
        profileBlock.style.borderOpacity = opacityInit;
        profileBlock.style.borderColor = '';
        // Use the same 10px multiplier as the input handler; consider making this configurable later
        profileBlock.style.backdropFilter = `blur(${10 * opacityInit}px)`;
      }
    }
  } catch (e) {
    console.warn('Error applying default slider values:', e);
  }

  // Custom Cursor Logic
  const cursor = document.querySelector('.custom-cursor');
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  if (isTouchDevice) {
    document.body.classList.add('touch-device');

    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      cursor.style.left = touch.clientX + 'px';
      cursor.style.top = touch.clientY + 'px';
      cursor.style.display = 'block';
    });

    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      cursor.style.left = touch.clientX + 'px';
      cursor.style.top = touch.clientY + 'px';
      cursor.style.display = 'block';
    });

    document.addEventListener('touchend', () => {
      cursor.style.display = 'none';
    });
  } else {
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursor.style.display = 'block';
    });

    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'scale(0.8) translate(-50%, -50%)';
    });

    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'scale(1) translate(-50%, -50%)';
    });
  }


  // Start Screen Typewriter Logic (Sử dụng startMessage từ config)
  let startTextContent = '';
  let startIndex = 0;
  let startCursorVisible = true;

  function typeWriterStart() {
    if (startIndex < startMessage.length) {
      startTextContent = startMessage.slice(0, startIndex + 1);
      startIndex++;
    }
    startText.textContent = startTextContent + (startCursorVisible ? '|' : ' ');
    setTimeout(typeWriterStart, 100);
  }

  setInterval(() => {
    startCursorVisible = !startCursorVisible;
    startText.textContent = startTextContent + (startCursorVisible ? '|' : ' ');
  }, 500);

  // Visitor Counter Logic
  function initializeVisitorCounter() {
    fetch('/api/counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'views' }),
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(() => fetch('/api/counter?slug=views'))
    .then(response => response.json())
    .then(data => {
      visitorCount.textContent = data.count.toLocaleString();
    })
    .catch(error => {
      console.error('Error updating or fetching visitor count:', error);
      visitorCount.textContent = 'Error';
    });
  }

  initializeVisitorCounter();

  // Handle Start Interaction
  let hasInteracted = false;
  function handleStartInteraction() {
    if (hasInteracted) return;
    hasInteracted = true;

    console.log('User interaction detected');
    startScreen.classList.add('hidden');

  // Use configured default volume (from API or fallback) if provided
  backgroundMusic.volume = (typeof defaultVolume === 'number') ? defaultVolume : 0.3;

    if (shuffledAudioFiles.length === 0) {
      shuffledAudioFiles = prepareShuffledAudioFiles();
    }

    backgroundMusic.src = shuffledAudioFiles[0];
    backgroundMusic.load();

    const playPromise = backgroundMusic.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Audio playback started successfully!');
        currentAudioIndex = 1;
        backgroundMusic.addEventListener('ended', playNextAudio);
      }).catch(error => {
        console.error('Failed to play audio:', error);
      });
    }

    profileBlock.classList.remove('hidden');
    gsap.fromTo(profileBlock,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power2.out', onComplete: () => {
        profileBlock.classList.add('profile-appear');
        profileContainer.classList.add('orbit');
      }}
    );
    typeWriterName();
    typeWriterBio();
  }

  startScreen.addEventListener('click', handleStartInteraction);
  startScreen.addEventListener('touchend', handleStartInteraction);


  // Profile Name Typewriter Logic (Sử dụng profileName từ config)
  let nameText = '';
  let nameIndex = 0;
  let isNameDeleting = false;
  let nameCursorVisible = true;

  function typeWriterName() {
    if (!isNameDeleting && nameIndex < name.length) {
      nameText = name.slice(0, nameIndex + 1);
      nameIndex++;
    } else if (isNameDeleting && nameIndex > 0) {
      nameText = name.slice(0, nameIndex - 1);
      nameIndex--;
    } else if (nameIndex === name.length) {
      isNameDeleting = true;
      setTimeout(typeWriterName, 10000);
      return;
    } else if (nameIndex === 0) {
      isNameDeleting = false;
    }
    profileName.textContent = nameText + (nameCursorVisible ? '|' : ' ');
    if (Math.random() < 0.1) {
      profileName.classList.add('glitch');
      setTimeout(() => profileName.classList.remove('glitch'), 200);
    }
    setTimeout(typeWriterName, isNameDeleting ? 150 : 300);
  }

  setInterval(() => {
    nameCursorVisible = !nameCursorVisible;
    profileName.textContent = nameText + (nameCursorVisible ? '|' : ' ');
  }, 500);


  // Bio Typewriter Logic (Sử dụng bioMessages từ config)
  let bioText = '';
  let bioIndex = 0;
  let bioMessageIndex = 0;
  let isBioDeleting = false;
  let bioCursorVisible = true;

  function typeWriterBio() {
    if (!isBioDeleting && bioIndex < bioMessages[bioMessageIndex].length) {
      bioText = bioMessages[bioMessageIndex].slice(0, bioIndex + 1);
      bioIndex++;
    } else if (isBioDeleting && bioIndex > 0) {
      bioText = bioMessages[bioMessageIndex].slice(0, bioIndex - 1);
      bioIndex--;
    } else if (bioIndex === bioMessages[bioMessageIndex].length) {
      isBioDeleting = true;
      setTimeout(typeWriterBio, 2000);
      return;
    } else if (bioIndex === 0 && isBioDeleting) {
      isBioDeleting = false;
      bioMessageIndex = (bioMessageIndex + 1) % bioMessages.length;
    }
    profileBio.textContent = bioText + (bioCursorVisible ? '|' : ' ');
    if (Math.random() < 0.1) {
      profileBio.classList.add('glitch');
      setTimeout(() => profileBio.classList.remove('glitch'), 200);
    }
    setTimeout(typeWriterBio, isBioDeleting ? 75 : 150);
  }

  setInterval(() => {
    bioCursorVisible = !bioCursorVisible;
    profileBio.textContent = bioText + (bioCursorVisible ? '|' : ' ');
  }, 500);

  // Volume Controls Logic
  let currentAudio = backgroundMusic;
  let isMuted = false;

  volumeIcon.addEventListener('click', () => {
    isMuted = !isMuted;
    currentAudio.muted = isMuted;
    volumeIcon.innerHTML = isMuted
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
  });

  volumeIcon.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isMuted = !isMuted;
    currentAudio.muted = isMuted;
    volumeIcon.innerHTML = isMuted
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
  });

  volumeSlider.addEventListener('input', () => {
    currentAudio.volume = volumeSlider.value;
    isMuted = false;
    currentAudio.muted = false;
    volumeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
  });


  // Transparency Controls Logic
  transparencySlider.addEventListener('input', () => {
    const opacity = transparencySlider.value;
    if (opacity == 0) {
      profileBlock.style.background = 'rgba(0, 0, 0, 0)';
      profileBlock.style.borderOpacity = '0';
      profileBlock.style.borderColor = 'transparent';
      profileBlock.style.backdropFilter = 'none';

      profileBlock.style.pointerEvents = 'auto';
      // Sử dụng socialIconsDOM và badgesDOM đã được lấy lại sau render
      socialIcons.forEach(icon => {
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '1';
      });
      badgesDOM.forEach(badge => {
        badge.style.pointerEvents = 'auto';
        badge.style.opacity = '1';
      });
      profilePicture.style.pointerEvents = 'auto';
      profilePicture.style.opacity = '1';
      profileName.style.opacity = '1';
      profileBio.style.opacity = '1';
      visitorCount.style.opacity = '1';
    } else {
      profileBlock.style.background = `rgba(0, 0, 0, ${opacity})`;
      profileBlock.style.borderOpacity = opacity;
      profileBlock.style.borderColor = '';
      profileBlock.style.backdropFilter = `blur(${10 * opacity}px)`;
      profileBlock.style.pointerEvents = 'auto';
      // Sử dụng socialIconsDOM và badgesDOM đã được lấy lại sau render
      socialIcons.forEach(icon => {
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '1';
      });
      badgesDOM.forEach(badge => {
        badge.style.pointerEvents = 'auto';
        badge.style.opacity = '1';
      });
      profilePicture.style.pointerEvents = 'auto';
      profilePicture.style.opacity = '1';
      profileName.style.opacity = '1';
      profileBio.style.opacity = '1';
      visitorCount.style.opacity = '1';
    }
  });


  // Tilt Effect Logic
  function handleTilt(e, element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let clientX, clientY;

    if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const mouseX = clientX - centerX;
    const mouseY = clientY - centerY;

    const maxTilt = 15;
    const tiltX = (mouseY / rect.height) * maxTilt;
    const tiltY = -(mouseX / rect.width) * maxTilt;

    gsap.to(element, {
      rotationX: tiltX,
      rotationY: tiltY,
      duration: 0.3,
      ease: 'power2.out',
      transformPerspective: 1000
    });
  }

  profileBlock.addEventListener('mousemove', (e) => handleTilt(e, profileBlock));
  profileBlock.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleTilt(e, profileBlock);
  });

  profileBlock.addEventListener('mouseleave', () => {
    gsap.to(profileBlock, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  });
  profileBlock.addEventListener('touchend', () => {
    gsap.to(profileBlock, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  });


  // Profile Picture Glitch/Orbit Logic
  profilePicture.addEventListener('mouseenter', () => {
    glitchOverlay.style.opacity = '1';
    setTimeout(() => {
      glitchOverlay.style.opacity = '0';
    }, 500);
  });


  profilePicture.addEventListener('click', () => {
    profileContainer.classList.remove('fast-orbit');
    profileContainer.classList.remove('orbit');
    void profileContainer.offsetWidth;
    profileContainer.classList.add('fast-orbit');
    setTimeout(() => {
      profileContainer.classList.remove('fast-orbit');
      void profileContainer.offsetWidth;
      profileContainer.classList.add('orbit');
    }, 500);
  });

  profilePicture.addEventListener('touchstart', (e) => {
    e.preventDefault();
    profileContainer.classList.remove('fast-orbit');
    profileContainer.classList.remove('orbit');
    void profileContainer.offsetWidth;
    profileContainer.classList.add('fast-orbit');
    setTimeout(() => {
      profileContainer.classList.remove('fast-orbit');
      void profileContainer.offsetWidth;
      profileContainer.classList.add('orbit');
    }, 500);
  });

  typeWriterStart();
});
