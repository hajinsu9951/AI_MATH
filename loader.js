(async function () {
  const order = ['home','intro','perceptron','text','mnist','hamming','conv','quickdraw','filter','pool','pipeline','detect'];
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