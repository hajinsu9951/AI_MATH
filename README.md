# AI_MATH — 인공지능 수학 30차시 수업 웹

2022 개정 교육과정 고등학교 「인공지능 수학」 5개 단원을 30차시 웹 수업으로 구성하는 프로젝트입니다.
설치·서버 없이 동작하는 순수 정적 SPA(PWA)로, GitHub Pages에서 바로 서비스됩니다.

## 수업 구조

모든 차시는 공통 템플릿을 따릅니다.

- **표제부** — 학습 목표(성취기준 [12인수XX-XX] 연계) · 핵심 개념 · 핵심 질문
- **STEP 1 도입** — 디딤 영상 슬롯(교사 URL 연결, 기기 저장) + 마중 퀴즈
- **STEP 2 전개** — 탐구 활동 2~4개 (관찰 → 단계별 토글로 정리·정의 확인, 정답은 시도 후 공개)
- **STEP 3 정리** — 핵심 질문에 답하기 + 형성평가 + 다음 차시 예고

## 차시 현황 (30차시 계획)

| 단원 | 차시 | 상태 |
|---|---|---|
| 1. 인공지능과 빅데이터 | 1~5 | **1차시 완료**(`intro`) · 4차시는 `perceptron` 확장 예정 |
| 2. 텍스트 데이터 처리 | 6~11 | `text` 뷰 확장 + 신규 4종 예정 |
| 3. 이미지 데이터 처리 | 12~19 | 기존 8뷰(mnist·hamming·conv·filter·pool·pipeline·detect·quickdraw) 배치 완료 |
| 4. 예측과 최적화 | 20~27 | 신규 4종(prob·trend·optim·gdsheet) 예정 |
| 5. 인공지능과 수학 탐구 | 28~30 | 프로젝트 워크스페이스 예정 |

## 구조

```
index.html   # 셸: 전역 스타일 + 상단 nav + #views 컨테이너
loader.js    # views/*.html 조각을 순서대로 fetch해 삽입 후 core.js 로드
core.js      # 라우터 go(v) + 모든 뷰의 초기화·인터랙션 코드
views/       # 차시(뷰) 조각 — <div class="view" id="v-이름">
sw.js        # 오프라인 캐시(서비스워커) — 뷰 추가 시 ASSETS와 CACHE_NAME 갱신
```

새 차시(뷰) 추가 절차: ① `views/이름.html` 생성 → ② `index.html` nav 버튼 → ③ `loader.js` order 배열 → ④ `core.js` 초기화 코드 → ⑤ `sw.js` ASSETS 추가 + 캐시 버전 +1

## 로컬 실행

```bash
python -m http.server 8123
```

브라우저에서 `http://localhost:8123` 접속.
