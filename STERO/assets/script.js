// STÉRO Lite - Auto-scrolling Screenshots Carousel
// 무한 루프를 위한 자동 스크롤 구현

(function() {
  'use strict';
  
  // DOM이 로드된 후 실행
  document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.getElementById('screenshotsCarousel');
    if (!carousel) return;
    
    // 스크린샷 아이템 복제 (무한 루프 효과를 위해)
    const items = carousel.querySelectorAll('.screenshot-item');
    if (items.length === 0) return;
    
    // 아이템들을 복제하여 추가 (끝에 복제본 추가)
    items.forEach(item => {
      const clone = item.cloneNode(true);
      carousel.appendChild(clone);
    });
    
    // 호버 시 일시정지 기능은 CSS에서 처리됨
    // 추가적인 인터랙션은 필요시 여기에 추가
  });
})();
