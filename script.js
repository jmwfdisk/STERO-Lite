// STÉRO Lite - Auto-scrolling Screenshots Carousel
// 무한 루프를 위한 자동 스크롤 구현

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.getElementById('screenshotsCarousel');
    if (!carousel) return;

    const items = carousel.querySelectorAll('.screenshot-item');
    if (items.length === 0) return;

    // 동작 감소 선호 시 애니메이션 생략
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // 아이템 복제 (무한 루프 효과)
    items.forEach(item => {
      carousel.appendChild(item.cloneNode(true));
    });

    // 모바일 터치 시 일시정지
    carousel.addEventListener('touchstart', function() {
      carousel.style.animationPlayState = 'paused';
    }, { passive: true });

    carousel.addEventListener('touchend', function() {
      carousel.style.animationPlayState = 'running';
    }, { passive: true });
  });
})();
