# AI_MATH — 인공지능 수학 37차시 수업 웹

제작 : 대전대신고등학교 교사 하진수

2022 개정 교육과정 고등학교 「인공지능 수학」 5개 단원(34차시) + 선택 심화 Ⅵ단원(3차시)을 37차시 웹 수업으로 구성하는 프로젝트입니다.
설치·서버 없이 동작하는 순수 정적 SPA(PWA)로, GitHub Pages에서 바로 서비스됩니다.

## 수업 구조

모든 차시는 공통 템플릿을 따릅니다.

- **표제부** — 학습 목표(성취기준 [12인수XX-XX] 연계) · 핵심 개념 · 핵심 질문
- **STEP 1 도입** — 디딤 영상 슬롯(교사 URL 연결, 기기 저장) + 마중 퀴즈
- **STEP 2 전개** — 탐구 활동 2~4개 (관찰 → 단계별 토글로 정리·정의 확인, 정답은 시도 후 공개)
- **STEP 3 정리** — 핵심 질문에 답하기 + 형성평가 + 다음 차시 예고

## 차시 현황 (37차시 체계 · 2026-07-31 재편)

| 단원 | 차시 | 뷰 | 상태 |
|---|---|---|---|
| Ⅰ. 인공지능과 빅데이터 | 1~6 | intro · mlplay · logic · perceptron · bias · dataeth | 6/6 완료 |
| Ⅱ. 텍스트 데이터 처리 | 7~13 | text(7·8) · tfidf(9) · vecop(10) · sim(11) · senti(12) · review(13) | 7/7 완료 |
| Ⅲ. 이미지 데이터 처리 | 14~20 | imgop · rgb · transpose · matmul · imgcls · **fclayer(준비 중)** · cnn | 6/7 |
| Ⅳ. 예측과 최적화 | 21~30 | prob(21·22) · trend(23·24) · optim(25·27·28) · **loss2(26 준비 중)** · gdsheet(29) · **axb(30 준비 중)** | 8/10 |
| Ⅴ. 인공지능과 수학 탐구 | 31~34 | inquiry · decision · datalab · project | 4/4 완료 |
| Ⅵ. 생성형 AI와 수학 (선택 심화 · 평가 제외) | 35~37 | **genvec · genimg · genethics (모두 준비 중)** | 0/3 |

구 12·13차시(quickdraw·mnist·hamming)는 **18차시 imgcls** 로, 구 15~19차시(conv·filter·pool·pipeline·detect)는
**20차시 cnn** 으로 통합되었습니다. 옛 주소(#mnist · #conv 등)로 들어와도 통합된 차시의 해당 탭으로 자동 연결됩니다.

## 구조

```
index.html   # 셸: 전역 스타일 + 상단 nav + #views 컨테이너
loader.js    # views/*.html 조각을 순서대로 fetch해 삽입 후 core.js 로드
core.js      # 라우터 go(v) + 모든 뷰의 초기화·인터랙션 코드
views/       # 차시(뷰) 조각 — <div class="view" id="v-이름">
sw.js        # 오프라인 캐시(서비스워커) — 뷰 추가 시 ASSETS와 CACHE_NAME 갱신
```

새 차시(뷰) 추가 절차: ① `views/이름.html` 생성 → ② `core.js` 의 AIM_LESSONS 행에 v/a 채우기 → ③ `loader.js` order 배열 → ④ `core.js` 초기화 코드(스니펫) 덧붙이기 → ⑤ `sw.js` ASSETS 추가 + CACHE_NAME +1

## 로컬 실행

```bash
python -m http.server 8123
```

브라우저에서 `http://localhost:8123` 접속.

## 참고 자료 배포 절차

각 차시 「참고 자료」 섹션의 **[자료 목록 내보내기]** 로 받은 JSON(교사가 이 기기에 추가한 자료 목록)을
`data/resources.json` 으로 저장해 배포하면, 이후 모든 사용자에게 기본으로 노출됩니다.
(교사가 브라우저에서 추가한 자료는 그 기기의 localStorage 에만 남습니다 — 학급 전체 공유는
「학급 공유 자료함」 URL 설정 또는 이 배포 절차를 이용하세요.)

## 교과서 지면 캡처 (로컬 전용)

`assets/textbook-local/` 은 `.gitignore` 로 배포에서 제외됩니다. 파일이 없으면 해당 이미지는
`onerror` 로 자동 제거되어 공개본에는 흔적이 남지 않습니다. 수업용으로만 이용하세요.
