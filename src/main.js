const ICONS_BASE = './assets/icons/';

import './js/parallax.js';
import('./js/scene.js');

import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import firebaseConfig from '../config/firebase.json';

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let profileConfig;
let projectsConfig;

let lightboxState = { mediaList: [], currentIndex: 0 };

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
let resizeTimer = null;
let videoDebounceTimer = null;

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
      for (let iter = 0; iter < 3; iter++) {
        const rect = content.getBoundingClientRect();
        const naturalHeight = Math.max(Math.round(rect.height), 50);
        const clampedHeight = Math.min(naturalHeight, 400);

        if (Math.abs(clampedHeight - prevHeight) < 2) break;
        prevHeight = clampedHeight;

        img.style.width = clampedHeight + 'px';
        img.style.height = clampedHeight + 'px';
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

  let actionButtonsHTML = '';
  if (config.skills && config.skills.length > 0 || config.cvPath) {
    actionButtonsHTML = '<div class="action-buttons">';
    
    const buttons = [];
    if (config.skills && config.skills.length > 0) {
      buttons.push('<button class="action-btn" id="skills-btn">Skills</button>');
    }
    if (config.cvPath) {
      buttons.push('<button class="action-btn" id="cv-download-btn">GET CV</button>');
    }
    
    if (buttons.length === 2) {
      actionButtonsHTML += buttons[0] + '<div class="action-divider"></div>' + buttons[1];
    } else {
      actionButtonsHTML += buttons.join('');
    }
    
    actionButtonsHTML += '</div>';
  }

  section.innerHTML = `
    <div class="profile-container">
      <div class="profile-image-wrapper">
        <img src="${escapeHtml(config.image)}" alt="${escapeHtml(config.name)}" class="profile-image" />
      </div>
      <h1 class="profile-name">${escapeHtml(config.name)}</h1>
      ${config.tagline ? `<p class="profile-tagline">${formatText(config.tagline)}</p>` : ''}
      ${config.bio ? `<p class="profile-bio">${formatText(config.bio)}</p>` : ''}
      ${socialLinksHTML}
      ${actionButtonsHTML ? `<div class="action-buttons">${actionButtonsHTML}</div>` : ''}
    </div>
  `;

  section.addEventListener('click', (e) => {
    const socialLink = e.target.closest('.social-link[href]');
    if (socialLink) {
      e.preventDefault();
      const platform = socialLink.title || 'unknown';
      trackEvent('click_social', { platform });
      window.open(socialLink.href, '_blank', 'noopener,noreferrer');
    }
  });

  const skillsBtn = document.getElementById('skills-btn');
  if (skillsBtn) {
    skillsBtn.addEventListener('click', () => openSkillsModal(config.skills));
  }

  const cvBtn = document.getElementById('cv-download-btn');
  if (cvBtn && config.cvPath) {
    cvBtn.addEventListener('click', () => downloadCV(config.cvPath));
  }
}

function renderRoadmap(projects) {
  const container = document.getElementById('roadmap-container');
  
  const sortedProjects = [...projects].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let html = '';
  for (let i = 0; i < sortedProjects.length; i++) {
    const project = sortedProjects[i];
    const storesHTML = renderStoreLinks(project.links?.stores || []);
    const mediaLinksHTML = renderMediaLinks(project.media || [], false);
    const customLinksHTML = renderCustomLinks(project.links?.custom || []);
    const downloadsHTML = renderDownloads(project.downloads);
    const hasFooter = project.company || storesHTML || mediaLinksHTML || customLinksHTML || downloadsHTML;
    
    html += `
      <div class="roadmap-stop" style="animation-delay: ${i * 0.15}s">
        <div class="roadmap-card-wrapper">
          <div class="project-card${hasFooter ? ' has-footer' : ''}" data-project-id="${escapeHtml(project.id)}">
            <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.name)}" class="card-image" />
            <div class="card-content">
              <div class="card-header">
                <h3 class="card-name">${escapeHtml(project.name)}</h3>
                <span class="card-date">${formatDateWithDuration(project.date, project.endDate)}</span>
              </div>
              <p class="card-description">${formatText(project.shortDescription)}</p>
              ${project.company ? `<div class="card-company-line">
                <img src="${escapeHtml(project.company.icon)}" alt="${escapeHtml(project.company.name)}" class="company-icon-card" title="${escapeHtml(project.company.name)}" />
                <span class="company-name" style="color: ${escapeHtml(project.company.color || '#fff')}">${escapeHtml(project.company.name)}</span>
                ${project.details?.role ? `<span class="role-separator">|</span><span class="card-role">${escapeHtml(project.details.role)}</span>` : ''}
              </div>` : ''}
              <div class="card-links">
                ${storesHTML}${customLinksHTML}${mediaLinksHTML}
                ${downloadsHTML}
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
      const projectId = card.dataset.projectId;
      const project = projects.find(p => p.id === projectId);

      const storeLink = e.target.closest('.store-link[href]');
      if (storeLink && !storeLink.classList.contains('store-link-disabled')) {
        const storeType = storeLink.title || 'unknown';
        trackEvent('click_project_link', { link_label: storeType, project_id: projectId });
        window.open(storeLink.href, '_blank', 'noopener,noreferrer');
        return;
      }
      
      const customLink = e.target.closest('.custom-link');
      if (customLink) {
        trackEvent('click_project_link', { link_label: customLink.title, project_id: projectId });
        window.open(customLink.href, '_blank', 'noopener,noreferrer');
        return;
      }
      
      const mediaItem = e.target.closest('.media-link-item');
      if (mediaItem && mediaItem.dataset.galleryType === 'card') {
        e.preventDefault();
        e.stopPropagation();
        if (!project) return;
        const mediaList = project.media || [];
        const mediaIndex = parseInt(mediaItem.dataset.mediaIndex);
        if (mediaList[mediaIndex]) {
          trackEvent('open_media', { media_type: mediaList[mediaIndex].type, project_id: projectId, media_index: mediaIndex });
          openLightbox(mediaList[mediaIndex], mediaList, mediaIndex);
        }
        return;
      }
      
      trackEvent('view_project', { project_id: projectId });
      openProjectModal(projectId);
    });
  });

  setupGlobalTooltip();
}

function setupGlobalTooltip() {
  const tooltip = document.getElementById('global-tooltip');
  if (!tooltip) return;

  function showTooltip(wrapper) {
    const disabledLink = wrapper.querySelector('.store-link-disabled');
    if (!disabledLink) return;

    const rect = disabledLink.getBoundingClientRect();
    
    tooltip.textContent = 'The game was removed from this store 😿';
    
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 200;
    
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.top - tooltipRect.height - 8;
    
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (top < 10) top = rect.bottom + 8;
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('visible');
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

  document.addEventListener('mouseover', (e) => {
    const wrapper = e.target.closest('.store-link-wrapper');
    if (wrapper) {
      showTooltip(wrapper);
    } else if (!e.target.closest('#global-tooltip')) {
      hideTooltip();
    }
  });

  document.addEventListener('mouseout', (e) => {
    const wrapper = e.target.closest('.store-link-wrapper');
    if (wrapper) {
      hideTooltip();
    }
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
      </span>`;
    } else if (store.url) {
      html += `<a href="${escapeHtml(store.url)}" target="_blank" rel="noopener noreferrer" class="store-link" title="${escapeHtml(store.type)}">
        <img src="${escapeHtml(iconPath)}" alt="${escapeHtml(store.type)}" />
      </a>`;
    }
  }
  return html;
}

function renderCustomLinks(links) {
  if (!links || links.length === 0) return '';
  
  let html = '';
  for (const link of links) {
    const iconPath = escapeHtml(link.icon);
    const href = escapeHtml(link.url);
    const label = escapeHtml(link.label || '');
    
    html += `<a href="${href}" target="_blank" rel="noopener noreferrer" class="store-link custom-link" title="${label}">
      <img src="${iconPath}" alt="${label}" />
    </a>`;
  }
  return html;
}

function renderDownloads(downloads) {
  if (!downloads || !downloads.count) return '';
  
  const colorStyle = downloads.color ? `style="color: ${escapeHtml(downloads.color)}"` : '';
  return `<span class="card-downloads" ${colorStyle}>${escapeHtml(downloads.count)}</span>`;
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
  const mediaGalleryHTML = renderMediaGallery(project.details?.media || [], true);
  const customLinksHTML = renderCustomLinks(project.links?.custom || []);
  const downloadsHTML = renderDownloads(project.downloads);
  
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
        ${project.company.name ? `<span class="company-name" style="color: ${escapeHtml(project.company.color || '#fff')}">${escapeHtml(project.company.name)}</span>` : ''}
        ${details.role ? `<span class="role-separator">|</span><span class="modal-role">${escapeHtml(details.role)}</span>` : ''}
      </div>
    `;
  }
  
  modalBody.innerHTML = `
    <div class="modal-top-section">
      <div class="modal-image-section">
        <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.name)}" class="modal-image" />
        ${storesHTML || customLinksHTML ? `<div class="card-links">${storesHTML}${customLinksHTML}</div>` : ''}
        ${downloadsHTML}
      </div>
      <div class="modal-info-section">
        <div class="modal-info-header">
          <h2 class="modal-name">${escapeHtml(project.name)}</h2>
          ${project.date ? `<span class="modal-date">${formatDateWithDuration(project.date, project.endDate)}</span>` : ''}
        </div>
        ${companyHTML}
        <p class="modal-description">${formatText(details.fullDescription || project.shortDescription)}</p>
        ${metaHTML ? `<div class="modal-meta">${metaHTML}</div>` : ''}
      </div>
    </div>
    ${mediaGalleryHTML}
  `;
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  modalBody.addEventListener('click', (e) => {
    const storeLink = e.target.closest('.store-link[href]');
    if (storeLink && !storeLink.classList.contains('store-link-disabled')) {
      e.preventDefault();
      const storeType = storeLink.title || 'unknown';
      trackEvent('click_project_link', { link_label: storeType, project_id: project.id });
      window.open(storeLink.href, '_blank', 'noopener,noreferrer');
      return;
    }
    
    const customLink = e.target.closest('.custom-link');
    if (customLink) {
      e.preventDefault();
      trackEvent('click_project_link', { link_label: customLink.title, project_id: project.id });
      window.open(customLink.href, '_blank', 'noopener,noreferrer');
      return;
    }
    
    const mediaLinkItem = e.target.closest('.media-link-item');
    if (mediaLinkItem) {
      e.preventDefault();
      e.stopPropagation();
      const mediaIndex = parseInt(mediaLinkItem.dataset.mediaIndex);
      const mediaList = project.details?.media || [];
      if (mediaList[mediaIndex]) {
        trackEvent('open_media', { media_type: mediaList[mediaIndex].type, project_id: project.id, media_index: mediaIndex });
        openLightbox(mediaList[mediaIndex], mediaList, mediaIndex);
      }
      return;
    }
    
    const mediaGalleryItem = e.target.closest('.media-gallery-item');
    if (mediaGalleryItem) {
      const index = parseInt(mediaGalleryItem.dataset.mediaIndex);
      const mediaList = project.details?.media || [];
      if (mediaList[index]) {
        trackEvent('open_media', { media_type: mediaList[index].type, project_id: project.id, media_index: index });
        openLightbox(mediaList[index], mediaList, index);
      }
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
    
    function markLoaded() {
      // TODO: remove delay after testing
      const delay = 200 + Math.random() * 800;
      setTimeout(() => {
        applySize();
        item.classList.add('loaded');
        const loader = item.querySelector('.media-loader');
        if (loader) loader.remove();
      }, delay);
    }
    
    if (mediaEl.complete && mediaEl.naturalWidth) {
      markLoaded();
    } else {
      mediaEl.addEventListener('loadeddata', markLoaded);
      mediaEl.addEventListener('load', markLoaded);
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
        <div class="media-loader"></div>
        <video src="${src}" muted loop></video>
        <div class="video-play-overlay">&#9654;</div>
      </div>`;
    } else if (item.type === 'gif') {
      html += `<div class="media-gallery-item" data-media-index="${i}">
        <div class="media-loader"></div>
        <img src="${src}" alt="Media" />
      </div>`;
    } else {
      html += `<div class="media-gallery-item" data-media-index="${i}">
        <div class="media-loader"></div>
        <img src="${src}" alt="Media" />
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

function openLightbox(mediaItem, mediaList, currentIndex) {
  lightboxState.mediaList = mediaList || [mediaItem];
  lightboxState.currentIndex = currentIndex || 0;
  
  renderLightboxContent(mediaItem);
  renderThumbnails(lightboxState.mediaList);
  updateLightboxNavVisibility(lightboxState.mediaList.length);
  
  const lightbox = document.getElementById('media-lightbox');
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

async function navigateLightbox(direction) {
  if (lightboxState.mediaList.length <= 1) return;
  
  const fromIndex = lightboxState.currentIndex;
  let newIndex = lightboxState.currentIndex + direction;
  if (newIndex < 0) newIndex = lightboxState.mediaList.length - 1;
  if (newIndex >= lightboxState.mediaList.length) newIndex = 0;
  
  renderLightboxContent(lightboxState.mediaList[newIndex]);
  updateThumbnails(newIndex);
  lightboxState.currentIndex = newIndex;
  
  trackEvent('navigate_lightbox', { direction: direction > 0 ? 'next' : 'prev', from_index: fromIndex, to_index: newIndex });
}

function switchToMedia(index) {
  if (index === lightboxState.currentIndex) return;
  renderLightboxContent(lightboxState.mediaList[index]);
  updateThumbnails(index);
  lightboxState.currentIndex = index;
}

function renderLightboxContent(mediaItem) {
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
}

function renderThumbnails(mediaList) {
  const container = document.getElementById('lightbox-thumbnails');
  if (!container) return;
  
  if (mediaList.length <= 1) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'flex';
  
  let html = '';
  for (let i = 0; i < mediaList.length; i++) {
    const item = mediaList[i];
    const src = escapeHtml(item.src);
    const activeClass = i === lightboxState.currentIndex ? ' active' : '';
    
    if (item.type === 'video') {
      html += `<div class="lightbox-thumb${activeClass}" data-index="${i}">
        <div class="video-thumbnail-placeholder">&#9654;</div>
      </div>`;
    } else {
      html += `<div class="lightbox-thumb${activeClass}" data-index="${i}">
        <img src="${src}" alt="Thumbnail" />
      </div>`;
    }
  }
  container.innerHTML = html;
  
  container.addEventListener('click', (e) => {
    const thumb = e.target.closest('.lightbox-thumb');
    if (thumb) {
      e.stopPropagation();
      const fromIndex = lightboxState.currentIndex;
      const toIndex = parseInt(thumb.dataset.index);
      switchToMedia(toIndex);
      trackEvent('navigate_lightbox', { direction: toIndex > fromIndex ? 'next' : 'prev', from_index: fromIndex, to_index: toIndex });
    }
  });
}

function updateThumbnails(activeIndex) {
  const thumbs = document.querySelectorAll('.lightbox-thumb');
  thumbs.forEach((thumb, index) => {
    if (index === activeIndex) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
  
  const activeThumb = thumbs[activeIndex];
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function updateLightboxNavVisibility(mediaCount) {
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');
  
  if (prevBtn) {
    prevBtn.style.display = mediaCount > 1 ? 'flex' : 'none';
  }
  if (nextBtn) {
    nextBtn.style.display = mediaCount > 1 ? 'flex' : 'none';
  }
}

function setupLightboxNavigation() {
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => navigateLightbox(-1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => navigateLightbox(1));
  }
  
  document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('media-lightbox');
    if (!lightbox || lightbox.classList.contains('hidden')) return;
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateLightbox(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateLightbox(1);
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

function formatText(text) {
  if (!text) return '';
  let result = escapeHtml(text).replace(/\n/g, '<br>');
  
  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Colored text: [#HEX]text[/color]
  result = result.replace(/\[#([0-9A-Fa-f]{3,6})\](.+?)\[\/color\]/g, '<span style="color:#$1">$2</span>');
  
  return result;
}

function formatDateWithDuration(dateStr, endDate) {
  if (!dateStr) return '';
  
  const start = new Date(dateStr);
  let result = start.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  
  if (endDate) {
    const end = new Date(endDate);
    const endFormatted = end.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    result += ' - ' + endFormatted;
    
    const duration = calculateDuration(dateStr, endDate);
    if (duration) {
      result += `: <span class="card-duration">${duration}</span>`;
    }
  }
  
  return result;
}

function calculateDuration(dateStr, endDate) {
  if (!dateStr || !endDate) return '';
  
  const start = new Date(dateStr);
  const end = new Date(endDate);
  
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years === 0 && months === 0) return 'Less than a month';
  
  const parts = [];
  if (years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);
  
  return parts.join(', ');
}

function trackEvent(eventName, params = {}) {
  logEvent(analytics, eventName, params);
  if (import.meta.env.DEV) {
    console.log(`[Firebase] ${eventName}`, params);
  }
}

let scrollThresholds = new Set();

async function init() {
  const profileData = await import('../config/profile.json');
  const projectsData = await import('../config/projects.json');
  
  profileConfig = profileData.default;
  projectsConfig = projectsData.default;

  trackEvent('portfolio_visit');
  
  // Inject favicon
  if (profileConfig.favicon) {
    const linkEl = document.createElement('link');
    linkEl.rel = 'icon';
    linkEl.href = profileConfig.favicon;
    document.head.appendChild(linkEl);
  }
  
  renderProfile(profileConfig);
  renderRoadmap(projectsConfig);
  
  document.getElementById('project-modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
      closeModal();
    }
  });

  const skillsModal = document.getElementById('skills-modal');
  if (skillsModal) {
    skillsModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
        closeSkillsModal();
      }
    });
  }

  document.getElementById('media-lightbox').addEventListener('click', (e) => {
    if (e.target.classList.contains('lightbox-overlay')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('media-lightbox').classList.contains('hidden')) {
        closeLightbox();
      } else if (!document.getElementById('skills-modal').classList.contains('hidden')) {
        closeSkillsModal();
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
      video.addEventListener('mouseenter', () => {
        clearTimeout(videoDebounceTimer);
        videoDebounceTimer = setTimeout(() => video.play().catch(() => {}), 100);
      });
      video.addEventListener('mouseleave', () => {
        clearTimeout(videoDebounceTimer);
        videoDebounceTimer = setTimeout(() => { video.pause(); video.currentTime = 0; }, 50);
      });
    });
  });
  
  setupLightboxNavigation();
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateCardImageSizes, 200);
  });

  scrollThresholds = new Set();
  let scrollThrottleTimer = null;
  const SCROLL_THROTTLE_MS = 100;

  window.addEventListener('scroll', () => {
    if (scrollThrottleTimer) return;
    scrollThrottleTimer = setTimeout(() => {
      scrollThrottleTimer = null;
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      if (scrollPercent >= 25 && !scrollThresholds.has(25)) {
        scrollThresholds.add(25);
        trackEvent('scroll_25');
      }
      if (scrollPercent >= 50 && !scrollThresholds.has(50)) {
        scrollThresholds.add(50);
        trackEvent('scroll_50');
      }
      if (scrollPercent >= 75 && !scrollThresholds.has(75)) {
        scrollThresholds.add(75);
        trackEvent('scroll_75');
      }
      if (scrollPercent >= 95 && !scrollThresholds.has(100)) {
        scrollThresholds.add(100);
        trackEvent('scroll_bottom');
      }
    }, SCROLL_THROTTLE_MS);
  });

  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      if (scrollPercent >= 50) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
    
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function openSkillsModal(skills) {
  const modal = document.getElementById('skills-modal');
  const skillsBody = document.getElementById('skills-body');
  
  if (!modal || !skillsBody) return;
  
  let html = '';
  for (let i = 0; i < skills.length; i++) {
    const section = skills[i];
    html += `<div class="skill-section">`;
    html += `<div class="skill-section-header">`;
    html += `<h3 class="skill-section-title">${escapeHtml(section.title)}</h3>`;
    html += `<div class="skill-divider"></div>`;
    html += `</div>`;
    html += `<div class="skill-items">`;
    for (let j = 0; j < section.items.length; j++) {
      html += `<span class="skill-item">${formatText(section.items[j])}</span>`;
      if (j < section.items.length - 1) {
        html += `<span class="skill-separator">|</span>`;
      }
    }
    html += `</div></div>`;
  }
  
  skillsBody.innerHTML = html;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  trackEvent('view_skills');
}

function closeSkillsModal() {
  const modal = document.getElementById('skills-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function downloadCV(cvPath) {
  trackEvent('click_cv_download', { cv_path: cvPath });
  
  const a = document.createElement('a');
  a.href = cvPath;
  a.download = cvPath.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

init();
