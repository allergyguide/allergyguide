document.addEventListener('DOMContentLoaded', () => {
  const openPopup = id => {
    const modal = document.getElementById(id);
    modal?.classList.add('active');
    modal?.setAttribute('aria-hidden', 'false');
  };

  const closePopup = modal => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  // 1) bind triggers
  document.querySelectorAll('.popup-trigger').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();               // don’t let this click bubble to the “outside” handler
      openPopup(btn.dataset.popupId);
    });
  });

  // 2) close button
  document.querySelectorAll('.popup-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closePopup(btn.closest('.popup-modal'));
    });
  });

  // 3) prevent clicks inside the popup-content from bubbling
  document.querySelectorAll('.popup-content').forEach(content => {
    content.addEventListener('click', e => e.stopPropagation());
  });

  // 4) catch *any* click outside the popup-content
  document.addEventListener('click', e => {
    const active = document.querySelector('.popup-modal.active');
    if (!active) return;

    // if the click wasn’t on the trigger or inside the content, close
    const isTrigger = !!e.target.closest('.popup-trigger');
    const isContent = !!e.target.closest('.popup-content');
    if (!isTrigger && !isContent) {
      closePopup(active);
    }
  });

  // 5) Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const active = document.querySelector('.popup-modal.active');
      if (active) closePopup(active);
    }
  });
});

