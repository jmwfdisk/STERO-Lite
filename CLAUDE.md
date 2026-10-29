# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

STÉRO 앱 시리즈의 정적 홈페이지 + 법적 고지 페이지입니다. 출시·테스트 중인 앱(STÉRO MUSIC iOS, STÉRO Lite Android, 곰곰디스크 안의 STÉRO Studio 웹)은 자세히, 개발 중인 앱(Chat·Cut·3D)은 Lab에서 소개만 합니다.
- App Store: https://apps.apple.com/us/app/stero-lite/id6758091280 · Instagram: https://www.instagram.com/stero_lite/
- 배포: GitHub Pages, 도메인 `stero.co.kr`(`CNAME`). 메타 태그의 절대 URL(`og:url`·`og:image`·`twitter:*`)도 이 도메인으로 통일 (옛 `sterolite.app` 쓰지 않음)
- 빌드 도구, 패키지 매니저, 프레임워크, 테스트 없음 — 순수 HTML/CSS/JS. `main`에 푸시하면 바로 배포됨.

## 검색 등록 (네이버·구글, 2026-10-30 완료)

- 네이버 서치어드바이저·구글 서치 콘솔에 `https://stero.co.kr` 등록·소유확인, `sitemap.xml` 제출 완료
- 모든 HTML `<head>`의 `google-site-verification`·`naver-site-verification` 메타 태그는 소유확인용이라 **지우지 않는다** (새 페이지에도 복사)
- 새 페이지를 만들면: `sitemap.xml`에 `<url>` 추가, `<link rel="canonical">`·`og:*`·인증 태그를 기존 페이지와 같은 형식으로 넣는다. 대표 주소는 `https://stero.co.kr/…` (www 아님)
- 검색어 대응: 제목·설명에 "스테로·STÉRO·STERO"를 함께 쓴다

## 배포 시 캐시

GitHub Pages는 CSS·JS를 10분(`max-age=600`) 캐시한다. `styles.css`·`script.js`·`merge.js`를 바꿔 배포할 때는 모든 HTML의 `?v=YYYYMMDD…` 버전 표시를 함께 올려서, 새 HTML이 예전 CSS로 보이는 일을 막는다.

## 로컬 실행

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## 페이지 구조

- `index.html` — 시리즈 한 페이지: Hero(L/R 파형) → 트랙리스트(Side A 출시·테스트 / Side B 개발 중) → AI 채팅 소개 → `#music`(사용법 9단계 + iPad + 생일 카드 띠 + 2.1 BETA) → `#lite`(사용법 9단계 + 테마) → `#studio`(소개만, 링크 없음) → `#lab`(Chat 실제 화면, Cut·3D 가상 화면) → 푸터
- `terms.html`, `privacy.html`, `delete-account.html` — 한글 법적 문서. **스토어에 등록된 주소라 경로를 바꾸지 않는다.** 셋 다 `.privacy-page` / `.privacy-container` / `.back-link`만 쓰고 `styles.css` 맨 아래 "법적 문서" 블록이 스타일을 담당. `script.js`는 불러오지 않음
- `merge.html` + `merge.js` — 웹 채널 합성 도구(STÉRO MUSIC 채널 합성과 같은 방식: L 파일·R 파일을 각각 모노로 섞어 좌/우 채널에, 길이는 긴 쪽, 채널별 -12~+12dB). **파일은 브라우저 안에서만 처리하고 어디로도 전송하지 않는다** — 이 전제가 페이지의 개인정보·저작권 안내와 맞물려 있으니 업로드·분석 코드를 넣지 말 것. 저작권 동의 체크 두 개가 모두 켜져야 `<fieldset id="tool">`이 열린다. 미리듣기와 내보내기가 같은 `build()` 그래프(OfflineAudioContext → 16bit WAV)를 쓴다. 15분 초과 파일은 거부
- `script.js` — Hero 캔버스 파형 + Web Audio 데모(L 패드·R 아르페지오). 소리는 "소리 켜기" 버튼이나 Hero 채널 합성 슬라이더를 처음 움직일 때만 시작(자동재생 없음). Hero 슬라이더(`#heroSep`)와 STÉRO MUSIC 사용법 06 슬라이더(`#sep`)는 `setMerge()` 하나로 연동되고, 95% 이상 합치면 `#mixer[data-merged]`가 켜져 `merge.html`로 가는 안내가 강조된다. 파형 수렴 정도 = max(스크롤 진행, 슬라이더 값). Hero 배경은 CSS 오로라 레이어(`.aurora i` 4개, script.js가 transform·opacity만 바꿈 — 캔버스에 큰 그라디언트를 매 프레임 칠하면 Safari가 24~40fps로 떨어진다) + 캔버스(4겹 파형 리본·빛 입자, 소리 크기에 반응) 위에 `.hero::before` 유리층(옅은 어둠/밝음 + 노이즈. **backdrop-filter 금지** — Safari와 Chrome이 캔버스를 다르게 흐림)과 `::after` 사선 반사광을 얹은 구조. 매 프레임 이전 화면을 50%만 지워 모션 블러 꼬리를 남기므로 빛의 한 프레임 세기는 낮게 둔다(쌓이면 약 2배). 물결은 실제 시간 기준(`performance.now`)으로 진행한다. Hero 파형 모양은 실제 오디오 샘플이 아니라 부드러운 물결로 그리고 소리는 채널별 높이·빛으로만 반영한다 — 샘플 모양을 쓰면 꼬리·유리 블러와 겹쳐 가로 띠처럼 굳어 보인다. 1024px 이상에서 체험 박스(`.mixer`)는 두 단 grid. 색 토큰을 못 읽으면 기본값으로 그리고, `draw()` 예외가 나도 루프는 계속된다. `.story`별 사용법 단계 전환(IntersectionObserver), 생일 카드 띠 이전/다음 버튼

## 앱 이름 표기 (법적 문서 편집 시 중요)

- iOS 앱: App Store 현재 이름은 **STÉRO Lite**, 이후 업데이트에서 **STÉRO MUSIC**으로 변경 예정 — 이 문구를 그대로 유지
- Android 앱: **STÉRO Lite**
- 운영 주체 표기: STÉRO (이하 "회사")

## 법적 문서 개정 규칙

약관·방침을 개정할 때 한 문서 안에서 여러 곳을 함께 맞춰야 합니다:
- `<meta name="description">`의 `(시행일: YYYY-MM-DD)`
- 상단 메타 줄: `시행일`, `이전 시행일`, `적용 앱`
- 상단의 `이전 변경 (날짜)` 요약 문단
- 맨 아래 부칙: "이 약관/방침은 YYYY년 M월 D일부터 시행합니다", "종전의 ... 대체합니다"

표기 규칙: 본문의 콜론은 앞뒤 한 칸씩 띄움 (`<strong>시행일</strong> : 2026-11-04`). 메타 줄 구분자는 `&nbsp;|&nbsp;`.

커밋 메시지는 `docs:`(문서), `style:`, `feat:`, `assets:` 접두어 + 한글 설명 형식.

## 디자인 시스템

`styles.css`의 `:root` 토큰 — 다크가 기본, `prefers-color-scheme: light`와 `[data-theme]`에서 같은 토큰만 다시 정의:
- 채널 색: `--ch-l`(코랄, 왼쪽 채널) · `--ch-r`(퍼플, 오른쪽 채널). "두 채널이 하나로"가 사이트 전체 모티프
- 글꼴(Google Fonts): `--display` Unbounded, `--body` IBM Plex Sans KR, `--mono` JetBrains Mono. 법적 문서 `<head>`에도 같은 폰트 링크가 있다
- 기기 화면 목업(`.dev`, Cut·3D 가상 화면) 안쪽은 앱 자체 화면이라 테마와 무관한 고정 색을 쓴다
- 이징 `--ease-in`·`--ease-em`. 모션은 CSS 스크롤 연동(`animation-timeline: view()`, 미지원 시 그냥 보임)과 IntersectionObserver

## 사용법 단계(`.story`)

- 왼쪽 고정 화면(`.phone .screen img[data-k]`)과 오른쪽 단계(`.step[data-k]`)의 `data-k`가 짝. 단계를 추가하면 이미지·단계·`.dots i` 개수를 함께 맞춘다
- 900px 미만에서는 고정 화면을 숨기고 각 단계 안의 `.inline` 이미지를 보여 준다
- STÉRO MUSIC 화면은 App Store용 스크린샷(자체 휴대폰 프레임 포함)이라 테두리 없이 둥근 카드로, Lite는 실기기 캡처(`.story.lite`, 비율 1080/2120)

## 접근성 — 편집 시 유지

링크/버튼 ARIA 레이블, `prefers-reduced-motion`(CSS 애니메이션 전부 끄고 캔버스는 정지 프레임만 그림), `focus-visible` 외곽선, 소리는 사용자 조작(버튼·Hero 슬라이더)으로만 시작.

## 에셋

- 사이트 이미지: `assets/images/site/*.webp` (원본을 줄여 WebP로 변환한 것). 접두어: `ios-`/`m-`(STÉRO MUSIC), `pad-`(iPad), `card-`(인스타 생일 카드), `lite-`·`and-`(Android), `chat-`(STÉRO Chat), `icon-`(앱 아이콘 — Lite 그린·Studio 코랄은 원본 아이콘 색만 바꾼 웹용 변형)
- 원본 출처: iOS `앱 개발/STERO Lite/STERO Lite 스크린샷 이미지/`, Android·Chat은 실기기(adb) 캡처와 앱 `drawable-nodpi` 사용 설명 이미지. 실기기 캡처는 상태 표시줄·시스템 바를 잘라 내고, 이메일·관리자 표시 같은 개인 정보는 쓰지 않는다
- 예전 랜딩의 `assets/images/<번호>.png`, `iPad Pro/`는 현재 페이지에서 쓰지 않는다(`Play.jpg`는 OG 이미지로 사용 중)
- 파비콘: `assets/images/favicon_io/` (모든 페이지 `<head>`에서 동일하게 참조)
- `assets/images/music.psd`, `.DS_Store`는 커밋하지 않음

## 푸터 (모든 페이지 공통)

`.site-foot`: 밑줄 링크 줄(이용약관 · **개인정보처리방침** · 계정 삭제 안내 · 채널 합성 · Instagram) → 사업자 정보 두 줄 → 저작권 줄. 그래픽스 오버핏 푸터와 같은 구성이고, 사업자 정보도 같다(곰곰소녀마켓 · 대표 정민우 · 주소 · 이메일 / 사업자등록번호 · 통신판매업신고 · 개인정보보호책임자). **전화번호는 넣지 않는다**(사용자 요청). 사업자 정보를 바꾸면 5개 HTML 모두 고친다. `index.html`·`merge.html`에는 오른쪽 아래 `.scroll-pill`(↓ 한 화면 아래 / ↑ 맨 위)도 있다.

## 연락처

gomgomgirls@naver.com — 랜딩 푸터, 약관·방침 문의처, 계정 삭제 요청 메일(`mailto:` 제목 포함)에 사용
