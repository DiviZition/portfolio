const ICONS_BASE = '/assets/icons/';

let profileConfig;
let projectsConfig;

const storeIcons = {
  'app-store': 'app-store.png',
  'ios': 'app-store.png',
  'google-play': 'google-play.png',
  'steam': 'steam.png',
  'itch-io': 'itch-io.png'
};

const socialIcons = {
  'linkedin': 'linkedin.png',
  'github': 'github.png',
  'steam': 'steam.png',
  'telegram': 'telegram.png',
  'twitter': 'twitter.png',
  'youtube': 'youtube.png',
  'discord': 'discord.png'
};

function getIconPath(platform) {
  const iconFile = socialIcons[platform] || storeIcons[platform];
  if (iconFile) return `${ICONS_BASE}${iconFile}`;
  return null;
}

let cardSizesScheduled = false;

function updateCardImageSizes() {
  if (cardSizesScheduled) return;
  cardSizesScheduled = true;

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    cardSizesScheduled = false;
    return;
  }

  requestAnimationFrame(() => {
    document.querySelectorAll('.project-card').forEach(card => {
      const img = card.querySelector('.card-image');
      const content = card.querySelector('.card-content');
      if (!img || !content) return;

      let prevHeight = 0;
      for (let iter = 0; iter < 5; iter++) {
        const rect = content.getBoundingClientRect();
        const naturalHeight = Math.max(Math.round(rect.height), 50);
        const clampedHeight = Math.min(naturalHeight, 400);

        if (Math.abs(clampedHeight - prevHeight) < 2) break;
        prevHeight = clampedHeight;

        img.style.width = clampedHeight + 'px';
        img.style.height = clampedHeight + 'px';
        
        document.body.offsetHeight;
      }

      if (content.scrollHeight > 400) {
        content.style.maxHeight = '400px';
        content.style.overflowY = 'auto';
      } else {
        content.style.maxHeight = '';
        content.style.overflowY = '';
      }
    });
    
    cardSizesScheduled = false;
  });
}

function renderProfile(config) {
  const section = document.getElementById('profile-section');
  
  let socialLinksHTML = '';
  if (config.socials && config.socials.length > 0) {
    socialLinksHTML = '<div class="social-links">';
    for (const social of config.socials) {
      const iconPath = getIconPath(social.platform);
      if (iconPath) {
        socialLinksHTML += `
          <a href="${escapeHtml(social.url)}" target="_blank" rel="noopener noreferrer" class="social-link" title="${escapeHtml(social.platform)}">
            <img src="${escapeHtml(iconPath)}" alt="${escapeHtml(social.platform)}" />
          </a>
        `;
      }
    }
    socialLinksHTML += '</div>';
  }

  section.innerHTML = `
    <div class="profile-container">
      <div class="profile-image-wrapper">
        <img src="${escapeHtml(config.image)}" alt="${escapeHtml(config.name)}" class="profile-image" />
      </div>
      <h1 class="profile-name">${escapeHtml(config.name)}</h1>
      ${config.tagline ? `<p class="profile-tagline">${escapeHtml(config.tagline)}</p>` : ''}
      ${config.bio ? `<p class="profile-bio">${escapeHtml(config.bio)}</p>` : ''}
      ${socialLinksHTML}
    </div>
  `;
}

function renderRoadmap(projects) {
  const container = document.getElementById('roadmap-container');
  
  const sortedProjects = [...projects].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let html = '';
  for (let i = 0; i < sortedProjects.length; i++) {
    const project = sortedProjects[i];
    const storesHTML = renderStoreLinks(project.links?.stores || []);
    const mediaLinksHTML = renderMediaLinks(project.links?.media || [], false);
    
    html += `
      <div class="roadmap-stop" style="animation-delay: ${i * 0.15}s">
        <div class="roadmap-card-wrapper">
          <div class="project-card" data-project-id="${escapeHtml(project.id)}">
            <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.name)}" class="card-image" />
            <div class="card-content">
              <div class="card-header">
                <h3 class="card-name">${escapeHtml(project.name)}</h3>
                <span class="card-date">${formatDate(project.date)}</span>
              </div>
              <p class="card-description">${escapeHtml(project.shortDescription)}</p>
              ${project.company ? `<div class="card-company-line">
                <img src="${escapeHtml(project.company.icon)}" alt="${escapeHtml(project.company.name)}" class="company-icon-card" title="${escapeHtml(project.company.name)}" />
                <span class="company-name">${escapeHtml(project.company.name)}</span>
                ${project.details?.role ? `<span class="role-separator">|</span><span class="card-role">${escapeHtml(project.details.role)}</span>` : ''}
              </div>` : ''}
              <div class="card-links">
                ${storesHTML}${mediaLinksHTML}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  updateCardImageSizes();
  resizeMediaGalleryItems();
  
  container.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const storeLink = e.target.closest('.store-link[href]');
      if (storeLink && !storeLink.classList.contains('store-link-disabled')) {
        return;
      }
      
      const mediaItem = e.target.closest('.media-link-item');
      if (mediaItem && mediaItem.dataset.galleryType === 'card') {
        e.preventDefault();
        e.stopPropagation();
        const projectId = card.dataset.projectId;
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        const mediaList = project.links?.media || [];
        const mediaIndex = parseInt(mediaItem.dataset.mediaIndex);
        if (mediaList[mediaIndex]) {
          openLightbox(mediaList[mediaIndex]);
        }
        return;
      }
      
      const projectId = card.dataset.projectId;
      openProjectModal(projectId);
    });
  });
}

function renderStoreLinks(stores) {
  if (!stores || stores.length === 0) return '';
  
  let html = '';
  for (const store of stores) {
    const iconPath = getIconPath(store.type);
    if (!iconPath) continue;
    
    if (store.disabled) {
      html += `<span class="store-link-wrapper" data-store-type="${escapeHtml(store.type)}">
        <span class="store-link store-link-disabled">
          <img src="${escapeHtml(iconPath)}" alt="${escapeHtml(store.type)}" />
        </span>
        <span class="store-tooltip">The game was removed from this store 😿</span>
      </span>`;
    } else if (store.url) {
      html += `<a href="${escapeHtml(store.url)}" target="_blank" rel="noopener noreferrer" class="store-link" title="${escapeHtml(store.type)}">
        <img src="${escapeHtml(iconPath)}" alt="${escapeHtml(store.type)}" />
      </a>`;
    }
  }
  return html;
}

function renderMediaLinks(media, isInModal) {
  if (!media || media.length === 0) return '';
  
  let html = '';
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const src = escapeHtml(item.src);
    
    if (item.type === 'video') {
      html += `<div class="media-link-item" data-media-index="${i}" data-gallery-type="${isInModal ? 'modal' : 'card'}">
        <img src="${src}" alt="Media preview" />
      </div>`;
    } else {
      html += `<div class="media-link-item" data-media-index="${i}" data-gallery-type="${isInModal ? 'modal' : 'card'}">
        <img src="${src}" alt="Media preview" />
      </div>`;
    }
  }
  return html;
}

function openProjectModal(projectId) {
  const projects = projectsConfig;
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  const modal = document.getElementById('project-modal');
  const modalBody = document.getElementById('modal-body');
  
  const details = project.details || {};
  const modalLinks = details.links || project.links || {};
  const storesHTML = renderStoreLinks(modalLinks.stores || []);
  const mediaGalleryHTML = renderMediaGallery(modalLinks.media || [], true);
  
  let metaHTML = '';
  if (details.techStack && details.techStack.length > 0) {
    metaHTML += `<span class="modal-meta-item"><strong>Tech:</strong> ${escapeHtml(details.techStack.join(', '))}</span>`;
  }
  if (details.team && details.team.length > 0) {
    metaHTML += `<span class="modal-meta-item"><strong>Team:</strong> ${escapeHtml(details.team.join(', '))}</span>`;
  }
  
  let companyHTML = '';
  if (project.company) {
    companyHTML = `
      <div class="modal-company-line">
        ${project.company.icon ? `<img src="${escapeHtml(project.company.icon)}" alt="${escapeHtml(project.company.name)}" class="company-icon-modal" title="${escapeHtml(project.company.name)}" />` : ''}
        ${project.company.name ? `<span class="company-name">${escapeHtml(project.company.name)}</span>` : ''}
        ${details.role ? `<span class="role-separator">|</span><span class="modal-role">${escapeHtml(details.role)}</span>` : ''}
      </div>
    `;
  }
  
  modalBody.innerHTML = `
    <div class="modal-top-section">
      <div class="modal-image-section">
        <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.name)}" class="modal-image" />
        ${storesHTML ? `<div class="card-links">${storesHTML}</div>` : ''}
      </div>
      <div class="modal-info-section">
        <h2 class="modal-name">${escapeHtml(project.name)}</h2>
        ${companyHTML}
        <p class="modal-description">${escapeHtml(details.fullDescription || project.shortDescription)}</p>
        ${metaHTML ? `<div class="modal-meta">${metaHTML}</div>` : ''}
      </div>
    </div>
    ${mediaGalleryHTML}
  `;
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  modalBody.querySelectorAll('.media-link-item').forEach(item => {
    item.addEventListener('click', () => {
      const mediaIndex = parseInt(item.dataset.mediaIndex);
      const mediaList = modalLinks.media || [];
      if (mediaList[mediaIndex]) {
        openLightbox(mediaList[mediaIndex]);
      }
    });
  });

  modalBody.querySelectorAll('.media-gallery-item').forEach((item, index) => {
    if (index < (modalLinks.media || []).length) {
      item.addEventListener('click', () => {
        openLightbox(modalLinks.media[index]);
      });
    }
  });

  resizeMediaGalleryItems();
}

function resizeMediaGalleryItems() {
  const galleryItems = document.querySelectorAll('.media-gallery-item');
  
  galleryItems.forEach(item => {
    const mediaEl = item.querySelector('img, video');
    if (!mediaEl) return;
    
    const targetHeight = 200;
    
    function applySize() {
      let naturalWidth, naturalHeight;
      
      if (mediaEl.tagName === 'VIDEO') {
        naturalWidth = mediaEl.videoWidth || 16;
        naturalHeight = mediaEl.videoHeight || 9;
      } else {
        naturalWidth = mediaEl.naturalWidth || 16;
        naturalHeight = mediaEl.naturalHeight || 9;
      }
      
      const aspectRatio = naturalWidth / naturalHeight;
      item.style.width = (targetHeight * aspectRatio) + 'px';
    }
    
    if (mediaEl.complete && mediaEl.naturalWidth) {
      applySize();
    } else {
      mediaEl.addEventListener('loadeddata', applySize);
      mediaEl.addEventListener('load', applySize);
    }
  });
}

function renderMediaGallery(media, isInModal) {
  if (!media || media.length === 0) return '';
  
  let html = '<div class="media-gallery">';
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const src = escapeHtml(item.src);
    
    if (item.type === 'video') {
      html += `<div class="media-gallery-item" data-media-index="${i}">
        <video src="${src}" muted loop></video>
      </div>`;
    } else if (item.type === 'gif') {
      html += `<div class="media-gallery-item" data-media-index="${i}">
        <img src="${src}" alt="Media" />
      </div>`;
    } else {
      html += `<div class="media-gallery-item" data-media-index="${i}">
        <img src="${src}" alt="Media" />
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

function openLightbox(mediaItem) {
  const lightbox = document.getElementById('media-lightbox');
  const content = document.getElementById('lightbox-content');
  
  if (mediaItem.type === 'video') {
    content.innerHTML = `<video src="${escapeHtml(mediaItem.src)}" controls autoplay></video>`;
  } else {
    content.innerHTML = `<img src="${escapeHtml(mediaItem.src)}" alt="Media" />`;
  }
  
  const mediaEl = content.querySelector('img, video');
  if (mediaEl) {
    function applySize() {
      let naturalWidth, naturalHeight;
      
      if (mediaEl.tagName === 'VIDEO') {
        naturalWidth = mediaEl.videoWidth || 16;
        naturalHeight = mediaEl.videoHeight || 9;
      } else {
        naturalWidth = mediaEl.naturalWidth || 16;
        naturalHeight = mediaEl.naturalHeight || 9;
      }
      
      const aspectRatio = naturalWidth / naturalHeight;
      const vw = window.innerWidth * 0.75;
      const vh = window.innerHeight * 0.75;
      
      let width, height;
      if (vw / vh > aspectRatio) {
        height = vh;
        width = vh * aspectRatio;
      } else {
        width = vw;
        height = vw / aspectRatio;
      }
      
      mediaEl.style.width = width + 'px';
      mediaEl.style.height = height + 'px';
    }
    
    if (mediaEl.complete && mediaEl.naturalWidth) {
      applySize();
    } else {
      mediaEl.addEventListener('loadeddata', applySize);
      mediaEl.addEventListener('load', applySize);
    }
  }
  
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('media-lightbox');
  const content = document.getElementById('lightbox-content');
  
  lightbox.classList.add('hidden');
  content.innerHTML = '';
  document.body.style.overflow = '';
}

function setupGalleryClickHandlers(mediaList) {
  const galleryItems = document.querySelectorAll('.media-gallery-item');
  
  galleryItems.forEach((item, index) => {
    if (index < mediaList.length) {
      item.addEventListener('click', () => {
        openLightbox(mediaList[index]);
      });
    }
  });
}

function closeModal() {
  const modal = document.getElementById('project-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function init() {
  profileConfig = await fetch('/config/profile.json').then(r => r.json());
  projectsConfig = await fetch('/config/projects.json').then(r => r.json());
  
  renderProfile(profileConfig);
  renderRoadmap(projectsConfig);
  
  document.getElementById('project-modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
      closeModal();
    }
  });
  
  document.getElementById('media-lightbox').addEventListener('click', (e) => {
    if (e.target.classList.contains('lightbox-overlay')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('media-lightbox').classList.contains('hidden')) {
        closeLightbox();
      } else if (!document.getElementById('project-modal').classList.contains('hidden')) {
        closeModal();
      }
    }
  });
  
  const galleries = document.querySelectorAll('.media-gallery');
  let isDown = false, startX, scrollLeft;
  
  galleries.forEach(gallery => {
    gallery.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - gallery.offsetLeft;
      scrollLeft = gallery.scrollLeft;
    });
    
    gallery.addEventListener('mouseleave', () => { isDown = false; });
    gallery.addEventListener('mouseup', () => { isDown = false; });
    
    gallery.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - gallery.offsetLeft;
      const walk = (x - startX) * 2;
      gallery.scrollLeft = scrollLeft - walk;
    });
    
    const videos = gallery.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('mouseenter', () => video.play().catch(() => {}));
      video.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
    });
  });
  
  window.addEventListener('resize', () => {
    updateCardImageSizes();
  });
}

init();
