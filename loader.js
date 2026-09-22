(async function () {
  /* 37차시 재편 — 차시 순서와 일치시킵니다. 37차시 전체 가동.
     1~6 intro·mlplay·logic·perceptron·bias·dataeth
     7~13 text(7·8)·tfidf(9)·vecop(10)·sim(11)·senti(12)·review(13)
     14~20 imgop·rgb·transpose·matmul·imgcls·fclayer·cnn
     21~30 prob(21·22)·trend(23·24)·optim(25·27·28)·loss2(26)·gdsheet(29)·axb(30)
     31~34 inquiry·decision·datalab·project
     35~37 genvec·genimg·genethics (Ⅵ 선택 심화)
     project(34차시)는 반드시 마지막 — 회고 탭의 「우리 팀이 쓴 수학」 지도가
     앞선 뷰의 존재를 판정합니다. */
  const order = ["home","refs","intro","mlplay","logic","perceptron","bias","dataeth","text","tfidf","vecop","sim","senti","review","imgop","rgb","transpose","matmul","imgcls","fclayer","cnn","prob","trend","optim","loss2","gdsheet","axb","inquiry","decision","datalab","project","genvec","genimg","genethics"];
  /* ── 배포 표시 ──────────────────────────────────────────────────────────
     뷰 33개를 표시 없이 받으면 브라우저 HTTP 캐시가 옛 사본을 내주어,
     새로 올린 내용이 캐시가 만료될 때까지(깃허브 페이지는 보통 10분)
     보이지 않습니다. 서비스워커를 지워도 마찬가지였습니다.
     sw.js 의 CACHE_NAME 과 같은 값을 붙여 한 번 새로 고치면 바로 보이게 합니다.
     ※ 내용을 고칠 때는 sw.js 의 CACHE_NAME 과 이 값을 함께 올립니다. */
  const BUILD = (typeof window !== 'undefined' && window.AIM_BUILD) || 'v121';

  const container = document.getElementById('views');
  if (!container) return;

  // 로딩 중 빠른 클릭에도 내용이 깨지지 않도록, 먼저 홈을 기본으로 표시되게 둡니다.
  // 각 섹션 HTML을 순서대로 로드해 DOM에 삽입한 뒤, 원본 스크립트(core.js)를 실행합니다.
  for (const v of order) {
    const res = await fetch(`views/${v}.html?${BUILD}`);
    if (!res.ok) throw new Error(`views/${v}.html 로드 실패 (${res.status})`);
    const html = await res.text();
    container.insertAdjacentHTML('beforeend', html);
  }

  const s = document.createElement('script');
  s.src = 'core.js?' + BUILD;
  document.body.appendChild(s);
})();
