# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

iOS 음악 플레이어 앱 **STÉRO Lite**의 정적 마케팅 웹사이트입니다.
- App Store: https://apps.apple.com/us/app/stero-lite/id6758091280
- 서비스 주소: https://sterolite.app/
- 배포: GitHub Pages (CNAME → sterolite.app)

빌드 도구, 패키지 매니저, 프레임워크 없음 — 순수 HTML/CSS/JS로 구성.

## 로컬 실행

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 페이지 구조

- `index.html` — 메인 랜딩 페이지 (영문 UI, 한글 콘텐츠 혼용)
- `privacy.html` — 개인정보처리방침 (한글)
- `terms.html` — 이용약관 (한글)
- `styles.css` — CSS 커스텀 프로퍼티 기반 전체 스타일
- `script.js` — 캐러셀 자동 스크롤 (무한 루프를 위해 스크린샷 항목 복제)

## 디자인 시스템 (CSS 커스텀 프로퍼티)

`styles.css`의 `:root`에 색상 정의:
- 브랜드 그라디언트: `--gradient-start: #ff6b35` (코랄) → `--gradient-end: #7b2cbf` (퍼플)
- 카드: 글래스모피즘 — `backdrop-filter: blur` + 반투명 배경
- 반응형 브레이크포인트: 768px (태블릿), 1024px (데스크탑)

## 주요 패턴

- **무한 캐러셀**: `script.js`가 DOM 로드 시 `#screenshotsCarousel` 안의 `.screenshot-item` 항목을 복제. CSS `scroll` 키프레임(40초)이 애니메이션을 구동. 마우스 오버 일시정지는 CSS `:hover`로 처리, 터치는 JS로 처리.
- **접근성**: 링크/버튼에 ARIA 레이블, `prefers-reduced-motion` 지원(캐러셀 애니메이션 비활성화), `focus-visible` 외곽선 — 편집 시 유지할 것.
- **이미지 경로**: iPhone 스크린샷은 `assets/images/` (1–10.png), iPad Pro 스크린샷은 `assets/images/iPad Pro/` (디렉토리 이름에 공백 포함).
- **연락처**: gomgomgirls@naver.com (푸터 Contact 링크)
