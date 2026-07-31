(async function () {
  /* 37차시 재편 — 차시 순서와 일치시킵니다.
     1~6 intro·mlplay·logic·perceptron·bias·dataeth
     7~13 text(7·8)·tfidf(9)·vecop(10)·sim(11)·senti(12)·review(13)
     14~20 imgop·rgb·transpose·matmul·imgcls·cnn   (19 fclayer 준비 중)
     21~30 prob(21·22)·trend(23·24)·optim(25·27·28)·gdsheet(29)  (26 loss2 · 30 axb 준비 중)
     31~34 inquiry·decision·datalab·project
     35~37 genvec·genimg·genethics (Ⅵ 선택 심화 — 준비 중)
     project(34차시)는 반드시 마지막 — 회고 탭의 「우리 팀이 쓴 수학」 지도가
     앞선 뷰의 존재를 판정합니다. */
  const order = ["home","intro","mlplay","logic","perceptron","bias","dataeth","text","tfidf","vecop","sim","senti","review","imgop","rgb","transpose","matmul","imgcls","cnn","prob","trend","optim","gdsheet","inquiry","decision","datalab","project"];
  const container = document.getElementById('views');
  if (!container) return;

  // 로딩 중 빠른 클릭에도 내용이 깨지지 않도록, 먼저 홈을 기본으로 표시되게 둡니다.
  // 각 섹션 HTML을 순서대로 로드해 DOM에 삽입한 뒤, 원본 스크립트(core.js)를 실행합니다.
  for (const v of order) {
    const res = await fetch(`views/${v}.html`);
    if (!res.ok) throw new Error(`views/${v}.html 로드 실패 (${res.status})`);
    const html = await res.text();
    container.insertAdjacentHTML('beforeend', html);
  }

  const s = document.createElement('script');
  s.src = 'core.js';
  document.body.appendChild(s);
})();
