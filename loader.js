(async function () {
  // 차시 순서와 일치시킵니다(§11) — 1~5차시 → 6~11차시 → 12~19차시 → 20~27차시 → 28~30차시.
  // project(30차시)는 반드시 마지막 — 회고 탭의 「우리 팀이 쓴 수학」 지도가 앞선 뷰의 존재를 판정합니다.
  const order = ['home','intro','mlplay','logic','perceptron','bias','text','tfidf','sim','senti','review','quickdraw','mnist','hamming','imgop','conv','filter','pool','pipeline','detect','prob','trend','optim','gdsheet','decision','datalab','project'];
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