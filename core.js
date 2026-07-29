let currentView='home';
let mnInited=false;
let hbInited=false;
let pcInited=false;
let srcImg=null;

function go(v,pushState=true){
  const viewEl=document.getElementById('v-'+v);
  if(!viewEl) return;

  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  viewEl.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const nb=document.querySelector(`.nav-btn[data-v="${v}"]`);
  if(nb) nb.classList.add('active');
  try{ aimNavSync(v); aimNavClose(); }catch(e){}

  window.scrollTo(0,0);
  currentView=v;
  initToggles(viewEl);

  if(pushState){
    try{history.pushState({view:v},'', '#'+v);}catch(e){}
  }

  if(v==='filter'){
    if(!srcImg){createDefImg();applyF();}
    const st=document.getElementById('up-status');
    if(st && st.textContent.trim()==='') st.textContent='기본 도형 이미지가 적용되었습니다. 직접 업로드하여 변경할 수 있습니다.';
  }
  if(v==='pool'){try{pRst();}catch(e){}}
  if(v==='perceptron'){
    if(!pcInited){pcInited=true;pcInit();}
    else{try{pcUpdate();}catch(e){}}
  }
  if(v==='mnist'){
    if(!mnInited){mnInited=true;mnInit();}
    else{mnRefresh();}
    initToggles(viewEl);
  }
  if(v==='hamming'){
    if(!hbInited){hbInited=true;hbInit();}
    else{hbRefresh();}
    initToggles(viewEl);
  }
  if(v==='conv'){
      requestAnimationFrame(()=>{
      try{ecRender();ecFitCanvas('eye');ecFitCanvas('cnn');}catch(e){}
    });
  }
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>go(b.dataset.v)));

window.addEventListener('popstate',e=>{
  const v=(e.state&&e.state.view)?e.state.view:'home';
  if(document.getElementById('v-'+v)) go(v,false);
  else if(document.getElementById('v-home')) go('home',false);
});


window.addEventListener('beforeunload',e=>{if(currentView!=='home'){e.preventDefault();}});

function htab(n,el){document.querySelectorAll('#v-hamming .tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#v-hamming .tpanel').forEach(p=>p.classList.remove('on'));document.getElementById('ht'+n).classList.add('on');}
function ctab(n,el){document.querySelectorAll('#v-conv .tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#v-conv .tpanel').forEach(p=>p.classList.remove('on'));document.getElementById('ct'+n).classList.add('on');}
function ptab(n,el){document.querySelectorAll('#v-pool .tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#v-pool .tpanel').forEach(p=>p.classList.remove('on'));document.getElementById('pt'+n).classList.add('on');}


function initToggles(root){
  const scope=root||document;
  scope.querySelectorAll('.card,.info').forEach(el=>{
    if(el.dataset.tglDone==='1') return;
    if(el.closest && el.closest('[data-no-toggle=\"1\"]')) return;

    const isCard=el.classList.contains('card');

    // 1) try :scope (modern browsers), 2) fallback to direct-child scan (older browsers)
    let head=null;
    try{
      head = isCard ? el.querySelector(':scope>h3,:scope>h4') : el.querySelector(':scope>strong');
    }catch(e){
      head = null;
    }
    if(!head){
      for(let i=0;i<el.children.length;i++){
        const ch=el.children[i];
        const t=ch.tagName;
        if(isCard){
          if(t==='H3' || t==='H4'){ head=ch; break; }
        }else{
          if(t==='STRONG'){ head=ch; break; }
        }
      }
    }
    if(!head) return;

    // 인터랙티브 요소가 있으면 자동 토글로 감싸지 않습니다.
    if(el.querySelector('button,input,select,textarea,canvas,video,audio,.tabs,.btn-row,.upz')) return;

    const body=document.createElement('div');
    body.className='tgl-body';
    let node=head.nextSibling;
    while(node){
      const next=node.nextSibling;
      body.appendChild(node);
      node=next;
    }
    el.appendChild(body);
    head.classList.add('tgl-head');
    head.addEventListener('click',()=>{
      head.classList.toggle('open');
      body.classList.toggle('open');
    });
    el.dataset.tglDone='1';
  });
}

let mnDS=null;
let mnLabel=0;
let mnDraw=false;
let mnLast=null;

function mnLoad(){
  try{
    const raw=localStorage.getItem('aimath_mnist_dataset_v1');
    if(raw) mnDS=JSON.parse(raw);
  }catch(e){}
  if(!mnDS || !Array.isArray(mnDS.samples)) mnDS={meta:{ver:1,size:28,createdAt:new Date().toISOString()},samples:[]};
}
function mnSave(){
  try{localStorage.setItem('aimath_mnist_dataset_v1', JSON.stringify(mnDS));}catch(e){}
}
function mnInit(){
  mnLoad();

  const labs=document.getElementById('mn-labs');
  if(labs){
    labs.innerHTML='';
    for(let d=0; d<=9; d++){
      const b=document.createElement('button');
      b.type='button';
      b.textContent=String(d);
      b.className=(d===mnLabel)?'on':'';
      b.onclick=()=>{
        mnLabel=d;
        labs.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
      };
      labs.appendChild(b);
    }
  }

  const cv=document.getElementById('mn-cv');
  if(cv){
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,cv.width,cv.height);

    const getPos=(e)=>{
      const r=cv.getBoundingClientRect();
      const x=(e.clientX - r.left) * (cv.width / r.width);
      const y=(e.clientY - r.top) * (cv.height / r.height);
      return {x,y};
    };

    const down=(e)=>{
      mnDraw=true;
      cv.setPointerCapture?.(e.pointerId);
      mnLast=getPos(e);
    };
    const move=(e)=>{
      if(!mnDraw) return;
      const p=getPos(e);
      ctx.strokeStyle='#000';
      ctx.lineWidth=18;
      ctx.lineCap='round';
      ctx.lineJoin='round';
      ctx.beginPath();
      ctx.moveTo(mnLast.x,mnLast.y);
      ctx.lineTo(p.x,p.y);
      ctx.stroke();
      mnLast=p;
      mnUpdatePreview();
    };
    const up=()=>{
      mnDraw=false; mnLast=null;
      mnUpdatePreview();
    };

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', up);
  }

  mnRefresh();
  mnUpdatePreview();
}

function mnClear(){
  const cv=document.getElementById('mn-cv'); if(!cv) return;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height);
  mnUpdatePreview();
}
function mnReset(){
  mnDS={meta:{ver:1,size:28,createdAt:new Date().toISOString()},samples:[]};
  mnSave();
  mnRefresh();
  mnClear();
  const st=document.getElementById('mn-stat'); if(st) st.textContent='샘플 0개';
}
function mnRaster28(){
  const cv=document.getElementById('mn-cv'); if(!cv) return null;
  const off=document.createElement('canvas');
  off.width=28; off.height=28;
  const octx=off.getContext('2d');
  octx.fillStyle='#fff';
  octx.fillRect(0,0,28,28);
  octx.drawImage(cv,0,0,28,28);
  const img=octx.getImageData(0,0,28,28).data;
  const px=new Array(28*28);
  let ink=0;
  for(let i=0;i<28*28;i++){
    const r=img[i*4], g=img[i*4+1], b=img[i*4+2];
    const gray=Math.round((r+g+b)/3);
      const v=255-gray;
    px[i]=v;
    if(v>10) ink++;
  }
  if(ink<8) return null; // too empty
  return {label:mnLabel,pixels:px};
}
function mnUpdatePreview(){
  const samp=mnRaster28();
  const pv=document.getElementById('mn-prev');
  if(!pv) return;
  const ctx=pv.getContext('2d');
  const W=pv.width,H=pv.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);

  if(!samp){
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.font='700 14px Pretendard';
    ctx.fillText('그려보세요', 16, 28);
    return;
  }
  const img=ctx.createImageData(28,28);
  for(let i=0;i<28*28;i++){
    const v=samp.pixels[i]; // 0..255
    img.data[i*4]=v;
    img.data[i*4+1]=v;
    img.data[i*4+2]=v;
    img.data[i*4+3]=255;
  }
  const off=document.createElement('canvas');
  off.width=28; off.height=28;
  off.getContext('2d').putImageData(img,0,0);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(off,0,0,W,H);
}

function mnAdd(){
  mnLoad();
  const samp=mnRaster28();
  const st=document.getElementById('mn-stat');
  if(!samp){
    const msg=document.getElementById('mn-stat');
    if(msg) msg.textContent='샘플 추가 실패 (너무 비어있음)';
    return;
  }
  mnDS.samples.push({label:samp.label,pixels:samp.pixels});
  mnSave();
  mnRefresh();
  mnClear();
  if(st) st.textContent=`샘플 ${mnDS.samples.length}개`;
}
function mnRemove(i){
  mnLoad();
  if(i<0||i>=mnDS.samples.length) return;
  mnDS.samples.splice(i,1);
  mnSave();
  mnRefresh();
}
function mnRefresh(){
  mnLoad();
  const list=document.getElementById('mn-list');
  const st=document.getElementById('mn-stat');
  if(st) st.textContent=`샘플 ${mnDS.samples.length}개`;

  if(!list) return;
  list.innerHTML='';
  mnDS.samples.slice().reverse().forEach((s,revIdx)=>{
    const idx = mnDS.samples.length-1-revIdx;
    const box=document.createElement('div');
    box.className='mn-smp';
    box.innerHTML=`<canvas width="56" height="56"></canvas>
      <div class="row"><span class="tag">y=${s.label}</span>
      <button class="rm" title="삭제" onclick="mnRemove(${idx})">✕</button></div>`;
    const cv=box.querySelector('canvas');
    const ctx=cv.getContext('2d');
    const img=ctx.createImageData(28,28);
    for(let i=0;i<28*28;i++){
      const v=s.pixels[i];
      img.data[i*4]=v; img.data[i*4+1]=v; img.data[i*4+2]=v; img.data[i*4+3]=255;
    }
    const off=document.createElement('canvas');
    off.width=28; off.height=28;
    off.getContext('2d').putImageData(img,0,0);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(off,0,0,56,56);
    list.appendChild(box);
  });
}

function mnExport(){
  mnLoad();
  const out={
    meta:{...mnDS.meta, exportedAt:new Date().toISOString()},
    samples: mnDS.samples
  };
  const blob=new Blob([JSON.stringify(out)],{type:'application/json'});
  const a=document.createElement('a');
  const ts=new Date().toISOString().replace(/[:.]/g,'-');
  a.download=`mn_dataset_${ts}.json`;
  a.href=URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
}


let hA=[1,0,1,1,0,0,1,0,1,0],hB=[1,1,0,1,0,1,1,0,0,1];
function rHD(){
  const box=document.getElementById('hd-box');box.innerHTML='';
  const mkRow=(lbl,arr,tog)=>{
    const r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:2px;';
    const lb=document.createElement('span');lb.style.cssText='font-family:var(--mono);font-size:0.62rem;color:var(--muted);width:2.2rem;text-align:right;margin-right:0.3rem;';lb.textContent=lbl;r.appendChild(lb);
    arr.forEach((v,i)=>{const e=document.createElement('span');e.style.cssText=`display:inline-flex;align-items:center;justify-content:center;width:2.1rem;height:2.1rem;background:${v?'var(--fg)':'var(--card)'};color:${v?'var(--bg)':'var(--fg)'};font-family:var(--mono);font-size:0.8rem;font-weight:600;border-radius:4px;cursor:pointer;transition:all 0.12s;border:1px solid var(--border);`;e.textContent=v;if(tog)e.onclick=()=>{arr[i]^=1;rHD();};r.appendChild(e);});
    return r;
  };
  box.appendChild(mkRow('A',hA,true));box.appendChild(mkRow('B',hB,true));
  const xr=document.createElement('div');xr.style.cssText='display:flex;align-items:center;gap:2px;';
  const xl=document.createElement('span');xl.style.cssText='font-family:var(--mono);font-size:0.62rem;color:var(--muted);width:2.2rem;text-align:right;margin-right:0.3rem;';xl.textContent='A⊕B';xr.appendChild(xl);
  let d=0;for(let i=0;i<hA.length;i++){const x=hA[i]^hB[i];d+=x;const e=document.createElement('span');e.style.cssText=`display:inline-flex;align-items:center;justify-content:center;width:2.1rem;height:2.1rem;background:${x?'var(--red)':'var(--card)'};color:${x?'#fff':'var(--muted)'};font-family:var(--mono);font-size:0.8rem;font-weight:600;border-radius:4px;border:1px solid ${x?'var(--red)':'var(--border)'};`;e.textContent=x;xr.appendChild(e);}
  box.appendChild(xr);document.getElementById('hd-res').textContent=`해밍 거리 = ${d}`;
}
rHD();

let bSz=6,uBmp=[],isDraw=false,dVal=1;
let curRefDigit=null;
let hGuess=new Array(10).fill('');
const REFS={};
REFS[6]=[
  [0,1,1,1,1,0,1,1,0,0,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,1,1,0,1,1,1,1,0],
  [0,0,1,1,0,0,0,1,1,1,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,1,1,1],
  [0,1,1,1,1,0,1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,1,1,1,1],
  [1,1,1,1,1,0,0,0,0,0,1,1,0,0,1,1,1,0,0,0,0,0,1,1,0,0,0,0,1,1,1,1,1,1,1,0],
  [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,1,1,1,1,1,0,0,0,1,0,0,0,0,0,1,0,0],
  [1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,1,1,1,0],
  [0,1,1,1,1,0,1,1,0,0,0,0,1,1,1,1,1,0,1,0,0,0,0,1,1,1,0,0,1,1,0,1,1,1,1,0],
  [1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0],
  [0,1,1,1,1,0,1,1,0,0,1,1,0,1,1,1,1,0,1,1,0,0,1,1,1,1,0,0,1,1,0,1,1,1,1,0],
  [0,1,1,1,1,0,1,1,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,1,0,0,0,0,1,1,0,1,1,1,1,0],
];
REFS[8]=[
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,0,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,0,1,0,0,0,1,1,0,0,1,0,0,1,1,0,0,0,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0],
  [0,1,1,1,1,1,1,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,0,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,0,1,1,0,0,0,1,1,0,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0],
];
REFS[12]=(()=>{const r=[];for(let d=0;d<10;d++){const s=REFS[6][d],o=[];for(let y=0;y<6;y++){const r1=[],r2=[];for(let x=0;x<6;x++){const v=s[y*6+x];r1.push(v,v);r2.push(v,v);}o.push(...r1,...r2);}r.push(o);}return r;})();

function setSz(n,el){
  bSz=n;
  uBmp=Array(n*n).fill(0);
  hGuess=new Array(10).fill('');
  isDraw=false;
  dVal=1;
  curRefDigit=null;
  document.querySelectorAll('.bsz').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  rBmp();
  initHGuessUI();
  document.getElementById('hbest').textContent='';
  document.getElementById('hoverlap').innerHTML='';
  document.getElementById('refpreview').innerHTML='';
  const ov=document.getElementById('ovpreview');
  if(ov) ov.innerHTML='';
  rRef();
}

function rBmp(){
  const g=document.getElementById('ubmp');const cs=bSz<=6?'2rem':bSz<=8?'1.6rem':'1.2rem';
  g.style.gridTemplateColumns=`repeat(${bSz},1fr)`;g.innerHTML='';
  for(let i=0;i<bSz*bSz;i++){const c=document.createElement('div');c.className='bc'+(uBmp[i]?' on':'');c.style.width=cs;c.style.height=cs;
    c.dataset.idx=i;
    c.addEventListener('mousedown',e=>{e.preventDefault();isDraw=true;dVal=uBmp[i]?0:1;uBmp[i]=dVal;rBmpVisual();});
    c.addEventListener('mouseenter',()=>{if(isDraw){uBmp[i]=dVal;rBmpVisual();}});
    g.appendChild(c);}
  bindTouch();
}

function rBmpVisual(){
  const cells=document.getElementById('ubmp').children;
  for(let i=0;i<cells.length;i++){cells[i].className='bc'+(uBmp[i]?' on':'');}
  renderOverlapPreview();
}

function bindTouch(){
  const g=document.getElementById('ubmp');
  g.ontouchstart=e=>{
    e.preventDefault();
    const t=e.touches[0];
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if(el&&el.dataset&&el.dataset.idx!==undefined){
      const idx=parseInt(el.dataset.idx);
      isDraw=true;dVal=uBmp[idx]?0:1;uBmp[idx]=dVal;rBmpVisual();
    }
  };
  g.ontouchmove=e=>{
    e.preventDefault();
    if(!isDraw)return;
    const t=e.touches[0];
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if(el&&el.dataset&&el.dataset.idx!==undefined){
      const idx=parseInt(el.dataset.idx);
      if(uBmp[idx]!==dVal){uBmp[idx]=dVal;rBmpVisual();}
    }
  };
  g.ontouchend=()=>{isDraw=false;};
}
document.addEventListener('mouseup',()=>{isDraw=false;});

function rRef(){
  const b=document.getElementById('rbtn');
  if(!b) return;
  b.innerHTML='';
  for(let d=0;d<10;d++){
    const e=document.createElement('button');
    e.className='btn'+(curRefDigit===d?' pri':'');
    e.textContent=d;
    e.style.padding='0.35rem 0.55rem';
    e.onclick=()=>showRefPreview(d);
    b.appendChild(e);
  }
}

function renderOverlapPreview(){
  const box=document.getElementById('ovpreview');
  if(!box) return;
  if(curRefDigit===null || !REFS[bSz] || !REFS[bSz][curRefDigit]){box.innerHTML='';return;}
  const ref=REFS[bSz][curRefDigit];
  const cs=bSz<=6?'1.2rem':bSz<=8?'1rem':'0.7rem';
  let html=`<p class="mat-label" style="margin-bottom:0.3rem;">겹친 부분 (내 그림 ∧ 참조)</p>`;
  html+=`<div class="bmp" style="grid-template-columns:repeat(${bSz},1fr);cursor:default;">`;
  for(let i=0;i<bSz*bSz;i++){
    const on=(uBmp[i]===1 && ref[i]===1);
    html+=`<div class="bc${on?' on':''}" style="width:${cs};height:${cs};pointer-events:none;"></div>`;
  }
  html+=`</div>`;
  box.innerHTML=html;
}

function showRefPreview(digit){
  curRefDigit=digit;
  const ref=REFS[bSz][digit];
  const cs=bSz<=6?'1.2rem':bSz<=8?'1rem':'0.7rem';
  const box=document.getElementById('refpreview');
  let html=`<p class="mat-label" style="margin-bottom:0.3rem;">참조: 숫자 ${digit}</p>`;
  html+=`<div class="bmp" style="grid-template-columns:repeat(${bSz},1fr);cursor:default;">`;
  for(let i=0;i<bSz*bSz;i++){
    html+=`<div class="bc${ref[i]?' on':''}" style="width:${cs};height:${cs};pointer-events:none;"></div>`;
  }
  html+=`</div>`;
  box.innerHTML=html;
  renderOverlapPreview();
  rRef();
}

function hbInit(){
  if(!uBmp || !uBmp.length) uBmp = Array(bSz*bSz).fill(0);
  try{rBmp();rRef();}catch(e){}
  try{initHGuessUI();}catch(e){}
  try{hdgInit();}catch(e){}
}
function hbRefresh(){
  try{rBmp();rRef();}catch(e){}
  try{initHGuessUI();}catch(e){}
  try{hdgInit();}catch(e){}
}



function initHGuessUI(){
  const box=document.getElementById('hbars');
  if(!box) return;
  box.innerHTML='';
  for(let d=0; d<10; d++){
    const row=document.createElement('div');
    row.className='hb';
    row.dataset.digit=d;
    row.innerHTML = `
      <span class="dl">${d}</span>
      <div class="tk"><div class="fl" style="width:0%"></div></div>
      <input class="hguess" type="number" inputmode="numeric" placeholder="내 답" aria-label="digit ${d} hamming guess">
      <span class="dv"></span>
    `;
    box.appendChild(row);
  }
  const hint=document.createElement('p');
  hint.style.fontSize='0.72rem';
  hint.style.color='var(--muted)';
  hint.style.marginTop='0.5rem';
  hint.textContent='각 숫자(0~9)와의 해밍 거리를 직접 계산해 입력한 뒤, “해밍 거리 계산”을 눌러 채점해보세요.';
  box.appendChild(hint);

  box.querySelectorAll('input.hguess').forEach(inp=>{
    const d=parseInt(inp.parentElement.dataset.digit);
    inp.value = (hGuess[d] ?? '');
    inp.addEventListener('input', ()=>{
      hGuess[d]=inp.value;
      const dl=inp.parentElement.querySelector('.dl');
      if(dl) dl.style.color='';
    });
  });
}
function clrBmp(){
  uBmp=Array(bSz*bSz).fill(0);
  rBmp();
  try{initHGuessUI();}catch(e){}
  document.getElementById('hbest').textContent='';
  document.getElementById('hoverlap').innerHTML='';
  document.getElementById('refpreview').innerHTML='';
  const ov=document.getElementById('ovpreview');
  if(ov) ov.innerHTML='';
  curRefDigit=null;
  rRef();
}

function calcH(){
  const refs=REFS[bSz];
  if(!refs) return;
  const tot=bSz*bSz;

  const ds=refs.map((ref,i)=>{
    let d=0;
    for(let j=0;j<tot;j++) d+=(uBmp[j]^ref[j]);
    return {digit:i,dist:d,sim:((tot-d)/tot*100).toFixed(1)};
  });
  const mx=Math.max(...ds.map(d=>d.dist),1);
  const mn=Math.min(...ds.map(d=>d.dist));

  const box=document.getElementById('hbars');
  if(!box) return;

  const guessMap={};
  box.querySelectorAll('.hb').forEach(row=>{
    const digit=parseInt(row.dataset.digit);
    const inp=row.querySelector('input.hguess');
    if(inp) guessMap[digit]=inp.value;
  });

  box.innerHTML='';
  ds.forEach(({digit,dist,sim})=>{
    const e=document.createElement('div');
    e.className='hb';
    e.dataset.digit=digit;

    const g=(guessMap[digit] ?? '').toString().trim();
    const gNum = g==='' ? null : Number(String(g).trim());
    const isOk = (gNum!==null && Number.isFinite(gNum) && gNum===dist);

    e.innerHTML = `
      <span class="dl" style="${gNum===null?'':(isOk?'color:var(--green);':'color:var(--red);')}">${digit}</span>
      <div class="tk"><div class="fl ${dist===mn?'best':''}" style="width:${(dist/mx*100)}%"></div></div>
      <input class="hguess" type="number" inputmode="numeric" placeholder="내 답" value="${g}">
      <span class="dv">${dist} (${sim}%)</span>
    `;
    box.appendChild(e);
  });

  box.querySelectorAll('input.hguess').forEach(inp=>{
    const d=parseInt(inp.parentElement.dataset.digit);
    inp.addEventListener('input', ()=>{
      hGuess[d]=inp.value;
      const dl=inp.parentElement.querySelector('.dl');
      if(dl) dl.style.color='';
    });
  });

  const best=ds.reduce((a,b)=>a.dist<b.dist?a:b);
  const bestEl=document.getElementById('hbest');
  if(bestEl) bestEl.textContent=`가장 유사: ${best.digit} (거리 ${best.dist}, 유사도 ${best.sim}%)`;

  const ovBox=document.getElementById('hoverlap');
  if(ovBox){
    const cs=bSz<=6?'1.05rem':bSz<=8?'0.92rem':'0.72rem';

    let html=`<p class="mat-label" style="margin-bottom:0.45rem;">내 그림 vs 모든 숫자 겹침 비교</p>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:0.8rem;align-items:flex-start;">`;

    ds.forEach(({digit,dist,sim})=>{
      const ref=refs[digit];
      const isBest = digit===best.digit;
      html+=`<div style="background:var(--bg);border:1px solid ${isBest?'var(--fg)':'var(--border)'};border-radius:var(--radius);padding:0.65rem;flex:1 1 230px;max-width:300px;">`;
      html+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">`;
      html+=`<span style="font-family:var(--mono);font-weight:800;color:${isBest?'var(--fg)':'var(--muted)'};">숫자 ${digit}${isBest?' · BEST':''}</span>`;
      html+=`<span style="font-family:var(--mono);font-size:0.72rem;color:var(--muted);">거리 ${dist} · ${sim}%</span>`;
      html+=`</div>`;
      html+=`<div class="ovlap" style="grid-template-columns:repeat(${bSz},1fr);">`;
      for(let i=0;i<tot;i++){
        const u=uBmp[i], r=ref[i];
        let cls;
        if(u===1&&r===1) cls='both';
        else if(u===0&&r===0) cls='match';
        else if(u===1&&r===0) cls='only-user';
        else cls='only-ref';
        html+=`<div class="oc ${cls}" style="width:${cs};height:${cs};"></div>`;
      }
      html+=`</div></div>`;
    });

    html+=`</div>`;
    html+=`<div style="display:flex;gap:0.8rem;margin-top:0.6rem;flex-wrap:wrap;">`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--fg);border-radius:2px;"></span>둘 다 1</span>`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--card);border:1px solid var(--border);border-radius:2px;"></span>둘 다 0</span>`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--red);opacity:0.7;border-radius:2px;"></span>내 그림에만</span>`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--blue);opacity:0.7;border-radius:2px;"></span>참조에만</span>`;
    html+=`</div>`;
    ovBox.innerHTML=html;
  }
}
function mkEG(id,data,rows,cols,onCh){
  const g=document.getElementById(id);g.innerHTML='';g.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const cell=document.createElement('div');cell.className='ec';
    const inp=document.createElement('input');inp.type='number';inp.value=data[r][c];
    inp.addEventListener('change',()=>{data[r][c]=parseInt(inp.value)||0;if(onCh)onCh();});
    inp.addEventListener('focus',()=>inp.select());
    cell.appendChild(inp);g.appendChild(cell);
  }
}

let mI=[[1,2,0,1],[0,1,3,2],[1,0,2,1],[2,1,0,3]],mK=[[1,0,-1],[0,1,0],[-1,0,1]],mO=[[0,0],[0,0]];

function newMan(){
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)mI[r][c]=Math.floor(Math.random()*5);
  const ks=[[[1,0,-1],[0,1,0],[-1,0,1]],[[0,-1,0],[-1,5,-1],[0,-1,0]],[[1,1,1],[0,0,0],[-1,-1,-1]]];
  const p=ks[Math.floor(Math.random()*ks.length)];for(let r=0;r<3;r++)for(let c=0;c<3;c++)mK[r][c]=p[r][c];
  mO=[[0,0],[0,0]];mkEG('mi',mI,4,4);mkEG('mk',mK,3,3);mkEG('mo',mO,2,2);
  document.getElementById('mres').style.display='none';document.getElementById('msol').style.display='none';
}

function chkMan(){
  const cor=[];
  for(let r=0;r<2;r++){cor.push([]);for(let c=0;c<2;c++){let s=0;for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++)s+=mI[r+kr][c+kc]*mK[kr][kc];cor[r].push(s);}}
  let ok=true;const det=[];
  for(let r=0;r<2;r++)for(let c=0;c<2;c++){
    const right=mO[r][c]===cor[r][c];if(!right)ok=false;
    let t=[];for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++)t.push(`${mI[r+kr][c+kc]}×(${mK[kr][kc]})`);
    det.push(`위치(${r},${c}): ${t.join(' + ')} = ${cor[r][c]}${right?'':' (입력값: '+mO[r][c]+')'}`);
  }
  const res=document.getElementById('mres');res.style.display='block';
  res.innerHTML=ok?'<strong>정답입니다.</strong>':'<strong>일부 틀렸습니다.</strong> 아래 풀이를 확인하세요.';
  res.style.borderLeftColor=ok?'var(--green)':'var(--red)';
  const sol=document.getElementById('msol');sol.style.display='block';
  sol.innerHTML=`<div class="card"><h3>풀이 과정</h3>${det.map(d=>'<p style="font-size:0.8rem;color:var(--muted);font-family:var(--mono);margin:0.25rem 0;">'+d+'</p>').join('')}</div>`;
}
newMan();

const AI=[[0,0,0,0,0],[0,1,1,1,0],[0,1,0,1,0],[0,1,1,1,0],[0,0,0,0,0]];
const AK=[[1,0,1],[0,1,0],[1,0,1]];
let ap=-1,ar=Array(9).fill('?');

function bldA(){
  ['ai','ak','ao'].forEach(id=>document.getElementById(id).innerHTML='');
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){const e=document.createElement('div');e.className='mc';e.id=`ai${r}${c}`;e.textContent=AI[r][c];document.getElementById('ai').appendChild(e);}
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){const e=document.createElement('div');e.className='mc';e.textContent=AK[r][c];document.getElementById('ak').appendChild(e);}
  for(let i=0;i<9;i++){const e=document.createElement('div');e.className='mc';e.id=`ao${i}`;e.textContent=ar[i];document.getElementById('ao').appendChild(e);}
}
bldA();



function aStep(){
  ap++;if(ap>=9){ap=8;return;}
  const row=Math.floor(ap/3),col=ap%3;
  for(let r=0;r<5;r++)for(let c=0;c<5;c++)document.getElementById(`ai${r}${c}`).className='mc';
  let sum=0,terms=[];
  for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++){
    const ir=row+kr,ic=col+kc;
    document.getElementById(`ai${ir}${ic}`).className='mc win';
  }
  for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++){
    const ir=row+kr,ic=col+kc;
    const kv=AK[kr][kc];
    if(kv!==0) document.getElementById(`ai${ir}${ic}`).className='mc win-active';
    const p=AI[ir][ic]*kv;sum+=p;terms.push(`(${AI[ir][ic]}×${kv})`);
  }
  ar[ap]=sum;
  for(let i=0;i<9;i++){const e=document.getElementById(`ao${i}`);e.textContent=ar[i];e.className=i===ap?'mc res':ar[i]!=='?'?'mc done':'mc';}
  document.getElementById('ast').textContent=`위치 (${row}, ${col}) → ${sum}`;
  document.getElementById('acalc').innerHTML=`<strong>계산:</strong> ${terms.join(' + ')} = <strong>${sum}</strong><br><span style="font-size:0.65rem;">진한 색 = 필터값이 0이 아닌 곳 (실제 곱셈 발생) · 연한 색 = 필터값 0 (곱해도 0)</span>`;
}

let aIv=null;
function aAuto(){if(aIv){clearInterval(aIv);aIv=null;}aReset();let s=0;aIv=setInterval(()=>{aStep();s++;if(s>=9){clearInterval(aIv);aIv=null;}},800);}
function aReset(){if(aIv){clearInterval(aIv);aIv=null;}ap=-1;ar=Array(9).fill('?');bldA();document.getElementById('ast').textContent='';document.getElementById('acalc').innerHTML='시작 버튼을 눌러 연산 과정을 확인하세요.';}

const FL={
  'Identity':{k:[[0,0,0],[0,1,0],[0,0,0]],d:'원본 그대로 출력합니다.'},
  'Box Blur':{k:[[1,1,1],[1,1,1],[1,1,1]],d:'주변 9픽셀 평균으로 흐리게 합니다.',n:9},
  'Sobel X':{k:[[-1,0,1],[-2,0,2],[-1,0,1]],d:'세로선(수직 경계)을 검출합니다.'},
  'Sobel Y':{k:[[-1,-2,-1],[0,0,0],[1,2,1]],d:'가로선(수평 경계)을 검출합니다.'},
  'Sharpen':{k:[[0,-1,0],[-1,5,-1],[0,-1,0]],d:'경계를 또렷하게 선명화합니다.'},
  'Edge':{k:[[-1,-1,-1],[-1,8,-1],[-1,-1,-1]],d:'윤곽선만 추출합니다.'},
};
let aF='Identity',cK=[[0,0,0],[0,1,0],[0,0,0]];
'Identity',cK=[[0,0,0],[0,1,0],[0,0,0]];

function bldFC(){
  const box=document.getElementById('fc');box.innerHTML='';
  Object.keys(FL).forEach(n=>{const ch=document.createElement('button');ch.className='chip'+(n===aF?' on':'');ch.textContent=n;
    ch.onclick=()=>{aF=n;document.querySelectorAll('#fc .chip').forEach(c=>c.classList.remove('on'));ch.classList.add('on');cK=FL[n].k.map(r=>[...r]);rFK();applyF();};
    box.appendChild(ch);});
}
function rFK(){
  mkEG('fk',cK,3,3);
  const f=FL[aF];
  const m=document.getElementById('fmult');
  if(m) m.textContent = (f && f.n) ? `1/${f.n} ×` : '';
  document.getElementById('fd').textContent=f?f.d:'커스텀 커널';
}
function applyCustom(){aF='Custom';document.querySelectorAll('#fc .chip').forEach(c=>c.classList.remove('on'));document.getElementById('fd').textContent='사용자 정의 커널 적용';applyF();}

function createDefImg(){
  const cv=document.getElementById('fin'),ctx=cv.getContext('2d'),W=240;
  ctx.fillStyle='#e8e0d6';ctx.fillRect(0,0,W,W);
  ctx.fillStyle='#3a342e';ctx.beginPath();ctx.arc(120,75,45,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#78726a';ctx.fillRect(35,155,70,55);
  ctx.fillStyle='#a89888';ctx.beginPath();ctx.moveTo(180,210);ctx.lineTo(145,155);ctx.lineTo(215,155);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#1a1714';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(25,25);ctx.lineTo(70,70);ctx.stroke();
  ctx.beginPath();ctx.moveTo(165,25);ctx.lineTo(215,25);ctx.stroke();ctx.beginPath();ctx.moveTo(190,15);ctx.lineTo(190,55);ctx.stroke();
  for(let i=0;i<10;i++){ctx.fillStyle='#1a1714';ctx.beginPath();ctx.arc(25+i*21,120,3,0,Math.PI*2);ctx.fill();}
  srcImg=ctx.getImageData(0,0,W,W);
}

function loadImg(file){
  const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{
    const cv=document.getElementById('fin'),ctx=cv.getContext('2d');ctx.clearRect(0,0,240,240);
    const sc=Math.min(240/img.width,240/img.height),w=img.width*sc,h=img.height*sc;
    ctx.fillStyle='#e8e0d6';ctx.fillRect(0,0,240,240);ctx.drawImage(img,(240-w)/2,(240-h)/2,w,h);
    srcImg=ctx.getImageData(0,0,240,240);applyF();
    document.getElementById('up-status').textContent='이미지가 적용되었습니다. (' +file.name+')';
    document.getElementById('upz').style.borderColor='var(--green)';
    setTimeout(()=>{document.getElementById('upz').style.borderColor='';},2000);
  };img.src=e.target.result;};reader.readAsDataURL(file);
}

const uz=document.getElementById('upz'),fi=document.getElementById('fup');
uz.onclick=()=>fi.click();fi.onchange=e=>{if(e.target.files[0])loadImg(e.target.files[0]);};
uz.ondragover=e=>{e.preventDefault();uz.classList.add('dg');};uz.ondragleave=()=>uz.classList.remove('dg');
uz.ondrop=e=>{e.preventDefault();uz.classList.remove('dg');if(e.dataTransfer.files[0])loadImg(e.dataTransfer.files[0]);};

function applyF(){
  if(!srcImg)return;const k=cK,f=FL[aF],norm=f&&f.n?f.n:1;
  const W=srcImg.width,H=srcImg.height,oc=document.getElementById('fout'),octx=oc.getContext('2d'),out=octx.createImageData(W,H);
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    let r=0,g=0,b=0;
    for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++){const idx=((y+ky)*W+(x+kx))*4,w=k[ky+1][kx+1];r+=srcImg.data[idx]*w;g+=srcImg.data[idx+1]*w;b+=srcImg.data[idx+2]*w;}
    const oi=(y*W+x)*4;out.data[oi]=Math.min(255,Math.max(0,r/norm));out.data[oi+1]=Math.min(255,Math.max(0,g/norm));out.data[oi+2]=Math.min(255,Math.max(0,b/norm));out.data[oi+3]=255;
  }
  octx.putImageData(out,0,0);
}

bldFC();rFK();

let pI=[[9,8,4,8],[7,9,4,8],[2,8,9,7],[6,5,9,5]],pP=-1,pR=['?','?','?','?'],pIv=null;

function bldP(){
  mkEG('pi',pI,4,4);
  const o=document.getElementById('po');o.innerHTML='';
  for(let i=0;i<4;i++){const e=document.createElement('div');e.className='mc';e.id=`po${i}`;e.textContent=pR[i];o.appendChild(e);}
}

function pRst(){if(pIv){clearInterval(pIv);pIv=null;}pP=-1;pR=['?','?','?','?'];bldP();document.getElementById('pst').textContent='';}

function pStp(){
  pP++;if(pP>=4){pP=3;return;}
  const sr=pP<2?0:2,sc=pP%2===0?0:2;
  document.querySelectorAll('#pi .ec').forEach(c=>{c.style.background='';c.style.outline='';const inp=c.querySelector('input');if(inp)inp.style.color='';});
  let mx=-Infinity;
  for(let r=sr;r<sr+2;r++)for(let c=sc;c<sc+2;c++){if(pI[r][c]>mx)mx=pI[r][c];}
  for(let r=sr;r<sr+2;r++)for(let c=sc;c<sc+2;c++){
    const idx=r*4+c,cells=document.getElementById('pi').children;
    const isMax=pI[r][c]===mx;
    cells[idx].style.background=isMax?'var(--green)':'var(--fg)';
    cells[idx].querySelector('input').style.color=isMax?'#fff':'var(--bg)';
    if(isMax)cells[idx].style.outline='2px solid var(--green)';
  }
  pR[pP]=mx;
  for(let i=0;i<4;i++){const e=document.getElementById(`po${i}`);e.textContent=pR[i];e.className=i===pP?'mc res':pR[i]!=='?'?'mc done':'mc';}
  document.getElementById('pst').textContent=`${sr}~${sr+1}행, ${sc}~${sc+1}열 → max = ${mx}`;
}

function pAut(){if(pIv){clearInterval(pIv);pIv=null;}pRst();let s=0;pIv=setInterval(()=>{pStp();s++;if(s>=4){clearInterval(pIv);pIv=null;}},1000);}

pRst();

const PC_N=3;
let pcInputs=[1,0.5,-0.3];
let pcWeights=[0.8,-0.5,0.6];
let pcBias=0;
let pcAct='step';
let pcTheta=0;

const PC_ACTS={
  'step':{name:'계단 함수',hasTheta:true},
  'relu':{name:'ReLU',hasTheta:true},
  'sigmoid':{name:'시그모이드',hasTheta:false},
};

function pcInit(){
  const box=document.getElementById('pc-inputs');
  box.innerHTML='';
  for(let i=0;i<PC_N;i++){
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:0.6rem;margin-bottom:0.8rem;';
    row.innerHTML=`
      <span class="mono" style="width:1.5rem;flex-shrink:0;">x${i+1}</span>
      <input type="range" class="ns" id="pc-x${i}" min="-2" max="2" step="0.05" value="${pcInputs[i]}" style="max-width:10rem;flex:1;">
      <span id="pc-xv${i}" style="font-family:var(--mono);font-size:0.78rem;min-width:2.5rem;text-align:right;">${pcInputs[i].toFixed(2)}</span>
      <span class="mono" style="color:var(--muted);flex-shrink:0;">w${i+1}</span>
      <input type="number" id="pc-w${i}" value="${pcWeights[i]}" step="0.1" style="width:4rem;font-family:var(--mono);font-size:0.78rem;padding:0.3rem 0.4rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--card);color:var(--fg);text-align:center;">
    `;
    box.appendChild(row);
    document.getElementById(`pc-x${i}`).addEventListener('input',function(){
      pcInputs[i]=parseFloat(this.value);
      document.getElementById(`pc-xv${i}`).textContent=pcInputs[i].toFixed(2);
      pcUpdate();
    });
    const __wEl=document.getElementById(`pc-w${i}`);
    if(__wEl) __wEl.addEventListener('input',function(){
      pcWeights[i]=parseFloat(this.value)||0;
      pcUpdate();
    });
  }

  const __pcBias=document.getElementById('pc-bias');
  if(__pcBias) __pcBias.addEventListener('input',function(){
    pcBias=parseFloat(this.value);
    document.getElementById('pc-bias-val').textContent=pcBias.toFixed(1);
    pcUpdate();
  });

  const actBox=document.getElementById('pc-act-chips');
  actBox.innerHTML='';
  Object.keys(PC_ACTS).forEach(key=>{
    const ch=document.createElement('button');
    ch.className='chip'+(key===pcAct?' on':'');
    ch.textContent=PC_ACTS[key].name;
    ch.onclick=()=>{
      pcAct=key;
      actBox.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
      ch.classList.add('on');
      document.getElementById('pc-threshold-wrap').style.display=PC_ACTS[key].hasTheta?'block':'none';
      pcUpdate();
    };
    actBox.appendChild(ch);
  });

  const __pcTheta=document.getElementById('pc-theta');
  if(__pcTheta) __pcTheta.addEventListener('input',function(){
    pcTheta=parseFloat(this.value);
    document.getElementById('pc-theta-val').textContent=pcTheta.toFixed(1);
    pcUpdate();
  });

  pcUpdate();
}

function pcActivate(x){
  switch(pcAct){
    case 'step': return x>=pcTheta?1:0;
    case 'relu': return x>=pcTheta?x-pcTheta:0;
    case 'sigmoid': return 1/(1+Math.exp(-(x)));
  }
}

function pcUpdate(){
  let wsum=pcBias;
  const terms=[];
  for(let i=0;i<PC_N;i++){
    wsum+=pcInputs[i]*pcWeights[i];
    terms.push(`(${pcInputs[i].toFixed(2)} × ${pcWeights[i].toFixed(1)})`);
  }
  const y=pcActivate(wsum);

  const calcEl=document.getElementById('pc-calc');
  calcEl.innerHTML=
    `가중합: ${terms.join(' + ')} + ${pcBias.toFixed(1)}<br>`+
    `<span style="color:var(--fg);font-weight:600;">x = ${wsum.toFixed(3)}</span><br>`+
    `f(x) = ${pcAct==='step'?'계단(θ='+pcTheta.toFixed(1)+')':pcAct==='relu'?'ReLU(θ='+pcTheta.toFixed(1)+')':'σ(x)'}`;

  document.getElementById('pc-output').textContent=y.toFixed(4);

  pcDrawGraph(wsum,y);
}

function pcDrawGraph(curX,curY){
  const cv=document.getElementById('pc-graph');
  const ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const pad=40;

  ctx.clearRect(0,0,W,H);

  const xMin=-6,xMax=6,yMin=-0.5,yMax=pcAct==='relu'?4:1.5;

  const toSX=x=>pad+(x-xMin)/(xMax-xMin)*(W-2*pad);
  const toSY=y=>H-pad-(y-yMin)/(yMax-yMin)*(H-2*pad);

  ctx.strokeStyle='#e8e0d6';
  ctx.lineWidth=1;
  for(let gx=Math.ceil(xMin);gx<=Math.floor(xMax);gx++){
    const sx=toSX(gx);
    ctx.beginPath();ctx.moveTo(sx,pad);ctx.lineTo(sx,H-pad);ctx.stroke();
  }
  for(let gy=Math.ceil(yMin*2)/2;gy<=yMax;gy+=0.5){
    const sy=toSY(gy);
    ctx.beginPath();ctx.moveTo(pad,sy);ctx.lineTo(W-pad,sy);ctx.stroke();
  }

  ctx.strokeStyle='#c8b9a6';
  ctx.lineWidth=1.5;
  const ax0=toSY(0);
  ctx.beginPath();ctx.moveTo(pad,ax0);ctx.lineTo(W-pad,ax0);ctx.stroke();
  const ay0=toSX(0);
  ctx.beginPath();ctx.moveTo(ay0,pad);ctx.lineTo(ay0,H-pad);ctx.stroke();

  ctx.fillStyle='#78726a';
  ctx.font='11px "JetBrains Mono"';
  ctx.textAlign='center';
  for(let gx=Math.ceil(xMin);gx<=Math.floor(xMax);gx++){
    if(gx===0)continue;
    ctx.fillText(gx,toSX(gx),ax0+14);
  }
  ctx.textAlign='right';
  for(let gy=0;gy<=yMax;gy+=0.5){
    if(gy===0)continue;
    const sy=toSY(gy);
    if(sy>pad&&sy<H-pad) ctx.fillText(gy.toFixed(1),ay0-6,sy+4);
  }

  if(pcAct!=='sigmoid'){
    const tx=toSX(pcTheta);
    ctx.strokeStyle='#4a6b8a';
    ctx.lineWidth=1;
    ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(tx,pad);ctx.lineTo(tx,H-pad);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#4a6b8a';
    ctx.textAlign='center';
    ctx.fillText('θ='+pcTheta.toFixed(1),tx,pad-6);
  }

  ctx.strokeStyle='#1a1714';
  ctx.lineWidth=2.5;
  ctx.beginPath();
  let first=true;
  for(let px=pad;px<=W-pad;px++){
    const x=xMin+(px-pad)/(W-2*pad)*(xMax-xMin);
    const y=pcActivate(x);
    const sy=toSY(y);
    if(sy<pad-10||sy>H-pad+10){if(!first){ctx.stroke();ctx.beginPath();first=true;}continue;}
    if(first){ctx.moveTo(px,sy);first=false;}
    else ctx.lineTo(px,sy);
  }
  ctx.stroke();

  const px=toSX(curX),py=toSY(curY);
  ctx.strokeStyle='#b44133';
  ctx.lineWidth=1;
  ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(px,ax0);ctx.lineTo(px,py);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ay0,py);ctx.lineTo(px,py);ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle='#b44133';
  ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);ctx.fill();

  ctx.fillStyle='#b44133';
  ctx.font='bold 11px "JetBrains Mono"';
  ctx.textAlign='left';
  ctx.fillText(`(${curX.toFixed(2)}, ${curY.toFixed(4)})`,px+10,py-8);

  ctx.fillStyle='#1a1714';
  ctx.font='bold 12px "Noto Sans KR"';
  ctx.textAlign='left';
  const fname=pcAct==='step'?'계단 함수':pcAct==='relu'?'ReLU':'시그모이드';
  ctx.fillText('f(x) = '+fname,pad+4,pad-8);
}

const __nsl=document.getElementById('nsl');
if(__nsl) __nsl.addEventListener('input',function(){
  const v=parseInt(this.value);
  document.getElementById('ni').textContent=v;
  document.getElementById('nf').textContent=(v/255).toFixed(3);
  document.getElementById('nsw').style.background=`rgb(${v},${v},${v})`;
});

let ecCur=1;
const EC_TOTAL=5;

function ecDrawEye(upTo){
  const cv=document.getElementById('eye-cv');if(!cv)return;
  const W=800,H=520,c=cv.getContext('2d');
  c.clearRect(0,0,W,H);c.fillStyle='#f5f2eb';c.fillRect(0,0,W,H);
  const AC='#b44133',PA='#6b665e',DM='#a8a29a';

  const EX=420,EY=175;
  c.save();c.translate(EX,EY);
  c.beginPath();c.ellipse(0,0,165,105,0,0,Math.PI*2);
  c.fillStyle='#eae5dc';c.fill();c.strokeStyle='#2a2520';c.lineWidth=2.5;c.stroke();
  c.beginPath();c.arc(22,0,55,0,Math.PI*2);c.fillStyle='#4a7a9a';c.fill();c.strokeStyle='#2a2520';c.lineWidth=1.5;c.stroke();
  c.beginPath();c.arc(22,0,22,0,Math.PI*2);c.fillStyle='#1a1714';c.fill();
  c.beginPath();c.arc(28,-7,6,0,Math.PI*2);c.fillStyle='rgba(255,255,255,0.35)';c.fill();
  c.restore();

  function label(x,y,title,sub,col,align){
    c.save();c.textAlign=align||'left';
    c.font='bold 15px sans-serif';c.fillStyle=col;c.fillText(title,x,y);
    if(sub){c.font='13px sans-serif';c.fillStyle=DM;c.fillText(sub,x,y+19);}
    c.restore();
  }
  function arrow(x1,y1,x2,y2,col){
    c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.5;
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
    const a=Math.atan2(y2-y1,x2-x1);
    c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-9*Math.cos(a-0.35),y2-9*Math.sin(a-0.35));
    c.lineTo(x2-9*Math.cos(a+0.35),y2-9*Math.sin(a+0.35));c.closePath();c.fill();c.restore();
  }

  if(upTo>=0){
    const col=upTo===0?AC:PA;
    c.save();c.strokeStyle=col;c.lineWidth=2;c.setLineDash([7,5]);
    for(let a=-25;a<=25;a+=12){c.beginPath();c.moveTo(700,EY-15+a);c.lineTo(EX+110,EY+a*0.2);c.stroke();}
    c.setLineDash([]);c.restore();
    c.save();c.font='30px sans-serif';c.textAlign='center';c.fillText('☀️',735,EY+5);c.restore();
    label(EX-30,EY+135,'① 수정체 (렌즈)','빛을 굴절시켜 망막에 초점',col,'center');
  }
  if(upTo>=1){
    const col=upTo===1?AC:PA;
    c.save();c.strokeStyle=col;c.lineWidth=7;c.lineCap='round';
    c.beginPath();c.arc(EX,EY,158,2.4,3.85);c.stroke();c.restore();
    label(EX-145,EY-140,'② 망막','약 1.3억 개의 광수용체 → 전기 신호로 변환',col);
  }
  if(upTo>=2){
    const col=upTo===2?AC:PA;
    arrow(EX-165,EY,120,EY,col);
    c.save();c.strokeStyle=col;c.lineWidth=3;c.lineCap='round';
    const vx=80,vy=EY-12;
    [[-14,0,14,0],[0,-14,0,14],[-10,-10,10,10],[10,-10,-10,10]].forEach(([a,b,d,e])=>{
      c.beginPath();c.moveTo(vx+a,vy+b);c.lineTo(vx+d,vy+e);c.stroke();
    });c.restore();
    label(25,EY-60,'③ 시각 피질 V1','방향 선택 뉴런 (수직/수평/대각선)',col);
  }
  if(upTo>=3){
    const col=upTo===3?AC:PA;
    arrow(80,EY+15,80,EY+75,col);
    c.save();c.strokeStyle=col;c.lineWidth=2;
    c.strokeRect(48,EY+88,20,15);
    c.beginPath();c.arc(88,EY+96,9,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(110,EY+103);c.lineTo(122,EY+85);c.lineTo(134,EY+103);c.closePath();c.stroke();
    c.restore();
    label(25,EY+125,'④ V2 → V4 피질','기초 특징을 조합하여 복잡한 형태 인식',col);
  }
  if(upTo>=4){
    const col=upTo===4?AC:PA;
    arrow(80,EY+150,80,EY+195,col);
    c.save();c.font='36px sans-serif';c.textAlign='center';c.fillText('🐱',80,EY+235);c.restore();
    label(25,EY+260,'⑤ 측두엽 (IT)','"이것은 고양이다!" — 최종 인식',col);
  }
}

function ecDrawCNN(upTo){
  const cv=document.getElementById('cnn-cv');if(!cv)return;
  const W=800,H=400,c=cv.getContext('2d');
  c.clearRect(0,0,W,H);c.fillStyle='#f5f2eb';c.fillRect(0,0,W,H);
  const AC='#4a6b8a',PA='#6b665e',DM='#a8a29a';
  const y0=50,bh=200;
  const cx=[70,220,370,500,660]; // center x of each block

  function arr(x1,y1,x2,y2,col){
    c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.5;
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
    const a=Math.atan2(y2-y1,x2-x1);
    c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-8*Math.cos(a-0.4),y2-8*Math.sin(a-0.4));
    c.lineTo(x2-8*Math.cos(a+0.4),y2-8*Math.sin(a+0.4));c.closePath();c.fill();c.restore();
  }
  function lbl(x,title,sub,col){
    c.save();c.textAlign='center';
    c.font='bold 15px sans-serif';c.fillStyle=col;c.fillText(title,x,y0+bh+28);
    c.font='12px monospace';c.fillStyle=DM;c.fillText(sub,x,y0+bh+46);
    c.restore();
  }

  if(upTo>=0){
    const col=upTo===0?AC:PA,x=cx[0];
    c.fillStyle=col;c.globalAlpha=0.1;c.fillRect(x-40,y0,80,bh);c.globalAlpha=1;
    c.strokeStyle=col;c.lineWidth=2;c.strokeRect(x-40,y0,80,bh);
    c.globalAlpha=0.2;c.strokeStyle=col;c.lineWidth=0.5;
    for(let i=1;i<7;i++){c.beginPath();c.moveTo(x-40,y0+i*bh/7);c.lineTo(x+40,y0+i*bh/7);c.stroke();}
    for(let i=1;i<5;i++){c.beginPath();c.moveTo(x-40+i*80/5,y0);c.lineTo(x-40+i*80/5,y0+bh);c.stroke();}
    c.globalAlpha=1;
    lbl(x,'입력','224×224×3',col);
  }
  if(upTo>=1){
    const col=upTo===1?AC:PA,x=cx[1];
    arr(cx[0]+44,y0+bh/2,x-48,y0+bh/2,col);
    for(let i=0;i<5;i++){
      const w=16,h=bh-i*20,sx=x-42+i*18;
      c.fillStyle=col;c.globalAlpha=0.18-i*0.025;c.fillRect(sx,y0+(bh-h)/2,w,h);c.globalAlpha=1;
      c.strokeStyle=col;c.lineWidth=1.2;c.strokeRect(sx,y0+(bh-h)/2,w,h);
    }
    lbl(x,'합성곱','Conv2D',col);
  }
  if(upTo>=2){
    const col=upTo===2?'#5a8a5a':PA,x=cx[2];
    arr(cx[1]+48,y0+bh/2,x-30,y0+bh/2,col);
    c.save();c.translate(x,y0+bh/2);
    c.strokeStyle=col;c.lineWidth=3.5;
    c.beginPath();c.moveTo(-20,18);c.lineTo(0,0);c.lineTo(20,-20);c.stroke();
    c.strokeStyle=DM;c.lineWidth=0.7;c.setLineDash([4,3]);
    c.beginPath();c.moveTo(-24,0);c.lineTo(24,0);c.stroke();c.setLineDash([]);
    c.restore();
    lbl(x,'활성화','ReLU',col);
  }
  if(upTo>=3){
    const col=upTo===3?'#8a6a4a':PA,x=cx[3];
    arr(cx[2]+28,y0+bh/2,x-36,y0+bh/2,col);
    for(let i=0;i<4;i++){
      const w=13,h=bh*0.6-i*14,sx=x-30+i*16;
      c.fillStyle=col;c.globalAlpha=0.16-i*0.03;c.fillRect(sx,y0+(bh-h)/2,w,h);c.globalAlpha=1;
      c.strokeStyle=col;c.lineWidth=1.2;c.strokeRect(sx,y0+(bh-h)/2,w,h);
    }
    lbl(x,'풀링','↓ 절반',col);
  }
  if(upTo>=4){
    const col=upTo===4?AC:PA,x=cx[4];
    arr(cx[3]+36,y0+bh/2,x-55,y0+bh/2,col);
    const sx=x-40,ny=6;
    for(let ix=0;ix<2;ix++)for(let iy=0;iy<ny;iy++){
      const nx=sx+ix*38+10,ny2=y0+22+iy*30;
      c.beginPath();c.arc(nx,ny2,7,0,Math.PI*2);
      c.fillStyle=col;c.globalAlpha=0.2+iy*0.1;c.fill();c.globalAlpha=1;
      c.strokeStyle=col;c.lineWidth=0.8;c.stroke();
      if(ix<1)for(let jy=0;jy<ny;jy++){
        c.strokeStyle=col;c.globalAlpha=0.1;c.lineWidth=0.4;
        c.beginPath();c.moveTo(nx+7,ny2);c.lineTo(sx+48+10,y0+22+jy*30);c.stroke();c.globalAlpha=1;
      }
    }
    arr(sx+66,y0+bh/2,sx+86,y0+bh/2,col);
    c.font='32px sans-serif';c.globalAlpha=1;c.textAlign='left';c.fillText('🐱',sx+90,y0+bh/2+10);
    lbl(x,'분류','Softmax',col);
  }
}

const EC_DESCS=[
  {eye:'<div class="cr"><strong>① 각막 · 수정체</strong> — 빛을 굴절시켜 망막에 상을 맺습니다. 카메라 렌즈와 같은 역할입니다.</div>',
   cnn:'<div class="cr"><strong>① 입력층</strong> — 이미지를 224×224 크기의 숫자 행렬(RGB)로 변환합니다. 총 150,528개의 숫자가 됩니다.</div>'},
  {eye:'<div class="cr"><strong>② 시각 피질 V1</strong> — 특정 방향의 선분에 반응하는 뉴런이 있습니다. 휴벨·비셀의 1981년 노벨상 수상 연구가 CNN의 영감이 되었습니다.</div>',
   cnn:'<div class="cr"><strong>② 합성곱층</strong> — 3×3 필터가 이미지 위를 이동하며 가장자리, 질감 등 저수준 특징을 추출합니다.</div>'},
  {eye:'<div class="cr"><strong>③ 뉴런 발화 임계값</strong> — 자극이 일정 수준 이상이어야 뉴런이 반응합니다. 약한 자극은 무시됩니다.</div>',
   cnn:'<div class="cr"><strong>③ ReLU</strong> — 음수를 0으로 만들어 "특징 있음/없음"으로 단순화합니다. 뉴런 발화를 수학적으로 구현한 것입니다.</div>'},
  {eye:'<div class="cr"><strong>④ V2→V4 피질</strong> — 기초 특징을 점점 조합하여 복잡한 형태(눈, 코, 바퀴)를 인식합니다.</div>',
   cnn:'<div class="cr"><strong>④ 풀링</strong> — 특징 맵을 축소하여 연산량을 줄이고, 이동 불변성을 확보합니다.</div>'},
  {eye:'<div class="cr"><strong>⑤ 측두엽 (IT)</strong> — "이것은 고양이다"라는 최종 인식을 수행합니다.</div>',
   cnn:'<div class="cr"><strong>⑤ FC + Softmax</strong> — 특징을 종합하여 "고양이 89%, 개 7%"처럼 확률을 출력합니다.</div>'}
];

function ecRender(){
  ecDrawEye(ecCur-1);ecDrawCNN(ecCur-1);
  document.getElementById('ec-label').textContent=ecCur+' / '+EC_TOTAL;
  const ed=document.getElementById('eye-desc'),cd=document.getElementById('cnn-desc');
  if(ecCur===0){ed.innerHTML='<p style="color:var(--muted);">다음 버튼을 눌러 시작하세요.</p>';cd.innerHTML='';}
  else{let eh='',ch='';for(let i=0;i<ecCur;i++){eh+=EC_DESCS[i].eye;ch+=EC_DESCS[i].cnn;}ed.innerHTML=eh;cd.innerHTML=ch;}
}
function ecNext(){ecCur=Math.min(EC_TOTAL,ecCur+1);ecRender();}
function ecPrev(){ecCur=Math.max(0,ecCur-1);ecRender();}

let ecActiveTab='eye';
function ecSwitchTab(tab){
  ecActiveTab=tab;
  const dual=document.getElementById('ec-dual');
  const pe=document.getElementById('ec-panel-eye');
  const pc=document.getElementById('ec-panel-cnn');
  if(dual){
    if(pe)pe.style.display='block';
    if(pc)pc.style.display='block';
    return;
  }
  if(!pe||!pc)return;
  pe.style.display=tab==='eye'?'block':'none';
  pc.style.display=tab==='cnn'?'block':'none';
  const b1=document.getElementById('ec-tab-eye');
  const b2=document.getElementById('ec-tab-cnn');
  if(b1){
    b1.style.fontWeight=tab==='eye'?'600':'400';
    b1.classList.toggle('pri', tab==='eye');
  }
  if(b2){
    b2.style.fontWeight=tab==='cnn'?'600':'400';
    b2.classList.toggle('pri', tab==='cnn');
  }
}

const ecPanState={eye:{scale:1,ox:0,oy:0,drag:false,lx:0,ly:0},cnn:{scale:1,ox:0,oy:0,drag:false,lx:0,ly:0}};
function ecApplyTransform(id){
  const s=ecPanState[id],cv=document.getElementById(id==='eye'?'eye-cv':'cnn-cv');
  cv.style.transform='translate('+s.ox+'px,'+s.oy+'px) scale('+s.scale+')';
}
function ecFitCanvas(id){
  const wrap=document.getElementById('ec-wrap-'+id);
  const cv=document.getElementById(id==='eye'?'eye-cv':'cnn-cv');
  if(!wrap||!cv) return;
  const ww=wrap.clientWidth,cw=cv.width;
  if(!ww||ww<=0||!cw) return;
  const s=ecPanState[id];
  s.scale=Math.min(1,ww/cw);s.ox=0;s.oy=0;
  ecApplyTransform(id);
}
function ecZoom(id,dir){
  const s=ecPanState[id];
  if(dir===0){ecFitCanvas(id);return;}
  const ns=Math.max(0.3,Math.min(3,s.scale+(dir>0?0.2:-0.2)));
  s.scale=ns;ecApplyTransform(id);
}
['eye','cnn'].forEach(id=>{
  const wrap=document.getElementById('ec-wrap-'+id);
  if(!wrap)return;
  wrap.addEventListener('wheel',e=>{
    e.preventDefault();
    const s=ecPanState[id];
    const delta=e.deltaY>0?-0.1:0.1;
    s.scale=Math.max(0.3,Math.min(3,s.scale+delta));
    ecApplyTransform(id);
  },{passive:false});
  wrap.addEventListener('mousedown',e=>{const s=ecPanState[id];s.drag=true;s.lx=e.clientX;s.ly=e.clientY;wrap.style.cursor='grabbing';});
  window.addEventListener('mousemove',e=>{const s=ecPanState[id];if(!s.drag)return;s.ox+=e.clientX-s.lx;s.oy+=e.clientY-s.ly;s.lx=e.clientX;s.ly=e.clientY;ecApplyTransform(id);});
  window.addEventListener('mouseup',()=>{ecPanState[id].drag=false;wrap.style.cursor='grab';});
  let lastTouch=null,lastDist=null;
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length===1){const s=ecPanState[id];s.drag=true;lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};}
    if(e.touches.length===2){lastDist=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);}
  });
  wrap.addEventListener('touchmove',e=>{
    e.preventDefault();
    const s=ecPanState[id];
    if(e.touches.length===1&&s.drag&&lastTouch){
      s.ox+=e.touches[0].clientX-lastTouch.x;s.oy+=e.touches[0].clientY-lastTouch.y;
      lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};ecApplyTransform(id);
    }
    if(e.touches.length===2&&lastDist){
      const d=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);
      s.scale=Math.max(0.3,Math.min(3,s.scale*(d/lastDist)));lastDist=d;ecApplyTransform(id);
    }
  },{passive:false});
  wrap.addEventListener('touchend',()=>{ecPanState[id].drag=false;lastTouch=null;lastDist=null;});
});

setTimeout(()=>{ecRender();ecFitCanvas('eye');ecFitCanvas('cnn');ecSwitchTab('eye');},150);
window.addEventListener('resize',()=>{ecFitCanvas('eye');ecFitCanvas('cnn');});

let cnnGraphModel=null,cnnLabels=null,cnnLoading=false,cnnStep=0;
const CNN_TOTAL_STEPS=6;
const MOBILENET_URL='https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json';
const LABELS_URL='https://storage.googleapis.com/download.tensorflow.org/data/ImageNetLabels.txt';

async function loadCNNModel(){
  if(cnnGraphModel)return cnnGraphModel;
  if(cnnLoading)return null;
  cnnLoading=true;
  const st=document.getElementById('cnn-status');
  try{
    if(!window.tf){
      st.textContent='TensorFlow.js 로딩 중...';
      await new Promise((res,rej)=>{const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
        s.onload=res;s.onerror=()=>rej(new Error('TF.js CDN fail'));document.head.appendChild(s);});
    }
    st.textContent='MobileNet V2 다운로드 중... (약 14MB)';
    cnnGraphModel=await tf.loadGraphModel(MOBILENET_URL);
    try{
      const resp=await fetch(LABELS_URL);
      const text=await resp.text();
      cnnLabels=text.trim().split('\n').map(s=>s.trim());
    }catch(e){console.warn('Labels load failed, using fallback');cnnLabels=null;}
    st.textContent='';
    cnnLoading=false;
    return cnnGraphModel;
  }catch(err){
    try{
      if(!window.mobilenet){
        st.textContent='대체 모델 로딩 중...';
        await new Promise((res,rej)=>{const s=document.createElement('script');
          s.src='https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';
          s.onload=res;s.onerror=()=>rej(new Error('CDN fail'));document.head.appendChild(s);});
      }
      st.textContent='MobileNet 모델 다운로드 중...';
      cnnGraphModel=await mobilenet.load();
      cnnGraphModel._isMobilenetPkg=true;
      st.textContent='';cnnLoading=false;return cnnGraphModel;
    }catch(e2){
      st.textContent='모델 로딩 실패: '+e2.message;
      console.error(err,e2);cnnLoading=false;return null;
    }
  }
}

async function classifyWithModel(canvas){
  const model=await loadCNNModel();
  if(!model)return null;
  if(model._isMobilenetPkg){return await model.classify(canvas,5);}
  const logits=tf.tidy(()=>{
    let img=tf.browser.fromPixels(canvas).toFloat();
    img=tf.image.resizeBilinear(img,[224,224]);
    img=img.div(127.5).sub(1);
    return model.predict(img.expandDims(0));
  });
  const probs=tf.softmax(logits);
  const data=await probs.data();
  logits.dispose();probs.dispose();
  const indexed=Array.from(data).map((p,i)=>({p,i}));
  indexed.sort((a,b)=>b.p-a.p);
  const top5=indexed.slice(0,5);
  return top5.map(t=>({
    className:cnnLabels&&cnnLabels[t.i]?cnnLabels[t.i]:('class_'+t.i),
    probability:t.p
  }));
}

const CNN_KERNELS=[
  {name:'세로 엣지',k:[[-1,0,1],[-2,0,2],[-1,0,1]]},
  {name:'가로 엣지',k:[[-1,-2,-1],[0,0,0],[1,2,1]]},
  {name:'대각선 ↘',k:[[0,1,2],[-1,0,1],[-2,-1,0]]},
  {name:'대각선 ↙',k:[[2,1,0],[1,0,-1],[0,-1,-2]]},
  {name:'선명화',k:[[0,-1,0],[-1,5,-1],[0,-1,0]]},
  {name:'가우시안',k:[[1,2,1],[2,4,2],[1,2,1]]},
  {name:'엠보스',k:[[-2,-1,0],[-1,1,1],[0,1,2]]},
  {name:'라플라시안',k:[[0,1,0],[1,-4,1],[0,1,0]]},
  {name:'세로선',k:[[1,0,-1],[1,0,-1],[1,0,-1]]},
  {name:'가로선',k:[[1,1,1],[0,0,0],[-1,-1,-1]]},
  {name:'경계강조',k:[[-1,-1,-1],[-1,8,-1],[-1,-1,-1]]},
  {name:'블러',k:[[1,1,1],[1,1,1],[1,1,1]]},
];
function jsConv(gray,w,h,kernel){const o=new Float32Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let s=0;for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++)s+=gray[(y+ky)*w+(x+kx)]*kernel[ky+1][kx+1];o[y*w+x]=s;}return o;}
function jsReLU(d){const o=new Float32Array(d.length);for(let i=0;i<d.length;i++)o[i]=Math.max(0,d[i]);return o;}
function jsPool(d,w,h){const ow=w>>1,oh=h>>1,o=new Float32Array(ow*oh);for(let y=0;y<oh;y++)for(let x=0;x<ow;x++)o[y*ow+x]=Math.max(d[(y*2)*w+x*2],d[(y*2)*w+x*2+1],d[(y*2+1)*w+x*2],d[(y*2+1)*w+x*2+1]);return{data:o,w:ow,h:oh};}

function drawJsMaps(maps,names,contId,sz){
  const cont=document.getElementById(contId);if(!cont)return;cont.innerHTML='';
  maps.forEach((m,i)=>{
    let mn=Infinity,mx=-Infinity;for(let v of m.data){if(v<mn)mn=v;if(v>mx)mx=v;}
    const rng=mx-mn||1;const cv=document.createElement('canvas');cv.width=m.w;cv.height=m.h;
    cv.style.cssText='width:'+sz+'px;height:'+sz+'px;border-radius:4px;border:1px solid var(--border);image-rendering:pixelated;';
    const ctx=cv.getContext('2d'),img=ctx.createImageData(m.w,m.h);
    for(let j=0;j<m.w*m.h;j++){const v=Math.round(((m.data[j]-mn)/rng)*255);img.data[j*4]=v;img.data[j*4+1]=v;img.data[j*4+2]=v;img.data[j*4+3]=255;}
    ctx.putImageData(img,0,0);
    const wrap=document.createElement('div');wrap.style.cssText='text-align:center;display:inline-block;margin:3px;';
    wrap.appendChild(cv);
    const lbl=document.createElement('div');lbl.style.cssText='font-family:var(--mono);font-size:0.58rem;color:var(--muted);margin-top:2px;max-width:'+sz+'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    lbl.textContent=names[i];wrap.appendChild(lbl);cont.appendChild(wrap);
  });
  const info=document.getElementById(contId.replace('maps','info'));
  if(info&&maps[0])info.textContent=maps.length+'개 필터 · 크기: '+maps[0].w+'×'+maps[0].h;
}

function cnnUpdateTimeline(step){
  document.querySelectorAll('.cnn-tl-btn').forEach(btn=>{
    const s=parseInt(btn.dataset.step);
    if(s===step){btn.style.background='var(--fg)';btn.style.color='var(--bg)';btn.style.borderColor='var(--fg)';btn.style.fontWeight='600';}
    else if(s<step){btn.style.background='var(--accent)';btn.style.color='var(--fg)';btn.style.borderColor='var(--accent)';btn.style.fontWeight='400';}
    else{btn.style.background='var(--card)';btn.style.color='var(--muted)';btn.style.borderColor='var(--border)';btn.style.fontWeight='400';}
  });
}
function cnnShowStep(n){cnnStep=Math.max(0,Math.min(CNN_TOTAL_STEPS-1,n));document.querySelectorAll('.cnn-step').forEach(el=>el.style.display='none');document.getElementById('cnn-step-'+cnnStep).style.display='block';cnnUpdateTimeline(cnnStep);}
function cnnNextStep(){cnnShowStep(cnnStep+1);}
function cnnPrevStep(){cnnShowStep(cnnStep-1);}

async function cnnAnalyze(imgEl){
  const st=document.getElementById('cnn-status');
  st.textContent='이미지 분석 중...';
  const inputCv=document.getElementById('cnn-input-cv');
  const ictx=inputCv.getContext('2d');
  ictx.imageSmoothingEnabled=true;
  try{ictx.imageSmoothingQuality='high';}catch(e){}
  ictx.clearRect(0,0,224,224);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#ffffff';
  ictx.fillStyle=bg;
  ictx.fillRect(0,0,224,224);
  const s=Math.min(224/imgEl.width,224/imgEl.height);
  const w=imgEl.width*s, h=imgEl.height*s;
  const dx=(224-w)/2, dy=(224-h)/2;
  ictx.drawImage(imgEl,dx,dy,w,h);

  const imgData=ictx.getImageData(0,0,224,224);
  const gray=new Float32Array(224*224);
  for(let i=0;i<224*224;i++)gray[i]=imgData.data[i*4]*0.299+imgData.data[i*4+1]*0.587+imgData.data[i*4+2]*0.114;

  const convMaps=CNN_KERNELS.map(k=>({data:jsConv(gray,224,224,k.k),w:224,h:224}));
  drawJsMaps(convMaps,CNN_KERNELS.map(k=>k.name),'cnn-conv1-maps',90);

  const reluMaps=convMaps.map(m=>({data:jsReLU(m.data),w:m.w,h:m.h}));
  drawJsMaps(reluMaps,CNN_KERNELS.map(k=>k.name+' (ReLU)'),'cnn-relu-maps',90);

  const poolMaps=reluMaps.map(m=>jsPool(m.data,m.w,m.h));
  drawJsMaps(poolMaps,CNN_KERNELS.map(k=>k.name),'cnn-pool-maps',80);

  const deepMaps=[],dN=[];
  for(let i=0;i<poolMaps.length;i++){const ki=(i+4)%CNN_KERNELS.length;const c2=jsConv(poolMaps[i].data,poolMaps[i].w,poolMaps[i].h,CNN_KERNELS[ki].k);const p2=jsPool(jsReLU(c2),poolMaps[i].w,poolMaps[i].h);deepMaps.push(p2);dN.push('Deep '+(i+1));}
  drawJsMaps(deepMaps,dN,'cnn-deep-maps',72);

  st.textContent='MobileNet V2로 분류 중...';
  try{
    const preds=await classifyWithModel(inputCv);
    const predBox=document.getElementById('cnn-predictions');
    if(preds&&preds.length>0){
      let html='<p style="margin-bottom:0.8rem;"><strong>상위 5개 예측 결과</strong></p>';
      preds.forEach((p,i)=>{
        const pct=p.probability*100;const isTop=i===0;const name=p.className.split(',')[0].trim();
        html+='<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.7rem;">';
        html+='<span style="font-family:var(--mono);font-size:0.85rem;min-width:3.8rem;text-align:right;font-weight:'+(isTop?'700':'400')+';color:'+(isTop?'var(--fg)':'var(--muted)')+';">'+pct.toFixed(1)+'%</span>';
        html+='<div style="flex:1;height:1.8rem;background:var(--bg);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);">';
        html+='<div style="width:'+Math.max(2,pct)+'%;height:100%;background:'+(isTop?'var(--fg)':'var(--accent)')+';border-radius:var(--radius);transition:width 0.6s;"></div></div>';
        html+='<span style="font-size:0.92rem;min-width:10rem;'+(isTop?'font-weight:600;color:var(--fg);':'color:var(--muted);')+'">'+name+'</span></div>';
      });
      predBox.innerHTML=html;
    }else{
      predBox.innerHTML='<p style="color:var(--muted);">모델 로딩 실패. 특징 맵(1~5단계)은 정상 표시됩니다.</p>';
    }
  }catch(err){
    console.error('Classify:',err);
    document.getElementById('cnn-predictions').innerHTML='<p style="color:var(--muted);">분류 오류: '+err.message+'</p>';
  }
  document.getElementById('cnn-controls').style.display='block';
  cnnShowStep(0);
  st.textContent='분석 완료! 타임라인을 클릭하거나 버튼으로 단계를 진행하세요.';
}

(()=>{
  const uz=document.getElementById('cnn-upz'),fi=document.getElementById('cnn-fup');
  if(!uz||!fi)return;
  uz.onclick=()=>fi.click();
  fi.onchange=e=>{if(e.target.files[0])cnnLoadImg(e.target.files[0]);};
  uz.ondragover=e=>{e.preventDefault();uz.classList.add('dg');};
  uz.ondragleave=()=>uz.classList.remove('dg');
  uz.ondrop=e=>{e.preventDefault();uz.classList.remove('dg');if(e.dataTransfer.files[0])cnnLoadImg(e.dataTransfer.files[0]);};
})();
function cnnLoadImg(file){const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>cnnAnalyze(img);img.src=e.target.result;};reader.readAsDataURL(file);}

let detModel=null,detLoading=false;

function loadDetScripts(){
  return new Promise((resolve,reject)=>{
    if(window.cocoSsd){resolve();return;}
    const loadSsd=()=>{
      const s2=document.createElement('script');
      s2.src='https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
      s2.onload=()=>resolve();
      s2.onerror=()=>reject(new Error('COCO-SSD 로드 실패'));
      document.head.appendChild(s2);
    };
    if(window.tf){loadSsd();return;}
    const s1=document.createElement('script');
    s1.src='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
    s1.onload=loadSsd;
    s1.onerror=()=>reject(new Error('TensorFlow.js 로드 실패'));
    document.head.appendChild(s1);
  });
}

async function initDetModel(){
  if(detModel)return detModel;
  if(detLoading)return null;
  detLoading=true;
  const st=document.getElementById('det-status');
  st.textContent='모델 로딩 중... (처음 실행 시 수 초 소요)';
  try{
    await loadDetScripts();
    detModel=await cocoSsd.load();
    st.textContent='모델 준비 완료.';
    detLoading=false;
    return detModel;
  }catch(err){
    st.textContent='모델 로딩 실패: '+err.message;
    detLoading=false;
    return null;
  }
}

const COCO_KR={'person':'사람','bicycle':'자전거','car':'자동차','motorcycle':'오토바이','airplane':'비행기','bus':'버스','train':'기차','truck':'트럭','boat':'보트','traffic light':'신호등','fire hydrant':'소화전','stop sign':'정지 표지판','parking meter':'주차 미터기','bench':'벤치','bird':'새','cat':'고양이','dog':'개','horse':'말','sheep':'양','cow':'소','elephant':'코끼리','bear':'곰','zebra':'얼룩말','giraffe':'기린','backpack':'배낭','umbrella':'우산','handbag':'핸드백','tie':'넥타이','suitcase':'여행가방','frisbee':'프리스비','skis':'스키','snowboard':'스노보드','sports ball':'공','kite':'연','baseball bat':'야구 배트','baseball glove':'야구 글러브','skateboard':'스케이트보드','surfboard':'서프보드','tennis racket':'테니스 라켓','bottle':'병','wine glass':'와인잔','cup':'컵','fork':'포크','knife':'칼','spoon':'숟가락','bowl':'그릇','banana':'바나나','apple':'사과','sandwich':'샌드위치','orange':'오렌지','broccoli':'브로콜리','carrot':'당근','hot dog':'핫도그','pizza':'피자','donut':'도넛','cake':'케이크','chair':'의자','couch':'소파','potted plant':'화분','bed':'침대','dining table':'식탁','toilet':'변기','tv':'TV','laptop':'노트북','mouse':'마우스','remote':'리모컨','keyboard':'키보드','cell phone':'휴대폰','microwave':'전자레인지','oven':'오븐','toaster':'토스터','sink':'싱크대','refrigerator':'냉장고','book':'책','clock':'시계','vase':'꽃병','scissors':'가위','teddy bear':'곰 인형','hair drier':'드라이어','toothbrush':'칫솔'};

async function detRun(imgEl){
  const model=await initDetModel();
  if(!model)return;
  const st=document.getElementById('det-status');
  st.textContent='탐지 중...';

  const predictions=await model.detect(imgEl);

  const cv=document.getElementById('det-canvas');
  const ctx=cv.getContext('2d');
  cv.width=imgEl.naturalWidth||imgEl.width;
  cv.height=imgEl.naturalHeight||imgEl.height;
  ctx.drawImage(imgEl,0,0,cv.width,cv.height);

  const colors=['#b44133','#4a6b8a','#5a7a5a','#8a6a4a','#6a4a8a','#4a8a7a','#8a4a6a','#7a8a4a'];

  predictions.forEach((p,i)=>{
    const [x,y,w,h]=p.bbox;
    const c=colors[i%colors.length];
    ctx.strokeStyle=c;
    ctx.lineWidth=Math.max(2,Math.round(cv.width/200));
    ctx.strokeRect(x,y,w,h);

    const label=`${COCO_KR[p.class]||p.class} ${(p.score*100).toFixed(1)}%`;
    ctx.font=`bold ${Math.max(12,Math.round(cv.width/40))}px "Noto Sans KR", sans-serif`;
    const tm=ctx.measureText(label);
    const lh=Math.max(16,Math.round(cv.width/30));
    ctx.fillStyle=c;
    ctx.fillRect(x,y-lh-4,tm.width+10,lh+4);
    ctx.fillStyle='#fff';
    ctx.fillText(label,x+5,y-6);
  });

  document.getElementById('det-result').style.display='block';

  const list=document.getElementById('det-list');
  if(predictions.length===0){
    list.innerHTML='<p style="font-size:0.84rem;color:var(--muted);">탐지된 객체가 없습니다.</p>';
    st.textContent='탐지 완료 — 인식된 객체 없음';
  }else{
    let html='<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">';
    predictions.forEach((p,i)=>{
      const c=colors[i%colors.length];
      const kr=COCO_KR[p.class]||p.class;
      html+=`<span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;border-radius:9999px;background:${c}18;color:${c};font-family:var(--mono);font-size:0.75rem;font-weight:600;border:1px solid ${c}30;">${kr} <span style="font-weight:400;opacity:0.7;">${(p.score*100).toFixed(1)}%</span></span>`;
    });
    html+='</div>';
    list.innerHTML=html;
    st.textContent=`탐지 완료 — ${predictions.length}개 객체 인식`;
  }
}

(()=>{
  const uz=document.getElementById('det-upz');
  const fi=document.getElementById('det-fup');
  if(!uz||!fi)return;
  uz.onclick=()=>fi.click();
  fi.onchange=e=>{if(e.target.files[0])detLoadImg(e.target.files[0]);};
  uz.ondragover=e=>{e.preventDefault();uz.classList.add('dg');};
  uz.ondragleave=()=>uz.classList.remove('dg');
  uz.ondrop=e=>{e.preventDefault();uz.classList.remove('dg');if(e.dataTransfer.files[0])detLoadImg(e.dataTransfer.files[0]);};
})();

function detLoadImg(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>detRun(img);
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

if('serviceWorker' in navigator)try{navigator.serviceWorker.register('sw.js');}catch(e){}

console.log('%c AI 수학 ','background:#1a1714;color:#f5f0ea;font-size:14px;font-weight:bold;padding:4px 8px;border-radius:4px;');
console.log('%c제작: gmb9817','font-size:12px;color:#1a1714;');
console.log('%c도움을 준 사람들: nflight11, frozenca, wizardrabbit, cubic','font-size:11px;color:#78726a;');


let hdg_cur=1;
const hdg_tot=9;
let hdg_first=new Array(hdg_tot+1).fill(null);
let hdg_solved=new Array(hdg_tot+1).fill(false);

const hdg_exp={
  1:"행렬 A와 B의 같은 위치 숫자가 서로 다른 곳은 1행 2열과 3행 2열(총 2곳)입니다. 이렇게 다른 부분을 1로 추출하는 것이 XOR 연산의 기초입니다.",
  2:"배타적 논리합(XOR)은 입력된 두 값이 '서로 다를 때만' 1을 반환합니다. 같을 때는 0을 반환하여 공통 데이터를 지웁니다.",
  3:"XOR는 다를 때만 남기므로, 두 집합이 공통으로 가지는 교집합 부분을 비워두고 양쪽 날개 영역만 색칠해야 합니다.",
  4:"대칭차집합은 합집합에서 교집합을 빼는 식(①)이나 차집합의 합(②)으로 표현됩니다. ③번 식은 합집합 전체가 되어버리는 오답입니다.",
  5:"각 자리별로 비교하면 (1⊕1=0), (0⊕1=1), (1⊕0=1), (1⊕1=0), (0⊕0=0)이 되어 결과는 01100이 됩니다.",
  6:"탐구 5의 결과 '01100'에는 숫자 1이 2개 포함되어 있으므로 두 데이터 사이의 해밍 거리는 2입니다.",
  7:"P ⊕ X = Q 의 양변에 P를 ⊕ 연산하면 X = P ⊕ Q 가 됩니다. 따라서 원본 P와 손상된 Q를 비교하여 숫자가 바뀐 위치(1행 2열, 2행 3열)가 마스크 행렬이 됩니다.",
  8:"4x4 행렬 비교 시, 입력 T와 S1은 4개의 픽셀이 다르고(거리 4), T와 S2는 1개의 픽셀만 다릅니다(거리 1). 따라서 거리가 더 짧은 S2로 분류됩니다.",
  9:"이진화는 임계값(Threshold)을 기준으로 데이터를 0과 1로 단순화합니다. 128 이상인 숫자(150, 200, 255) 위치만 클릭하여 1로 바꾸면 됩니다."
};
function hdg_el(id){return document.getElementById(id);}
function hdg_hasRoot(){return !!hdg_el('hdg-root');}
function hdg_mark(s,isC){if(isC){hdg_first[s]=true;hdg_solved[s]=true;}else{if(hdg_first[s]!==true)hdg_first[s]=false;}}

function hdg_setFb(s,isC,msg){
  const fb=hdg_el('hdg-fb'+s);
  if(!fb)return;
  if(isC){
    fb.className='hdg-fb succ';
    fb.innerHTML=`<b>✅ 정답!</b><br>${msg}<br><br><span style="font-size:0.9em;color:var(--muted);">[풀이] ${hdg_exp[s]||''}</span>`;
  }else{
    fb.className='hdg-fb err';
    fb.innerHTML=`<b>❌ 오답!</b><br>${msg}<br><br><span style="font-size:0.9em;color:var(--muted);">[힌트를 확인하고 다시 수정해 보세요]</span>`;
  }
  const nBtn=hdg_el('hdg-nBtn');
  if(nBtn)nBtn.style.display=(hdg_solved[s]===true)?'block':'none';
}

function hdg_showStage(n){
  for(let i=1;i<=hdg_tot;i++){
    const st=hdg_el('hdg-st'+i);
    if(st)st.classList.toggle('on', i===n);
  }
  const prog=hdg_el('hdg-progTxt');
  if(prog)prog.textContent=String(n);
  const pBtn=hdg_el('hdg-pBtn');
  const nBtn=hdg_el('hdg-nBtn');
  if(pBtn)pBtn.style.display=(n>1)?'block':'none';
  if(nBtn)nBtn.style.display=(hdg_solved[n]===true)?'block':'none';
  const res=hdg_el('hdg-stRes');
  if(res)res.classList.remove('on');
}

function hdg_showRes(){
  const prog=hdg_el('hdg-progBox');
  if(prog)prog.style.display='none';
  for(let i=1;i<=hdg_tot;i++){const st=hdg_el('hdg-st'+i);if(st)st.classList.remove('on');}
  const res=hdg_el('hdg-stRes');
  if(res)res.classList.add('on');

  const pBtn=hdg_el('hdg-pBtn');
  const nBtn=hdg_el('hdg-nBtn');
  if(pBtn)pBtn.style.display='block';
  if(nBtn)nBtn.style.display='none';

  let score=0;let wHtml='';
  for(let i=1;i<=hdg_tot;i++){
    if(hdg_first[i]===true) score++;
    else wHtml+=`<div class="hdg-wrong"><div style="font-weight:800;color:var(--red);margin-bottom:0.25rem;">탐구 ${i}번 오답 해설</div><div>${hdg_exp[i]||''}</div></div>`;
  }
  const fin=hdg_el('hdg-finScore');
  if(fin)fin.textContent=String(score);
  if(score===hdg_tot) wHtml='<p style="text-align:center;font-weight:800;color:var(--green);">🎉 모든 탐구를 한 번에 완벽하게 통과했습니다!</p>';
  const wList=hdg_el('hdg-wList');
  if(wList)wList.innerHTML=wHtml;
}

function hdg_move(dir){
  if(!hdg_hasRoot())return;
  const next=hdg_cur+dir;
  if(next>=1 && next<=hdg_tot){hdg_cur=next;hdg_showStage(hdg_cur);}
  else{hdg_showRes();}
  hdg_el('hdg-root')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function hdg_renderGrid(id,data,isInteractive,targetArray){
  const container=hdg_el(id);
  if(!container)return;
  container.innerHTML='';
  for(let i=0;i<data.length;i++){
    const cell=document.createElement('div');
    cell.className='hdg-cell';
    if(!isInteractive){
      cell.textContent=data[i];
      if(data[i]===1)cell.classList.add('on');
    }else{
      cell.textContent=targetArray[i];
      if(targetArray[i]===1)cell.classList.add('on');
      cell.onclick=()=>{
        targetArray[i]=1-targetArray[i];
        cell.textContent=targetArray[i];
        cell.classList.toggle('on', targetArray[i]===1);
      };
    }
    container.appendChild(cell);
  }
}

const hdg_s1_o=[1,0,1,0,0,0,1,1,1];
const hdg_s1_c=[1,1,1,0,0,0,1,0,1];
let hdg_s1_a=[0,0,0,0,0,0,0,0,0];

function hdg_initStage1(){
  hdg_renderGrid('hdg-g1_org', hdg_s1_o, false);
  hdg_renderGrid('hdg-g1_cor', hdg_s1_c, false);
  hdg_renderGrid('hdg-g1_ans', hdg_s1_a, true, hdg_s1_a);
}

function hdg_chk1(){
  let isC=true;
  for(let i=0;i<9;i++){ if(hdg_s1_a[i] !== (hdg_s1_o[i]^hdg_s1_c[i])){isC=false;break;} }
  hdg_mark(1,isC);
  if(isC) hdg_setFb(1,true,'두 행렬에서 차이가 발생하는 위치를 정확히 도출했습니다.');
  else hdg_setFb(1,false,'숫자가 다른 2곳의 위치를 클릭하여 1로 만드세요.');
}

function hdg_chk2(idx,isC,btn){
  const st=hdg_el('hdg-st2');
  st?.querySelectorAll('.hdg-opt').forEach(b=>b.style.borderColor='var(--border)');
  if(btn) btn.style.borderColor='var(--accent)';
  hdg_mark(2,isC);
  if(isC) hdg_setFb(2,true,'XOR의 정의를 정확히 이해했습니다.');
  else hdg_setFb(2,false,'같을 때는 0이 되어야 합니다.');
}

let hdg_states={a:false,b:false,i:false};

function hdg_drawVenn(){
  const cv=hdg_el('hdg-vCanvas');
  if(!cv)return;
  const cx=cv.getContext('2d');
  const cA={x:130,y:100,r:70}, cB={x:220,y:100,r:70};
  cx.clearRect(0,0,cv.width,cv.height);
  const id=cx.createImageData(cv.width,cv.height);

  for(let y=0;y<cv.height;y++){for(let x=0;x<cv.width;x++){const dA=Math.hypot(x-cA.x,y-cA.y)<=cA.r;const dB=Math.hypot(x-cB.x,y-cB.y)<=cB.r;const f=(dA&&!dB&&hdg_states.a)||(!dA&&dB&&hdg_states.b)||(dA&&dB&&hdg_states.i);const i=(y*cv.width+x)*4;if(f){id.data[i]=180;id.data[i+1]=65;id.data[i+2]=51;id.data[i+3]=160;}else{id.data[i]=245;id.data[i+1]=240;id.data[i+2]=234;id.data[i+3]=255;}}}
  cx.putImageData(id,0,0);

  cx.lineWidth=2;
  cx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()||'#4a6b8a';
  cx.beginPath(); cx.arc(cA.x,cA.y,cA.r,0,Math.PI*2); cx.stroke();
  cx.beginPath(); cx.arc(cB.x,cB.y,cB.r,0,Math.PI*2); cx.stroke();

  cx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#1a1714';
  cx.font='700 18px system-ui, sans-serif';
  cx.fillText('A', 55,105); cx.fillText('B', 280,105);
}

function hdg_initStage3(){
  const cv=hdg_el('hdg-vCanvas');
  if(!cv)return;
  hdg_states={a:false,b:false,i:false};
  hdg_drawVenn();
  cv.onclick=(e)=>{
    const r=cv.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    const cA={x:130,y:100,r:70}, cB={x:220,y:100,r:70};
    const dA=Math.hypot(x-cA.x,y-cA.y)<=cA.r;
    const dB=Math.hypot(x-cB.x,y-cB.y)<=cB.r;

    if(dA&&!dB) hdg_states.a=!hdg_states.a;
    else if(!dA&&dB) hdg_states.b=!hdg_states.b;
    else if(dA&&dB) hdg_states.i=!hdg_states.i;
    hdg_drawVenn();
  };
}

function hdg_chk3(){
  const isC=(hdg_states.a && hdg_states.b && !hdg_states.i);
  hdg_mark(3,isC);
  if(isC) hdg_setFb(3,true,'대칭차집합 영역을 완벽히 색칠했습니다.');
  else{
    let msg='양쪽 날개 영역을 모두 색칠하세요.';
    if(hdg_states.i) msg='가운데 교집합은 서로 같으므로 비워야 합니다.';
    hdg_setFb(3,false,msg);
  }
}

function hdg_chk4(idx,isC,btn){
  const st=hdg_el('hdg-st4');
  st?.querySelectorAll('.hdg-opt').forEach(b=>b.style.borderColor='var(--border)');
  if(btn) btn.style.borderColor='var(--accent)';
  hdg_mark(4,isC);
  if(isC) hdg_setFb(4,true,'올바르지 않은 식을 잘 찾았습니다.');
  else hdg_setFb(4,false,'고르신 식은 대칭차집합의 올바른 수식입니다.');
}

function hdg_chk5(){
  const v=hdg_el('hdg-i5')?.value?.trim()||'';
  const isC=(v==='01100');
  hdg_mark(5,isC);
  if(isC) hdg_setFb(5,true,'정확한 벡터 연산입니다.');
  else hdg_setFb(5,false,'각 자리별로 (1⊕1=0, 0⊕1=1) 계산해 보세요.');
}

function hdg_chk6(){
  const v=hdg_el('hdg-i6')?.value;
  const isC=(String(v)==='2');
  hdg_mark(6,isC);
  if(isC) hdg_setFb(6,true,'해밍 거리를 바르게 구했습니다.');
  else hdg_setFb(6,false,'결과값 01100에 포함된 1의 개수를 세어보세요.');
}

const hdg_s7_o=[1,1,0,0,0,0,1,0,1];
const hdg_s7_c=[1,0,0,0,1,0,1,0,1];
let hdg_s7_a=[0,0,0,0,0,0,0,0,0];

function hdg_initStage7(){
  hdg_renderGrid('hdg-g7_org', hdg_s7_o, false);
  hdg_renderGrid('hdg-g7_cor', hdg_s7_c, false);
  hdg_renderGrid('hdg-g7_ans', hdg_s7_a, true, hdg_s7_a);
}

function hdg_chk7(){
  let isC=true;
  for(let i=0;i<9;i++){ if(hdg_s7_a[i] !== (hdg_s7_o[i]^hdg_s7_c[i])){isC=false;break;} }
  hdg_mark(7,isC);
  if(isC) hdg_setFb(7,true,'마스크 행렬 복원에 성공했습니다!');
  else hdg_setFb(7,false,'행렬 P와 Q의 숫자가 변한 곳을 클릭하세요.');
}

const hdg_t_d=[1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1];
const hdg_s1_d=[1,0,0,0,1,0,0,0,0,0,1,1,0,0,1,1];
const hdg_s2_d=[1,1,0,0,1,1,0,0,0,0,1,1,0,1,1,1];

function hdg_initStage8(){
  hdg_renderGrid('hdg-g8_t', hdg_t_d, false);
  hdg_renderGrid('hdg-g8_s1', hdg_s1_d, false);
  hdg_renderGrid('hdg-g8_s2', hdg_s2_d, false);
}

function hdg_chk8(idx,isC,btn){
  const st=hdg_el('hdg-st8');
  st?.querySelectorAll('.hdg-opt').forEach(b=>b.style.borderColor='var(--border)');
  if(btn) btn.style.borderColor='var(--accent)';
  hdg_mark(8,isC);
  if(isC) hdg_setFb(8,true,'가장 해밍 거리가 짧은 표본을 찾았습니다.');
  else hdg_setFb(8,false,'T와 다른 픽셀이 가장 적은 것을 고르세요.');
}

const hdg_s9_o=[45,150,200,80,128,90,255,30,100];
let hdg_s9_a=[0,0,0,0,0,0,0,0,0];

function hdg_initStage9(){
  const g9=hdg_el('hdg-g9_org');
  if(g9){
    g9.innerHTML='';
    for(let i=0;i<9;i++){
      const c=document.createElement('div');
      c.className='hdg-cell';
      c.textContent=hdg_s9_o[i];
      c.style.fontSize='0.75rem';
      c.style.background=`rgb(${hdg_s9_o[i]},${hdg_s9_o[i]},${hdg_s9_o[i]})`;
      c.style.color=(hdg_s9_o[i]<128)?'#ffffff':'#000000';
      g9.appendChild(c);
    }
  }
  hdg_renderGrid('hdg-g9_ans', hdg_s9_a, true, hdg_s9_a);
}

function hdg_chk9(){
  let isC=true;
  for(let i=0;i<9;i++){const target=hdg_s9_o[i]>=128?1:0;if(hdg_s9_a[i]!==target){isC=false;break;}}
  hdg_mark(9,isC);
  if(isC) hdg_setFb(9,true,'임계값(128)을 기준으로 완벽하게 이진화했습니다.');
  else hdg_setFb(9,false,'128 이상인 숫자만 클릭하여 1로 만들어야 합니다.');
}

let hdg_inited=false;
function hdgInit(){
  if(hdg_inited) return;
  if(!hdg_hasRoot()) return;
  hdg_inited=true;
  hdg_initStage1();
  hdg_initStage3();
  hdg_initStage7();
  hdg_initStage8();
  hdg_initStage9();
  hdg_showStage(hdg_cur);
}


/* ═══════════════════════════════════════════════════════════════
   공통 컴포넌트 (접두사 cmn) — 1단원 5개 차시가 데이터만 넘겨 재사용합니다.
     videoDeck(containerId, slug, VIDEOS)   추천 영상 카드 3×2 그리드 + 교사 추가 + 전체 화면 재생
     warmStepper(containerId, prefix, QS)   마중 퀴즈 — "질문 N." 순차 공개
     quizStepper(containerId, prefix, QS)   형성평가 — 한 문항씩 + 총점 + 복기 + 다시 풀기
     chipDefs(selector, DEFS)               핵심 개념 칩 확대 + 클릭 상세 설명
   문항 데이터 형식: { q:'문항', opts:['보기1','보기2',…], answer:정답인덱스, explain:'해설(HTML 허용)' }
   영상 데이터 형식: { id:'유튜브ID', t:'제목', s:'출처' }
   ═══════════════════════════════════════════════════════════════ */

function cmnEsc(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function cmnGet(k,d){try{const v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}}
function cmnSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function cmnYtId(u){
  const s=String(u||'').trim();
  if(/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m=s.match(/(?:v=|vi=|youtu\.be\/|embed\/|shorts\/|\/v\/)([A-Za-z0-9_-]{11})/);
  return m?m[1]:'';
}

/* ── 전체 화면 재생 오버레이 (✕ · ESC 로 닫기, requestFullscreen 실패 시 화면을 꽉 채우는 fixed 오버레이) ── */
function cmnPlay(id,title){
  if(!id) return;
  const ov=document.createElement('div');
  ov.className='cmn-ov';
  ov.innerHTML='<button class="cmn-ov-x" type="button" aria-label="닫기">✕</button>'+
    '<iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0" '+
    'title="'+cmnEsc(title||'추천 영상')+'" allow="autoplay; encrypted-media; fullscreen" '+
    'allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  const onKey=e=>{ if(e.key==='Escape'||e.key==='Esc') close(); };
  function close(){
    document.removeEventListener('keydown',onKey);
    try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){}
    if(ov.parentNode) ov.parentNode.removeChild(ov);
  }
  ov.querySelector('.cmn-ov-x').addEventListener('click',close);
  document.addEventListener('keydown',onKey);
  document.body.appendChild(ov);
  try{
    const r=ov.requestFullscreen&&ov.requestFullscreen();
    if(r&&r.catch) r.catch(()=>{});
  }catch(e){}
}

/* ── 일반 링크(유튜브가 아닌 자료)의 페이지 내 임베드 시도 → 차단되면 새 탭 폴백 ── */
function cmnPlayUrl(url,title){
  if(!/^https?:\/\//i.test(String(url||''))) return;
  const ov=document.createElement('div');
  ov.className='cmn-ov';
  ov.innerHTML='<button class="cmn-ov-x" type="button" aria-label="닫기">✕</button>'+
    '<a class="cmn-ov-new" href="'+cmnEsc(url)+'" target="_blank" rel="noopener">새 탭에서 열기 ↗</a>'+
    '<p class="cmn-ov-msg">자료를 불러오는 중입니다…</p>'+
    '<iframe src="'+cmnEsc(url)+'" title="'+cmnEsc(title||'참고 자료')+'" '+
    'referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>';
  const onKey=e=>{ if(e.key==='Escape'||e.key==='Esc') close(); };
  function close(){
    document.removeEventListener('keydown',onKey);
    clearTimeout(timer);
    if(ov.parentNode) ov.parentNode.removeChild(ov);
  }
  ov.querySelector('.cmn-ov-x').addEventListener('click',close);
  document.addEventListener('keydown',onKey);
  const fr=ov.querySelector('iframe');
  const msg=ov.querySelector('.cmn-ov-msg');
  let loaded=false;
  fr.addEventListener('load',()=>{ loaded=true; if(msg) msg.style.display='none'; });
  // 임베드가 차단되는 사이트(X-Frame-Options 등)는 화면이 비므로 새 탭으로 폴백합니다.
  const timer=setTimeout(()=>{
    if(loaded) return;
    if(msg) msg.textContent='이 사이트는 페이지 안에서 열 수 없어 새 탭에서 열립니다.';
    try{ window.open(url,'_blank','noopener'); }catch(e){}
    setTimeout(close,1400);
  },3000);
  document.body.appendChild(ov);
}

/* ── 추천 영상 카드 그리드 (교사 추가 슬롯은 언제나 정확히 1칸) ── */
function videoDeck(cid, slug, VIDEOS){
  const box=document.getElementById(cid);
  if(!box) return;
  const KEY='aimath.'+slug+'.lastvid';
  const CK ='aimath.'+slug+'.customvids';
  const base=(Array.isArray(VIDEOS)?VIDEOS:[]).slice(0,5);

  function loadCustom(){
    try{const a=JSON.parse(cmnGet(CK,'[]'));return Array.isArray(a)?a:[];}catch(e){return [];}
  }
  function saveCustom(a){cmnSet(CK,JSON.stringify(a));}

  function cardHTML(v,last){
    const thumb = v.id
      ? '<img src="https://img.youtube.com/vi/'+cmnEsc(v.id)+'/hqdefault.jpg" alt="" loading="lazy" '+
        'onerror="this.style.display=\'none\';this.parentElement.insertAdjacentText(\'beforeend\',\'🎬\');">'+
        '<span class="cmn-vd-play">▶</span>'
      : '<span class="cmn-vd-emo" aria-hidden="true">🔗</span><span class="cmn-vd-badge">웹 자료</span>';
    return '<div class="cmn-vd-thumb">'+thumb+'</div>'+
      '<div class="cmn-vd-meta"><b>'+cmnEsc(v.t||(v.id?'추천 영상':'참고 링크'))+'</b>'+
        '<span>'+cmnEsc(v.s||'')+(last?' · 마지막으로 본 자료':'')+'</span></div>';
  }

  function render(){
    const custom=loadCustom();
    const all=base.concat(custom);
    const lastId=cmnGet(KEY,'');
    box.innerHTML='<div class="cmn-vd-grid"></div>'+
      '<div class="cmn-vd-form"><input class="cmn-in cmn-vd-u" type="url" placeholder="유튜브 주소를 붙여넣으세요">'+
      '<input class="cmn-in cmn-vd-t" type="text" placeholder="영상 제목(선택)">'+
      '<button class="btn cmn-go cmn-vd-ok" type="button">등록</button>'+
      '<button class="btn cmn-go cmn-vd-no" type="button">취소</button></div>'+
      '<p class="cmn-note"></p>';
    const g=box.querySelector('.cmn-vd-grid');
    const form=box.querySelector('.cmn-vd-form');
    const note=box.querySelector('.cmn-note');

    all.forEach((v,i)=>{
      const isCustom=(i>=base.length);
      const b=document.createElement('button');
      b.type='button';
      b.className='cmn-vd-card'+(v.id===lastId?' last':'');
      b.innerHTML=cardHTML(v,v.id===lastId);
      b.addEventListener('click',()=>{ cmnSet(KEY,v.id); cmnPlay(v.id,v.t); render(); });
      if(isCustom){
        const x=document.createElement('button');
        x.type='button'; x.className='cmn-vd-del'; x.textContent='✕';
        x.title='선생님이 추가한 영상 삭제';
        x.addEventListener('click',ev=>{
          ev.stopPropagation();
          const c=loadCustom(); c.splice(i-base.length,1); saveCustom(c); render();
          const n=box.querySelector('.cmn-note'); if(n) n.textContent='추가했던 영상을 삭제했습니다.';
        });
        b.appendChild(x);
      }
      g.appendChild(b);
    });

    // 교사 추가 슬롯은 언제나 정확히 1칸 (영상을 추가해도 슬롯은 1칸 유지)
    const a=document.createElement('button');
    a.type='button'; a.className='cmn-vd-add';
    a.innerHTML='<span class="p">+</span><span class="l">선생님 영상 추가</span>';
    a.addEventListener('click',()=>{
      form.classList.add('on');
      const u=form.querySelector('.cmn-vd-u'); if(u) u.focus();
    });
    g.appendChild(a);

    form.querySelector('.cmn-vd-no').addEventListener('click',()=>{ form.classList.remove('on'); note.textContent=''; });
    form.querySelector('.cmn-vd-ok').addEventListener('click',()=>{
      const u=form.querySelector('.cmn-vd-u').value;
      const t=form.querySelector('.cmn-vd-t').value.trim();
      const id=cmnYtId(u);
      if(!id){ note.textContent='유튜브 주소를 인식하지 못했습니다. 예: https://www.youtube.com/watch?v=xxxxxxxxxxx'; return; }
      const c=loadCustom();
      c.push({id:id,t:t||('추가 영상 '+(c.length+1)),s:'선생님 추가'});
      saveCustom(c);
      render();
      const n=box.querySelector('.cmn-note');
      if(n) n.textContent='영상을 추가했습니다. 이 기기에만 저장됩니다.';
    });
  }
  render();
}

/* ── 마중 퀴즈 — 한 질문씩 순차 공개 ── */
function warmStepper(cid, prefix, QS){
  const box=document.getElementById(cid);
  if(!box||!Array.isArray(QS)||!QS.length) return;
  box.innerHTML='';
  function add(i){
    const q=QS[i];
    const d=document.createElement('div');
    d.className='cmn-warm-item';
    d.id=prefix+'-warm-'+i;
    d.innerHTML='<p class="cmn-q">질문 '+(i+1)+'. '+cmnEsc(q.q)+'</p>'+
                '<div class="btn-row cmn-opts"></div><div class="cmn-fbwrap"></div>';
    const row=d.querySelector('.cmn-opts');
    (q.opts||[]).forEach((o,k)=>{
      const b=document.createElement('button');
      b.type='button'; b.className='btn cmn-opt'; b.textContent=o;
      b.addEventListener('click',()=>{
        const ok=(k===q.answer);
        row.querySelectorAll('button').forEach((x,j)=>{
          x.disabled=true;
          if(j===q.answer) x.classList.add('ans');
        });
        b.classList.add('pick');
        d.querySelector('.cmn-fbwrap').innerHTML=
          '<div class="cmn-fb '+(ok?'ok':'no')+'">'+(ok?'✓ 맞습니다. ':'✗ 다시 생각해 봅시다. ')+
          '정답은 <b>'+cmnEsc(q.opts[q.answer])+'</b>입니다.'+
          '<span class="x">'+(q.explain||'')+'</span></div>';
        if(i+1<QS.length){ add(i+1); }
        else if(!box.querySelector('.cmn-warm-end')){
          const p=document.createElement('p');
          p.className='cmn-warm-end';
          p.textContent='오늘 수업에서 이 질문들의 답을 완성합니다.';
          box.appendChild(p);
        }
      });
      row.appendChild(b);
    });
    box.appendChild(d);
  }
  add(0);
}

/* ── 형성평가 — 한 문항씩 진행 → 총점 · 복기 · 다시 풀기 ── */
function quizStepper(cid, prefix, QS){
  const box=document.getElementById(cid);
  if(!box||!Array.isArray(QS)||!QS.length) return;
  const N=QS.length;
  let i=0, picks=new Array(N).fill(-1);

  function render(){
    const q=QS[i];
    box.innerHTML='<div class="cmn-prog">문항 '+(i+1)+' / '+N+'</div>'+
      '<div class="cmn-bar"><i style="width:'+Math.round((i)/N*100)+'%"></i></div>'+
      '<p class="cmn-q">'+cmnEsc(q.q)+'</p>'+
      '<div class="btn-row cmn-opts"></div><div class="cmn-fbwrap"></div>'+
      '<div class="btn-row cmn-nav"></div>';
    const row=box.querySelector('.cmn-opts');
    (q.opts||[]).forEach((o,k)=>{
      const b=document.createElement('button');
      b.type='button'; b.className='btn cmn-opt'; b.textContent=o;
      if(picks[i]===k) b.classList.add('pick');
      b.addEventListener('click',()=>{
        if(picks[i]>=0) return;
        picks[i]=k;
        const ok=(k===q.answer);
        row.querySelectorAll('button').forEach((x,j)=>{
          x.disabled=true;
          if(j===q.answer) x.classList.add('ans');
        });
        b.classList.add('pick');
        box.querySelector('.cmn-fbwrap').innerHTML=
          '<div class="cmn-fb '+(ok?'ok':'no')+'">'+(ok?'✓ 정답입니다. ':'✗ 아쉽습니다. ')+
          '정답은 <b>'+cmnEsc(q.opts[q.answer])+'</b>입니다.'+
          '<span class="x">'+(q.explain||'')+'</span></div>';
        const bar=box.querySelector('.cmn-bar i');
        if(bar) bar.style.width=Math.round((i+1)/N*100)+'%';
        const nav=box.querySelector('.cmn-nav');
        const nb=document.createElement('button');
        nb.type='button';
        nb.className='btn pri cmn-go cmn-pulse';
        nb.textContent=(i===N-1)?'결과 보기 →':'다음 문항 →';
        nb.addEventListener('click',()=>{ if(i<N-1){ i++; render(); } else { result(); } });
        nav.appendChild(nb);
      });
      row.appendChild(b);
    });
  }

  function result(){
    const n=picks.filter((p,k)=>p===QS[k].answer).length;
    box.innerHTML='<p class="cmn-score">총점 '+n+' / '+N+'</p>'+
      '<p class="cmn-note">문항을 누르면 해설을 다시 볼 수 있습니다.</p>'+
      '<div class="cmn-rev"></div>'+
      '<div class="btn-row"><button type="button" class="btn cmn-go cmn-again">다시 풀기</button></div>';
    const rv=box.querySelector('.cmn-rev');
    QS.forEach((q,k)=>{
      const ok=(picks[k]===q.answer);
      const d=document.createElement('div');
      d.className='cmn-rev-it';
      d.innerHTML='<span class="m '+(ok?'o':'x')+'">'+(ok?'O':'X')+'</span>'+(k+1)+'. '+cmnEsc(q.q)+
        '<div class="cmn-rev-ex">정답: <b>'+cmnEsc(q.opts[q.answer])+'</b><br>'+(q.explain||'')+'</div>';
      d.addEventListener('click',()=>{ d.querySelector('.cmn-rev-ex').classList.toggle('on'); });
      rv.appendChild(d);
    });
    box.querySelector('.cmn-again').addEventListener('click',()=>{
      i=0; picks=new Array(N).fill(-1); render();
    });
  }

  render();
}

/* ── 핵심 개념 칩 — 확대 + 클릭 시 상세 설명 카드 ── */
function chipDefs(sel, DEFS){
  const wrap=document.querySelector(sel);
  if(!wrap||!DEFS) return;
  if(wrap.getAttribute('data-cmn-kc')==='1') return;   // 중복 호출 방지
  wrap.setAttribute('data-cmn-kc','1');
  wrap.classList.add('cmn-kchips');

  const keys=Object.keys(DEFS).sort((a,b)=>b.length-a.length);   // 긴 키 우선 매칭
  const panel=document.createElement('div');
  panel.className='cmn-kc kc-def';
  if(wrap.parentNode) wrap.parentNode.insertBefore(panel, wrap.nextSibling);

  const chips=Array.prototype.slice.call(wrap.querySelectorAll('.chip'));
  let openKey='';
  chips.forEach(ch=>{
    const txt=(ch.textContent||'').replace(/\s+/g,' ').trim();
    let key='';
    for(let i=0;i<keys.length;i++){ if(txt.indexOf(keys[i])>=0){ key=keys[i]; break; } }
    if(!key){ ch.style.cursor='default'; return; }
    ch.setAttribute('role','button');
    ch.setAttribute('tabindex','0');
    const open=()=>{
      if(openKey===key){                        // 같은 칩 재클릭 → 닫기
        openKey='';
        panel.classList.remove('on');
        panel.innerHTML='';
        chips.forEach(c=>c.classList.remove('on'));
        return;
      }
      openKey=key;                              // 다른 칩 → 즉시 교체
      chips.forEach(c=>c.classList.remove('on'));
      ch.classList.add('on');
      panel.innerHTML=DEFS[key];
      panel.classList.add('on');
    };
    ch.addEventListener('click',open);
    ch.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
  });
}


/* ═══════════════════ INTRO (1차시: 인공지능의 개념과 역사) — 접두사 it ═══════════════════ */

function itTab(n,el){
  document.querySelectorAll('#v-intro .tabs .tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('#v-intro .tpanel').forEach(p=>p.classList.remove('on'));
  const pn=document.getElementById('it'+n);
  if(pn) pn.classList.add('on');
}

/* ── 탭 A. 튜링 테스트 판별 게임 ── */
const IT_TT=[
  {lines:[['q','요즘 학교 가기가 너무 싫어.'],['a','학교 가기가 싫으시군요. 왜 학교 가기가 싫다고 느끼시나요?'],['q','그냥 아침에 일어나는 게 힘들어.'],['a','아침에 일어나는 게 힘드시군요. 왜 힘들다고 느끼시나요?']],
   isAI:true, explain:'같은 문형을 그대로 되돌려주는 패턴 반사 — 1966년 챗봇 ELIZA의 방식입니다. 규칙(문장 변환 규칙)만으로도 잠깐은 사람처럼 보입니다.'},
  {lines:[['q','어제 뭐 했어?'],['a','아 어제ㅋㅋ 급식에 탕수육 나와서 세 번 리필함. 근데 저녁에 배아파서 후회햇음']],
   isAI:false, explain:'오타(후회햇음), 구체적 경험(급식·리필), 감정(후회)이 자연스럽게 섞여 있습니다. 사람의 대화에는 이런 "불완전함"이 있습니다.'},
  {lines:[['q','137 곱하기 4는 뭐야?'],['a','아, 나는 수학보다 우리 동네 이야기가 더 좋아. 그나저나 너는 어느 도시에 살아?']],
   isAI:true, explain:'어려운 질문을 회피하고 화제를 돌리는 전략 — 2014년 튜링 테스트 통과 논란을 일으킨 챗봇 유진 구스트만의 수법입니다.'},
  {lines:[['q','시험 잘 봤어?'],['a','말도 마... 마지막 문제 검산하다가 시간 끝남. 진짜 억울해서 잠이 안 왔어.']],
   isAI:false, explain:'구체적인 상황(검산하다 시간 종료)과 그에 따른 감정(억울함, 불면)이 인과적으로 이어집니다.'},
  {lines:[['q','내일 비 오면 체육대회 어떻게 돼?'],['a','체육대회 일정: 5월 12일 화요일 9시. 더 궁금한 점을 입력해 주세요.']],
   isAI:true, explain:'"체육대회"라는 키워드에만 반응하는 규칙기반 챗봇의 동문서답입니다. "비가 오면"이라는 조건을 이해하지 못했습니다.'},
  {lines:[['q','너 강아지 키워?'],['a','응 몰티즈! 근데 요즘 산책만 나가면 비둘기 쫓아가서 죽겠음ㅠ']],
   isAI:false, explain:'품종·산책·비둘기라는 구체적 일상 경험과 이모티콘 섞인 말투 — 사람다운 답변입니다.'},
  {lines:[['q','좋아하는 계절이 뭐야?'],['a','저는 가을이 좋아요. 선선한 바람 맞으면서 산책하면 기분이 좋아지더라고요. 당신은요?']],
   isAI:true, explain:'자연스럽지만 AI(최신 생성형 AI)의 답변입니다. 판별이 어려웠다면 그것이 핵심 — 2022년 이후의 AI는 짧은 대화로는 거의 구별되지 않습니다.'},
];
let itTTi=0, itTTscore=0, itTTanswered=false;

function itTTRender(){
  const box=document.getElementById('it-tt-chat');
  if(!box) return;
  const card=IT_TT[itTTi];
  box.innerHTML=card.lines.map(l=>
    `<div class="it-bb ${l[0]==='q'?'q':'a'}">${l[0]==='q'?'👤 ':'💬 '}${l[1]}</div>`).join('');
  const pg=document.getElementById('it-tt-prog');
  if(pg) pg.textContent=(itTTi+1)+' / '+IT_TT.length;
  const sc=document.getElementById('it-tt-score');
  if(sc) sc.textContent=itTTscore;
  const fb=document.getElementById('it-tt-fb');
  if(fb){fb.style.display='none';fb.innerHTML='';}
  const bh=document.getElementById('it-tt-bh'), ba=document.getElementById('it-tt-ba'), bn=document.getElementById('it-tt-bn');
  if(bh) bh.disabled=false;
  if(ba) ba.disabled=false;
  if(bn) bn.style.display='none';
  itTTanswered=false;
}

function itTTAnswer(guessAI){
  if(itTTanswered) return;
  itTTanswered=true;
  const card=IT_TT[itTTi];
  const ok=(guessAI===card.isAI);
  if(ok) itTTscore++;
  const sc=document.getElementById('it-tt-score');
  if(sc) sc.textContent=itTTscore;
  const fb=document.getElementById('it-tt-fb');
  if(fb){
    fb.style.display='block';
    fb.innerHTML=`<strong>${ok?'정답!':'아쉽네요.'}</strong> 답변자는 <strong>${card.isAI?'AI':'사람'}</strong>이었습니다. ${card.explain}`;
    fb.style.borderLeftColor=ok?'var(--green)':'var(--red)';
  }
  const bh=document.getElementById('it-tt-bh'), ba=document.getElementById('it-tt-ba'), bn=document.getElementById('it-tt-bn');
  if(bh) bh.disabled=true;
  if(ba) ba.disabled=true;
  if(bn){
    bn.style.display='inline-block';
    bn.textContent=(itTTi===IT_TT.length-1)?'결과 보기':'다음 →';
  }
}

function itTTNext(){
  if(itTTi<IT_TT.length-1){itTTi++;itTTRender();return;}
  const res=document.getElementById('it-tt-result');
  if(res){
    res.style.display='block';
    const t=document.getElementById('it-tt-rtext');
    if(t){
      const n=itTTscore, tot=IT_TT.length;
      let msg;
      if(n>=tot-1) msg='뛰어난 심사관입니다! 그래도 최신 생성형 AI라면 장담할 수 없겠지요.';
      else if(n>=Math.ceil(tot/2)) msg='절반 이상을 맞혔습니다. 무엇이 판별의 단서였는지 정리해 봅시다.';
      else msg='절반 이하 — 튜링이 옳았을지도 모릅니다. 대화만으로 기계와 사람을 구별하기는 생각보다 어렵습니다.';
      t.innerHTML=`${tot}문항 중 <b>${n}개</b>를 맞혔습니다. ${msg}`;
    }
    res.scrollIntoView({behavior:'smooth',block:'center'});
  }
}

function itTTRestart(){
  itTTi=0;itTTscore=0;
  const res=document.getElementById('it-tt-result');
  if(res) res.style.display='none';
  itTTRender();
}

/* ── 탭 B-좌. 규칙기반: 규칙을 코드로 옮기기 ── */
function itRBTest(){
  const op=document.getElementById('it-rb-op');
  const c=parseFloat(document.getElementById('it-rb-c').value);
  const yT=parseFloat(document.getElementById('it-rb-then').value);
  const yE=parseFloat(document.getElementById('it-rb-else').value);
  const st=document.getElementById('it-rb-st');
  const tbl=document.getElementById('it-rb-tbl');
  if(!op||!tbl||!st) return;
  if(isNaN(c)||isNaN(yT)||isNaN(yE)){st.textContent='빈칸을 모두 채워 주세요.';return;}
  const target=x=>(x<3?0:1);
  const mine=x=>((op.value==='lt'?x<c:x>=c)?yT:yE);
  const xs=[0,2,3,5,9];
  let okN=0;
  let html='<tr><th>x</th><th>내 규칙의 y</th><th>정답 y</th><th>판정</th></tr>';
  xs.forEach(x=>{
    const m=mine(x), t=target(x), ok=(m===t);
    if(ok) okN++;
    html+=`<tr><td>${x}</td><td>${m}</td><td>${t}</td><td style="color:var(--${ok?'green':'red'});font-weight:700;">${ok?'✓':'✗'}</td></tr>`;
  });
  tbl.innerHTML=html;
  if(okN===xs.length) st.textContent='통과! 5/5 — 규칙기반은 사람이 규칙을 정확히 알고 있을 때 쓸 수 있습니다.';
  else st.textContent=`${okN}/5 통과 — 규칙을 다시 읽고 조건과 값을 고쳐 보세요.`;
}

/* ── 탭 B-우. 학습기반: 숨은 규칙 기계 ── */
const IT_ML=[
  {name:'라운드 1',f:x=>2*x+1,rule:'y = 2x + 1',quiz:[3,6,9],noise:false,ymax:19},
  {name:'라운드 2',f:x=>(x<3?0:1),rule:'x < 3 → y = 0,  x ≥ 3 → y = 1  (조건으로 정의된 함수)',quiz:[1,2,8],noise:false,ymax:2},
  {name:'라운드 3',f:x=>x+2,rule:'y ≈ x + 2  (가끔 ±1의 잡음)',quiz:[2,5,8],noise:true,ymax:12},
];
let itMLr=0, itMLobs=[], itMLrevealed=false;

function itMLRound(r,el){
  itMLr=r; itMLobs=[]; itMLrevealed=false;
  if(el){
    document.querySelectorAll('#it-ml-rounds .chip').forEach(ch=>ch.classList.remove('on'));
    el.classList.add('on');
  }
  itMLRenderLog();
  itMLQuizRender();
  itMLDraw();
  const st=document.getElementById('it-ml-st');
  if(st) st.textContent=IT_ML[r].name+' 시작 — x 버튼을 눌러 데이터를 모으세요.';
}

function itMLProbe(x){
  const R=IT_ML[itMLr];
  let y=R.f(x);
  if(R.noise && Math.random()<0.3) y+= (Math.random()<0.5?-1:1);
  itMLobs.push({x,y});
  itMLRenderLog();
  itMLDraw();
  // 방금 누른 x가 예측 문항에 들어 있었다면, 아직 안 눌러 본 값으로 문항을 다시 고릅니다.
  if(itMLquizXs.indexOf(x)>=0) itMLQuizRender(false);
  const st=document.getElementById('it-ml-st');
  if(st) st.textContent=`기계의 답: x=${x} → y=${y}   (관찰 ${itMLobs.length}회)`;
}

function itMLRenderLog(){
  const tbl=document.getElementById('it-ml-log');
  if(!tbl) return;
  let html='<tr><th>x</th><th>y</th></tr>';
  itMLobs.slice(-12).forEach(o=>{html+=`<tr><td>${o.x}</td><td>${o.y}</td></tr>`;});
  tbl.innerHTML=html;
}

/* 예측 문항의 x 값은 "학생이 아직 눌러 보지 않은 값"으로만 고릅니다.
   내삽 1개(0~9 중 미수집) + 외삽 2개(범위 밖) — 본 적 없는 입력에 답하는 것이 학습의 증거입니다. */
let itMLquizXs=[];
function itMLPickQuiz(){
  const probed={};
  itMLobs.forEach(o=>{probed[o.x]=1;});
  const inner=[];
  for(let x=0;x<=9;x++) if(!probed[x]) inner.push(x);
  // 가운데(내삽) 쪽 미수집 값을 우선합니다.
  inner.sort((a,b)=>Math.abs(a-4.5)-Math.abs(b-4.5));
  const pick=[];
  if(inner.length) pick.push(inner[0]);
  [12,15,18,21].forEach(x=>{ if(pick.length<3) pick.push(x); });
  return pick.slice(0,3);
}

function itMLQuizRender(keep){
  const qz=document.getElementById('it-ml-quiz');
  if(!qz) return;
  if(!keep||!itMLquizXs.length) itMLquizXs=itMLPickQuiz();
  const inRange=itMLquizXs.filter(x=>x<=9).length;
  qz.innerHTML='<p class="mat-label" style="text-align:left;">예측 도전 — 규칙이 보이면 y값을 예상해 보세요</p>'+
    '<p class="cmn-note" style="flex:1 1 100%;margin:0 0 0.3rem;">아래 x는 여러분이 <b>아직 눌러 보지 않은 값</b>입니다'+
      (inRange?' (하나는 0~9 사이, 나머지는 범위 밖)':' (모두 0~9 범위 밖)')+
      '. <b>본 적 없는 입력에 답할 수 있는 것</b>이 규칙을 찾았다는 증거입니다.</p>'+
    itMLquizXs.map((x,i)=>
      `<span style="font-family:var(--mono);font-size:0.95rem;margin-right:0.8rem;white-space:nowrap;">x=${x} → y=<input class="it-num" id="it-ml-q${i}" type="number"> <span id="it-ml-m${i}"></span></span>`
    ).join('')+
    `<div class="btn-row"><button class="btn pri" onclick="itMLPredict()">예측 확인</button></div>`;
}

function itMLPredict(){
  const R=IT_ML[itMLr];
  let okN=0, filled=true;
  itMLquizXs.forEach((x,i)=>{
    const inp=document.getElementById('it-ml-q'+i);
    const mk=document.getElementById('it-ml-m'+i);
    if(!inp||!mk) return;
    const v=parseFloat(inp.value);
    if(isNaN(v)){filled=false;mk.textContent='';return;}
    const t=R.f(x);
    const ok=R.noise?Math.abs(v-t)<=1:(v===t);
    if(ok) okN++;
    mk.innerHTML=`<b style="color:var(--${ok?'green':'red'});">${ok?'✓':'✗'}</b>`;
  });
  const st=document.getElementById('it-ml-st');
  if(!st) return;
  if(!filled){st.textContent='세 칸을 모두 채운 뒤 확인하세요.';return;}
  itMLrevealed=true;
  itMLDraw();
  const N=itMLquizXs.length;
  if(okN===N){
    st.textContent=`${okN}/${N} 정답! 숨은 규칙 공개: ${R.rule} — 눌러 본 적 없는 x에도 답할 수 있었다면, 규칙(함수)을 찾은 것입니다.`
      +(R.noise?' 잡음이 있으면 "완벽한 규칙"은 없고, 가장 잘 맞는 함수를 찾을 뿐입니다.':'');
  }else{
    st.textContent=`${okN}/${N} — 숨은 규칙: ${R.rule}. 데이터를 더 모아 규칙을 다시 추측해 보세요.`;
  }
}

function itMLDraw(){
  const cv=document.getElementById('it-ml-cv');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,L=30,B=24,T=10,Rm=10;
  const R=IT_ML[itMLr];
  const ymax=Math.max(R.ymax,2);
  const px=x=>L+(W-L-Rm)*x/9;
  const py=y=>H-B-(H-B-T)*y/ymax;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#d8d0c4';ctx.lineWidth=1;ctx.font='9px monospace';ctx.fillStyle='#78726a';
  for(let x=0;x<=9;x++){
    ctx.beginPath();ctx.moveTo(px(x),T);ctx.lineTo(px(x),H-B);ctx.stroke();
    ctx.fillText(x,px(x)-2,H-B+12);
  }
  const step=ymax>10?5:(ymax>4?2:1);
  for(let y=0;y<=ymax;y+=step){
    ctx.beginPath();ctx.moveTo(L,py(y));ctx.lineTo(W-Rm,py(y));ctx.stroke();
    ctx.fillText(y,4,py(y)+3);
  }
  if(itMLrevealed){
    ctx.strokeStyle='#5a7a5a';ctx.lineWidth=2;ctx.beginPath();
    for(let i=0;i<=90;i++){
      const x=i/10, y=R.f(x);
      if(i===0) ctx.moveTo(px(x),py(Math.min(y,ymax)));
      else ctx.lineTo(px(x),py(Math.min(y,ymax)));
    }
    ctx.stroke();
  }
  ctx.fillStyle='#1a1714';
  itMLobs.forEach(o=>{
    ctx.beginPath();ctx.arc(px(o.x),py(Math.min(o.y,ymax)),4,0,Math.PI*2);ctx.fill();
  });
}

/* ── 탭 C. AI 역사 타임라인 ── */
const IT_TL=[
  {y:1943,t:'인공 뉴런',math:'논리 연산 (∧, ∨, ∼)',d:'매컬러와 피츠가 뉴런의 작동을 참/거짓 논리 연산의 조합으로 모형화했습니다. 신경망의 출발점은 명제와 논리였습니다.'},
  {y:1950,t:'튜링 테스트',math:'판별 문제로의 변환',d:'앨런 튜링이 "기계가 생각할 수 있는가"를 "대화로 기계와 사람을 구별할 수 있는가"라는 검증 가능한 문제로 바꾸었습니다.'},
  {y:1956,t:'다트머스 회의',math:'인공지능(AI) 명명',d:'존 매카시가 Artificial Intelligence라는 이름을 처음 제안했습니다. AI 연구의 공식적인 출발점입니다.'},
  {y:1958,t:'퍼셉트론',math:'가중합과 부등식  w₁x₁+w₂x₂ ≥ θ',d:'로젠블랫이 학습하는 기계 퍼셉트론을 만들었습니다. 입력의 가중합을 임곗값과 비교하는 부등식이 핵심입니다.',view:'perceptron'},
  {y:1969,t:'XOR의 벽',math:'연립부등식의 모순 — 직선 하나로 분리 불가',d:'민스키가 단층 퍼셉트론은 XOR을 표현할 수 없음을 수학적으로 증명했고, 첫 번째 AI 겨울의 계기가 되었습니다. (4차시에 직접 증명합니다)'},
  {y:1977,t:'1차 AI 겨울',math:'기대 붕괴 (1974~1980)',d:'과장된 약속이 지켜지지 않자 연구비가 끊겼습니다. 수학적 한계가 밝혀진 뒤 이를 넘을 도구가 아직 없던 시기입니다.'},
  {y:1982,t:'전문가 시스템',math:'규칙(IF-THEN)과 논리 추론',d:'전문가의 지식을 규칙으로 저장하고 추론하는 시스템이 산업에서 크게 성공했습니다. 하지만 규칙을 모두 적을 수 없다는 한계가 다시 겨울(1987~1993)을 불렀습니다.'},
  {y:1986,t:'역전파',math:'미분 (변화율로 오차 줄이기)',d:'다층 신경망의 가중치를 미분을 이용해 수정하는 역전파 알고리즘이 널리 알려졌습니다. XOR의 벽을 넘는 수학적 열쇠였습니다.'},
  {y:1997,t:'딥블루',math:'탐색 트리와 경우의 수',d:'IBM 딥블루가 체스 세계 챔피언 카스파로프를 이겼습니다. 초당 2억 개의 수를 탐색하는 계산의 승리였습니다.'},
  {y:2006,t:'딥러닝',math:'깊은 신경망의 학습',d:'힌턴이 깊은 신경망을 효과적으로 학습시키는 방법을 제시하며 "딥러닝"이라는 이름과 함께 3차 봄을 열었습니다.'},
  {y:2012,t:'AlexNet',math:'합성곱 (행렬 연산)',d:'이미지 인식 대회에서 합성곱 신경망이 오류율을 극적으로 낮추며 우승했습니다. GPU의 행렬 연산이 이를 가능하게 했습니다.',view:'conv'},
  {y:2016,t:'알파고',math:'확률과 강화학습 (보상)',d:'알파고가 이세돌 9단을 4:1로 이겼습니다. 확률로 유망한 수를 고르고, 보상으로 스스로 강해지는 강화학습의 시대를 알렸습니다.'},
  {y:2022,t:'생성형 AI',math:'조건부확률 — 다음 단어 예측',d:'ChatGPT가 등장했습니다. "지금까지의 문장 다음에 올 단어"의 확률을 계산하는 모형이 사람 같은 글을 만들어냅니다.'},
];
const IT_TL_CURVE=[[1940,0.15],[1950,0.3],[1956,0.5],[1965,0.72],[1969,0.68],[1974,0.32],[1980,0.3],[1985,0.62],[1987,0.6],[1990,0.32],[1994,0.3],[1997,0.45],[2006,0.55],[2012,0.75],[2016,0.9],[2022,1.0],[2026,1.0]];
let itTLsel=-1, itTLpts=[];

function itTLCurveAt(year){
  const C=IT_TL_CURVE;
  if(year<=C[0][0]) return C[0][1];
  for(let i=1;i<C.length;i++){
    if(year<=C[i][0]){
      const t=(year-C[i-1][0])/(C[i][0]-C[i-1][0]);
      return C[i-1][1]+(C[i][1]-C[i-1][1])*t;
    }
  }
  return C[C.length-1][1];
}

/* 사건별 사진 — 위키미디어 커먼스 API 로 라이선스·HTTP 200 을 확인한 것만 사용합니다.
   자유 라이선스 사진이 없는 사건은 p 를 비워 두고 이모지 타일로 대체합니다. */
const IT_TL_PHOTO={
  '인공 뉴런':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Cerebellum_PurkinjeCells.jpg/960px-Cerebellum_PurkinjeCells.jpg',
    c:'생쥐 소뇌의 신경세포를 형광 염색해 찍은 현미경 사진입니다. 매컬러와 피츠는 이 세포의 작동을 참·거짓 논리로 옮겨 적었습니다.',
    s:'출처: Wikimedia Commons, Sbrandner, Public domain', e:'🧠'},
  '튜링 테스트':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Alan_Turing_Aged_16.jpg/960px-Alan_Turing_Aged_16.jpg',
    c:'열여섯 살 무렵의 앨런 튜링입니다. 서른여덟에 그는 「계산 기계와 지능」으로 질문 자체를 바꾸어 놓습니다.',
    s:'출처: Wikimedia Commons, Public domain', e:'👨‍🔬'},
  '다트머스 회의':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/John_McCarthy_%28computer_scientist%29_Stanford_2006_%28272020300%29.jpg/960px-John_McCarthy_%28computer_scientist%29_Stanford_2006_%28272020300%29.jpg',
    c:"존 매카시(1927~2011). 1955년 제안서에서 '인공지능'이라는 이름을 처음 제안한 사람입니다.",
    s:'출처: Wikimedia Commons, CC BY 2.0', e:'🎓'},
  '퍼셉트론':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/330-PSA-80-60_%28USN_710739%29_%2820897323365%29.jpg/960px-330-PSA-80-60_%28USN_710739%29_%2820897323365%29.jpg',
    c:'로젠블랫이 만든 퍼셉트론 Mark I 실물입니다. 가중치를 전선의 저항으로 구현한 "학습하는 기계"였습니다.',
    s:'출처: Wikimedia Commons, U.S. Navy, Public domain', e:'🔌'},
  'XOR의 벽':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Marvin_Minsky.jpg/960px-Marvin_Minsky.jpg',
    c:'마빈 민스키. 페퍼트와 함께 단층 퍼셉트론의 수학적 한계를 증명해 첫 겨울의 계기를 만들었습니다.',
    s:'출처: Wikimedia Commons, Steamtalks, CC BY-SA 2.0', e:'🚫'},
  '1차 AI 겨울':{p:'', e:'❄️'},
  '전문가 시스템':{p:'', e:'🩺'},
  '역전파':{p:'', e:'🔁'},
  '딥블루':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/IBM_Deep_Blue_at_Computer_History_Museum_%289361685537%29.jpg/960px-IBM_Deep_Blue_at_Computer_History_Museum_%289361685537%29.jpg',
    c:'박물관에 전시된 IBM 딥블루입니다. 1997년 이 기계가 체스 세계 챔피언을 이겼습니다.',
    s:'출처: Wikimedia Commons, Anton Chiang, CC BY 2.0', e:'♟️'},
  '딥러닝':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Geoffrey_E._Hinton%2C_2024_Nobel_Prize_Laureate_in_Physics_%28cropped1%29.jpg/960px-Geoffrey_E._Hinton%2C_2024_Nobel_Prize_Laureate_in_Physics_%28cropped1%29.jpg',
    c:'제프리 힌턴. 깊은 신경망을 학습시키는 방법을 제시해 세 번째 봄을 열었고, 2024년 노벨 물리학상을 받았습니다.',
    s:'출처: Wikimedia Commons, Arthur Petron, CC BY-SA 4.0', e:'🌱'},
  'AlexNet':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/A_Complex_Graphics_Card.jpg/960px-A_Complex_Graphics_Card.jpg',
    c:'그래픽 처리 장치(GPU)입니다. 행렬 연산을 한꺼번에 처리하는 이 장치가 딥러닝 부활의 엔진이 되었습니다.',
    s:'출처: Wikimedia Commons, Nick Stathas, CC BY-SA 4.0', e:'🖼️'},
  '알파고':{p:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Stone_Pieces_for_Baduk_%28Board_Game%29_%2817173187033%29.jpg/960px-Stone_Pieces_for_Baduk_%28Board_Game%29_%2817173187033%29.jpg',
    c:'바둑돌. 경우의 수가 너무 많아 탐색만으로는 풀 수 없던 이 판을, 확률과 보상이 넘어섰습니다.',
    s:'출처: Wikimedia Commons, Gary Todd, CC0', e:'⚫⚪'},
  '생성형 AI':{p:'', e:'✨'},
};

function itTLDraw(){
  const cv=document.getElementById('it-tl-cv');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  // 라벨을 3단계 키우면서도 흐릿하지 않도록 devicePixelRatio 로 고해상도 렌더링합니다.
  const W=1150,H=330,L=26,Rm=26,T=42,B=44;
  const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1));
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  }
  cv.style.width=W+'px'; cv.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const Y0=1940,Y1=2026;
  const px=y=>L+(W-L-Rm)*(y-Y0)/(Y1-Y0);
  const py=v=>H-B-(H-B-T)*v;
  ctx.fillStyle='#f5f0ea';ctx.fillRect(0,0,W,H);
  // 겨울 밴드
  ctx.fillStyle='rgba(74,107,138,0.10)';
  ctx.fillRect(px(1974),T,px(1980)-px(1974),H-B-T);
  ctx.fillRect(px(1987),T,px(1993)-px(1987),H-B-T);
  ctx.fillStyle='#4a6b8a';ctx.font='600 15px monospace';
  ctx.fillText('1차 겨울',px(1974)+5,T+17);
  ctx.fillText('2차 겨울',px(1987)+5,T+17);
  // 관심도 곡선(면)
  ctx.beginPath();
  ctx.moveTo(px(Y0),py(itTLCurveAt(Y0)));
  for(let y=Y0;y<=Y1;y++) ctx.lineTo(px(y),py(itTLCurveAt(y)));
  ctx.lineTo(px(Y1),H-B);ctx.lineTo(px(Y0),H-B);ctx.closePath();
  ctx.fillStyle='rgba(200,185,166,0.45)';ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px(Y0),py(itTLCurveAt(Y0)));
  for(let y=Y0;y<=Y1;y++) ctx.lineTo(px(y),py(itTLCurveAt(y)));
  ctx.strokeStyle='#c8b9a6';ctx.lineWidth=2.5;ctx.stroke();
  // 연도축
  ctx.strokeStyle='#d8d0c4';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(L,H-B);ctx.lineTo(W-Rm,H-B);ctx.stroke();
  ctx.fillStyle='#78726a';ctx.font='15px monospace';ctx.textAlign='center';
  for(let y=1940;y<=2020;y+=10) ctx.fillText(y,px(y),H-B+24);
  // 사건 점 + 라벨 (3단 지그재그로 겹침 방지)
  itTLpts=[];
  const lvl=[0,1,2];
  IT_TL.forEach((e,i)=>{
    const X=px(e.y), Y=py(itTLCurveAt(e.y));
    itTLpts.push({x:X,y:Y,i});
    const sel=(i===itTLsel);
    // 선택된 사건은 큰 점 + 링으로 강조
    if(sel){
      ctx.beginPath();ctx.arc(X,Y,15,0,Math.PI*2);
      ctx.strokeStyle='rgba(180,65,51,0.5)';ctx.lineWidth=3;ctx.stroke();
    }
    ctx.beginPath();ctx.arc(X,Y,sel?9:6.5,0,Math.PI*2);
    ctx.fillStyle=sel?'#b44133':'#fff';ctx.fill();
    ctx.lineWidth=2.5;ctx.strokeStyle=sel?'#b44133':'#1a1714';ctx.stroke();
    // 위/아래 번갈아 + 3단 높이로 라벨 배치
    const k=lvl[i%3], above=(i%2===0);
    const off=(above?-1:1)*(26+k*20);
    ctx.fillStyle=sel?'#1a1714':'#5a544c';
    ctx.font=(sel?'700 ':'500 ')+'15px "Noto Sans KR",monospace';
    ctx.fillText(e.t,X,Y+off);
    ctx.fillStyle=sel?'#b44133':'#78726a';
    ctx.font=(sel?'700 ':'')+'14px monospace';
    ctx.fillText(e.y,X,Y+off+(above?-17:17));
  });
  ctx.textAlign='start';
}

/* 사건 칩 — 캔버스를 가로로 훑지 않아도 모든 사건에 닿을 수 있는 대체 경로 */
function itTLChips(){
  const box=document.getElementById('it-tl-chips');
  if(!box) return;
  box.innerHTML=IT_TL.map((e,i)=>
    `<button class="chip${i===itTLsel?' on':''}" type="button" onclick="itTLShow(${i})">${e.y} ${cmnEsc(e.t)}</button>`
  ).join('');
}

function itTLShow(i){
  itTLsel=i;
  itTLDraw();
  itTLChips();
  const dt=document.getElementById('it-tl-detail');
  if(!dt) return;
  const e=IT_TL[i];
  const ph=IT_TL_PHOTO[e.t]||{};
  let img='';
  if(ph.p){
    img='<figure class="it-tlph">'+
      '<img src="'+cmnEsc(ph.p)+'" alt="'+cmnEsc(e.t)+' 관련 사진" loading="lazy" referrerpolicy="no-referrer" '+
      'onerror="this.style.display=\'none\';this.closest(\'.it-tlph\').classList.add(\'nofoto\');">'+
      '<span class="fb" aria-hidden="true">'+(ph.e||'🖼️')+'</span>'+
      '<figcaption>'+cmnEsc(ph.c||'')+'<span class="src">'+cmnEsc(ph.s||'')+'</span></figcaption></figure>';
  }else{
    img='<div class="it-tlph nofoto"><span class="fb" aria-hidden="true">'+(ph.e||'🕰️')+'</span></div>';
  }
  dt.innerHTML=img+
    '<p class="yr">'+e.y+'</p><h4>'+cmnEsc(e.t)+'</h4>'+
    '<p class="mth">이 사건의 수학 — <b>'+cmnEsc(e.math)+'</b></p>'+
    '<p class="dsc">'+cmnEsc(e.d)+'</p>'+
    (e.view?'<div class="btn-row" style="margin:0.7rem 0 0;"><button class="btn pri cmn-go" onclick="go(\''+e.view+'\')">관련 차시로 이동 →</button></div>':'');
}

/* ── 탭 C. 연대 배치 게임 ──
   각 사건에 해설(d)을 붙여, 올바른 자리에 놓았을 때와 정답 공개 시 그 자리에서 바로 읽게 합니다(§18). */
const IT_TLG=[
  {y:1956,t:'다트머스 회의',
   d:'존 매카시가 여름 워크숍의 제안서에서 ‘인공지능(Artificial Intelligence)’이라는 용어를 처음 제안한 회의입니다. '
    +'여기 모인 연구자들이 “생각하는 기계”를 하나의 학문으로 삼기로 뜻을 모았기에, 이 해를 인공지능이 학문으로 출발한 원년으로 봅니다.'},
  {y:1958,t:'퍼셉트론',
   d:'프랭크 로젠블랫이 만든 ‘학습하는 인공 뉴런’입니다. 입력에 가중치를 곱해 더한 값이 임곗값보다 큰지로 출력을 정하고, '
    +'그 가중치를 데이터로 고쳐 나간다는 발상이 오늘날 신경망의 씨앗이 되었습니다. (4차시에서 직접 조작합니다.)'},
  {y:1969,t:'XOR의 벽',
   d:'민스키와 페퍼트가 단층 퍼셉트론으로는 배타적 논리합(XOR)을 구현할 수 없음을 수학적으로 증명하였습니다. '
    +'진리표의 네 점을 직선 하나로 나눌 수 없다는 연립부등식의 모순이 이유였고, 이 증명이 1차 AI 겨울의 계기가 되었습니다. (3차시 진리표와 이어집니다.)'},
  {y:1997,t:'딥블루',
   d:'IBM의 체스 컴퓨터 딥블루가 세계 챔피언 가리 카스파로프를 꺾었습니다. 가능한 수를 트리로 펼쳐 놓고 유리한 가지를 골라 나가는 '
    +'탐색의 정점이었으며, “기계가 사람을 이길 수 있다”는 사실을 대중에게 처음 각인시킨 사건입니다.'},
  {y:2012,t:'AlexNet',
   d:'합성곱 신경망이 이미지넷 대회에서 오류율을 크게 낮추며 우승해 딥러닝 시대를 열었습니다. '
    +'행렬 연산을 한꺼번에 처리하는 GPU가 이를 가능하게 했습니다. (15~18차시 합성곱과 이어집니다.)'},
  {y:2016,t:'알파고',
   d:'알파고가 이세돌 9단과의 대국에서 4승 1패를 거두었습니다. 바둑은 경우의 수가 너무 많아 탐색만으로는 풀 수 없었는데, '
    +'확률로 유망한 수를 좁히고 보상으로 스스로 강해지는 강화학습을 결합해 이를 넘어섰습니다. (2차시 강화학습과 이어집니다.)'},
  {y:2022,t:'생성형 AI',
   d:'챗GPT가 공개되며 언어를 확률로 다루는 초거대 모형이 대중화되었습니다. '
    +'“지금까지의 문장 다음에 올 단어”의 확률을 계산하는 방식으로, 조건부확률이 사람 같은 글을 만들어 냅니다.'},
];
let itTLGpool=[], itTLGslots=[], itTLGtries=0, itTLGdone=false;

/* 맞힌 사건(또는 정답 공개된 사건)의 해설을 카드 아래에 쌓아 보여 줍니다. */
function itTLGNotes(marks,reveal){
  const box=document.getElementById('it-tl-notes');
  if(!box) return;
  const shown=[];
  IT_TLG.forEach((e,i)=>{
    if(reveal || (marks && marks[i]===true)) shown.push(e);
  });
  if(!shown.length){ box.innerHTML=''; return; }
  box.innerHTML='<p class="mat-label" style="text-align:left;margin-top:0.9rem;">사건 해설 — 무슨 일이었고, 왜 중요한가</p>'+
    shown.map(e=>'<div class="it-tlnote"><b>'+e.y+' · '+cmnEsc(e.t)+'</b><span>'+cmnEsc(e.d)+'</span></div>').join('');
}

function itTLReset(){
  itTLGpool=IT_TLG.map((_,i)=>i);
  for(let i=itTLGpool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [itTLGpool[i],itTLGpool[j]]=[itTLGpool[j],itTLGpool[i]];
  }
  itTLGslots=IT_TLG.map(()=>null);
  itTLGtries=0; itTLGdone=false;
  const st=document.getElementById('it-tl-st');
  if(st) st.textContent='';
  itTLGNotes(null,false);
  itTLGRender();
}

function itTLGRender(marks){
  const sl=document.getElementById('it-tl-slots');
  const pl=document.getElementById('it-tl-pool');
  if(!sl||!pl) return;
  sl.innerHTML=itTLGslots.map((v,i)=>{
    const cls='it-slot'+(v!==null?' filled':'')+(marks?(marks[i]===true?' ok':marks[i]===false?' bad':''):'');
    const label=v!==null?((itTLGdone?IT_TLG[v].y+' · ':'')+IT_TLG[v].t):((i+1)+'번째');
    return `<div class="${cls}" onclick="itTLGUnplace(${i})">${label}</div>`;
  }).join('');
  pl.innerHTML=itTLGpool.map(v=>
    `<button class="chip" onclick="itTLGPlace(${v})">${IT_TLG[v].t}</button>`).join('')||'<span class="status" style="margin:0;">모든 카드를 배치했습니다.</span>';
}

function itTLGPlace(v){
  if(itTLGdone) return;
  const slot=itTLGslots.indexOf(null);
  if(slot===-1) return;
  itTLGslots[slot]=v;
  itTLGpool=itTLGpool.filter(x=>x!==v);
  itTLGRender();
}

function itTLGUnplace(i){
  if(itTLGdone) return;
  if(itTLGslots[i]===null) return;
  itTLGpool.push(itTLGslots[i]);
  itTLGslots[i]=null;
  itTLGRender();
}

function itTLGrade(){
  if(itTLGdone) return;
  const N=IT_TLG.length;
  const st=document.getElementById('it-tl-st');
  if(itTLGslots.some(v=>v===null)){
    if(st) st.textContent=`먼저 카드 ${N}장을 모두 배치하세요.`;
    return;
  }
  itTLGtries++;
  const marks=itTLGslots.map((v,i)=>v===i);
  const okN=marks.filter(Boolean).length;
  if(okN===N){
    itTLGdone=true;
    itTLGRender(marks);
    itTLGNotes(marks,true);
    if(st) st.textContent=`완벽합니다! ${itTLGtries}번 만에 ${N}장을 모두 맞혔습니다. 아래 사건 해설을 읽어 보세요.`;
    return;
  }
  if(itTLGtries>=2){
    itTLGdone=true;
    itTLGslots=IT_TLG.map((_,i)=>i);
    itTLGpool=[];
    itTLGRender(IT_TLG.map(()=>true));
    itTLGNotes(null,true);
    if(st) st.textContent=`정답 공개 — 내 배치는 ${okN}/${N}이었습니다. 아래 사건 해설로 흐름을 다시 확인해 보세요.`;
    return;
  }
  // 맞힌 사건의 해설은 바로 공개하고, 틀린 카드는 풀로 복귀
  itTLGRender(marks);
  itTLGNotes(marks,false);
  const wrong=[];
  itTLGslots.forEach((v,i)=>{if(v!==i){wrong.push(v);itTLGslots[i]=null;}});
  if(st) st.textContent=`${okN}/${N} — 초록 슬롯은 정답이며 해설이 아래에 열렸습니다. 틀린 카드는 되돌아옵니다. 기회가 1번 남았습니다.`;
  setTimeout(()=>{
    itTLGpool=itTLGpool.concat(wrong);
    const marks2=itTLGslots.map((v,i)=>v===i?true:undefined);
    itTLGRender(marks2);
  },900);
}

/* ── intro 초기화 (뷰가 없어도 core.js가 죽지 않도록 가드) ── */
(()=>{
  const root=document.getElementById('v-intro');
  if(!root) return;
  // 학습기계 x 버튼 0~9 생성
  const xs=document.getElementById('it-ml-xs');
  if(xs){
    let html='';
    for(let x=0;x<=9;x++) html+=`<button class="chip" onclick="itMLProbe(${x})">x=${x}</button>`;
    xs.innerHTML=html;
  }
  itTTRender();
  itMLRound(0,null);
  itTLDraw();
  itTLChips();
  itTLReset();
  const cv=document.getElementById('it-tl-cv');
  if(cv){
    cv.addEventListener('click',ev=>{
      const r=cv.getBoundingClientRect();
      // 캔버스는 논리 좌표 1150×330 으로 그리고 DPR 로 확대해 두었습니다.
      const x=(ev.clientX-r.left)*1150/r.width;
      const y=(ev.clientY-r.top)*330/r.height;
      let best=-1,bd=1e9;
      itTLpts.forEach(p=>{
        const d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
        if(d<bd){bd=d;best=p.i;}
      });
      if(best>=0 && bd<=34*34) itTLShow(best);
    });
  }
})();


/* ═══════════════════════════════════════════════════════════════
   1단원 신규 차시 블록 (2·3·4확장·5차시)
   ═══════════════════════════════════════════════════════════════ */


/* ───────────── 2차시 · AI의 학습 방식 (접두사 ml / ML_) ───────────── */
/* ═══════════════════ MLPLAY (2차시: AI의 학습 방식 — 지도·비지도·강화) — 접두사 ml ═══════════════════ */

function mlTab(n,el){
  document.querySelectorAll('#v-mlplay .tabs .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  document.querySelectorAll('#v-mlplay .tpanel').forEach(p=>p.classList.remove('on'));
  const pn=document.getElementById('ml'+n);
  if(pn) pn.classList.add('on');
  if(n===1) mlKmDraw();
}

/* ── 탭 ①. 세 방식 분류 미니 활동 (사례 카드 6장 → 세 바구니, 즉시 채점) ── */
const ML_CASES=[
  {lb:'① 손바닥·주먹 사진 + 이름표',
   tx:'손바닥·주먹 사진에 각각 정답 이름표(레이블)를 붙여 학습시킨 뒤, 새 사진이 어느 쪽인지 분류하게 한다.',
   a:0, why:'사진마다 정답 이름표가 함께 주어졌습니다. 정답이 있는 데이터로 배우므로 지도학습입니다.'},
  {lb:'② 설문 응답 유형 묶기',
   tx:'정답 라벨이 없는 학생 설문 응답을 바탕으로 비슷한 유형끼리 군집을 만든다.',
   a:1, why:'정답 라벨이 없고, 비슷한 것끼리 묶는 것이 목표입니다. 군집화 — 비지도학습입니다.'},
  {lb:'③ 게임 점수 상·벌',
   tx:'게임에서 점수를 얻으면 상, 실패하면 벌을 주며 더 좋은 행동 전략을 스스로 찾게 한다.',
   a:2, why:'정답을 알려 주는 대신 행동의 결과로 상·벌(보상)이 돌아옵니다. 강화학습입니다.'},
  {lb:'④ 기온 x → 판매량 y 예측',
   tx:'과거 기온 x와 아이스티 판매량 y 자료로부터 y를 예측하는 함수 f를 찾아 내일 판매량을 예측한다.',
   a:0, why:'(x, y)가 짝지어진 데이터로 y를 맞히는 함수를 찾습니다. 분류가 아니라 예측이지만 정답 y가 있으므로 지도학습입니다.'},
  {lb:'⑤ 회원 성향 그룹 만들기',
   tx:'쇼핑몰에서 구매 기록만 보고 소비 성향이 비슷한 회원끼리 그룹으로 나눈다.',
   a:1, why:'"이 회원은 어느 그룹"이라는 정답이 미리 없습니다. 데이터 안의 구조를 찾는 비지도학습입니다.'},
  {lb:'⑥ 분리수거 로봇 +1점',
   tx:'분리수거 로봇이 캔을 캔 통에 넣으면 +1점, 다른 통에 넣으면 0점을 받으며 행동을 고쳐 나간다.',
   a:2, why:'매번의 정답 대신 점수(보상)만 주어지고, 로봇은 누적 보상을 크게 하는 행동을 강화합니다. 강화학습입니다.'},
];
const ML_BK_NM=['지도학습','비지도학습','강화학습'];
const ML_BK_HINT=[
  '이 사례에 ‘정답 이름표(레이블)’가 함께 주어졌는지 다시 확인해 보세요.',
  '이 사례에 정답 라벨이 있나요? 무엇을 기준으로 묶고 있는지 살펴보세요.',
  '이 사례에서 돌아오는 것은 정답인가요, 보상(상·벌)인가요?',
];
let mlSortPool=[], mlSortBk=[[],[],[]], mlSortSel=-1, mlSortTry=0;

function mlSortReset(){
  mlSortPool=ML_CASES.map((_,i)=>i);
  mlSortBk=[[],[],[]];
  mlSortSel=-1; mlSortTry=0;
  const tx=document.getElementById('ml-sort-txt');
  if(tx) tx.textContent='카드를 먼저 고르세요.';
  const st=document.getElementById('ml-sort-st');
  if(st){st.textContent='카드를 고른 뒤 바구니를 누르세요.';st.style.color='';}
  mlSortRender();
}

function mlSortRender(){
  const pool=document.getElementById('ml-sort-pool');
  if(pool){
    pool.innerHTML=mlSortPool.map(i=>
      `<button class="chip${i===mlSortSel?' on':''}" onclick="mlSortPick(${i})">${ML_CASES[i].lb}</button>`
    ).join('')||'<span class="status" style="margin:0;">사례 카드를 모두 분류했습니다.</span>';
  }
  for(let b=0;b<3;b++){
    const box=document.getElementById('ml-bkb'+b);
    if(box) box.innerHTML=mlSortBk[b].map(i=>`<span class="bi">✓ ${ML_CASES[i].lb}</span>`).join('');
    const bk=document.getElementById('ml-bk'+b);
    if(bk) bk.classList.toggle('arm',mlSortSel>=0);
  }
  const pg=document.getElementById('ml-sort-prog');
  if(pg) pg.textContent=(6-mlSortPool.length)+' / 6';
  const tr=document.getElementById('ml-sort-try');
  if(tr) tr.textContent=mlSortTry;
}

function mlSortPick(i){
  mlSortSel=i;
  const tx=document.getElementById('ml-sort-txt');
  if(tx) tx.innerHTML=`<b>${ML_CASES[i].lb}</b> — ${ML_CASES[i].tx}`;
  const st=document.getElementById('ml-sort-st');
  if(st){st.textContent='이 사례는 어느 바구니일까요? 바구니를 눌러 보세요.';st.style.color='';}
  mlSortRender();
}

function mlSortDrop(b){
  const st=document.getElementById('ml-sort-st');
  if(mlSortSel<0){
    if(st){st.textContent='먼저 사례 카드를 하나 고르세요.';st.style.color='';}
    return;
  }
  const i=mlSortSel;
  mlSortTry++;
  if(ML_CASES[i].a===b){
    mlSortBk[b].push(i);
    mlSortPool=mlSortPool.filter(v=>v!==i);
    mlSortSel=-1;
    const tx=document.getElementById('ml-sort-txt');
    if(tx) tx.textContent='다음 카드를 고르세요.';
    if(st){
      st.innerHTML=`✓ <b>${ML_BK_NM[b]}</b> — ${ML_CASES[i].why}`;
      st.style.color='var(--green)';
    }
    if(mlSortPool.length===0 && st){
      st.innerHTML=`✓ 6장 모두 분류 완료! 총 ${mlSortTry}회 시도했습니다.`+
        (mlSortTry===6?' 한 번도 틀리지 않았습니다 — 세 방식의 기준이 잡혔군요.':' 아래 <b>단계 2 · 정리</b>를 열어 판단 기준을 확인해 봅시다.');
      st.style.color='var(--green)';
    }
  }else{
    if(st){
      st.innerHTML=`✗ ${ML_BK_NM[b]}이 아닙니다. ${ML_BK_HINT[ML_CASES[i].a]}`;
      st.style.color='var(--red)';
    }
  }
  mlSortRender();
}

/* ── 탭 ②. 비지도학습 · k-means 스텝 시뮬레이터 ── */
const ML_KM_CLR=['#b44133','#4a6b8a','#5a7a5a','#1a1714'];  /* --red / --blue / --green / --fg */
const ML_KM_SAMPLE=[[1,1],[2,1],[2,2],[8,8],[9,8],[8,9],[5,1],[6,1],[6,2]];
const ML_KM_M={L:38,R:16,T:26,B:40};
let mlKmPts=[], mlKmCent=[], mlKmKn=3, mlKmIter=0, mlKmBusy=false;
let mlKmCalcHtml='', mlKmCalcOpen=false;

function mlKmN(v){
  return (Math.abs(v-Math.round(v))<1e-9)?String(Math.round(v)):v.toFixed(1);
}

function mlKmStatus(msg){
  const st=document.getElementById('ml-km-st');
  if(st) st.textContent=msg;
}

function mlKmLegend(){
  const lg=document.getElementById('ml-km-lg');
  if(!lg) return;
  let h='';
  for(let j=0;j<mlKmKn;j++) h+=`<span><i style="background:${ML_KM_CLR[j]}"></i>군집 ${j+1} (중심 ×)</span>`;
  h+='<span><i style="background:#fff;border:1px solid #78726a;"></i>아직 배정 전</span>';
  h+=`<span>점 ${mlKmPts.length}개 · 반복 ${mlKmIter}회</span>`;
  lg.innerHTML=h;
}

function mlKmDraw(){
  const cv=document.getElementById('ml-km-cv');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,L=ML_KM_M.L,R=ML_KM_M.R,T=ML_KM_M.T,B=ML_KM_M.B;
  const px=x=>L+(W-L-R)*x/10;
  const py=y=>H-B-(H-B-T)*y/10;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  // 격자
  ctx.strokeStyle='#ece6dd';ctx.lineWidth=1;
  for(let i=0;i<=10;i++){
    ctx.beginPath();ctx.moveTo(px(i),T);ctx.lineTo(px(i),H-B);ctx.stroke();
    ctx.beginPath();ctx.moveTo(L,py(i));ctx.lineTo(W-R,py(i));ctx.stroke();
  }
  // 축과 눈금
  ctx.strokeStyle='#d8d0c4';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(L,H-B);ctx.lineTo(W-R,H-B);ctx.stroke();
  ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(L,H-B);ctx.stroke();
  ctx.fillStyle='#78726a';ctx.font='11px monospace';
  ctx.textAlign='center';
  for(let i=0;i<=10;i+=2) ctx.fillText(i,px(i),H-B+16);
  ctx.textAlign='right';
  for(let i=0;i<=10;i+=2) ctx.fillText(i,L-6,py(i)+4);
  ctx.fillText('y',L-6,T-10);            // 눈금 숫자와 겹치지 않도록 축 위·아래로 배치
  ctx.textAlign='center';
  ctx.fillText('x',(L+W-R)/2,H-B+30);
  ctx.textAlign='left';
  // 소속선 (점 → 중심)
  if(mlKmCent.length===mlKmKn){
    ctx.lineWidth=1;
    mlKmPts.forEach(p=>{
      if(p.c<0||p.c>=mlKmCent.length) return;
      ctx.strokeStyle=ML_KM_CLR[p.c%ML_KM_CLR.length];
      ctx.globalAlpha=0.28;
      ctx.beginPath();ctx.moveTo(px(p.x),py(p.y));ctx.lineTo(px(mlKmCent[p.c].x),py(mlKmCent[p.c].y));ctx.stroke();
      ctx.globalAlpha=1;
    });
  }
  // 점
  mlKmPts.forEach(p=>{
    const X=px(p.x),Y=py(p.y);
    if(p.out){
      ctx.strokeStyle='#78726a';ctx.lineWidth=1;
      ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.arc(X,Y,10,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();ctx.arc(X,Y,p.out?6.5:5.5,0,Math.PI*2);
    ctx.fillStyle=(p.c>=0)?ML_KM_CLR[p.c%ML_KM_CLR.length]:'#fff';
    ctx.fill();
    ctx.lineWidth=1.5;ctx.strokeStyle=(p.c>=0)?'#fff':'#78726a';ctx.stroke();
    if(p.out){
      ctx.fillStyle='#78726a';ctx.font='10px monospace';ctx.textAlign='center';
      ctx.fillText('이상치',X,Y-14);
      ctx.textAlign='left';
    }
  });
  // 중심 × (점이 하나도 없을 때는 그리지 않습니다 — [모두 지우기] 직후와 화면을 일치시킵니다)
  if(mlKmPts.length>0) mlKmCent.forEach((c,j)=>{
    const X=px(c.x),Y=py(c.y),s=9;
    ctx.lineCap='round';
    ctx.strokeStyle='#fff';ctx.lineWidth=6;
    ctx.beginPath();ctx.moveTo(X-s,Y-s);ctx.lineTo(X+s,Y+s);ctx.moveTo(X+s,Y-s);ctx.lineTo(X-s,Y+s);ctx.stroke();
    ctx.strokeStyle=ML_KM_CLR[j%ML_KM_CLR.length];ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(X-s,Y-s);ctx.lineTo(X+s,Y+s);ctx.moveTo(X+s,Y-s);ctx.lineTo(X-s,Y+s);ctx.stroke();
    ctx.lineCap='butt';
  });
  // 빈 화면 안내
  if(mlKmPts.length===0){
    ctx.fillStyle='#a9a29a';ctx.font='13px sans-serif';ctx.textAlign='center';
    ctx.fillText('좌표평면을 클릭해 점을 찍거나 [예시 데이터]를 눌러 보세요',(L+W-R)/2,(T+H-B)/2);
    ctx.textAlign='left';
  }
  mlKmLegend();
}

function mlKmInitCent(){
  const n=mlKmPts.length;
  mlKmCent=[];mlKmIter=0;
  mlKmPts.forEach(p=>{p.c=-1;});
  mlKmCalcHtml='';mlKmRenderCalc();
  if(n>=mlKmKn){
    const idx=[];
    let guard=0;
    while(idx.length<mlKmKn && guard<500){
      guard++;
      const i=Math.floor(Math.random()*n);
      if(idx.indexOf(i)<0) idx.push(i);
    }
    idx.forEach(i=>mlKmCent.push({x:mlKmPts[i].x,y:mlKmPts[i].y}));
  }else{
    for(let j=0;j<mlKmKn;j++) mlKmCent.push({x:2+j*2.2,y:5});
  }
}

function mlKmSetK(k,el){
  if(mlKmBusy) return;
  mlKmKn=k;
  document.querySelectorAll('#ml-km-ks .chip').forEach(c=>c.classList.remove('on'));
  if(el) el.classList.add('on');
  mlKmInitCent();
  mlKmDraw();
  mlKmLogReset();
  mlKmStatus(`군집 수 k = ${k}. 중심 ${k}개를 무작위로 뽑았습니다. [1 Step]을 눌러 보세요.`);
}

function mlKmAdd(x,y,out){
  mlKmPts.push({x:x,y:y,c:-1,out:!!out});
  if(mlKmCent.length!==mlKmKn) mlKmInitCent();
  mlKmDraw();
}

function mlKmSample(){
  if(mlKmBusy) return;
  mlKmPts=ML_KM_SAMPLE.map(p=>({x:p[0],y:p[1],c:-1,out:false}));
  mlKmInitCent();
  mlKmDraw();
  mlKmLogReset();
  mlKmStatus('예시 데이터 9개를 불러왔습니다. 손으로 먼저 묶어 본 뒤 [1 Step]을 눌러 기계와 비교해 보세요.');
}

function mlKmClear(){
  if(mlKmBusy) return;
  mlKmPts=[];mlKmCent=[];mlKmIter=0;mlKmCalcHtml='';
  mlKmRenderCalc();
  mlKmDraw();
  mlKmLogReset();
  mlKmStatus('모두 지웠습니다. 좌표평면을 클릭해 점을 찍어 보세요.');
}

function mlKmRestart(){
  if(mlKmBusy) return;
  mlKmInitCent();
  mlKmDraw();
  mlKmLogReset();
  mlKmStatus('중심을 다시 무작위로 뽑았습니다. 처음 중심이 달라지면 결과가 어떻게 달라지는지 관찰해 보세요.');
}

function mlKmOutlier(){
  if(mlKmBusy) return;
  if(mlKmPts.length===0){
    mlKmStatus('먼저 점을 찍거나 [예시 데이터]를 불러온 뒤 이상치를 추가해 보세요.');
    return;
  }
  // 기존 점들에서 가장 멀리 떨어진 모서리를 이상치 자리로 고릅니다.
  const cand=[[0.4,0.4],[9.6,0.4],[0.4,9.6],[9.6,9.6]];
  let best=cand[0],bd=-1;
  cand.forEach(c=>{
    let dm=1e9;
    mlKmPts.forEach(p=>{
      const dx=p.x-c[0],dy=p.y-c[1];
      dm=Math.min(dm,dx*dx+dy*dy);
    });
    if(dm>bd){bd=dm;best=c;}
  });
  mlKmAdd(best[0],best[1],true);
  mlKmStatus('이상치를 하나 추가했습니다. [1 Step]을 눌러 이 점이 속한 군집의 중심(평균)이 어디로 끌려가는지 관찰하세요.');
}

function mlKmAssign(){
  const rows=[];
  mlKmPts.forEach(p=>{
    let bi=0,bd=Infinity;
    const ds=mlKmCent.map((c,j)=>{
      const dx=p.x-c.x,dy=p.y-c.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<bd){bd=d;bi=j;}
      return d;
    });
    p.c=bi;
    rows.push({x:p.x,y:p.y,ds:ds,best:bi});
  });
  return rows;
}

function mlKmMeans(){
  const to=[];
  for(let j=0;j<mlKmKn;j++){
    const ms=mlKmPts.filter(p=>p.c===j);
    if(ms.length===0){to.push({x:mlKmCent[j].x,y:mlKmCent[j].y});continue;}
    let sx=0,sy=0;
    ms.forEach(p=>{sx+=p.x;sy+=p.y;});
    to.push({x:sx/ms.length,y:sy/ms.length});
  }
  return to;
}

function mlKmBuildCalc(rows,from,to){
  let h='<h5>단계 ① 배정 — 각 점에서 중심까지의 거리 d = √((x−a)² + (y−b)²)</h5>';
  h+='<div class="ml-scroll"><table class="ml-tbl"><tr><th>점 (x, y)</th>';
  for(let j=0;j<mlKmKn;j++) h+=`<th>중심 ${j+1}</th>`;
  h+='<th>최근접</th></tr>';
  rows.slice(0,8).forEach(r=>{
    h+=`<tr><td>(${mlKmN(r.x)}, ${mlKmN(r.y)})</td>`;
    r.ds.forEach((d,j)=>{
      h+=`<td${j===r.best?' style="color:var(--green);font-weight:700;"':''}>${d.toFixed(2)}</td>`;
    });
    h+=`<td style="font-weight:700;">중심 ${r.best+1}</td></tr>`;
  });
  h+='</table></div>';
  if(rows.length>8) h+=`<p class="fx">… 나머지 ${rows.length-8}개 점은 생략했습니다.</p>`;
  h+='<h5>단계 ② 갱신 — 중심 = 소속 점들의 좌표의 평균</h5>';
  for(let j=0;j<mlKmKn;j++){
    const ms=mlKmPts.filter(p=>p.c===j);
    if(ms.length===0){
      h+=`<p class="fx" style="color:var(--red);">중심 ${j+1} — 소속된 점이 없어 자리를 그대로 둡니다.</p>`;
      continue;
    }
    const cut=ms.slice(0,6);
    const tail=(ms.length>6)?'+…':'';
    const xs=cut.map(p=>mlKmN(p.x)).join('+')+tail;
    const ys=cut.map(p=>mlKmN(p.y)).join('+')+tail;
    h+=`<p class="fx">중심 ${j+1} (점 ${ms.length}개) &nbsp; x̄ = (${xs}) ÷ ${ms.length} = ${to[j].x.toFixed(2)} &nbsp;·&nbsp; ȳ = (${ys}) ÷ ${ms.length} = ${to[j].y.toFixed(2)}<br>`+
       `&nbsp;&nbsp;→ 중심 이동 (${from[j].x.toFixed(2)}, ${from[j].y.toFixed(2)}) ⇒ (${to[j].x.toFixed(2)}, ${to[j].y.toFixed(2)})</p>`;
  }
  return h;
}

function mlKmRenderCalc(){
  const box=document.getElementById('ml-km-calc');
  if(!box) return;
  box.innerHTML=mlKmCalcHtml||'<p class="fx">아직 실행한 단계가 없습니다. [1 Step]을 누르면 이 자리에 거리 계산표와 평균(중심) 계산식이 나타납니다.</p>';
}

function mlKmToggleCalc(){
  const box=document.getElementById('ml-km-calc');
  const btn=document.getElementById('ml-km-calcbtn');
  if(!box) return;
  mlKmCalcOpen=!mlKmCalcOpen;
  box.classList.toggle('open',mlKmCalcOpen);
  if(btn) btn.textContent=mlKmCalcOpen?'계산 과정 접기 ▾':'계산 과정 펼치기 ▸';
  if(mlKmCalcOpen) mlKmRenderCalc();
}

function mlKmAnimate(from,to,cb){
  const t0=Date.now(),D=550;
  let done=false;
  const finish=()=>{
    if(done) return;
    done=true;
    mlKmCent=to.map(c=>({x:c.x,y:c.y}));
    mlKmDraw();
    cb();
  };
  const tick=()=>{
    if(done) return;
    const p=Math.min(1,(Date.now()-t0)/D);
    const e=1-Math.pow(1-p,3);
    mlKmCent=from.map((c,i)=>({x:c.x+(to[i].x-c.x)*e,y:c.y+(to[i].y-c.y)*e}));
    mlKmDraw();
    if(p<1) requestAnimationFrame(tick);
    else finish();
  };
  requestAnimationFrame(tick);
  // 브라우저 탭이 백그라운드로 가면 requestAnimationFrame이 멈춥니다.
  // 시계 기반 예비 타이머를 두어 mlKmBusy가 영구히 잠기는 일을 막습니다.
  setTimeout(finish,D+500);
}

function mlKmStep(){
  if(mlKmBusy) return;
  if(mlKmPts.length<mlKmKn){
    mlKmStatus(`점이 ${mlKmKn}개 이상 있어야 k = ${mlKmKn} 군집을 만들 수 있습니다. 좌표평면을 클릭하거나 [예시 데이터]를 눌러 주세요.`);
    return;
  }
  if(mlKmCent.length!==mlKmKn) mlKmInitCent();
  mlKmBusy=true;
  const rows=mlKmAssign();
  mlKmDraw();
  mlKmStatus('① 배정 — 각 점을 가장 가까운 중심의 색으로 물들였습니다. 곧 중심이 평균 위치로 이동합니다.');
  mlKmPhase('① 배정 단계 — 거리가 가장 가까운 중심에 점을 배정합니다','asn');
  mlKmExampleAssign(rows);
  setTimeout(()=>{
    const from=mlKmCent.map(c=>({x:c.x,y:c.y}));
    const to=mlKmMeans();
    let mv=0;
    from.forEach((c,i)=>{
      const dx=to[i].x-c.x,dy=to[i].y-c.y;
      mv=Math.max(mv,Math.sqrt(dx*dx+dy*dy));
    });
    mlKmCalcHtml=mlKmBuildCalc(rows,from,to);
    mlKmRenderCalc();
    mlKmExampleUpdate(from,to);
    mlKmAnimate(from,to,()=>{
      mlKmCent=to;
      mlKmIter++;
      mlKmBusy=false;
      mlKmDraw();
      mlKmStatus(mv<0.01
        ? `② 갱신 — 중심이 더 이상 움직이지 않습니다. ${mlKmIter}번 반복 만에 수렴했습니다.`
        : `② 갱신 — 중심을 소속 점들의 평균으로 옮겼습니다. (반복 ${mlKmIter}회 · 가장 많이 움직인 중심 ${mv.toFixed(2)}) 계속 눌러 보세요.`);
      mlKmPhase(mv<0.01?'② 갱신 단계 — 중심이 더 이상 움직이지 않습니다(수렴)':'② 갱신 단계 — 평균으로 중심을 옮깁니다','upd');
      mlKmLogPush(mlKmIter,mv);
    });
  },420);
}

/* ── 탭 ③. 강화학습 · 밴딧 보상 게임 ── */
const ML_BD_P=[0.2,0.6,0.4];
const ML_BD_NM=['A','B','C'];
const ML_BD_MAX=30;
let mlBdLog=[], mlBdN=[0,0,0], mlBdS=[0,0,0], mlBdCum=0, mlBdRev=false;

function mlBdReset(){
  mlBdLog=[];mlBdN=[0,0,0];mlBdS=[0,0,0];mlBdCum=0;mlBdRev=false;
  const box=document.getElementById('ml-bd-box');
  if(box){box.style.display='none';box.innerHTML='';}
  const rv=document.getElementById('ml-bd-reveal');
  if(rv){rv.disabled=true;rv.textContent='확률 공개 (10회 이후)';}
  const st=document.getElementById('ml-bd-st');
  if(st){st.textContent='버튼을 눌러 첫 회차를 시작하세요. (누적 보상 0)';st.style.color='';}
  mlBdCycleStage(1);
  const bd=document.getElementById('ml-bd-badge');
  if(bd){bd.textContent='버튼을 누르면 이 자리에 탐험/활용 상태가 표시됩니다.';bd.className='ml-badge';}
  mlBdRenderSlots();
  mlBdRenderBars();
  mlBdRenderLog();
}

function mlBdRenderSlots(){
  for(let i=0;i<3;i++){
    const el=document.getElementById('ml-bd-s'+i);
    if(!el) continue;
    const sub=el.querySelector('.sub');
    if(sub) sub.textContent=`시도 ${mlBdN[i]} · 보상 ${mlBdS[i]}`;
  }
}

function mlBdRenderBars(){
  const box=document.getElementById('ml-bd-bars');
  if(!box) return;
  let bi=-1,br=-1;
  for(let i=0;i<3;i++){
    if(mlBdN[i]>0){
      const r=mlBdS[i]/mlBdN[i];
      if(r>br){br=r;bi=i;}
    }
  }
  let h='';
  for(let i=0;i<3;i++){
    const n=mlBdN[i],s=mlBdS[i];
    const r=n?s/n:0;
    const w=Math.round(r*100);
    const txt=n?`${s}/${n} = ${r.toFixed(2)}`:'시도 없음';
    const tp=mlBdRev?`<span class="tp" style="left:${Math.round(ML_BD_P[i]*100)}%;"></span>`:'';
    h+=`<div class="ml-bar"><span class="lb">${ML_BD_NM[i]}</span>`+
       `<span class="tk"><span class="fl${(i===bi&&n>0)?' best':''}" style="width:${w}%;"></span>${tp}</span>`+
       `<span class="vv">${txt}${mlBdRev?` · p=${ML_BD_P[i]}`:''}</span></div>`;
  }
  if(mlBdRev) h+='<p class="status" style="margin:0.4rem 0 0;">빨간 세로선이 숨은 확률 p의 자리입니다. 내 막대가 그 선에 얼마나 가까운가요?</p>';
  box.innerHTML=h;
}

function mlBdRenderLog(){
  const tbl=document.getElementById('ml-bd-log');
  if(!tbl) return;
  let h='<tr><th>회차</th><th>선택</th><th>보상</th><th>누적</th><th>구분</th></tr>';
  if(mlBdLog.length===0){
    h+='<tr><td colspan="5" style="color:var(--muted);">아직 기록이 없습니다.</td></tr>';
  }else{
    mlBdLog.forEach(r=>{
      const kTxt=r.kind==='exploit'?'활용':'탐험';
      const kClr=r.kind==='exploit'?'var(--green)':'var(--blue)';
      h+=`<tr><td>${r.n}</td><td style="font-weight:700;">${ML_BD_NM[r.i]}</td>`+
         `<td style="color:var(--${r.r?'green':'red'});font-weight:700;">${r.r}</td><td>${r.cum}</td>`+
         `<td style="color:${kClr};font-weight:600;">${kTxt}</td></tr>`;
    });
  }
  tbl.innerHTML=h;
  const bx=document.getElementById('ml-bd-logbox');
  if(bx) bx.scrollTop=bx.scrollHeight;
}

function mlBdPull(i){
  const st=document.getElementById('ml-bd-st');
  if(mlBdLog.length>=ML_BD_MAX){
    if(st){st.textContent=`${ML_BD_MAX}회까지 기록했습니다. [확률 공개]로 결과를 확인하거나 [기록 지우고 다시]를 눌러 주세요.`;st.style.color='';}
    return;
  }
  const prevN=mlBdN.slice(),prevS=mlBdS.slice();
  const kind=mlBdJudge(i,prevN,prevS);
  const r=(Math.random()<ML_BD_P[i])?1:0;
  mlBdN[i]++;mlBdS[i]+=r;mlBdCum+=r;
  mlBdLog.push({n:mlBdLog.length+1,i:i,r:r,cum:mlBdCum,kind:kind});
  const el=document.getElementById('ml-bd-s'+i);
  if(el){
    el.classList.remove('hit','miss');
    void el.offsetWidth;
    el.classList.add(r?'hit':'miss');
    setTimeout(()=>{el.classList.remove('hit','miss');},450);
  }
  if(st){
    st.textContent=`${mlBdLog.length}회차 · ${ML_BD_NM[i]} 선택 → 보상 ${r} (누적 보상 ${mlBdCum})`;
    st.style.color=r?'var(--green)':'var(--muted)';
  }
  const rv=document.getElementById('ml-bd-reveal');
  if(rv && mlBdLog.length>=10 && !mlBdRev){
    rv.disabled=false;
    rv.textContent='확률 공개';
  }
  mlBdCyclePlay();
  mlBdBadge(kind);
  mlBdRenderSlots();
  mlBdRenderBars();
  mlBdRenderLog();
}

function mlBdReveal(){
  const st=document.getElementById('ml-bd-st');
  if(mlBdLog.length<10){
    if(st){st.textContent='먼저 10회 이상 선택해 주세요.';st.style.color='';}
    return;
  }
  mlBdRev=true;
  mlBdRenderBars();
  const N=mlBdLog.length;
  const untried=[];
  for(let i=0;i<3;i++) if(mlBdN[i]===0) untried.push(ML_BD_NM[i]);
  const rateB=mlBdN[1]/N;
  const expB=(0.6*N).toFixed(1);
  let judge;
  if(untried.length>0){
    judge=`한 번도 눌러 보지 않은 선택지(${untried.join(', ')})가 있습니다. <b>탐험이 부족</b>했군요 — 시도하지 않은 선택지의 보상률은 추정할 방법이 없습니다.`;
  }else if(rateB>=0.5){
    judge=`세 선택지를 모두 시도해 보고 B를 ${mlBdN[1]}회(전체의 ${Math.round(rateB*100)}%) 골랐습니다. <b>탐험 → 활용</b>으로 잘 갈아탔습니다.`;
  }else{
    judge=`세 선택지를 골고루 시도했지만 B의 비중이 ${Math.round(rateB*100)}%에 그쳤습니다. <b>탐험은 충분, 활용이 부족</b> — 좋아 보이는 선택을 더 반복했다면 누적 보상이 커졌을 것입니다.`;
  }
  const box=document.getElementById('ml-bd-box');
  if(box){
    box.style.display='block';
    const nExplore=mlBdLog.filter(r=>r.kind==='explore').length;
    const nExploit=mlBdLog.filter(r=>r.kind==='exploit').length;
    const eeSeq=mlBdLog.map(r=>
      `<span class="ml-eechip ${r.kind}" title="${r.n}회차 · ${ML_BD_NM[r.i]} · ${r.kind==='exploit'?'활용':'탐험'}">${r.n}${ML_BD_NM[r.i]}</span>`
    ).join('');
    box.innerHTML=
      `<strong>확률 공개 — 숨은 확률은 A 0.2 · B 0.6 · C 0.4 였습니다.</strong><br>`+
      `내 기록: 총 <b>${N}회</b> 시도, 누적 보상 <b>${mlBdCum}</b> `+
      `(A ${mlBdN[0]}회 · B ${mlBdN[1]}회 · C ${mlBdN[2]}회)<br>`+
      `${N}회 내내 B만 골랐다면 누적 보상은 평균 <b>0.6 × ${N} ≈ ${expB}</b> 정도였을 것입니다.<br>`+
      `<span style="display:block;margin-top:0.5rem;">${judge}</span>`+
      `<span style="display:block;margin-top:0.5rem;">경험적 보상률(상대도수)이 숨은 확률 p와 얼마나 어긋났는지 막대의 빨간 선으로 확인해 보세요. `+
      `시도 횟수가 적은 선택지일수록 어긋남이 큽니다 — 상대도수는 시도가 늘어야 확률에 가까워집니다.</span>`+
      `<div style="margin-top:0.7rem;"><b>내 선택 이력 되돌아보기</b> — `+
      `<span style="color:var(--blue);">탐험 ${nExplore}회</span> · `+
      `<span style="color:var(--green);">활용 ${nExploit}회</span></div>`+
      `<div class="ml-eeseq">${eeSeq}</div>`;
  }
  if(st){st.textContent='확률을 공개했습니다. 아래 단계 2 · 정리를 열어 탐험과 활용을 정리해 봅시다.';st.style.color='';}
  const rv=document.getElementById('ml-bd-reveal');
  if(rv){rv.disabled=true;rv.textContent='공개 완료';}
}

/* ── mlplay 초기화 (뷰가 없어도 core.js가 죽지 않도록 가드) ── */
(()=>{
  const root=document.getElementById('v-mlplay');
  if(!root) return;
  mlSortReset();
  mlKmInitCent();
  mlKmDraw();
  mlKmRenderCalc();
  mlBdReset();
  const cv=document.getElementById('ml-km-cv');
  if(cv){
    cv.addEventListener('click',ev=>{
      if(mlKmBusy) return;
      const r=cv.getBoundingClientRect();
      if(!r.width||!r.height) return;
      const cx=(ev.clientX-r.left)*cv.width/r.width;
      const cy=(ev.clientY-r.top)*cv.height/r.height;
      const W=cv.width,H=cv.height,L=ML_KM_M.L,R=ML_KM_M.R,T=ML_KM_M.T,B=ML_KM_M.B;
      if(cx<L-8||cx>W-R+8||cy<T-8||cy>H-B+8) return;
      let x=(cx-L)/(W-L-R)*10;
      let y=(H-B-cy)/(H-B-T)*10;
      x=Math.min(10,Math.max(0,Math.round(x*10)/10));
      y=Math.min(10,Math.max(0,Math.round(y*10)/10));
      mlKmAdd(x,y,false);
      mlKmStatus(`점 (${mlKmN(x)}, ${mlKmN(y)})을 추가했습니다. 점 ${mlKmPts.length}개 — [1 Step]으로 군집을 만들어 보세요.`);
    });
  }
})();


/* ───────────── 3차시 · 규칙으로 생각하는 AI (접두사 lg / LG_) ───────────── */
/* ═══════════════════ LOGIC (3차시: 규칙으로 생각하는 AI) — 접두사 lg ═══════════════════ */

function lgTab(n,el){
  document.querySelectorAll('#v-logic .tabs .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  document.querySelectorAll('#v-logic .tpanel').forEach(p=>p.classList.remove('on'));
  const pn=document.getElementById('lg'+n);
  if(pn) pn.classList.add('on');
}

function lgEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── 탭 ①. 진리표 실험실 ── */
const LG_GATES={
  NOT:{sym:'∼p', ko:'NOT · 부정',           arity:1, f:(p,q)=>(p?0:1),      def:'p가 참이면 ∼p는 거짓, p가 거짓이면 ∼p는 참'},
  AND:{sym:'p ∧ q', ko:'AND · 논리곱',       arity:2, f:(p,q)=>((p&&q)?1:0), def:'p와 q가 모두 참이면 참, 하나라도 거짓이면 거짓'},
  OR: {sym:'p ∨ q', ko:'OR · 논리합',        arity:2, f:(p,q)=>((p||q)?1:0), def:'p와 q 중 하나라도 참이면 참, 모두 거짓이면 거짓'},
  XOR:{sym:'p ⊕ q', ko:'XOR · 배타적 논리합', arity:2, f:(p,q)=>((p!==q)?1:0),def:'p와 q 중 하나만 참이면 참, 모두 참이거나 모두 거짓이면 거짓'},
};
const LG_ROWS=[[0,0],[0,1],[1,0],[1,1]];
let lgTTg='NOT', lgTTp=0, lgTTq=0, lgTTopen=false;
let lgTTdone={NOT:false,AND:false,OR:false,XOR:false};

function lgTTGate(g,el){
  if(!LG_GATES[g]) return;
  lgTTg=g; lgTTopen=false;
  if(el){
    document.querySelectorAll('#lg-tt-gates .chip').forEach(ch=>ch.classList.remove('on'));
    el.classList.add('on');
  }
  const fore=document.getElementById('lg-tt-fore');
  if(fore){fore.style.display='none';fore.innerHTML='';}
  const st=document.getElementById('lg-tt-st');
  if(st) st.textContent='네 칸을 모두 고른 뒤 [채점]을 누르세요.';
  lgTTTable();
  lgTTCircuit();
}

function lgTTTable(){
  const t=document.getElementById('lg-tt-tbl');
  const nm=document.getElementById('lg-tt-name');
  if(!t) return;
  const G=LG_GATES[lgTTg];
  if(nm) nm.textContent=G.ko+' — '+G.def;
  let h=`<tr><th>행</th><th>p</th><th>q</th><th>내 예측 ${G.sym}</th><th>판정</th></tr>`;
  LG_ROWS.forEach((r,i)=>{
    h+=`<tr id="lg-tr${i}">`+
       `<td><button class="lg-mini" onclick="lgTTRow(${i})" title="이 행의 p, q를 회로에 넣어 봅니다">${i+1}행 ▶</button></td>`+
       `<td>${r[0]}</td><td>${r[1]}</td>`+
       `<td><select class="lg-sel" id="lg-pd${i}" aria-label="${i+1}행 예측">`+
       `<option value="">?</option><option value="0">0</option><option value="1">1</option></select></td>`+
       `<td id="lg-mk${i}">—</td></tr>`;
  });
  t.innerHTML=h;
  lgTTMarkCur();
}

function lgTTMarkCur(){
  LG_ROWS.forEach((r,i)=>{
    const tr=document.getElementById('lg-tr'+i);
    if(!tr) return;
    tr.classList.toggle('cur', lgTTopen && r[0]===lgTTp && r[1]===lgTTq);
  });
}

function lgTTClear(){
  LG_ROWS.forEach((r,i)=>{
    const sel=document.getElementById('lg-pd'+i), mk=document.getElementById('lg-mk'+i);
    if(sel) sel.value='';
    if(mk) mk.innerHTML='—';
  });
  const st=document.getElementById('lg-tt-st');
  if(st) st.textContent='예측을 지웠습니다. 네 칸을 다시 채워 보세요.';
}

function lgTTGrade(){
  const G=LG_GATES[lgTTg];
  const st=document.getElementById('lg-tt-st');
  let filled=true;
  LG_ROWS.forEach((r,i)=>{
    const sel=document.getElementById('lg-pd'+i);
    if(!sel || sel.value==='') filled=false;
  });
  if(!filled){
    if(st) st.textContent='네 칸을 모두 고른 뒤 [채점]을 누르세요.';
    return;
  }
  const opChar={NOT:'∼',AND:'∧',OR:'∨',XOR:'⊕'}[lgTTg];
  let ok=0;
  LG_ROWS.forEach((r,i)=>{
    const sel=document.getElementById('lg-pd'+i), mk=document.getElementById('lg-mk'+i);
    if(!sel||!mk) return;
    const v=parseInt(sel.value,10), t=G.f(r[0],r[1]);
    const good=(v===t);
    if(good) ok++;
    const formula=(G.arity===1) ? `${opChar}${r[0]} = ${t}` : `${r[0]} ${opChar} ${r[1]} = ${t}`;
    mk.innerHTML=(good
      ? '<b style="color:var(--green);">✓</b>'
      : `<b style="color:var(--red);">✗ 정답 ${t}</b>`)
      + `<br><span class="lg-dim" style="font-size:0.76rem;">${formula}</span>`;
  });
  lgTTopen=true;
  if(ok===4) lgTTdone[lgTTg]=true;
  lgTTCircuit();
  const left=Object.keys(lgTTdone).filter(k=>!lgTTdone[k]);
  if(st){
    if(ok===4) st.textContent=`4/4 정답! ${G.ko} 진리표를 완성했습니다.`+
      (left.length?`  남은 연산: ${left.join(', ')}`:'  네 연산을 모두 완성했습니다!');
    else st.textContent=`${ok}/4 — 아래 회로에서 p와 q를 뒤집어 신호를 확인한 뒤 다시 채워 보세요.`;
  }
  const fore=document.getElementById('lg-tt-fore');
  if(fore){
    if(lgTTg==='XOR'){
      fore.style.display='block';
      fore.innerHTML='<strong>복선 — 이 표가 4차시 퍼셉트론의 벽이 됩니다.</strong> '+
        'XOR의 출력 열 <span class="mi">0 1 1 0</span>을 좌표평면의 네 점 (0,0)·(0,1)·(1,0)·(1,1)에 옮겨 찍어 보세요. '+
        '출력이 1인 점 (0,1)·(1,0)과 0인 점 (0,0)·(1,1)은 서로 대각선으로 마주 봅니다. '+
        '<b>직선 하나로는 이 둘을 절대 나눌 수 없습니다.</b> 1969년 민스키가 증명한 이 사실이 첫 번째 AI 겨울의 계기였습니다. '+
        '다음 차시에서 여러분이 직접 이 벽에 부딪혀 보고, 은닉층을 더해 넘습니다.';
    }else{
      fore.style.display='none';
      fore.innerHTML='';
    }
  }
}

function lgTTOpen(){
  lgTTopen=true;
  lgTTCircuit();
  const st=document.getElementById('lg-tt-st');
  if(st) st.textContent='회로를 열었습니다. 신호를 확인한 뒤 표를 채우고 [채점]을 눌러 보세요.';
}

function lgTTToggle(w){
  if(w==='p') lgTTp=lgTTp?0:1;
  else lgTTq=lgTTq?0:1;
  lgTTCircuit();
}

function lgTTRow(i){
  const r=LG_ROWS[i];
  if(!r) return;
  lgTTp=r[0]; lgTTq=r[1];
  lgTTopen=true;
  lgTTCircuit();
}

function lgTTCircuit(){
  const box=document.getElementById('lg-tt-cir');
  if(!box) return;
  const inputs=document.getElementById('lg-tt-inputs');
  const out=document.getElementById('lg-tt-out');
  const peek=document.getElementById('lg-tt-peek');
  if(peek) peek.style.display=lgTTopen?'none':'inline-block';
  if(!lgTTopen){
    box.innerHTML='<div class="lg-lock">예측한 진리표를 <b>[채점]</b>하면 회로도가 열립니다.<br>'+
      '먼저 스스로 생각해 보는 것이 오늘의 핵심입니다.</div>';
    if(inputs) inputs.style.display='none';
    if(out) out.textContent='';
    lgTTMarkCur();
    return;
  }
  if(inputs) inputs.style.display='flex';
  const G=LG_GATES[lgTTg];
  const one=(G.arity===1);
  const p=lgTTp, q=lgTTq;
  const y=G.f(p,q);
  const ON='var(--green)', OFF='var(--border)';
  const wc=v=>(v?ON:OFF), ww=v=>(v?4:2);

  let body='';
  if(lgTTg==='NOT'){
    body='<path class="lg-gate" d="M150,62 L216,100 L150,138 Z"></path>'+
         '<circle class="lg-gate" cx="224" cy="100" r="8"></circle>'+
         '<text class="lg-t" x="176" y="105" text-anchor="middle">NOT</text>';
  }else if(lgTTg==='AND'){
    body='<path class="lg-gate" d="M150,60 L192,60 A40,40 0 0 1 192,140 L150,140 Z"></path>'+
         '<text class="lg-t" x="180" y="105" text-anchor="middle">AND</text>';
  }else{
    body='<path class="lg-gate" d="M148,60 Q196,62 232,100 Q196,138 148,140 Q170,100 148,60 Z"></path>'+
         `<text class="lg-t" x="184" y="105" text-anchor="middle">${lgTTg}</text>`;
    if(lgTTg==='XOR') body='<path class="lg-gate2" d="M134,60 Q156,100 134,140"></path>'+body;
  }

  let wires='';
  if(one){
    wires+=`<line x1="40" y1="100" x2="150" y2="100" stroke="${wc(p)}" stroke-width="${ww(p)}" stroke-linecap="round"></line>`+
           `<circle cx="40" cy="100" r="6" fill="${wc(p)}"></circle>`+
           `<text class="lg-t" x="16" y="105">p</text>`+
           `<text class="lg-t" x="92" y="90" text-anchor="middle">${p}</text>`+
           `<text class="lg-t sm" x="40" y="152">NOT은 입력 p 하나만 사용합니다</text>`;
  }else{
    wires+=`<line x1="40" y1="62" x2="150" y2="62" stroke="${wc(p)}" stroke-width="${ww(p)}" stroke-linecap="round"></line>`+
           `<circle cx="40" cy="62" r="6" fill="${wc(p)}"></circle>`+
           `<text class="lg-t" x="16" y="67">p</text>`+
           `<text class="lg-t" x="92" y="52" text-anchor="middle">${p}</text>`+
           `<line x1="40" y1="138" x2="150" y2="138" stroke="${wc(q)}" stroke-width="${ww(q)}" stroke-linecap="round"></line>`+
           `<circle cx="40" cy="138" r="6" fill="${wc(q)}"></circle>`+
           `<text class="lg-t" x="16" y="143">q</text>`+
           `<text class="lg-t" x="92" y="132" text-anchor="middle">${q}</text>`;
  }
  wires+=`<line x1="232" y1="100" x2="330" y2="100" stroke="${wc(y)}" stroke-width="${ww(y)}" stroke-linecap="round"></line>`+
         `<text class="lg-t" x="281" y="90" text-anchor="middle">${y}</text>`;

  let rays='';
  if(y){
    // 전구 밑동(base)을 피해 위·옆으로만 빛살을 그립니다.
    const R=[[0,-34],[25,-24],[34,-4],[-34,-4],[-25,-24],[30,18],[-30,18]];
    R.forEach(d=>{
      const x1=356+d[0]*0.72, y1=100+d[1]*0.72, x2=356+d[0], y2=100+d[1];
      rays+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round"></line>`;
    });
  }
  const bulb=
    `<circle cx="356" cy="100" r="22" fill="${y?'var(--accent)':'var(--bg)'}" stroke="${y?'var(--fg)':'var(--border)'}" stroke-width="2"></circle>`+
    `<rect x="347" y="121" width="18" height="8" rx="2" fill="${y?'var(--fg)':'var(--border)'}"></rect>`+
    `<text class="lg-t" x="356" y="106" text-anchor="middle">${y}</text>`+
    `<text class="lg-t sm" x="356" y="152" text-anchor="middle">출력 ${y} (${y?'참':'거짓'})</text>`;

  box.innerHTML=`<svg class="lg-svg" viewBox="0 0 440 175" role="img" `+
    `aria-label="${lgTTg} 게이트 회로도 — p=${p}, q=${q}, 출력 ${y}">`+
    rays+wires+body+bulb+
    `<text class="lg-t sm" x="4" y="18">${G.sym}</text></svg>`;

  const pv=document.getElementById('lg-tt-pv'), qv=document.getElementById('lg-tt-qv');
  if(pv) pv.textContent=p;
  if(qv) qv.textContent=q;
  const qb=document.getElementById('lg-tt-qbtn');
  if(qb){qb.disabled=one; qb.style.opacity=one?'0.35':'';}
  if(out) out.textContent=one
    ? `∼p : p=${p} → 출력 ${y}   (초록 굵은 선 = 신호 1, 옅은 선 = 신호 0)`
    : `${G.sym} : p=${p}, q=${q} → 출력 ${y}   (초록 굵은 선 = 신호 1, 옅은 선 = 신호 0)`;
  lgTTMarkCur();
}

/* ── 탭 ②-A. 전문가 시스템 — 증상 진단 ── */
const LG_ES_FACTS=[
  {id:'fever', n:'고열'},        {id:'cough', n:'기침'},
  {id:'ache',  n:'근육통'},      {id:'head',  n:'두통'},
  {id:'throat',n:'인후통'},      {id:'diar',  n:'설사'},
  {id:'sneez', n:'재채기'},      {id:'nose',  n:'콧물'},
  {id:'stuff', n:'코막힘'},      {id:'smell', n:'후각·미각 이상'},
];
const LG_ES_RULES=[
  {n:'①', cond:['고열','기침','근육통','두통','인후통','설사'], out:['코로나19','독감'],
   ifTxt:'고열, 기침, 근육통, 두통, 인후통, 설사가 있으면', thenTxt:'코로나19이거나 독감이다.'},
  {n:'②', cond:['재채기','콧물','코막힘','인후통'], out:['비염','감기'],
   ifTxt:'재채기, 콧물, 코막힘, 인후통이 있으면', thenTxt:'비염이거나 감기이다.'},
  {n:'③', cond:['후각·미각 이상'], out:['코로나19'],
   ifTxt:'후각 또는 미각 기능을 상실하면', thenTxt:'코로나19이다.'},
];
const LG_ES_PRESETS=[
  ['고열','기침','후각·미각 이상'],
  ['재채기','콧물'],
  ['고열','콧물'],
];

function lgEsMode(m,el){
  if(el){
    document.querySelectorAll('#lg-es-modes .chip').forEach(ch=>ch.classList.remove('on'));
    el.classList.add('on');
  }
  const a=document.getElementById('lg-es-a'), b=document.getElementById('lg-es-b');
  if(a) a.style.display=(m===0)?'block':'none';
  if(b) b.style.display=(m===1)?'block':'none';
}

function lgEsBuild(){
  const fb=document.getElementById('lg-es-facts');
  if(fb){
    fb.innerHTML=LG_ES_FACTS.map(f=>
      `<label class="lg-fact"><input type="checkbox" id="lg-f-${f.id}" onchange="lgEsRun()">${lgEsc(f.n)}</label>`
    ).join('');
  }
  const kb=document.getElementById('lg-es-kb');
  if(kb){
    kb.innerHTML=LG_ES_RULES.map((r,i)=>
      `<div class="lg-kb" id="lg-kb${i}"><span class="rn">규칙 ${r.n}</span>`+
      `<p><b>IF</b> ${lgEsc(r.ifTxt)} <b>THEN</b> ${lgEsc(r.thenTxt)}</p>`+
      `<p style="font-family:var(--mono);font-size:0.72rem;color:var(--muted);">조건 = { ${r.cond.join(', ')} } 중 하나 이상`+
      `　→　후보 = { ${r.out.join(', ')} }</p></div>`
    ).join('');
  }
}

function lgEsPreset(k){
  const names=(k<0)?[]:(LG_ES_PRESETS[k]||[]);
  LG_ES_FACTS.forEach(f=>{
    const el=document.getElementById('lg-f-'+f.id);
    if(el) el.checked=(names.indexOf(f.n)>=0);
  });
  lgEsRun();
}

function lgEsRun(){
  const tr=document.getElementById('lg-es-trace');
  const cc=document.getElementById('lg-es-concl');
  if(!tr||!cc) return;
  const names=LG_ES_FACTS.filter(f=>{
    const el=document.getElementById('lg-f-'+f.id);
    return !!(el&&el.checked);
  }).map(f=>f.n);

  LG_ES_RULES.forEach((r,i)=>{
    const el=document.getElementById('lg-kb'+i);
    if(!el) return;
    el.classList.toggle('on', r.cond.some(c=>names.indexOf(c)>=0));
  });

  if(!names.length){
    tr.innerHTML='<p class="lg-dim">증상(사실)을 하나 이상 체크하면 추론 엔진이 규칙을 찾기 시작합니다.</p>';
    cc.style.display='none'; cc.innerHTML=''; cc.className='lg-concl';
    return;
  }

  let cand=null, k=0, html='';
  LG_ES_RULES.forEach(r=>{
    const m=r.cond.filter(c=>names.indexOf(c)>=0);
    if(!m.length) return;
    k++;
    const before=cand;
    const next=(cand===null)?r.out.slice():cand.filter(x=>r.out.indexOf(x)>=0);
    html+='<div class="lg-fire">'+
      `<p class="lg-fn">발동 ${k} · 규칙 ${r.n}</p>`+
      `<p><b>IF</b> ${lgEsc(r.ifTxt)}</p>`+
      `<p>일치한 사실 : ${m.map(x=>`<span class="lg-tag">${lgEsc(x)}</span>`).join('')}</p>`+
      `<p><b>THEN</b> ${lgEsc(r.thenTxt)}　후보 = { ${r.out.join(', ')} }</p>`+
      `<p class="lg-ac">누적 후보 ${before===null?'':'{ '+before.join(', ')+' } ∩ '}`+
      `{ ${r.out.join(', ')} } = ${next.length?('{ '+next.join(', ')+' }'):'∅ (공집합)'}</p>`+
      '</div>';
    cand=next;
  });

  if(!k){
    tr.innerHTML='<p class="lg-dim">체크한 사실에 해당하는 규칙이 지식 베이스에 없습니다. — 규칙이 없으면 전문가 시스템은 아무 결론도 내지 못합니다.</p>';
    cc.style.display='block'; cc.className='lg-concl bad';
    cc.innerHTML='<b>결론을 낼 수 없습니다.</b> 지식 베이스에 이 증상을 다루는 규칙이 없습니다. '+
      '전문가 시스템의 성능은 사람이 적어 넣은 규칙의 양과 질에 그대로 묶여 있습니다.';
    return;
  }

  tr.innerHTML=html;
  cc.style.display='block';
  if(!cand.length){
    cc.className='lg-concl bad';
    cc.innerHTML='<b>규칙 충돌 — 후보가 공집합(∅)이 되었습니다.</b> '+
      '두 규칙이 서로 다른 결론을 가리켜 교집합이 비었습니다. 규칙만으로는 "둘 다 조금씩 그럴듯하다"를 표현할 수 없습니다. '+
      '그래서 실제 전문가 시스템은 0과 1 사이의 값을 다루는 <b>퍼지 이론</b>과 <b>확률적 방법</b>을 함께 사용합니다. '+
      '이것이 오늘 핵심 질문의 답 절반입니다 — 규칙 기반이 멈추는 지점.';
  }else if(cand.length===1){
    cc.className='lg-concl ok';
    cc.innerHTML=`<b>결론 : ${lgEsc(cand[0])}</b> — 발동한 규칙 ${k}개의 후보 집합을 차례로 교집합하여 하나로 좁혔습니다. `+
      '이것이 추론 엔진이 하는 일입니다. 사실을 하나 더 켜거나 끄면 결론이 어떻게 달라지는지도 확인해 보세요.';
  }else{
    cc.className='lg-concl';
    cc.innerHTML=`<b>아직 좁혀지지 않았습니다 — 후보 { ${cand.join(', ')} }</b> `+
      '규칙만으로는 여기까지입니다. 결론을 확정하려면 <b>사실(증상)이 더 필요</b>합니다. '+
      '어떤 증상을 하나 더 알면 후보가 1개로 줄어들까요? 체크해 보며 찾아보세요.';
  }
}

/* ── 탭 ②-B. 전문가 시스템 — 나에게 맞는 반려동물 찾기 ── */
const LG_PET={
  start:{q:'하루에 산책·놀이로 함께할 수 있는 시간은 얼마인가요?',a:[
    {t:'30분 미만',to:'n1',rule:'IF 함께할 시간 < 30분 THEN 활동량이 적은 반려동물'},
    {t:'30분 ~ 1시간',to:'n2',rule:'IF 30분 ≤ 함께할 시간 < 1시간 THEN 실내 활동형 반려동물'},
    {t:'1시간 이상',to:'n3',rule:'IF 함께할 시간 ≥ 1시간 THEN 활동량이 많은 반려동물'}]},
  n1:{q:'집을 비우는 시간이 하루 8시간을 넘나요?',a:[
    {t:'넘는다',to:'L_fish',rule:'IF 활동량 적음 ∧ 장시간 부재 THEN 돌봄 부담이 가장 적은 반려동물'},
    {t:'넘지 않는다',to:'L_ham',rule:'IF 활동량 적음 ∧ ∼장시간 부재 THEN 소형 설치류'}]},
  n2:{q:'동물의 털에 알레르기가 있나요?',a:[
    {t:'있다',to:'L_nofur',rule:'IF 실내 활동형 ∧ 털 알레르기 THEN 털이 없는 반려동물'},
    {t:'없다',to:'n2b',rule:'IF 실내 활동형 ∧ ∼털 알레르기 THEN 반려묘 또는 소형견 후보'}]},
  n2b:{q:'혼자 있는 시간을 잘 견디는 성향이 좋나요, 사람을 잘 따르는 성향이 좋나요?',a:[
    {t:'혼자서도 잘 지내면 좋겠다',to:'L_cat',rule:'IF 독립적인 성향 선호 THEN 반려묘'},
    {t:'사람을 잘 따르면 좋겠다',to:'L_small',rule:'IF 사람 친화적 성향 선호 THEN 소형견'}]},
  n3:{q:'함께 지낼 공간이 넓은 편인가요? (마당 또는 넓은 거실)',a:[
    {t:'넓다',to:'L_big',rule:'IF 활동량 많음 ∧ 넓은 공간 THEN 중·대형견'},
    {t:'좁다',to:'L_small',rule:'IF 활동량 많음 ∧ ∼넓은 공간 THEN 소형견 (매일 산책 필수)'}]},
  L_fish:{r:'관상어 (구피 · 베타)',d:'물 관리만 해 주면 되어 돌봄 시간이 가장 적게 듭니다. 다만 교감의 방식이 다르다는 점을 감안해야 합니다.'},
  L_ham:{r:'햄스터 · 기니피그',d:'좁은 공간에서도 기를 수 있고 돌봄 시간이 짧습니다. 야행성이라 활동 시간이 사람과 다를 수 있습니다.'},
  L_nofur:{r:'관상어 · 거북 등 털이 없는 반려동물',d:'털 알레르기가 있는 경우 우선 고려됩니다. 온도·수질 관리 장비가 필요합니다.'},
  L_cat:{r:'반려묘 (고양이)',d:'독립적인 성향으로 혼자 있는 시간을 비교적 잘 견딥니다. 스크래처·화장실 관리가 필요합니다.'},
  L_small:{r:'소형견 (몰티즈 · 푸들 등)',d:'사람을 잘 따르고 실내 공간에서도 지낼 수 있습니다. 다만 매일의 산책과 사회화 훈련이 꼭 필요합니다.'},
  L_big:{r:'중·대형견 (리트리버 · 셰퍼드 등)',d:'활동량이 많아 넓은 공간과 긴 산책이 필요합니다. 사료·의료비 등 유지 비용도 큽니다.'},
};
let lgPetNode='start', lgPetPath=[];

function lgPetReset(){
  lgPetNode='start'; lgPetPath=[];
  lgPetRender();
}

function lgPetAnswer(i){
  const nd=LG_PET[lgPetNode];
  if(!nd||!nd.a||!nd.a[i]) return;
  const ch=nd.a[i];
  lgPetPath.push({rule:ch.rule, ans:ch.t, q:nd.q});
  lgPetNode=ch.to;
  lgPetRender();
}

function lgPetRender(){
  const qb=document.getElementById('lg-pet-q');
  const ab=document.getElementById('lg-pet-a');
  const pb=document.getElementById('lg-pet-path');
  if(!qb||!ab||!pb) return;
  const nd=LG_PET[lgPetNode];
  if(!nd){lgPetReset();return;}
  if(nd.r){
    qb.className='lg-concl ok';
    qb.innerHTML=`<b>추천 결론 : ${lgEsc(nd.r)}</b><br>${lgEsc(nd.d)}`+
      '<br><br>이 결론은 <b>전문가가 미리 적어 둔 규칙</b>을 차례로 적용한 결과일 뿐입니다. '+
      '규칙에 없는 상황(예: 털 알레르기가 있지만 큰 개를 기르고 싶다)이나 개인의 사정은 담지 못합니다. '+
      '전문가 시스템의 한계를 활동지에 한 줄로 적어 봅시다.';
    ab.innerHTML='';
  }else{
    qb.className='lg-concl';
    qb.innerHTML=`<b>질문 ${lgPetPath.length+1}.</b> ${lgEsc(nd.q)}`;
    ab.innerHTML=nd.a.map((c,i)=>`<button class="btn" onclick="lgPetAnswer(${i})">${lgEsc(c.t)}</button>`).join('');
  }
  pb.innerHTML=lgPetPath.length
    ? lgPetPath.map((s,i)=>`<li>규칙 ${i+1} 발동 — ${lgEsc(s.rule)}<br>　(대답: ${lgEsc(s.ans)})</li>`).join('')
    : '<li style="border-left-color:var(--border);color:var(--muted);">아직 발동한 규칙이 없습니다. 질문에 답해 보세요.</li>';
}

/* ── 탭 ③. 순서도 트레이서 (이차방정식의 실근 개수) ── */
const LG_FC_NODES=['start','in','a0','notq','d','dgt','two','deq','one','zero','end'];
let lgFcSteps=[], lgFcI=-1, lgFcPredV='', lgFcRes='';

function lgFmt(x){
  if(typeof x!=='number'||!isFinite(x)) return '—';
  const r=Math.round(x*1e6)/1e6;
  return String(r);
}

function lgFcRead(){
  const a=parseFloat((document.getElementById('lg-fc-a')||{}).value);
  const b=parseFloat((document.getElementById('lg-fc-b')||{}).value);
  const c=parseFloat((document.getElementById('lg-fc-c')||{}).value);
  return {a:a,b:b,c:c};
}

function lgFcPred(v,el){
  lgFcPredV=v;
  if(el){
    document.querySelectorAll('#lg-fc-preds .chip').forEach(ch=>ch.classList.remove('on'));
    el.classList.add('on');
  }
  const st=document.getElementById('lg-fc-st');
  if(st) st.textContent='예측을 기록했습니다. [한 단계]를 눌러 순서도를 따라가 보세요.';
}

function lgFcPreset(a,b,c,el){
  const ea=document.getElementById('lg-fc-a'), eb=document.getElementById('lg-fc-b'), ec=document.getElementById('lg-fc-c');
  if(ea) ea.value=a;
  if(eb) eb.value=b;
  if(ec) ec.value=c;
  if(el){
    document.querySelectorAll('#lg-fc-pre .chip').forEach(ch=>ch.classList.remove('on'));
    el.classList.add('on');
  }
  lgFcReset();
}

function lgFcBuild(){
  const v=lgFcRead();
  const a=v.a, b=v.b, c=v.c;
  const S=[];
  if(isNaN(a)||isNaN(b)||isNaN(c)) return null;
  S.push({node:'start', set:{}, msg:'시작 — 순서도의 출발점입니다.'});
  S.push({node:'in', set:{a:a,b:b,c:c}, msg:`입력 — a = ${lgFmt(a)},  b = ${lgFmt(b)},  c = ${lgFmt(c)}`});
  const isZeroA=(Math.abs(a)<1e-12);
  S.push({node:'a0', set:{}, msg:`판단 — a = 0 인가?  a = ${lgFmt(a)} 이므로 ${isZeroA?'예':'아니요'}`});
  if(isZeroA){
    S.push({node:'notq', set:{res:'이차방정식이 아니다'}, msg:'출력 — a = 0 이면 이차항이 없으므로 이차방정식이 아닙니다.', res:'X'});
  }else{
    const D=b*b-4*a*c;
    S.push({node:'d', set:{D:D}, msg:`처리 — D = b² − 4ac = (${lgFmt(b)})² − 4·(${lgFmt(a)})·(${lgFmt(c)}) = ${lgFmt(D)}`});
    const gt=(D>1e-12), eq=(Math.abs(D)<=1e-12);
    S.push({node:'dgt', set:{}, msg:`판단 — D > 0 인가?  D = ${lgFmt(D)} 이므로 ${gt?'예':'아니요'}`});
    if(gt){
      S.push({node:'two', set:{res:'서로 다른 두 실근 (2개)'}, msg:'출력 — D > 0 이므로 서로 다른 두 실근을 가집니다.', res:'2'});
    }else{
      S.push({node:'deq', set:{}, msg:`판단 — D = 0 인가?  D = ${lgFmt(D)} 이므로 ${eq?'예':'아니요'}`});
      if(eq) S.push({node:'one', set:{res:'중근 (실근 1개)'}, msg:'출력 — D = 0 이므로 중근, 즉 실근이 1개입니다.', res:'1'});
      else   S.push({node:'zero', set:{res:'실근 없음 (0개)'}, msg:'출력 — D < 0 이므로 실근이 없습니다.', res:'0'});
    }
  }
  S.push({node:'end', set:{}, msg:'끝 — 알고리즘이 종료되었습니다.'});
  return S;
}

function lgFcHi(){
  const cur=(lgFcI>=0&&lgFcSteps[lgFcI])?lgFcSteps[lgFcI].node:'';
  const done={};
  for(let i=0;i<lgFcI;i++) done[lgFcSteps[i].node]=1;
  LG_FC_NODES.forEach(k=>{
    const el=document.getElementById('lg-n-'+k);
    if(!el) return;
    el.classList.remove('on','done');
    if(k===cur) el.classList.add('on');
    else if(done[k]) el.classList.add('done');
  });
}

function lgFcVars(){
  const t=document.getElementById('lg-fc-vars');
  if(!t) return;
  const v={};
  for(let i=0;i<=lgFcI;i++){
    const s=lgFcSteps[i];
    if(!s) break;
    Object.keys(s.set).forEach(k=>{v[k]=s.set[k];});
  }
  const cell=x=>(x===undefined?'<span style="color:var(--muted);">—</span>':(typeof x==='number'?lgFmt(x):lgEsc(x)));
  t.innerHTML='<tr><th>변수</th><th>값</th></tr>'+
    `<tr><td>a</td><td>${cell(v.a)}</td></tr>`+
    `<tr><td>b</td><td>${cell(v.b)}</td></tr>`+
    `<tr><td>c</td><td>${cell(v.c)}</td></tr>`+
    `<tr><td>D</td><td>${cell(v.D)}</td></tr>`+
    `<tr><td>판정</td><td>${cell(v.res)}</td></tr>`;
}

function lgFcLog(){
  const el=document.getElementById('lg-fc-log');
  if(!el) return;
  if(lgFcI<0){el.innerHTML='<span style="color:var(--muted);">아직 실행하지 않았습니다.</span>';return;}
  let h='';
  for(let i=0;i<=lgFcI;i++){
    const s=lgFcSteps[i];
    if(!s) break;
    const last=(i===lgFcI);
    h+=`<div style="margin-bottom:0.2rem;color:var(--${last?'fg':'muted'});">${last?'▶ ':'　'}${lgEsc(s.msg)}</div>`;
  }
  el.innerHTML=h;
}

function lgFcRender(){
  lgFcHi(); lgFcVars(); lgFcLog();
}

function lgFcReset(){
  lgFcSteps=[]; lgFcI=-1; lgFcRes='';
  lgFcRender();
  const st=document.getElementById('lg-fc-st');
  if(st) st.textContent='a, b, c를 정하고 예측을 고른 뒤 [한 단계]를 눌러 보세요.';
}

function lgFcStep(){
  const st=document.getElementById('lg-fc-st');
  if(!lgFcSteps.length){
    const S=lgFcBuild();
    if(!S){if(st) st.textContent='a, b, c를 모두 수로 채워 주세요.';return;}
    lgFcSteps=S; lgFcI=-1;
  }
  if(lgFcI>=lgFcSteps.length-1){
    if(st) st.textContent='순서도의 끝에 도착했습니다. [처음부터]를 누르거나 a, b, c를 바꿔 다시 실행해 보세요.';
    return;
  }
  lgFcI++;
  const s=lgFcSteps[lgFcI];
  if(s.res) lgFcRes=s.res;
  lgFcRender();
  if(st){
    if(lgFcI===lgFcSteps.length-1) st.innerHTML=lgFcVerdict();
    else st.textContent=`단계 ${lgFcI+1} / ${lgFcSteps.length} — ${s.msg}`;
  }
}

function lgFcAll(){
  const st=document.getElementById('lg-fc-st');
  if(!lgFcSteps.length){
    const S=lgFcBuild();
    if(!S){if(st) st.textContent='a, b, c를 모두 수로 채워 주세요.';return;}
    lgFcSteps=S; lgFcI=-1;
  }
  lgFcSteps.forEach(s=>{if(s.res) lgFcRes=s.res;});
  lgFcI=lgFcSteps.length-1;
  lgFcRender();
  if(st) st.innerHTML=lgFcVerdict();
}

function lgFcVerdict(){
  const LAB={'2':'서로 다른 두 실근 (2개)','1':'중근 (1개)','0':'실근 없음 (0개)','X':'이차방정식이 아니다'};
  const real=LAB[lgFcRes]||'—';
  if(!lgFcPredV) return `실행 완료 — 결과는 <b>${real}</b> 입니다. 다음에는 예측을 먼저 고르고 실행해 보세요.`;
  const ok=(lgFcPredV===lgFcRes);
  const mine=LAB[lgFcPredV]||'—';
  return ok
    ? `<span style="color:var(--green);">✓ 예측 적중!</span> 내 예측 <b>${mine}</b> = 순서도의 결과 <b>${real}</b>. 어느 판단 기호에서 갈렸는지 실행 기록으로 확인해 보세요.`
    : `<span style="color:var(--red);">✗ 예측과 다릅니다.</span> 내 예측 <b>${mine}</b> / 순서도의 결과 <b>${real}</b>. 실행 기록에서 D의 값과 판단 기호의 답을 다시 따라가 봅시다.`;
}

/* ── logic 초기화 (뷰가 없어도 core.js가 죽지 않도록 가드) ── */
(()=>{
  const root=document.getElementById('v-logic');
  if(!root) return;
  lgTTTable();
  lgTTCircuit();
  lgEsBuild();
  lgEsRun();
  lgPetReset();
  lgFcReset();
  ['lg-fc-a','lg-fc-b','lg-fc-c'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('input',()=>{
      document.querySelectorAll('#lg-fc-pre .chip').forEach(ch=>ch.classList.remove('on'));
      lgFcReset();
    });
  });
})();


/* ───────────── 4차시 · 퍼셉트론과 XOR — 확장 블록 (접두사 pcx / PCX_) ───────────── */
/* ═══════════ PERCEPTRON 확장 (4차시: 퍼셉트론과 XOR의 벽 넘기) — 접두사 pcx ═══════════ */
/* 기존 pc* 블록(퍼셉트론 조작실 = 활동 1)은 그대로 두고, 표제부·도입·XOR 도전·정리만 새로 얹습니다.
   core.js 말미(startRouter IIFE 앞뒤 어디든)에 그대로 붙여 넣으면 됩니다. */

function pcxTab(n,el){
  document.querySelectorAll('#v-perceptron .tabs .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  document.querySelectorAll('#v-perceptron .tpanel').forEach(p=>p.classList.remove('on'));
  const pn=document.getElementById('pcx'+n);
  if(pn) pn.classList.add('on');
  // 탭 0(활동 1)으로 돌아오면 기존 pc* 그래프를 다시 그립니다.
  if(n===0){try{if(typeof pcUpdate==='function' && document.getElementById('pc-graph')) pcUpdate();}catch(e){}}
  if(n===1){pcxRender();if(pcxS.hidden){pcxDraw2();}}
}

/* ── 전개 활동 2. XOR 도전 ── */
/* 캔버스 색은 index.html의 :root 토큰 값과 동일한 값을 사용합니다(기존 pc* 코드와 같은 관례). */
const PCX_COL={fg:'#1a1714',mut:'#78726a',bd:'#d8d0c4',acc:'#c8b9a6',red:'#b44133',green:'#5a7a5a',blue:'#4a6b8a'};
const PCX_VMIN=-0.4, PCX_VMAX=1.4;
const PCX_PTS=[[0,0],[0,1],[1,0],[1,1]];
const PCX_TARGET={and:[0,0,0,1],or:[0,1,1,1],xor:[0,1,1,0]};
const PCX_MODENAME={and:'AND · 논리곱',or:'OR · 논리합',xor:'XOR · 배타적 논리합'};
const PCX_HINT=[
  'AND 힌트 — w₁ = w₂ = 1 로 두면 네 줄의 가중합이 차례로 0, 1, 1, 2 가 됩니다. 1과 2 사이에 θ를 놓으면 (1,1)만 1이 됩니다. θ = 1.5 를 시도해 보세요.',
  'OR 힌트 — w₁ = w₂ = 1 이면 가중합은 0, 1, 1, 2. 이번에는 0과 1 사이에 θ를 놓아야 (0,0)만 0이 됩니다. θ = 0.5 를 시도해 보세요.',
  'XOR 힌트 — 사실 정답이 없습니다. (1,0)과 (0,1)에서 1이 되려면 w₁ ≥ θ 이고 w₂ ≥ θ, 두 식을 더하면 w₁ + w₂ ≥ 2θ. 그런데 (1,1)에서 0이 되려면 w₁ + w₂ < θ 여야 합니다. θ가 양수인 한 둘은 결코 함께 성립하지 않습니다. [은닉층 추가]를 눌러 보세요.',
];

let pcxS={mode:'and',w1:0.2,w2:0.2,th:1.0,tries:0,solved:{and:false,or:false,xor:false},hidden:false,ff:-1};
let pcxInited=false;

function pcxOut(x1,x2){
  return (pcxS.w1*x1+pcxS.w2*x2 >= pcxS.th-1e-9)?1:0;
}

function pcxNum(v){return (v===0?0:v).toFixed(1);}

/* 사각 영역을 반평면으로 자릅니다(Sutherland–Hodgman). ge=true면 w1x+w2y ≥ th 쪽을 남깁니다. */
function pcxRect(){
  return [[PCX_VMIN,PCX_VMIN],[PCX_VMAX,PCX_VMIN],[PCX_VMAX,PCX_VMAX],[PCX_VMIN,PCX_VMAX]];
}
function pcxClip(poly,w1,w2,th,ge){
  if(!poly||poly.length<3) return [];
  const f=p=>{const v=w1*p[0]+w2*p[1]-th;return ge?v:-v;};
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    const fa=f(a),fb=f(b);
    if(fa>=0) out.push(a);
    if((fa>=0)!==(fb>=0)){
      const t=fa/(fa-fb);
      out.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]);
    }
  }
  return out;
}
/* 직선 w1x+w2y=th 를 화면 사각형으로 잘라 선분 두 끝점을 돌려줍니다. */
function pcxLineSeg(w1,w2,th){
  if(Math.abs(w1)<1e-12&&Math.abs(w2)<1e-12) return null;
  const R=pcxRect(), pts=[];
  for(let i=0;i<4;i++){
    const a=R[i],b=R[(i+1)%4];
    const fa=w1*a[0]+w2*a[1]-th, fb=w1*b[0]+w2*b[1]-th;
    if(Math.abs(fa)<1e-12){pts.push(a);continue;}
    if((fa<0)!==(fb<0)){const t=fa/(fa-fb);pts.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]);}
  }
  if(pts.length<2) return null;
  const p=pts[0], q=pts[pts.length-1];
  if(Math.abs(p[0]-q[0])<1e-9 && Math.abs(p[1]-q[1])<1e-9) return null;
  return [p,q];
}

function pcxBase(cv){
  const ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,pad=48;
  const V0=PCX_VMIN,V1=PCX_VMAX;
  const toSX=x=>pad+(x-V0)/(V1-V0)*(W-2*pad);
  const toSY=y=>H-pad-(y-V0)/(V1-V0)*(H-2*pad);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle=PCX_COL.bd;ctx.lineWidth=1;
  [0,0.5,1].forEach(g=>{
    ctx.beginPath();ctx.moveTo(toSX(g),toSY(V0));ctx.lineTo(toSX(g),toSY(V1));ctx.stroke();
    ctx.beginPath();ctx.moveTo(toSX(V0),toSY(g));ctx.lineTo(toSX(V1),toSY(g));ctx.stroke();
  });
  ctx.strokeStyle=PCX_COL.mut;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(toSX(V0),toSY(0));ctx.lineTo(toSX(V1),toSY(0));ctx.stroke();
  ctx.beginPath();ctx.moveTo(toSX(0),toSY(V0));ctx.lineTo(toSX(0),toSY(V1));ctx.stroke();
  ctx.fillStyle=PCX_COL.mut;ctx.font='11px "Noto Sans KR"';
  ctx.textAlign='center';
  [0.5,1].forEach(g=>ctx.fillText(String(g),toSX(g),toSY(0)+16));
  ctx.textAlign='right';
  [0.5,1].forEach(g=>ctx.fillText(String(g),toSX(0)-6,toSY(g)+4));
  ctx.fillText('O',toSX(0)-6,toSY(0)+16);
  ctx.fillStyle=PCX_COL.fg;ctx.font='bold 12px "Noto Sans KR"';
  ctx.textAlign='right';ctx.fillText('x1',toSX(V1)-2,toSY(0)+18);
  ctx.textAlign='left';ctx.fillText('x2',toSX(0)+8,toSY(V1)+12);
  return {ctx,W,H,pad,toSX,toSY};
}

function pcxFillPoly(g,poly,color){
  if(!poly||poly.length<3) return;
  const {ctx,toSX,toSY}=g;
  ctx.fillStyle=color;
  ctx.beginPath();
  poly.forEach((p,i)=>{const sx=toSX(p[0]),sy=toSY(p[1]);if(i===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);});
  ctx.closePath();ctx.fill();
}

function pcxStrokeLine(g,seg,color,dash){
  if(!seg) return;
  const {ctx,toSX,toSY}=g;
  ctx.save();
  ctx.strokeStyle=color;ctx.lineWidth=2.6;
  if(dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(toSX(seg[0][0]),toSY(seg[0][1]));
  ctx.lineTo(toSX(seg[1][0]),toSY(seg[1][1]));
  ctx.stroke();
  ctx.restore();
}

function pcxDrawPts(g,targets,outs){
  const {ctx,toSX,toSY}=g;
  PCX_PTS.forEach((p,i)=>{
    const sx=toSX(p[0]),sy=toSY(p[1]);
    ctx.fillStyle=targets[i]===1?PCX_COL.red:PCX_COL.blue;
    ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    const ok=(outs[i]===targets[i]);
    ctx.textAlign='left';
    ctx.fillStyle=ok?PCX_COL.green:PCX_COL.red;
    ctx.font='bold 15px "Noto Sans KR"';
    ctx.fillText(ok?'✓':'✗',sx+13,sy-4);
    ctx.fillStyle=PCX_COL.mut;
    ctx.font='11px "Noto Sans KR"';
    ctx.fillText('('+p[0]+','+p[1]+')→'+targets[i],sx+13,sy+14);
  });
}

function pcxLegend(g,rows){
  const {ctx,toSX,toSY}=g;
  rows.forEach((r,i)=>{
    const y=-0.13-i*0.15;
    const x0=toSX(-0.36), sy=toSY(y);
    ctx.save();
    ctx.strokeStyle=r.color;ctx.lineWidth=2.6;
    if(r.dash) ctx.setLineDash(r.dash);
    ctx.beginPath();ctx.moveTo(x0,sy-4);ctx.lineTo(x0+22,sy-4);ctx.stroke();
    ctx.restore();
    ctx.fillStyle=PCX_COL.mut;ctx.font='11px "Noto Sans KR"';ctx.textAlign='left';
    ctx.fillText(r.text,x0+28,sy);
  });
}

function pcxDraw(){
  const cv=document.getElementById('pcx-cv');
  if(!cv) return;
  const g=pcxBase(cv);
  const tg=PCX_TARGET[pcxS.mode];
  const outs=PCX_PTS.map(p=>pcxOut(p[0],p[1]));
  pcxFillPoly(g,pcxClip(pcxRect(),pcxS.w1,pcxS.w2,pcxS.th,true),'rgba(90,122,90,0.16)');
  const seg=pcxLineSeg(pcxS.w1,pcxS.w2,pcxS.th);
  pcxStrokeLine(g,seg,PCX_COL.fg,null);
  if(!seg){
    g.ctx.fillStyle=PCX_COL.red;g.ctx.font='12px "Noto Sans KR"';g.ctx.textAlign='center';
    g.ctx.fillText('w₁ = w₂ = 0 이면 결정경계가 사라집니다',g.toSX(0.5),g.toSY(1.25));
  }
  pcxDrawPts(g,tg,outs);
  pcxLegend(g,[
    {color:PCX_COL.fg,text:'결정경계  w1·x1 + w2·x2 = θ'},
    {color:'rgba(90,122,90,0.55)',text:'초록 영역 = 퍼셉트론이 1을 출력'},
  ]);
}

function pcxDraw2(){
  const cv=document.getElementById('pcx-cv2');
  if(!cv) return;
  const g=pcxBase(cv);
  let band=pcxClip(pcxRect(),1,1,0.5,true);
  band=pcxClip(band,1,1,1.5,false);
  pcxFillPoly(g,band,'rgba(90,122,90,0.20)');
  pcxStrokeLine(g,pcxLineSeg(1,1,0.5),PCX_COL.fg,null);
  pcxStrokeLine(g,pcxLineSeg(1,1,1.5),PCX_COL.fg,[6,4]);
  pcxDrawPts(g,PCX_TARGET.xor,PCX_TARGET.xor);
  pcxLegend(g,[
    {color:PCX_COL.fg,text:'z1(OR) 의 직선  x1 + x2 = 0.5'},
    {color:PCX_COL.fg,dash:[6,4],text:'z2(AND) 의 직선  x1 + x2 = 1.5'},
  ]);
}

function pcxRenderTable(tg,outs){
  const tb=document.getElementById('pcx-tt');
  if(!tb) return 0;
  let okN=0;
  let html='<tr><th>x₁</th><th>x₂</th><th>w₁x₁ + w₂x₂</th><th>출력 f</th><th>정답</th><th>판정</th></tr>';
  PCX_PTS.forEach((p,i)=>{
    const s=pcxS.w1*p[0]+pcxS.w2*p[1];
    const ok=(outs[i]===tg[i]);
    if(ok) okN++;
    html+='<tr class="'+(ok?'ok':'bad')+'"><td>'+p[0]+'</td><td>'+p[1]+'</td><td>'+s.toFixed(1)+
      '</td><td>'+outs[i]+'</td><td>'+tg[i]+'</td><td class="'+(ok?'g':'r')+'">'+(ok?'✓':'✗')+'</td></tr>';
  });
  tb.innerHTML=html;
  return okN;
}

function pcxRenderBadges(){
  const box=document.getElementById('pcx-badges');
  if(!box) return;
  box.innerHTML=['and','or','xor'].map(m=>{
    // XOR는 단층으로 '완료'가 될 수 없습니다. 은닉층을 더한 순간에만 '해결'로 바뀝니다.
    if(m==='xor'){
      return '<span class="pcx-bdg'+(pcxS.hidden?' done':'')+'">'+PCX_MODENAME[m]+
        (pcxS.hidden?' 다층으로 해결':' 단층으로 도전 중')+'</span>';
    }
    return '<span class="pcx-bdg'+(pcxS.solved[m]?' done':'')+'">'+PCX_MODENAME[m]+(pcxS.solved[m]?' 완료':' 미완')+'</span>';
  }).join('');
}

function pcxRender(){
  const tg=PCX_TARGET[pcxS.mode];
  if(!tg) return;
  const outs=PCX_PTS.map(p=>pcxOut(p[0],p[1]));

  const w1v=document.getElementById('pcx-w1v'), w2v=document.getElementById('pcx-w2v'), thv=document.getElementById('pcx-thv');
  if(w1v) w1v.textContent=pcxNum(pcxS.w1);
  if(w2v) w2v.textContent=pcxNum(pcxS.w2);
  if(thv) thv.textContent=pcxNum(pcxS.th);

  const rule=document.getElementById('pcx-rule');
  if(rule) rule.textContent='지금의 규칙 :  f = 1  ( '+pcxNum(pcxS.w1)+'·x₁ + '+pcxNum(pcxS.w2)+'·x₂ ≥ '+pcxNum(pcxS.th)+' ),  그 밖에는 0';

  const okN=pcxRenderTable(tg,outs);
  pcxRenderBadges();

  const st=document.getElementById('pcx-st');
  if(st){
    let msg=PCX_MODENAME[pcxS.mode]+' — 4행 중 '+okN+'행 일치.';
    if(pcxS.mode==='xor') msg+='  시도 '+pcxS.tries+'회.';
    if(okN===4) msg+='  네 줄 모두 맞혔습니다!';
    else if(pcxS.mode==='xor'&&okN===3) msg+='  3행까지가 한계입니다. 한 줄은 반드시 어긋납니다.';
    st.textContent=msg;
  }

  // 성공 연출
  const win=document.getElementById('pcx-win');
  if(okN===4){
    if(!pcxS.solved[pcxS.mode]){
      pcxS.solved[pcxS.mode]=true;
      pcxRenderBadges();
      const lab=document.getElementById('pcx-lab');
      if(lab){lab.classList.add('pcx-flash');setTimeout(()=>lab.classList.remove('pcx-flash'),1300);}
    }
    if(win){
      win.style.display='block';
      const t=document.getElementById('pcx-win-t'), p=document.getElementById('pcx-win-p');
      if(t) t.textContent='성공! '+PCX_MODENAME[pcxS.mode]+' 을(를) 퍼셉트론으로 구현했습니다';
      if(p) p.textContent='가중치 w₁ = '+pcxNum(pcxS.w1)+', w₂ = '+pcxNum(pcxS.w2)+', 임곗값 θ = '+pcxNum(pcxS.th)+
        ' 로 진리표 네 줄이 모두 맞았습니다. 좌표평면의 직선 하나가 파란 점과 빨간 점을 정확히 갈라놓았지요? '+
        '이 직선이 바로 결정경계입니다. 활동지에 지금의 w₁, w₂, θ 를 적어 두세요.';
    }
  }else if(win){
    win.style.display='none';
  }

  // 은닉층 추가 버튼 — XOR 모드에서 3회 이상 시도한 뒤 활성화
  const b=document.getElementById('pcx-addh');
  if(b){
    if(pcxS.hidden||pcxS.mode!=='xor'){
      b.style.display='none';
    }else{
      b.style.display='inline-block';
      const need=Math.max(0,3-pcxS.tries);
      b.disabled=need>0;
      b.textContent=need>0?('은닉층 추가 — '+need+'번 더 시도해 보세요'):'은닉층 추가 ＋';
    }
  }

  pcxDraw();
}

function pcxSetMode(m,el){
  if(!PCX_TARGET[m]) return;
  pcxS.mode=m;
  const box=document.getElementById('pcx-modes');
  if(box) box.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  if(el) el.classList.add('on');
  const hint=document.getElementById('pcx-hint');
  if(hint) hint.textContent='힌트는 충분히 시도한 뒤에 확인하세요.';
  pcxRender();
}

function pcxReset(){
  pcxS.w1=0.2;pcxS.w2=0.2;pcxS.th=1.0;
  const a=document.getElementById('pcx-w1'), b=document.getElementById('pcx-w2'), c=document.getElementById('pcx-th');
  if(a) a.value='0.2';
  if(b) b.value='0.2';
  if(c) c.value='1';
  pcxRender();
}

function pcxHint(i){
  const el=document.getElementById('pcx-hint');
  if(el&&PCX_HINT[i]) el.textContent=PCX_HINT[i];
}

/* ── 은닉층 추가 → 2층 다층퍼셉트론 ── */
function pcxMLP(x1,x2){
  const z1=(x1+x2>=0.5-1e-9)?1:0;   // OR
  const z2=(x1+x2>=1.5-1e-9)?1:0;   // AND
  const y=(z1-z2>=0.5-1e-9)?1:0;    // OR 이면서 AND 가 아닌 영역
  return {z1:z1,z2:z2,y:y};
}

function pcxMLPTable(){
  const tb=document.getElementById('pcx-mlp-tt');
  if(!tb) return;
  let html='<tr><th>x₁</th><th>x₂</th><th>x₁+x₂</th><th>z₁ (θ=0.5)</th><th>z₂ (θ=1.5)</th><th>z₁−z₂</th><th>y (θ=0.5)</th><th>XOR 정답</th></tr>';
  PCX_PTS.forEach((p,i)=>{
    const r=pcxMLP(p[0],p[1]);
    const ok=(r.y===PCX_TARGET.xor[i]);
    const cls=(i===pcxS.ff?'cur ':'')+(ok?'ok':'bad');
    html+='<tr class="'+cls+'"><td>'+p[0]+'</td><td>'+p[1]+'</td><td>'+(p[0]+p[1])+'</td><td>'+r.z1+'</td><td>'+r.z2+
      '</td><td>'+(r.z1-r.z2)+'</td><td class="'+(ok?'g':'r')+'">'+r.y+'</td><td>'+PCX_TARGET.xor[i]+'</td></tr>';
  });
  tb.innerHTML=html;
}

function pcxNode(id,on,val){
  const c=document.getElementById('pcx-n-'+id);
  const t=document.getElementById('pcx-v-'+id);
  if(c) c.classList.toggle('on',!!on);
  if(t){t.textContent=(val===null||val===undefined)?'?':String(val);t.classList.toggle('on',!!on);}
}
function pcxEdge(id,on){
  const e=document.getElementById('pcx-e-'+id);
  if(e) e.classList.toggle('on',!!on);
}

function pcxFF(i){
  pcxS.ff=i;
  const chips=document.getElementById('pcx-ffchips');
  if(chips) chips.querySelectorAll('.chip').forEach((c,k)=>c.classList.toggle('on',k===i));
  const st=document.getElementById('pcx-hst');
  if(i<0||i>3){
    ['x1','x2','z1','z2','y'].forEach(id=>pcxNode(id,false,null));
    ['x1z1','x1z2','x2z1','x2z2','z1y','z2y'].forEach(id=>pcxEdge(id,false));
    if(st) st.textContent='아래 네 개의 입력 버튼을 눌러 순전파 과정을 한 줄씩 확인해 보세요.';
    pcxMLPTable();
    return;
  }
  const p=PCX_PTS[i], r=pcxMLP(p[0],p[1]);
  pcxNode('x1',p[0]===1,p[0]);
  pcxNode('x2',p[1]===1,p[1]);
  pcxNode('z1',r.z1===1,r.z1);
  pcxNode('z2',r.z2===1,r.z2);
  pcxNode('y',r.y===1,r.y);
  pcxEdge('x1z1',p[0]===1);pcxEdge('x1z2',p[0]===1);
  pcxEdge('x2z1',p[1]===1);pcxEdge('x2z2',p[1]===1);
  pcxEdge('z1y',r.z1===1);pcxEdge('z2y',r.z2===1);
  if(st) st.textContent='입력 ('+p[0]+', '+p[1]+') → 은닉층 z₁ = '+r.z1+', z₂ = '+r.z2+
    ' → 출력 y = f('+r.z1+' − '+r.z2+') = f('+(r.z1-r.z2)+') = '+r.y+
    '  (XOR 정답 '+PCX_TARGET.xor[i]+') '+(r.y===PCX_TARGET.xor[i]?'✓':'✗');
  pcxMLPTable();
}

function pcxAddHidden(){
  if(pcxS.hidden) return;
  pcxS.hidden=true;
  const box=document.getElementById('pcx-hidden');
  const b=document.getElementById('pcx-addh');
  if(b) b.style.display='none';
  if(box){
    box.style.display='block';
    box.classList.add('pcx-flash');
    setTimeout(()=>box.classList.remove('pcx-flash'),1400);
    try{box.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}
  }
  pcxDraw2();
  pcxFF(-1);
  pcxRenderBadges();
  const st=document.getElementById('pcx-st');
  if(st) st.textContent='은닉층을 추가했습니다 — 퍼셉트론 두 개가 각각 직선을 하나씩 긋습니다. 아래에서 확인하세요.';
}

/* ── perceptron 확장 초기화 (뷰가 없어도 core.js가 죽지 않도록 가드) ── */
(()=>{
  const root=document.getElementById('v-perceptron');
  if(!root||pcxInited) return;
  pcxInited=true;


  const bind=(id,key)=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('input',function(){
      pcxS[key]=parseFloat(this.value)||0;
      pcxRender();
    });
    // 시도 횟수는 XOR 모드에서 슬라이더를 놓을 때마다 1씩 늘어납니다.
    el.addEventListener('change',function(){
      if(pcxS.mode==='xor'){pcxS.tries++;pcxRender();}
    });
  };
  bind('pcx-w1','w1');
  bind('pcx-w2','w2');
  bind('pcx-th','th');

  pcxRender();
  pcxFF(-1);
})();


/* ───────────── 5차시 · 빅데이터와 편향 (접두사 bs / BS_) ───────────── */
/* ═══════════════════ BIAS (5차시: 빅데이터와 편향 — 정확도 95%의 함정) — 접두사 bs ═══════════════════ */

function bsEl(id){return document.getElementById(id);}

function bsCol(name,fallback){
  try{
    const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v||fallback;
  }catch(e){return fallback;}
}

function bsFmt(n){
  if(!isFinite(n)) return '–';
  const r=Math.round(n*1000)/1000;
  try{return r.toLocaleString('ko-KR',{maximumFractionDigits:3});}catch(e){return String(r);}
}

function bsPct(n){
  if(!isFinite(n)) return '–';
  return (Math.round(n*10)/10).toFixed(1)+'%';
}

function bsTab(n,el){
  document.querySelectorAll('#v-bias .tabs .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  document.querySelectorAll('#v-bias .tpanel').forEach(p=>p.classList.remove('on'));
  const pn=bsEl('bs'+n);
  if(pn) pn.classList.add('on');
  if(n===0) bsUpdate();
}

/* ── 탭 ① 편향 실험 ──────────────────────────────────────────
   시나리오 : 음식 사진 분류 AI. 양식 1000장 고정, 한식은 x장(0~800) 추가 수집.
   모델 A   : 항상 "양식"이라고만 답한다 → 한식 0% / 양식 100% / 전체=양식 비율 / 균형 50%
   모델 B   : 데이터로 학습한 모델(모의) → 한식 = 95·x/(x+150) %, 양식 = 96 % 고정
   테스트 데이터도 학습 데이터와 같은 비율로 모았다고 가정한다.            */
const BS_W_FIX=1000;   // 양식(다수 집단) 장수 — 고정
const BS_GOAL=0.4;     // 한식 목표 비율
const BS_ANS=667;      // x/(1000+x) ≥ 0.4 의 최소 자연수 해
let bsX=0, bsModel=0, bsGoalOn=false;

function bsPerf(x,m){
  // 한식 사진이 0장이면 (한식 중 맞힌 수)/(한식 수)는 분모가 0 — 정확도를 "잴 수 없다"(NaN).
  // 0%로 표기하지 않는 것은 수학적으로 0/0이 정의되지 않기 때문이며, 이 상태 자체가 편향의 한 유형(누락)이다.
  const able=(x>0);
  if(m===1){
    const k=able?95*x/(x+150):NaN;
    const w=96;
    return {k:k,w:w,all:(x*(able?k:0)+BS_W_FIX*w)/(BS_W_FIX+x),bal:able?(k+w)/2:NaN,able:able};
  }
  return {k:able?0:NaN,w:100,all:BS_W_FIX/(BS_W_FIX+x)*100,bal:able?50:NaN,able:able};
}

function bsDrawDonut(){
  const cv=bsEl('bs-donut');
  if(!cv||!cv.getContext) return;
  const g=cv.getContext('2d');
  const W=cv.width, H=cv.height;
  g.clearRect(0,0,W,H);

  const bg=bsCol('--card','#ebe5dc');
  const fg=bsCol('--fg','#1a1714');
  const cK=bsCol('--blue','#4a6b8a');
  const cW=bsCol('--muted','#78726a');
  const cR=bsCol('--red','#b44133');
  const bd=bsCol('--border','#d8d0c4');

  g.fillStyle=bg; g.fillRect(0,0,W,H);

  const cx=W/2, cy=H/2, R=Math.min(W,H)/2-16, r=R*0.60;
  const mid=(R+r)/2, th=R-r;
  const total=BS_W_FIX+bsX;
  const kFrac=bsX/total;

  // 양식(전체 링) → 한식(호)
  g.lineWidth=th;
  g.beginPath(); g.strokeStyle=cW; g.arc(cx,cy,mid,0,Math.PI*2); g.stroke();
  if(kFrac>0.0001){
    g.beginPath(); g.strokeStyle=cK;
    g.arc(cx,cy,mid,-Math.PI/2,-Math.PI/2+Math.PI*2*kFrac);
    g.stroke();
  }
  // 링 테두리
  g.lineWidth=1; g.strokeStyle=bd;
  g.beginPath(); g.arc(cx,cy,R,0,Math.PI*2); g.stroke();
  g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.stroke();

  // 40% 목표 눈금
  if(bsGoalOn){
    const a=-Math.PI/2+Math.PI*2*BS_GOAL;
    g.lineWidth=3; g.strokeStyle=cR;
    g.beginPath();
    g.moveTo(cx+Math.cos(a)*(r-5), cy+Math.sin(a)*(r-5));
    g.lineTo(cx+Math.cos(a)*(R+5), cy+Math.sin(a)*(R+5));
    g.stroke();
    g.fillStyle=cR;
    g.font='600 11px "JetBrains Mono", monospace';
    g.textAlign='left'; g.textBaseline='middle';
    g.fillText('40%', cx+Math.cos(a)*(R+9), cy+Math.sin(a)*(R+9));
  }

  // 가운데 수치
  g.textAlign='center'; g.textBaseline='middle';
  g.fillStyle=fg;
  g.font='700 21px "JetBrains Mono", monospace';
  g.fillText(bsPct(kFrac*100), cx, cy-6);
  g.fillStyle=cW;
  g.font='500 10px "JetBrains Mono", monospace';
  g.fillText('한식 비율', cx, cy+15);
}

function bsBar(id,vid,pct,color){
  const b=bsEl(id), v=bsEl(vid);
  const ok=isFinite(pct);
  if(b){b.style.width=(ok?Math.max(0,Math.min(100,pct)):0)+'%';b.style.background=color;}
  if(v){
    v.textContent=ok?bsPct(pct):'?';
    v.style.color=ok?color:'var(--red)';
    v.title=ok?'':'한식 사진이 0장이라 정확도를 잴 수 없습니다.';
  }
}

/* 세 정확도의 뜻 + 지금 슬라이더 값이 대입된 계산식 (§30) — bsUpdate 에서 매번 다시 그립니다. */
function bsAccCards(p,total){
  const box=bsEl('bs-acc');
  if(!box) return;
  const N=n=>bsFmt(Math.round(n));
  const okK=p.able;
  // 맞힌 장수 = 집단별 정확도 × 집단 사진 수
  const hitK=okK?Math.round(bsX*p.k/100):0;
  const hitW=Math.round(BS_W_FIX*p.w/100);
  box.innerHTML=
    '<div class="bs-accit a"><div class="t"><b>전체 정확도</b><span class="v">'+bsPct(p.all)+'</span></div>'+
      '<div class="d">전체 사진 가운데 맞힌 비율입니다.</div>'+
      '<div class="f">(맞힌 양식 + 맞힌 한식) ÷ 전체<br>= ('+N(hitW)+' + '+N(hitK)+') ÷ '+N(total)+' = '+bsPct(p.all)+'</div>'+
      '<div class="n">한식을 다 틀려도 양식이 많으면 높게 나옵니다.</div></div>'+
    '<div class="bs-accit k"><div class="t"><b>한식만 정확도</b><span class="v">'+(okK?bsPct(p.k):'잴 수 없음')+'</span></div>'+
      '<div class="d">한식 사진만 놓고 보았을 때 맞힌 비율입니다.</div>'+
      '<div class="f">맞힌 한식 ÷ 전체 한식<br>= '+(okK?(N(hitK)+' ÷ '+N(bsX)+' = '+bsPct(p.k)):'? ÷ 0 → 계산 불가')+'</div>'+
      '<div class="n">소수 집단이 실제로 얼마나 보호받는지 보여 주는 수입니다. (심화 — 재현율)</div></div>'+
    '<div class="bs-accit b"><div class="t"><b>균형 정확도</b><span class="v">'+(okK?bsPct(p.bal):'계산 불가')+'</span></div>'+
      '<div class="d">양식 정확도와 한식 정확도의 평균입니다.</div>'+
      '<div class="f">(양식 정확도 + 한식 정확도) ÷ 2<br>= ('+bsPct(p.w).replace('%','')+' + '+(okK?bsPct(p.k).replace('%',''):'?')+') ÷ 2 = '+
        (okK?bsPct(p.bal):'계산 불가')+'</div>'+
      '<div class="n">두 집단을 똑같은 무게로 보는 공정한 잣대입니다.</div></div>';

  const tb=bsEl('bs-acc-tbl');
  if(tb) tb.innerHTML='<table><tr><th>지금 이 상황</th><th>전체 정확도</th><th>한식만 정확도</th><th>균형 정확도</th></tr>'+
    '<tr><td>한식 '+N(bsX)+'장 · 양식 '+N(BS_W_FIX)+'장</td>'+
    '<td class="v" style="color:var(--blue);">'+bsPct(p.all)+'</td>'+
    '<td class="v" style="color:var(--red);">'+(okK?bsPct(p.k):'잴 수 없음')+'</td>'+
    '<td class="v" style="color:var(--green);">'+(okK?bsPct(p.bal):'계산 불가')+'</td></tr></table>';
}

function bsUpdate(){
  const sl=bsEl('bs-x');
  if(sl) bsX=Math.max(0,Math.min(800,parseInt(sl.value,10)||0));
  const total=BS_W_FIX+bsX;
  const kFrac=bsX/total;
  const p=bsPerf(bsX,bsModel);

  bsDrawDonut();

  const xst=bsEl('bs-xst');
  if(xst) xst.innerHTML=`x = <b>${bsFmt(bsX)}</b> 장 · 한식 ${bsFmt(bsX)} : 양식 ${bsFmt(BS_W_FIX)} · 전체 ${bsFmt(total)} 장`;

  const lg=bsEl('bs-legend');
  if(lg) lg.innerHTML=
    `<i class="bs-sw" style="background:var(--blue);"></i>한식 ${bsFmt(bsX)}장 (${bsPct(kFrac*100)})`+
    ` &nbsp; <i class="bs-sw" style="background:var(--muted);"></i>양식 ${bsFmt(BS_W_FIX)}장 (${bsPct((1-kFrac)*100)})`;

  bsBar('bs-b-all','bs-v-all',p.all,'var(--blue)');
  bsBar('bs-b-k','bs-v-k',p.k,'var(--red)');
  bsBar('bs-b-bal','bs-v-bal',p.bal,'var(--green)');

  const warn=bsEl('bs-warn');
  if(warn){
    warn.innerHTML=p.able
      ? ''
      : '한식 사진이 <b>0장</b> — 한식 정확도 = (맞힌 수) / <b>0</b> 은 계산되지 않습니다. '+
        '<b>잴 수 없다</b>는 것은 "성능이 0"보다 위험한 상태입니다. 문제가 있는지조차 알 수 없으니까요. '+
        '슬라이더를 조금만 올려 보세요.';
  }

  const calc=bsEl('bs-calc');
  if(calc){
    if(bsModel===1){
      calc.innerHTML=
        `모의 규칙 : 한식 정확도 = 95 × x/(x+150) , 양식 정확도 = 96%<br>`+
        (p.able
          ? `한식 ${bsPct(p.k)} · 양식 ${bsPct(p.w)}<br>`+
            `전체 = (${bsFmt(bsX)}×${bsPct(p.k).replace('%','')} + ${bsFmt(BS_W_FIX)}×96) / ${bsFmt(total)} = <b>${bsPct(p.all)}</b><br>`+
            `균형 = (${bsPct(p.k).replace('%','')} + 96) / 2 = <b>${bsPct(p.bal)}</b>`
          : `한식 — 잴 수 없음 (한식 0장) · 양식 96.0%<br>`+
            `전체 = (1000 × 96) / 1000 = <b>96.0%</b> ← 양식만으로 잰 값<br>`+
            `균형 = (? + 96) / 2 → <b>계산 불가</b>`);
    }else{
      calc.innerHTML=
        `모델 A는 사진을 보지도 않고 "양식"이라고만 답합니다.<br>`+
        `전체 = 1000 / (1000 + ${bsFmt(bsX)}) = <b>${bsPct(p.all)}</b><br>`+
        (p.able
          ? `양식 100% · 한식 0% → 균형 = (100 + 0) / 2 = <b>50.0%</b>`
          : `양식 100% · 한식 — 잴 수 없음 → 균형 <b>계산 불가</b>`);
    }
  }

  bsAccCards(p,total);

  const gst=bsEl('bs-goal-st');
  if(gst){
    if(bsGoalOn){
      const ok=(kFrac>=BS_GOAL-1e-9);
      gst.innerHTML=`현재 한식 비율 = ${bsFmt(bsX)} / ${bsFmt(total)} = <b>${bsPct(kFrac*100)}</b> → 목표 40% <b style="color:var(--${ok?'green':'red'});">${ok?'달성':'미달'}</b>`;
    }else{
      gst.textContent='';
    }
  }
}

function bsSetX(v){
  bsX=Math.max(0,Math.min(800,parseInt(v,10)||0));
  bsUpdate();
}

function bsJump(v){
  const sl=bsEl('bs-x');
  if(sl) sl.value=v;
  bsSetX(v);
}

function bsSetModel(m,el){
  bsModel=m;
  if(el){
    document.querySelectorAll('#bs-models .chip').forEach(c=>c.classList.remove('on'));
    el.classList.add('on');
  }
  bsUpdate();
}

function bsGoalToggle(cb){
  bsGoalOn=!!(cb&&cb.checked);
  const card=bsEl('bs-ineq');
  if(card) card.style.display=bsGoalOn?'block':'none';
  bsUpdate();
  // scrollIntoView 미지원·옵션 미지원 환경에서도 체크 동작 자체는 막히지 않도록 감쌉니다.
  if(bsGoalOn&&card&&card.scrollIntoView){
    try{card.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){try{card.scrollIntoView();}catch(e2){}}
  }
}

function bsIneqCheck(){
  const inp=bsEl('bs-ineq-in');
  const st=bsEl('bs-ineq-st');
  const sol=bsEl('bs-ineq-sol');
  if(!inp||!st) return;
  const raw=inp.value.trim();
  if(raw===''){st.textContent='답을 입력한 뒤 [채점]을 눌러 주세요.';st.style.color='';return;}
  const v=parseInt(raw,10);
  if(!isFinite(v)){st.textContent='0 이상의 정수를 입력해 주세요.';st.style.color='';return;}

  let msg,ok=false;
  if(v===BS_ANS){
    ok=true;
    msg='✓ 정답! 667장입니다. 667/1667 ≈ 0.4001 로 40%를 아슬아슬하게 넘습니다.';
  }else if(v===BS_ANS-1){
    msg='✗ 아깝습니다. 666장이면 666/1666 ≈ 0.3998 로 40%에 아주 조금 못 미칩니다. 한 장만 더!';
  }else if(v>BS_ANS){
    msg='△ 부등식은 만족하지만 "가장 작은" 값이 아닙니다. 더 줄일 수 있습니다.';
  }else{
    msg='✗ 너무 적습니다. x/(1000+x) 값을 실제로 계산해 40%와 비교해 보세요.';
  }
  st.textContent=msg;
  st.style.color=ok?'var(--green)':(v>BS_ANS?'var(--muted)':'var(--red)');

  if(sol){
    sol.style.display='block';
    sol.innerHTML=
      '<strong>풀이 — 부등식 세우고 풀기</strong>'+
      '<div class="math" style="margin:0.6rem 0;">'+
      '  x / (1000 + x) ≥ 0.4\n'+
      '  1000 + x > 0 이므로 양변에 (1000 + x)를 곱해도 부등호 방향은 그대로\n'+
      '  x ≥ 0.4(1000 + x)\n'+
      '  x ≥ 400 + 0.4x\n'+
      '  0.6x ≥ 400\n'+
      '  x ≥ 400 / 0.6 = 2000/3 = 666.666…\n'+
      '  x는 사진의 장수 → 자연수이므로  x ≥ 667'+
      '</div>'+
      '<div style="font-family:var(--mono);font-size:0.72rem;line-height:1.9;">'+
      '검산  667 / 1667 ≈ 0.4001 ≥ 0.4 &nbsp;✓<br>'+
      '검산  666 / 1666 ≈ 0.3998 &lt; 0.4 &nbsp;✗</div>'+
      '<p style="margin-top:0.6rem;">부등식을 세우는 순간 "더 모아야 한다"는 막연한 말이 '+
      '<b>667장</b>이라는 실행 가능한 계획이 됩니다.</p>'+
      '<div class="btn-row"><button class="btn" onclick="bsJump(667)">슬라이더를 667로 맞추기</button></div>';
  }
}

/* ── 탭 ② 혼동행렬 계산기 ── */
const BS_CM_EX=[
  {n:'① 편향 모델 — 한식 데이터가 거의 없던 시절의 결과',tp:20,fn:180,fp:5,tn:995},
  {n:'② 추가 수집 후 — 한식 667장을 더 모아 다시 학습한 결과',tp:170,fn:30,fp:40,tn:960},
];

function bsCMVal(id){
  const el=bsEl(id);
  if(!el) return NaN;
  const v=parseInt(el.value,10);
  return (isFinite(v)&&v>=0)?v:NaN;
}

function bsCMRow(title,desc,formula,val){
  const pct=isFinite(val)?val*100:NaN;
  const bar=isFinite(pct)
    ? `<div class="bs-bar"><span class="nm">${title}</span><span class="tk"><span class="fl" style="width:${Math.max(0,Math.min(100,pct))}%;background:var(--blue);"></span></span><span class="vl">${bsPct(pct)}</span></div>`
    : `<div class="bs-bar"><span class="nm">${title}</span><span class="tk"></span><span class="vl" style="color:var(--muted);">–</span></div>`;
  return `<div class="bs-mt"><div class="ttl">${title} — ${desc}</div><div class="fm">${formula}</div>${bar}</div>`;
}

function bsCM(){
  const out=bsEl('bs-cm-out');
  if(!out) return;
  const tp=bsCMVal('bs-tp'), fn=bsCMVal('bs-fn'), fp=bsCMVal('bs-fp'), tn=bsCMVal('bs-tn');
  if([tp,fn,fp,tn].some(v=>!isFinite(v))){
    out.innerHTML='<div class="status">네 칸을 모두 0 이상의 정수로 채워 주세요.</div>';
    return;
  }
  const tot=tp+fn+fp+tn;
  if(tot===0){
    out.innerHTML='<div class="status">전체 개수가 0입니다. 값을 입력해 주세요.</div>';
    return;
  }
  const acc=(tp+tn)/tot;
  const prec=(tp+fp)>0?tp/(tp+fp):NaN;
  const rec=(tp+fn)>0?tp/(tp+fn):NaN;

  let html=`<div class="status">실제 한식 ${bsFmt(tp+fn)}장 · 실제 양식 ${bsFmt(fp+tn)}장 · 전체 ${bsFmt(tot)}장</div>`;
  html+=bsCMRow('정확도','네 칸 전체에서 맞힌 비율',
    `(TP + TN) / 전체 = (${tp} + ${tn}) / ${tot} = ${bsFmt(Math.round(acc*1000)/1000)}`, acc);
  html+=bsCMRow('정밀도','"한식"이라 예측한 것 중 실제 한식의 비율',
    (tp+fp)>0
      ? `TP / (TP + FP) = ${tp} / (${tp} + ${fp}) = ${bsFmt(Math.round(prec*1000)/1000)}`
      : `TP / (TP + FP) = ${tp} / 0 → 계산 불가 — "한식"이라고 예측한 적이 한 번도 없습니다.`, prec);
  html+=bsCMRow('재현율','실제 한식 중 찾아낸 비율',
    (tp+fn)>0
      ? `TP / (TP + FN) = ${tp} / (${tp} + ${fn}) = ${bsFmt(Math.round(rec*1000)/1000)}`
      : `TP / (TP + FN) = ${tp} / 0 → 계산 불가 — 시험 데이터에 실제 한식이 없습니다.`, rec);

  if(isFinite(rec)&&isFinite(acc)&&acc-rec>=0.3){
    html+=`<div class="status" style="color:var(--red);">⚠ 정확도(${bsPct(acc*100)})와 재현율(${bsPct(rec*100)})의 차이가 큽니다 — 오류가 FN 칸에 몰려 있습니다.</div>`;
  }
  out.innerHTML=html;
}

function bsCMLoad(i){
  const ex=BS_CM_EX[i];
  if(!ex) return;
  const set=(id,v)=>{const el=bsEl(id);if(el) el.value=v;};
  set('bs-tp',ex.tp); set('bs-fn',ex.fn); set('bs-fp',ex.fp); set('bs-tn',ex.tn);
  const note=bsEl('bs-cm-note');
  if(note) note.textContent=ex.n;
  bsCM();
}

function bsCMClear(){
  ['bs-tp','bs-fn','bs-fp','bs-tn'].forEach(id=>{const el=bsEl(id);if(el) el.value='';});
  const note=bsEl('bs-cm-note');
  if(note) note.textContent='네 칸을 직접 채워 보세요.';
  bsCM();
}

/* ── 탭 ③ 5V와 데이터 단위 — 환산 사다리 ── */
let bsLadTid=[];
let bsLadLast=0;

function bsLadStop(){
  bsLadTid.forEach(t=>clearTimeout(t));
  bsLadTid=[];
}

function bsLadRender(totMB,animate){
  const box=bsEl('bs-lad');
  if(!box) return;
  bsLadStop();
  bsLadLast=totMB;
  const rows=[
    ['TB · 테라바이트','10¹² B',totMB/1e6,'TB'],
    ['GB · 기가바이트','10⁹ B', totMB/1e3,'GB'],
    ['MB · 메가바이트','10⁶ B', totMB,    'MB'],
    ['KB · 킬로바이트','10³ B', totMB*1e3,'KB'],
    ['B · 바이트',     '10⁰ B', totMB*1e6,'B'],
  ];
  box.innerHTML=rows.map((r,i)=>
    `<div class="bs-rung" id="bs-r${i}"><span class="u">${r[0]}</span><span class="p">${r[1]}</span><span class="v">${bsFmt(r[2])} ${r[3]}</span></div>`
  ).join('');
  // 아래(B)에서 위(TB)로 한 칸씩 오릅니다.
  [4,3,2,1,0].forEach((idx,k)=>{
    const run=()=>{
      const el=bsEl('bs-r'+idx);
      if(!el) return;
      el.classList.add('on');
      if(idx===0) el.classList.add('hi');
    };
    if(animate) bsLadTid.push(setTimeout(run,120+k*400));
    else run();
  });
}

function bsUnitReset(){
  bsLadStop();
  const box=bsEl('bs-lad');
  if(box) box.innerHTML='';
  const sol=bsEl('bs-unit-sol');
  if(sol){sol.style.display='none';sol.innerHTML='';}
  const st=bsEl('bs-unit-st');
  if(st){st.textContent='계산한 값을 입력하고 [확인]을 누르면 환산 사다리가 올라갑니다.';st.style.color='';}
  bsLadLast=0;
}

function bsUnitCheck(){
  const st=bsEl('bs-unit-st');
  if(!st) return;
  const sz=parseFloat((bsEl('bs-sz')||{}).value);
  const n=parseFloat((bsEl('bs-n')||{}).value);
  const v=parseFloat((bsEl('bs-tot')||{}).value);
  if(!isFinite(sz)||!isFinite(n)||sz<0||n<0){
    st.textContent='사진 1장 용량(MB)과 장수를 먼저 확인해 주세요.';st.style.color='';return;
  }
  const exp=sz*n;
  if(!isFinite(v)){
    st.textContent='전체 용량(MB)을 입력한 뒤 [확인]을 눌러 주세요.';st.style.color='';return;
  }
  const ok=Math.abs(v-exp)<=Math.max(1e-6,exp*0.001);
  st.innerHTML=ok
    ? `✓ 정답! ${bsFmt(sz)} MB × ${bsFmt(n)} 장 = <b>${bsFmt(exp)} MB</b> — 사다리를 올라가 봅시다.`
    : `✗ 다시 — ${bsFmt(sz)} × ${bsFmt(n)} 을 계산해 보세요. (정답: <b>${bsFmt(exp)} MB</b>)`;
  st.style.color=ok?'var(--green)':'var(--red)';

  bsLadRender(exp,true);

  const sol=bsEl('bs-unit-sol');
  if(sol){
    sol.style.display='block';
    sol.innerHTML=
      '<strong>환산 정리 — 한 칸에 1000배</strong>'+
      `<div style="font-family:var(--mono);font-size:0.74rem;line-height:2;margin-top:0.5rem;">`+
      `${bsFmt(sz)} MB × ${bsFmt(n)} 장 = ${bsFmt(exp)} MB<br>`+
      `= ${bsFmt(exp/1e3)} GB &nbsp;(1 GB = 1000 MB)<br>`+
      `= ${bsFmt(exp/1e6)} TB &nbsp;(1 TB = 1000 GB)<br>`+
      `= ${bsFmt(exp*1e6)} B &nbsp;(1 MB = 10⁶ B)</div>`+
      '<p style="margin-top:0.6rem;">사진 50만 장이 겨우 <b>1 TB</b>입니다. 그런데 전 세계에서 한 해에 만들어지는 데이터는 '+
      '<b>제타바이트(ZB, 10²¹ B)</b> 단위로 이야기됩니다 — 1 ZB는 1 TB의 <b>10억 배</b>입니다. '+
      '이것이 빅데이터의 첫 번째 V, <b>규모(Volume)</b>입니다.</p>';
  }
}

function bsLadReplay(){
  if(bsLadLast>0){bsLadRender(bsLadLast,true);return;}
  const st=bsEl('bs-unit-st');
  if(st){st.textContent='먼저 전체 용량을 입력하고 [확인]을 눌러 주세요.';st.style.color='';}
}


/* ═════════ 1단원 신규 차시 블록 끝 ═════════ */


/* ═════════ 1차시 intro — 보강 데이터 · 공통 컴포넌트 초기화 ═════════ */
/* ═══════════════════════════════════════════════════════════════
   1차시 intro — 공통 컴포넌트 데이터 (접두사 it / IT_)
   core.js 의 「INTRO … 접두사 it」 블록 안에 그대로 붙여 넣습니다.
   공통 API(quizStepper·warmStepper·videoDeck·chipDefs)는 Finalize 단계에서
   core.js 에 구현되며, 이 파일은 "호출하는 쪽"만 담고 있습니다.
   ═══════════════════════════════════════════════════════════════ */

/* ── 탭·활동으로 이동하는 링크 버튼용 onclick 문자열 ────────────────
   n = 0(튜링 테스트 게임) · 1(규칙 vs 학습) · 2(역사 타임라인)          */
function itGoTab(n){
  return "var t=document.querySelectorAll('#v-intro .tabs .tab');if(t["+n+"]){t["+n+"].click();"
       + "document.querySelector('#v-intro .tabs').scrollIntoView({behavior:'smooth',block:'start'});}";
}

/* ── STEP 1 추천 영상 (실존 확인된 유튜브 ID만 사용) ── */
/* 자료 중복 배치 금지(§23) — 각 영상은 가장 관련 깊은 차시 한 곳에만 둡니다.
   탐색 영상(fG8T07Csz6w)은 3차시, 기계학습 영상(IiyYsAMmmw4)은 2차시 전용입니다. */
const IT_VIDEOS = [
  {id:'xeWIcOy8rzY', t:'한눈에 보는 인공지능의 역사',            s:'EBS 이솦'},
  {id:'BUTP-YsD3nM', t:'AI의 역사 — 인공지능은 어떻게 발전했나', s:'술술과학'},
];

/* ── 앨런 튜링 소개 카드 · 관련 영상 (추천 영상 재사용) ── */
/* 튜링 소개 카드의 관련 영상 — 교사 추가 슬롯은 정확히 1칸(§24-1) */
const IT_TURING_VIDEOS = [
  {id:'xeWIcOy8rzY', t:'한눈에 보는 인공지능의 역사 — 1950년 튜링 테스트 구간', s:'EBS 이솦'},
];

/* ── STEP 1 마중 퀴즈 (순차 공개, 라벨은 "질문 N.") ── */
const IT_WARM_Q = [
  {
    q:'세탁물의 흐림(오염) 정도를 감지해 세탁 시간을 스스로 조절하는 세탁기의 "퍼지 제어" — 인공지능일까요?',
    opts:['O — 인공지능이다','X — 그냥 기계 장치다'],
    answer:0,
    explain:'인공지능이 맞습니다. 흐림 정도라는 입력을 센서로 감지해 세탁 시간이라는 출력을 스스로 정하는 것은, '
      +'인식하고 판단하는 지적 능력을 기계로 구현한 것이기 때문입니다. '
      +'특히 퍼지 제어는 참(1)과 거짓(0) 사이의 중간 값까지 다루는 퍼지 이론을 이용한 기술로, 1980년대 전문가 시스템에도 함께 쓰였습니다. '
      +'인공지능은 사람 모습의 로봇만이 아니라 이렇게 생활 가전 속에도 일찍부터 들어와 있었습니다.'
  },
  {
    q:'내비게이션이 수많은 길 가운데 최단 경로를 찾아 주는 기능 — 인공지능일까요?',
    opts:['O — 인공지능이다','X — 단순 계산일 뿐이다'],
    answer:0,
    explain:'인공지능이 맞습니다. 가능한 경로를 체계적으로 펼쳐 놓고 그 가운데 가장 좋은 하나를 고르는 일을 탐색이라 하는데, '
      +'탐색은 1956년 다트머스 회의 이후 인공지능이 가장 먼저 붙든 핵심 주제였습니다. '
      +'1997년 체스 컴퓨터 딥블루가 세계 챔피언을 이긴 것도 같은 탐색의 힘이었습니다. '
      +'STEP 2 활동 ③ 타임라인에서 그 흐름을 직접 확인해 봅시다.'
  },
  {
    q:'"학습하는 프로그램"이 "규칙대로 실행하는 프로그램"과 결정적으로 다른 점은 무엇일까요?',
    opts:['더 빠른 컴퓨터를 쓴다','데이터(경험)를 보고 스스로 규칙을 찾는다','오류 없이 완벽하게 작동한다'],
    answer:1,
    explain:'핵심은 속도나 완벽함이 아니라 "규칙을 누가 찾는가"입니다. '
      +'규칙 기반 프로그램에서는 사람이 규칙을 알고 코드로 옮겨 적지만, 학습하는 프로그램은 데이터 (x, y)를 보고 규칙(함수 f)을 스스로 찾아냅니다. '
      +'오늘 STEP 2 활동 ②에서 같은 함수를 두 방식으로 만들어 보며 이 차이를 직접 확인합니다.'
  },
];

/* ── STEP 3 형성 체크 (스텝형, 문항 1개씩) ── */
const IT_QUIZ_Q = [
  {
    q:'기계학습이 기존 프로그램(규칙기반)과 다른 점은 무엇입니까?',
    opts:['사람이 규칙을 직접 입력한다','데이터에서 규칙(함수)을 스스로 찾는다','규칙 없이 무작위로 답한다'],
    answer:1,
    explain:'기계학습은 규칙을 사람이 적는 대신, 데이터 (x, y)에서 규칙에 해당하는 함수 f를 컴퓨터가 스스로 찾게 하는 방법입니다. '
      +'활동 ②의 왼쪽(A)에서는 "x가 3보다 작으면 0"이라는 규칙을 여러분이 직접 옮겨 적었지만, '
      +'오른쪽(B)에서는 규칙을 아는 사람이 아무도 없는 상태에서 데이터만 보고 규칙을 추측했습니다. '
      +'바로 그 추측이 기계학습이 하는 일입니다.'
  },
  {
    q:'1969년 "단층 퍼셉트론은 XOR을 못 푼다"는 지적이 가져온 결과는 무엇입니까?',
    opts:['AI 연구가 더 활발해졌다','AI 겨울이 왔고, 뒤에 다층 구조로 극복했다','컴퓨터 개발이 완전히 중단되었다'],
    answer:1,
    explain:'민스키와 페퍼트는 단층 퍼셉트론으로 배타적 논리합(XOR)을 구현할 수 없음을 수학적으로 증명했습니다. '
      +'진리표의 네 점을 직선 하나로 나눌 수 없다는 연립부등식의 모순이 이유였고, 이 증명이 1차 AI 겨울(1974~1980)의 계기가 되었습니다. '
      +'그러나 1986년 다층 구조와 미분을 이용한 역전파가 알려지면서 이 벽은 넘어섰습니다. '
      +'AI의 역사는 이렇게 "수학의 한계 발견 → 새 수학으로 돌파"를 반복해 왔습니다.'
  },
  {
    q:'튜링 테스트가 판정하려는 것은 무엇입니까?',
    opts:['기계의 계산 속도','기계의 저장 용량','대화만으로 기계와 사람을 구별할 수 있는가'],
    answer:2,
    explain:'튜링은 1950년 논문 「계산 기계와 지능」에서 "기계가 생각할 수 있는가"라는 답하기 어려운 물음을 '
      +'"대화만으로 기계와 사람을 구별할 수 있는가"라는 판별 문제로 바꾸었습니다. '
      +'따라서 판정의 기준은 기계의 내부 구조나 성능이 아니라 겉으로 드러난 행동입니다. '
      +'활동 ①에서 여러분이 심사관이 되어 해 본 일이 바로 이 판별입니다.'
  },
  {
    q:'인공지능을 수학의 눈으로 볼 때, "학습"이란 무엇입니까?',
    opts:['규칙을 코드로 정확히 옮겨 적는 일','데이터 (x, y)를 가장 잘 설명하는 함수 f를 찾는 일','컴퓨터의 계산 속도를 높이는 일'],
    answer:1,
    explain:'인공지능의 모델은 입력 x를 출력 y에 대응시키는 함수 f이고, 학습은 주어진 데이터에 가장 잘 맞는 f를 찾아가는 과정입니다. '
      +'활동 ② 라운드 1에서 숨은 규칙이 y = 2x + 1이라는 일차함수였던 것을 떠올려 보세요. '
      +'라운드 3처럼 잡음이 섞이면 모든 점을 지나는 함수는 없으므로 "가장 잘 맞는 함수"를 고르게 되는데, 이것이 4단원 추세선·손실함수의 출발점입니다.'
  },
  {
    q:'마중 퀴즈로 돌아가서 — 세탁기의 퍼지 제어, 내비게이션의 경로 탐색에 대한 설명으로 가장 알맞은 것은 무엇입니까?',
    opts:['로봇 몸체가 없으므로 인공지능이 아니다','감지·판단 같은 지적 능력을 구현한 생활 속 인공지능 사례다','사람이 매번 직접 조작해야 하는 기능이다'],
    answer:1,
    explain:'인공지능은 인식·학습·추론·행동과 같은 인간의 지적 능력을 컴퓨터로 구현하는 기술이므로, 로봇의 몸체 유무와는 관계가 없습니다. '
      +'세탁기의 퍼지 제어는 오염 정도를 인식해 판단하는 기능이고, 내비게이션의 경로 탐색은 수많은 경우 가운데 최적을 고르는 탐색 기능입니다. '
      +'둘 다 사람이 매번 조작하지 않아도 스스로 판단한다는 점에서 생활 속 인공지능 사례입니다.'
  },
];

/* ── 표제부 핵심 개념 칩 — 클릭 시 펼쳐지는 상세 설명 ── */
const IT_CHIP_DEFS = {
  '함수 f':
    `<p><b>정의.</b> 함수는 입력 x 하나하나에 출력 y 하나를 대응시키는 규칙입니다.
       인공지능에서 모형(model)은 현실의 복잡한 관계를 수학적으로 나타낸 것으로, 주로 이 함수 f의 모습을 띱니다.
       그러므로 "인공지능을 만든다"는 말은 곧 "입력을 출력으로 옮겨 주는 함수 f를 정한다"는 뜻입니다.</p>
     <p style="margin-top:0.5rem;"><b>예시.</b> ① 사진(x)을 넣으면 '고양이'(y)라는 이름이 나오는 이미지 분류기,
       ② 한국어 문장(x)을 넣으면 영어 문장(y)이 나오는 번역기. 겉모습은 달라도 둘 다 f : x ↦ y 입니다.</p>
     <p style="margin-top:0.5rem;"><b>이번 차시와의 연결.</b> STEP 2 활동 ②에서 여러분은 같은 함수를
       규칙기반(A)과 학습기반(B) 두 방식으로 만들어 보았습니다.
       특히 오른쪽 기계의 숨은 규칙 y = 2x + 1을 데이터만 보고 알아맞힌 순간,
       여러분은 "데이터에서 함수 f를 찾는" 학습을 손으로 해 본 것입니다.</p>
     <div class="btn-row">
       <button class="btn" style="text-transform:none;" onclick="${itGoTab(1)}">STEP 2 활동 ②로 이동 →</button>
       <button class="btn" style="text-transform:none;" onclick="go('mlplay')">2차시 · 학습 방식 →</button>
     </div>`,

  '규칙 기반':
    `<p><b>정의.</b> 규칙 기반 방식은 사람이 이미 알고 있는 규칙을 IF-THEN 형태로 적어 넣어 컴퓨터를 작동시키는 방법입니다.
       이에 비해 학습 기반 방식은 규칙을 적지 않고, 데이터 (x, y)를 주어 컴퓨터가 규칙에 해당하는 함수를 스스로 찾게 합니다.
       두 방식의 결정적 차이는 성능이 아니라 <b>규칙을 찾는 주체가 사람인가 기계인가</b>에 있습니다.</p>
     <p style="margin-top:0.5rem;"><b>예시.</b> ① 규칙 기반 — 1972년의 의료 전문가 시스템 마이신(MYCIN)은
       "열이 있고 백혈구 수치가 높으면 특정 감염을 의심한다"와 같은 규칙을 저장해 진단을 도왔습니다.
       ② 학습 기반 — 스팸 메일 분류기는 규칙을 적는 대신 수많은 메일과 '스팸/정상' 표시를 함께 학습합니다.</p>
     <p style="margin-top:0.5rem;"><b>이번 차시와의 연결.</b> STEP 2 활동 ②의 왼쪽(A)에서 규칙을 직접 옮겨 적어
       테스트를 통과시켜 본 것처럼, 규칙이 분명한 문제에서는 규칙 기반이 여전히 정확합니다.
       그러나 손글씨 인식처럼 규칙을 말로 다 적을 수 없는 문제에서는 학습 기반이 필요합니다.</p>
     <div class="btn-row">
       <button class="btn" style="text-transform:none;" onclick="${itGoTab(1)}">STEP 2 활동 ②로 이동 →</button>
       <button class="btn" style="text-transform:none;" onclick="go('logic')">3차시 · 규칙과 논리 →</button>
     </div>`,

  '튜링 테스트':
    `<p><b>정의.</b> 튜링 테스트는 기계가 지능을 가졌는지를 대화만으로 판별하는 시험입니다.
       심판은 보이지 않는 두 상대(한쪽은 사람, 다른 쪽은 컴퓨터 프로그램)와 글로만 대화한 뒤 어느 쪽이 사람인지 판정하며,
       구별하지 못하면 그 기계는 시험을 통과한 것으로 봅니다.
       앨런 튜링이 1950년 논문 「계산 기계와 지능」에서 이미테이션 게임이라는 이름으로 제안하였습니다.</p>
     <p style="margin-top:0.5rem;"><b>예시.</b> ① 1966년의 챗봇 ELIZA는 상대의 문장을 되묻는 규칙만으로 사람처럼 보였습니다.
       ② 2014년에는 13세 소년으로 설정된 프로그램 '유진 구스트만'이 심사위원 33%를 속여 통과 논란이 있었습니다.</p>
     <p style="margin-top:0.5rem;"><b>이번 차시와의 연결.</b> STEP 2 활동 ①에서 여러분이 일곱 개의 대화를 두고
       "사람이다 / AI다"를 직접 판별해 본 것이 바로 이 시험입니다.
       마지막 대화(생성형 AI)에서 판별이 어려웠다면, 그것이 오늘 수업의 핵심 경험입니다.</p>
     <div class="btn-row">
       <button class="btn" style="text-transform:none;" onclick="${itGoTab(0)}">STEP 2 활동 ①로 이동 →</button>
       <button class="btn" style="text-transform:none;" onclick="go('bias')">5차시 · 빅데이터 편향 →</button>
     </div>`,

  '붐':
    `<p><b>정의.</b> AI 겨울이란 인공지능에 대한 기대가 무너져 연구비와 사회적 관심이 끊긴 시기를 말하며,
       1974~1980년의 1차 겨울과 1987~1993년의 2차 겨울이 대표적입니다.
       반대로 새로운 수학이나 기술이 한계를 돌파하면 다시 기대가 높아지는데, 이를 붐(봄)이라 부릅니다.
       인공지능의 역사는 이 붐과 겨울이 번갈아 반복된 역사입니다.</p>
     <p style="margin-top:0.5rem;"><b>예시.</b> ① 1969년 단층 퍼셉트론이 XOR을 표현할 수 없다는 증명은 1차 겨울을 불렀고,
       1986년 다층 구조와 미분(역전파)이 그 벽을 넘었습니다.
       ② 1980년대에 번영한 전문가 시스템은 규칙을 다 적을 수 없다는 한계로 2차 겨울을 맞았고,
       2012년 합성곱 신경망과 GPU의 행렬 연산이 다시 봄을 열었습니다.</p>
     <p style="margin-top:0.5rem;"><b>이번 차시와의 연결.</b> STEP 2 활동 ③의 관심도 곡선에서
       두 번 움푹 팬 구간이 바로 겨울이고, 곡선이 다시 솟는 지점마다 새로운 수학이 놓여 있습니다.
       연대 배치 게임에서 정렬한 여섯 사건을 이 흐름 위에 올려 놓고 다시 읽어 보세요.</p>
     <div class="btn-row">
       <button class="btn" style="text-transform:none;" onclick="${itGoTab(2)}">STEP 2 활동 ③으로 이동 →</button>
       <button class="btn" style="text-transform:none;" onclick="go('perceptron')">4차시 · 퍼셉트론 →</button>
     </div>`,
};

/* ── intro 공통 컴포넌트 초기화 (뷰가 없으면 조용히 통과) ── */
(function(){
  if(!document.getElementById('v-intro')) return;
  if(typeof videoDeck==='function'){
    videoDeck('it-videos','intro',IT_VIDEOS);
    videoDeck('it-turing-videos','intro-turing',IT_TURING_VIDEOS);
  }
  if(typeof warmStepper==='function') warmStepper('it-warm','it',IT_WARM_Q);
  if(typeof quizStepper==='function') quizStepper('it-quiz','it',IT_QUIZ_Q);
  if(typeof chipDefs==='function')    chipDefs('#v-intro .it-keys',IT_CHIP_DEFS);
})();


/* ═════════ 2차시 mlplay — 보강 데이터 · 공통 컴포넌트 초기화 ═════════ */
/* ═══════════════════════════════════════════════════════════════
   2차시 · AI의 학습 방식 (mlplay) — 보강 데이터 · 공통 API 호출 블록
   접두사: ml / ML_
   ───────────────────────────────────────────────────────────────
   이 파일의 내용은 core.js 의 mlplay 블록(기존 mlplay 초기화 IIFE 바로 뒤)에
   그대로 붙여 넣습니다. 공통 컴포넌트(quizStepper·warmStepper·videoDeck·chipDefs)는
   Finalize 단계가 core.js 에 구현하며, 이 파일은 "호출하는 쪽"만 담당합니다.
   함께 제거해야 할 기존 함수·상수는 NOTES.md 참고.
   ═══════════════════════════════════════════════════════════════ */


/* ── 공통 유틸 (mlVidEsc 제거 대체) ── */
function mlEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── 탭·활동으로 이동하는 보조 함수 (핵심 개념 칩 상세 설명의 이동 버튼에서 사용) ── */
function mlJump(tab,id){
  const tabs=document.querySelectorAll('#v-mlplay .tabs .tab');
  if(typeof mlTab==='function' && tabs[tab]) mlTab(tab,tabs[tab]);
  const el=document.getElementById(id);
  if(!el) return;
  const head=el.querySelector('.tgl-head');
  if(head && !head.classList.contains('open')) head.click();
  try{el.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){el.scrollIntoView();}
}


/* ═════════ 1. 추천 영상 (videoDeck) ═════════
   실존 확인된 유튜브 ID만 사용합니다(새 ID 창작 금지).             */
/* 자료 중복 배치 금지(§23) — 역사 영상은 1차시, 탐색 영상은 3차시 전용입니다. */
const ML_VIDEOS=[
  {id:'IiyYsAMmmw4', t:'기계학습 — 지도학습·비지도학습·강화학습', s:'유튜브 · 오늘의 주력 영상'},
];


/* ═════════ 2. 마중 퀴즈 (warmStepper — 순차 공개, 라벨 "질문 N.") ═════════ */
const ML_WARM_Q=[
  {
    q:'"정답(레이블)이 없는 데이터로는 기계가 아무것도 배울 수 없다." — 맞을까요?',
    opts:['O — 정답이 없으면 배울 수 없습니다','X — 정답이 없어도 배울 수 있습니다'],
    answer:1,
    explain:'정답이 없어도 기계는 배웁니다. 정답 라벨이 없을 때 기계는 <b>거리</b>를 기준으로 비슷한 것끼리 묶거나(비지도학습), 행동의 결과로 돌아오는 <b>보상</b>을 신호로 삼습니다(강화학습). 오늘 이 두 방식을 직접 돌려 봅니다.'
  },
  {
    q:'AI가 사진 100장을 "비슷한 것끼리" 세 묶음으로 나누었습니다. 이때 AI가 한 일은 무엇일까요?',
    opts:['미리 정해진 정답 이름표를 맞혔습니다','정답 없이 가까운(비슷한) 것끼리 묶었습니다','사람이 준 묶음 기준을 그대로 따랐습니다'],
    answer:1,
    explain:'군집화에는 맞혀야 할 정답 이름표가 애초에 없습니다. 서로 가까운(비슷한) 것끼리 묶을 뿐이며, 그 "가깝다"의 기준이 바로 <b>두 점 사이의 거리</b>입니다. 그래서 결과의 옳고 그름이 아니라 묶음의 타당성을 설명하게 됩니다.'
  },
  {
    q:'정답도 없고 묶을 것도 없습니다. 게임 속 AI는 무엇을 보고 더 좋은 행동을 배울까요?',
    opts:['사람이 붙인 정답 라벨','행동의 결과로 받는 보상','데이터의 개수'],
    answer:1,
    explain:'강화학습은 정답 대신 행동의 결과로 돌아오는 <b>보상 r</b>을 신호로 삼습니다. 점수가 오르면 상, 깎이면 벌로 인식하며 더 나은 행동을 찾아 갑니다. 탭 ③의 밴딧 게임에서 직접 보상을 모아 보겠습니다.'
  },
];


/* ═════════ 3. 형성평가 (quizStepper — 문항 1개씩, 총점·복기) ═════════ */
const ML_QUIZ_Q=[
  {
    q:'지도학습·비지도학습·강화학습을 구분하는 기준으로 가장 알맞은 것은 무엇입니까?',
    opts:['사용하는 컴퓨터의 성능','정답(레이블)이 있는가, 없다면 무엇을 신호로 삼는가','데이터가 사진인가 숫자인가'],
    answer:1,
    explain:'기계학습은 <b>학습시키는 방법</b>에 따라 세 갈래로 나뉩니다. 갈림길은 컴퓨터의 성능이나 자료의 종류가 아니라 "데이터가 기계에게 무엇을 알려 주는가"입니다. 정답 y가 있으면 지도학습, 없으면 거리로 묶는 비지도학습, 정답 대신 보상 r이 오면 강화학습입니다.'
  },
  {
    q:'k-means에서 각 점이 어느 군집에 속할지 정하는 기준은 무엇입니까?',
    opts:['점에 미리 붙어 있는 정답 라벨','각 중심까지의 거리 — 가장 가까운 중심','점을 찍은 순서'],
    answer:1,
    explain:'k-means에는 정답 라벨이 없습니다. 배정의 기준은 오직 <b>거리</b>로, 각 중심까지의 거리 d = √((x₁−x₂)² + (y₁−y₂)²)를 비교해 가장 작은 중심의 군집으로 분류합니다. 탭 ②의 [계산 과정 펼치기]에서 거리표를 다시 확인해 보세요.'
  },
  {
    q:'k-means에서 중심(×)의 새 위치는 무엇으로 정해집니까?',
    opts:['소속 점들의 좌표의 평균','소속 점들 중 가장 큰 좌표','좌표평면의 한가운데 (5, 5)'],
    answer:0,
    explain:'중심의 좌표는 소속 점들의 x좌표 평균과 y좌표 평균입니다. 즉 (x̄, ȳ) = ( (x₁+…+xₙ)/n , (y₁+…+yₙ)/n )입니다. 중심이 곧 <b>평균</b>이기 때문에, 멀리 떨어진 이상치 하나가 들어오면 중심이 그쪽으로 끌려갑니다.'
  },
  {
    q:'밴딧 게임에서 B를 8번 눌러 보상 1이 5번 나왔습니다. B의 경험적 보상률은 얼마입니까?',
    opts:['5 (보상의 합)','5/8 = 0.625 (상대도수)','8/5 = 1.6'],
    answer:1,
    explain:'경험적 보상률은 (보상이 1인 횟수) ÷ (그 선택지를 고른 횟수), 곧 <b>상대도수</b>입니다. 따라서 5 ÷ 8 = 0.625입니다. 보상의 합 5는 누적 보상일 뿐 비율이 아니며, 시도 횟수가 늘어날수록 이 상대도수는 숨은 확률 p에 가까워집니다.'
  },
  {
    q:'10회만 해 보고 "B가 최선"이라고 확신하기 어려운 이유로 가장 알맞은 것은 무엇입니까?',
    opts:['보상이 1과 0뿐이라 계산이 불가능해서','시도가 적어 상대도수가 흔들리고, 탐험을 멈추면 더 좋은 선택을 놓칠 수 있어서','숨은 확률이 매 회차마다 바뀌어서'],
    answer:1,
    explain:'숨은 확률 p는 변하지 않고, 보상이 0과 1뿐이어도 상대도수는 잘 계산됩니다. 문제는 두 가지입니다 — 시도가 적으면 표본이 작아 상대도수가 크게 흔들리고, 한 선택만 반복하면 더 좋은 선택지를 영영 확인하지 못합니다. 그래서 <b>탐험</b>과 <b>활용</b>의 균형이 필요합니다.'
  },
  {
    q:'다음 중 강화학습에 해당하는 것은 무엇입니까?',
    opts:['이메일에서 스팸 여부 분류하기','고객 구매 데이터에서 내역별로 연관성 식별하기','차량이 스스로 주차하도록 교육해 소모 시간과 시행착오 줄이기'],
    answer:2,
    explain:'스팸 여부 분류는 정답 이름표가 붙은 데이터를 쓰므로 지도학습, 구매 데이터의 연관성 식별은 정답 없이 숨은 규칙을 찾으므로 비지도학습(연관성 분석)입니다. 자율 주차는 시행에 따른 <b>보상</b>으로 최적 행동을 찾아 가므로 강화학습입니다.'
  },
];


/* ═════════ 4. 핵심 개념 칩 상세 설명 (chipDefs) ═════════
   ※ 칩 텍스트끼리 서로 부분 문자열이 되지 않도록 키를 잡았습니다.
      ('지도학습'은 '비지도학습'의 부분 문자열이므로 키로 쓰지 않고
       '레이블'·'비지도'로 구분합니다.)                              */
const ML_CHIP_DEFS={
  '레이블':
    '<b>지도학습 · 레이블</b><br>'+
    '지도학습(Supervised Learning)은 입력값과 출력값을 함께 주고 학습시키는 방법으로, 처음부터 문제와 정답을 모두 알려 줍니다. '+
    '학습에 주는 자료를 <b>훈련 데이터</b>라 하고, 훈련 데이터에 정답을 달아 주는 일을 <b>레이블링(Labeling)</b>이라고 합니다. '+
    '이때의 레이블이 1차시에서 배운 함수 f의 출력 y에 해당합니다.'+
    '<p style="margin-top:0.6rem;"><b>예시</b> — ① 스팸·정상 이름표가 붙은 메일로 학습한 스팸 필터 ② 0~9의 정답이 달린 손글씨 이미지로 학습한 숫자 인식기.</p>'+
    '<p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — STEP 2 활동 ①에서 \'손바닥·주먹 사진 + 이름표\'와 \'기온 x → 판매량 y 예측\' 카드를 지도학습 바구니에 넣어 본 것처럼, '+
    '정답이 데이터에 붙어 있는지만 확인하면 판단이 끝납니다. \'무엇인가\'를 맞히면 분류, \'얼마인가\'를 맞히면 예측이지만 둘 다 지도학습입니다.</p>'+
    '<div class="btn-row" style="margin-top:0.7rem;">'+
      '<button class="btn" onclick="mlJump(0,\'ml-act-sort\')">STEP 2 활동 ①로 이동</button>'+
      '<button class="btn" onclick="go(\'intro\')">1차시 · 함수 f 다시 보기</button>'+
      '<button class="btn" onclick="go(\'perceptron\')">4차시 · 가중치 조정으로 잇기</button>'+
    '</div>',

  '비지도':
    '<b>비지도학습 · 군집</b><br>'+
    '비지도학습(Unsupervised Learning)은 기계가 정답이 제공되지 않은 데이터를 학습하여 스스로 새로운 정보를 찾아내는 방법입니다. '+
    '맞혀야 할 이름표가 없으므로 판단의 기준은 "정답과 같은가"가 아니라 "서로 얼마나 <b>가까운가</b>"가 됩니다. '+
    '대표적인 사례로는 비슷한 것끼리 묶는 <b>군집화</b>와, 함께 자주 일어나는 사건을 찾는 <b>연관성 분석</b>이 있습니다.'+
    '<p style="margin-top:0.6rem;"><b>예시</b> — ① 쇼핑몰이 구매 기록만 보고 소비 성향이 비슷한 회원끼리 묶어 그룹별로 광고를 보내는 일 ② 주제 이름표 없이 단어 사용이 비슷한 뉴스 기사끼리 모으는 일.</p>'+
    '<p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — STEP 2 활동 ②에서 정답 라벨이 하나도 없는 점들을 [1 Step]으로 묶어 본 것이 바로 군집화입니다. '+
    '결과에 정답이 없으므로 "왜 그렇게 묶었는지 기준을 설명할 수 있는가"가 평가의 잣대라는 점을 기억합시다.</p>'+
    '<div class="btn-row" style="margin-top:0.7rem;">'+
      '<button class="btn" onclick="mlJump(1,\'ml-act-km\')">STEP 2 활동 ②로 이동</button>'+
      '<button class="btn" onclick="go(\'bias\')">5차시 · 데이터가 치우치면</button>'+
    '</div>',

  '강화':
    '<b>강화학습 · 보상</b><br>'+
    '강화학습(Reinforcement Learning)은 현재 상태에서 어떤 행동을 하는 것이 최적인지를 찾아내는 학습 방법입니다. '+
    '각 행동에 따라 주어지는 <b>보상</b>을 통해 최적 행동이 점점 강화되도록 학습이 진행됩니다. '+
    '목표는 한 번의 정답이 아니라 <b>장기적으로 누적 보상을 최대화하는 전략(정책)</b>을 찾는 것입니다.'+
    '<p style="margin-top:0.6rem;"><b>예시</b> — ① 2016년 이세돌 9단과의 대국에서 4승 1패를 거둔 알파고 ② 캔을 캔 통에 넣으면 +1점, 다른 통에 넣으면 0점을 받으며 행동을 고쳐 나가는 분리수거 로봇.</p>'+
    '<p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — STEP 2 활동 ③의 밴딧 게임에서 A·B·C를 눌러 보상 0 또는 1을 모으며 "어느 선택이 좋은가"를 스스로 판단해 본 것이 강화학습의 축소판입니다. '+
    '초반에는 <b>탐험</b>, 판단이 서면 <b>활용</b> — 이 균형이 전략의 핵심이었습니다.</p>'+
    '<div class="btn-row" style="margin-top:0.7rem;">'+
      '<button class="btn" onclick="mlJump(2,\'ml-act-bd\')">STEP 2 활동 ③으로 이동</button>'+
      '<button class="btn" onclick="go(\'intro\')">1차시 · 2016 알파고 다시 보기</button>'+
    '</div>',

  '거리':
    '<b>두 점 사이의 거리</b><br>'+
    '좌표평면 위의 두 점 (x₁, y₁), (x₂, y₂) 사이의 거리는 d = √((x₁−x₂)² + (y₁−y₂)²)로 구합니다. '+
    '비지도학습에서 "비슷하다"는 말은 감각적인 표현이 아니라 <b>이 거리가 작다</b>는 뜻입니다. '+
    '거리를 정의할 수 있으면, 특성이 몇 가지든 자료를 묶을 수 있습니다.'+
    '<p style="margin-top:0.6rem;"><b>예시</b> — ① 점 (1, 1)과 (2, 2)의 거리는 √2 ≈ 1.41 ② 과일의 단맛을 x, 신맛을 y로 두면 두 과일의 맛 차이도 같은 식으로 잽니다.</p>'+
    '<p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — STEP 2 활동 ②에서 [1 Step]을 누를 때마다 각 점이 <b>가장 가까운 중심</b>의 색으로 물들었습니다. '+
    '[계산 과정 펼치기]를 열면 점마다 세 중심까지의 거리를 모두 계산해 가장 작은 값을 고르는 과정이 수로 보입니다.</p>'+
    '<div class="btn-row" style="margin-top:0.7rem;">'+
      '<button class="btn" onclick="mlJump(1,\'ml-act-km\')">STEP 2 활동 ②로 이동</button>'+
      '<button class="btn" onclick="go(\'hamming\')">13차시 · 또 다른 거리(해밍 거리)</button>'+
    '</div>',

  '평균':
    '<b>평균(중심)</b><br>'+
    'k-means에서 각 군집의 <b>중심</b>은 소속된 점들의 <b>산술평균</b>입니다. '+
    '즉 (x̄, ȳ) = ( (x₁+x₂+…+xₙ)/n , (y₁+y₂+…+yₙ)/n )으로 계산합니다. '+
    '중심이 평균이기 때문에 갱신 단계는 계산만 하면 끝나지만, 동시에 <b>평균이 극단값에 약하다</b>는 성질도 그대로 따라옵니다.'+
    '<p style="margin-top:0.6rem;"><b>예시</b> — ① 점 (1, 1), (2, 1), (2, 2)의 중심은 (5/3, 4/3) ≈ (1.67, 1.33) ② 여기에 (10, 10) 하나가 더해지면 중심은 (3.75, 3.5)로 크게 끌려갑니다.</p>'+
    '<p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — STEP 2 활동 ②의 [이상치 추가]를 눌러 중심 ×가 멀리 끌려가는 장면을 확인했습니다. '+
    '데이터 한 개가 결과 전체를 바꿀 수 있다는 이 관찰은 5차시 데이터 편향 논의로 이어집니다.</p>'+
    '<div class="btn-row" style="margin-top:0.7rem;">'+
      '<button class="btn" onclick="mlJump(1,\'ml-act-km\')">STEP 2 활동 ②로 이동</button>'+
      '<button class="btn" onclick="go(\'bias\')">5차시 · 치우친 데이터</button>'+
    '</div>',

  '상대도수':
    '<b>상대도수(보상률)</b><br>'+
    '상대도수는 (어떤 사건이 일어난 횟수) ÷ (전체 시행 횟수)입니다. '+
    '밴딧 게임에서는 (보상이 1인 횟수) ÷ (그 선택지를 고른 횟수)가 곧 <b>경험적 보상률</b>이 됩니다. '+
    '시행 횟수가 늘어날수록 상대도수는 눈에 보이지 않는 <b>숨은 확률 p</b>에 가까워집니다.'+
    '<p style="margin-top:0.6rem;"><b>예시</b> — ① B를 8번 눌러 보상 1이 5번이면 보상률은 5/8 = 0.625 ② 2번 눌러 1번 성공한 1/2 = 0.5보다, 100번 눌러 60번 성공한 0.6이 훨씬 믿을 만한 추정입니다.</p>'+
    '<p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — STEP 2 활동 ③에서 10회 이상 눌러 막대그래프로 확인한 값이 바로 이 상대도수이고, '+
    '[확률 공개]를 누르면 그 값이 숨은 확률에 얼마나 가까웠는지 비교할 수 있었습니다.</p>'+
    '<div class="btn-row" style="margin-top:0.7rem;">'+
      '<button class="btn" onclick="mlJump(2,\'ml-act-bd\')">STEP 2 활동 ③으로 이동</button>'+
      '<button class="btn" onclick="go(\'logic\')">3차시 · 규칙으로 생각하는 AI</button>'+
    '</div>',
};


/* ═════════ 5. 참고 자료 카드 (스펙 §14 — 실존 확인 URL만) ═════════ */
const ML_REF_KEY='aimath.mlplay.refs';
const ML_REFS_BASE=[
  {kind:'yt', vid:'IiyYsAMmmw4', badge:'영상',
   t:'기계학습 — 지도·비지도·강화',
   d:'세 가지 학습 방식을 사례와 함께 정리한 영상입니다. 오늘 수업의 디딤 영상과 같습니다.'},
  {kind:'yt', vid:'xeWIcOy8rzY', badge:'영상',
   t:'한눈에 보는 인공지능의 역사',
   d:'EBS 이솦 — 1차시 타임라인을 복습하며 알파고와 강화학습의 자리를 확인해 봅니다.'},
  {kind:'web', url:'https://teachablemachine.withgoogle.com', em:'🤖', badge:'웹 도구',
   t:'티처블 머신(Teachable Machine)',
   d:'사진·소리·자세를 직접 학습시켜 지도학습을 체험하는 구글의 웹 도구입니다. 5차시 편향 실습에서도 사용합니다.'},
  {kind:'web', url:'https://www.ebssw.kr', em:'📺', badge:'사이트',
   t:'EBS 이솦(온라인 AI 교육 플랫폼)',
   d:'인공지능 개념 영상과 실습 자료를 찾아볼 수 있는 공식 사이트입니다.'},
];

function mlRefLoad(){
  try{
    const raw=localStorage.getItem(ML_REF_KEY);
    const arr=raw?JSON.parse(raw):[];
    return Array.isArray(arr)?arr:[];
  }catch(e){return [];}
}
function mlRefSave(arr){
  try{localStorage.setItem(ML_REF_KEY,JSON.stringify(arr));}catch(e){}
}

function mlRefRender(){
  const box=document.getElementById('ml-refs');
  if(!box) return;
  let html=ML_REFS_BASE.map(r=>{
    const url=(r.kind==='yt')?('https://www.youtube.com/watch?v='+r.vid):r.url;
    const th=(r.kind==='yt')
      ?`<div class="th"><img src="https://img.youtube.com/vi/${r.vid}/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='🎬';"></div>`
      :`<div class="th">${r.em}</div>`;
    return `<a class="ml-ref" href="${mlEsc(url)}" target="_blank" rel="noopener">`+
      th+`<span class="bg">${mlEsc(r.badge)}</span>`+
      `<div class="bd"><div class="tt">${mlEsc(r.t)}</div><div class="ds">${mlEsc(r.d)}</div></div></a>`;
  }).join('');
  html+=mlRefLoad().map((r,i)=>
    `<a class="ml-ref" href="${mlEsc(r.url)}" target="_blank" rel="noopener">`+
    `<div class="th">🔗</div><span class="bg">추가</span>`+
    `<button class="del" title="이 자료 삭제" onclick="event.preventDefault();event.stopPropagation();mlRefDel(${i});">×</button>`+
    `<div class="bd"><div class="tt">${mlEsc(r.t||r.url)}</div><div class="ds">선생님이 추가한 자료입니다.</div></div></a>`
  ).join('');
  box.innerHTML=html;
}

function mlRefAdd(){
  const iu=document.getElementById('ml-ref-url');
  const it=document.getElementById('ml-ref-title');
  const st=document.getElementById('ml-ref-st');
  if(!iu) return;
  const url=iu.value.trim();
  if(!/^https?:\/\//i.test(url)){
    if(st) st.textContent='http(s)로 시작하는 전체 주소를 붙여넣어 주세요.';
    return;
  }
  const arr=mlRefLoad();
  arr.push({url:url, t:(it&&it.value.trim())||url});
  mlRefSave(arr);
  iu.value=''; if(it) it.value='';
  if(st) st.textContent='자료를 추가했습니다. 이 기기에만 저장됩니다.';
  mlRefRender();
}

function mlRefDel(i){
  const arr=mlRefLoad();
  if(i<0||i>=arr.length) return;
  arr.splice(i,1);
  mlRefSave(arr);
  const st=document.getElementById('ml-ref-st');
  if(st) st.textContent='추가한 자료를 삭제했습니다.';
  mlRefRender();
}


/* ═════════ 6. 공통 API 호출 초기화 ═════════
   ※ core.js 의 기존 mlplay 초기화 IIFE 바로 뒤에 놓습니다.
      기존 IIFE 안의 mlVidRender(); 한 줄은 반드시 삭제하십시오.        */
(()=>{
  const root=document.getElementById('v-mlplay');
  if(!root) return;
  if(typeof videoDeck==='function')   videoDeck('ml-videos','mlplay',ML_VIDEOS);
  if(typeof warmStepper==='function') warmStepper('ml-warm','ml',ML_WARM_Q);
  if(typeof quizStepper==='function') quizStepper('ml-quiz','ml',ML_QUIZ_Q);
  if(typeof chipDefs==='function')    chipDefs('#v-mlplay .ml-keys',ML_CHIP_DEFS);
  mlRefRender();
})();


/* ═════════ 3차시 logic — 보강 데이터 · 공통 컴포넌트 초기화 ═════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   LOGIC (3차시 · 규칙으로 생각하는 AI) — 보강 데이터 + 공통 컴포넌트 초기화
   접두사: lg / LG_   (core.js의 기존 lg 블록과 이름이 겹치지 않도록 새 이름만 사용)

   이 파일은 core.js 말미(startRouter IIFE 앞)에 그대로 append 합니다.
   공통 컴포넌트 quizStepper·warmStepper·videoDeck·chipDefs 는 Finalize 단계가
   core.js에 구현하며, 이 파일은 "호출하는 쪽"만 담당합니다.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1. 추천 영상 (videoDeck) — 실존 확인된 ID만 사용 ── */
/* 자료 중복 배치 금지(§23) — 역사 영상은 1차시 전용입니다. */
const LG_VIDEOS = [
  { id:'fG8T07Csz6w', t:'인공지능의 시작, 탐색 — 규칙과 탐색으로 푸는 문제', s:'EBS 이솦' },
];

/* ── 2. 마중 퀴즈 (warmStepper) — 순차 공개, 라벨 "질문 N." ── */
const LG_WARM_QS = [
  {
    q:'"열이 나면 감기다", "기침을 하면 감기다" 같은 규칙(IF-THEN) 문장을 아주 많이 적어 두면, 컴퓨터가 진짜 의사를 대신해 진단할 수 있을까요?',
    opts:['규칙을 충분히 많이 적으면 가능하다','규칙을 아무리 늘려도 한계가 있다','규칙으로는 아무것도 판단할 수 없다'],
    answer:1,
    explain:'정답은 "규칙을 아무리 늘려도 한계가 있다"입니다. 1980년대의 전문가 시스템은 규칙을 쌓아 올려 큰 성공을 거두었지만, 사람이 예외를 모두 적어 둘 수 없고 규칙끼리 서로 다른 결론을 가리키면 답을 내지 못하는 벽에 부딪혔습니다. 오늘 전개 탭 ②에서 그 충돌을 직접 만들어 보고, 규칙이 어디에서 멈추는지 눈으로 확인합니다.'
  },
  {
    q:'명제 p가 참(1), 명제 q가 거짓(0)일 때 — "p 또는 q"(논리합)의 진릿값은 무엇일까요?',
    opts:['1 (참)','0 (거짓)','정할 수 없다'],
    answer:0,
    explain:'정답은 1(참)입니다. 논리합(OR, ∨)은 두 명제 가운데 하나라도 참이면 참이 되고, 모두 거짓일 때만 거짓이 됩니다. 여기서는 p가 참이므로 q의 값과 관계없이 p∨q는 참, 곧 1입니다. 전개 탭 ①에서 진리표 네 줄을 직접 채우며 확인해 봅시다.'
  },
  {
    q:'"이차방정식 ax²+bx+c=0의 실근이 몇 개인지 판정하라"를 컴퓨터에게 시키려면, 가장 먼저 필요한 것은 무엇일까요?',
    opts:['모든 답을 통째로 외우게 한다','판단 순서를 단계로 적어 준다','데이터를 100만 개 모아 준다'],
    answer:1,
    explain:'정답은 "판단 순서를 단계로 적어 준다"입니다. 어떤 문제를 해결하는 처리 과정의 순서를 알고리즘이라 하고, 그것을 기호와 그림으로 나타낸 것이 순서도입니다. 규칙 기반 인공지능은 답을 외우거나 데이터를 모으는 대신 판단의 절차를 사람이 적어 주는 방식이며, 전개 탭 ③에서 그 순서도를 한 단계씩 따라가 봅니다.'
  },
];

/* ── 3. 형성평가 (quizStepper) — 문항 1개씩, 총점·복기·다시 풀기 ── */
const LG_QUIZ_QS = [
  {
    q:'p=1, q=0일 때 배타적 논리합 p⊕q의 진릿값은?',
    opts:['0 (거짓)','1 (참)','정할 수 없다'],
    answer:1,
    explain:'정답은 1(참)입니다. 배타적 논리합(XOR, ⊕)은 두 명제 중 하나만 참일 때 참이 되고, 둘 다 참이거나 둘 다 거짓이면 거짓이 됩니다. p=1, q=0은 두 값이 서로 다르므로 p⊕q=1입니다. "같으면 0, 다르면 1"로 기억해 두면 편리합니다.'
  },
  {
    q:'진리표의 출력 열이 0 0 0 1 (p, q가 0 0 → 0 1 → 1 0 → 1 1 순)인 논리 연산은?',
    opts:['논리합(OR, ∨)','논리곱(AND, ∧)','배타적 논리합(XOR, ⊕)'],
    answer:1,
    explain:'정답은 논리곱(AND, ∧)입니다. 출력이 마지막 행 (1, 1)에서만 1이므로 "둘 다 참일 때만 참"이라는 뜻이고, 이것이 논리곱입니다. 참고로 논리합의 출력 열은 0 1 1 1, 배타적 논리합의 출력 열은 0 1 1 0이므로 세 연산을 출력 열만으로 구별할 수 있습니다.'
  },
  {
    q:'전문가 시스템에서 규칙 ①이 후보 {코로나19, 독감}을, 규칙 ③이 후보 {코로나19}를 내놓았습니다. 추론 엔진이 결론을 좁히는 방법은?',
    opts:['두 후보 집합의 합집합을 구한다','두 후보 집합의 교집합을 구한다','규칙 번호가 큰 쪽을 그대로 쓴다'],
    answer:1,
    explain:'정답은 "교집합을 구한다"입니다. 여러 규칙이 각각 내놓은 후보 집합의 교집합을 구하면 {코로나19, 독감} ∩ {코로나19} = {코로나19}로 후보가 하나로 좁혀집니다. 합집합을 구하면 후보가 오히려 늘어나므로 결론에 이를 수 없습니다.'
  },
  {
    q:'순서도에서 마름모(◇) 기호의 뜻으로 알맞은 것은?',
    opts:['순서도의 시작과 끝을 나타낸다','여러 연산과 데이터 이동을 처리한다','조건에 따라 경우를 분류(판단)한다'],
    answer:2,
    explain:'정답은 "조건에 따라 경우를 분류(판단)한다"입니다. 순서도에서 시작과 끝은 타원, 여러 연산과 데이터 이동 등의 처리는 직사각형, 자료를 비교·판단해 경우를 나누는 것은 마름모로 나타냅니다. 오늘 따라간 순서도에서 "a = 0 ?", "D > 0 ?", "D = 0 ?" 세 개가 모두 마름모였습니다.'
  },
  {
    q:'다음 중 1970년대에 개발되어 세균 감염을 진단하고 항생제를 처방한 의료 전문가 시스템은?',
    opts:['DENDRAL','MYCIN','XCON'],
    answer:1,
    explain:'정답은 MYCIN입니다. MYCIN은 1970년대 스탠퍼드 대학에서 개발된 규칙 기반 전문가 시스템으로, 세균 감염 진단과 항생제 처방에 활용되며 전문가 수준의 진단 가능성을 입증하였습니다. DENDRAL은 1960년대에 분광 데이터로 분자 구조를 추정한 최초의 전문가 시스템이고, XCON은 1980년대에 컴퓨터 하드웨어 구성을 자동으로 추천한 시스템입니다.'
  },
  {
    q:'마중 퀴즈로 돌아가서 — "규칙을 아주 많이 적으면 AI가 의사를 대신할 수 있을까?"에 대한 설명으로 가장 알맞은 것은?',
    opts:['규칙 수가 1만 개를 넘으면 완전해진다','규칙끼리 충돌하고 예외를 다 적을 수 없어 한계가 있다','규칙 기반 방식으로는 어떤 진단도 불가능하다'],
    answer:1,
    explain:'정답은 "규칙끼리 충돌하고 예외를 다 적을 수 없어 한계가 있다"입니다. 오늘 사례 C에서 본 것처럼 고열과 콧물이 함께 나타나면 두 규칙이 서로 다른 결론을 가리켜 후보가 공집합이 됩니다. 그렇다고 규칙이 무력한 것은 아니어서, MYCIN처럼 전문가 수준의 진단을 해낸 사례도 있습니다. 그래서 실제 시스템은 퍼지 이론과 확률적 방법을 함께 사용합니다.'
  },
];

/* ── 4. 핵심 개념 칩 상세 설명 (chipDefs) ──
   키는 칩 텍스트의 일부. 값은 HTML 정의문
   ① 교과서식 정의 ② 구체 예시 ③ 이번 차시 활동과의 연결(+이동 버튼) ④ 이전·다음 차시 연결 */
const LG_DEFS = {
  '명제': `
    <p><b>정의</b> — 참 또는 거짓을 명확히 구분할 수 있는 문장이나 식을 <b>명제</b>라 하고,
      명제의 참과 거짓을 <b>진릿값</b>이라고 합니다. 진릿값이 참이면 T, 거짓이면 F로 나타내는데,
      프로그래밍에서는 <b>참을 1, 거짓을 0</b>으로 나타냅니다.
      규칙 기반 인공지능이 "판단한다"는 말은, 사실은 이렇게 0과 1로 바뀐 명제를 계산한다는 뜻입니다.</p>
    <p style="margin-top:0.5rem;"><b>예시</b> — "3은 소수이다"는 참이므로 진릿값이 1이고,
      "6은 소수이다"는 거짓이므로 진릿값이 0입니다.
      반면 "내일 비가 올까?"나 "이 그림은 아름답다"는 참·거짓을 명확히 정할 수 없으므로 명제가 아닙니다.
      인공지능에 넣을 수 있는 것은 오직 명제뿐이라는 점이 중요합니다.</p>
    <p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — 전개 탭 ①에서 p와 q의 진릿값을 0과 1로 직접 뒤집으며
      회로의 신호가 어떻게 달라지는지 관찰합니다. 탭 ②에서는 "고열이 있다"라는 명제가 참일 때에만
      해당 규칙이 발동하는 모습을 보게 됩니다.</p>
    <div class="btn-row">
      <button class="btn" onclick="lgGoAct(0,'lg-act0')">활동 ① 진리표 실험실로 이동</button>
      <button class="btn" onclick="go('intro')">← 1차시 · AI 개념과 역사</button>
    </div>`,

  '진리표': `
    <p><b>정의</b> — 주어진 명제들을 결합하여 새로운 명제를 만들 때 쓰는 기호를 <b>논리 연산자</b>라고 합니다.
      NOT(부정, ∼)은 진릿값을 뒤집고, OR(논리합, ∨)은 하나라도 참이면 참,
      AND(논리곱, ∧)은 모두 참일 때만 참, XOR(배타적 논리합, ⊕)은 하나만 참일 때 참입니다.
      두 명제 p, q의 진릿값이 주어질 때 합성 명제의 진릿값을 <b>모든 경우</b>에 대해 정리한 표를 <b>진리표</b>라고 합니다.</p>
    <p style="margin-top:0.5rem;"><b>예시</b> — p=1, q=0이면 p∨q=1, p∧q=0, p⊕q=1입니다.
      출력 열만 세로로 읽으면 AND는 <span class="mi">0 0 0 1</span>, OR는 <span class="mi">0 1 1 1</span>,
      XOR는 <span class="mi">0 1 1 0</span>이 되어 세 연산을 한눈에 구별할 수 있습니다.
      입력이 2개이면 표는 4행, 입력이 n개이면 2ⁿ행이 됩니다.</p>
    <p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — 전개 탭 ①에서 네 연산의 진리표를
      <b>먼저 예측해 채운 뒤</b> 채점하고, 회로의 신호로 확인하였습니다.
      특히 XOR의 출력 열 <span class="mi">0 1 1 0</span>은 오늘 수업의 복선입니다.</p>
    <div class="btn-row">
      <button class="btn" onclick="lgGoAct(0,'lg-act0')">활동 ① 진리표 실험실로 이동</button>
      <button class="btn" onclick="go('perceptron')">4차시 · 퍼셉트론과 XOR →</button>
    </div>`,

  '논리 게이트': `
    <p><b>정의</b> — 전자 회로에서 논리 연산을 수행하는 부품을 <b>논리 게이트</b>,
      게이트를 이어 붙여 만든 회로를 <b>논리 회로</b>라고 합니다.
      게이트는 0과 1이라는 전기 신호를 받아 진리표대로 출력을 내보냅니다.
      컴퓨터의 중앙 처리 장치는 결국 수십억 개의 논리 게이트로 이루어진 거대한 논리 회로입니다.</p>
    <p style="margin-top:0.5rem;"><b>예시</b> — 자동차 안전벨트 경고음은 "시동이 걸렸다 ∧ 안전벨트를 매지 않았다"가 참일 때만 울리는 <b>AND 회로</b>입니다.
      건물의 자동문은 "사람이 감지되었다 ∨ 열림 버튼을 눌렀다"인 <b>OR 회로</b>,
      계단 양쪽에서 켜고 끄는 전등은 두 스위치의 상태가 서로 다를 때 불이 켜지는 <b>XOR 회로</b>입니다.</p>
    <p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — 전개 탭 ①에서 채점을 마치면 회로도가 열리고,
      p와 q를 뒤집을 때마다 신호선의 색과 출력 전구가 바뀌는 것을 볼 수 있습니다.
      진리표의 한 행이 회로의 한 상태에 정확히 대응한다는 점을 확인해 보세요.</p>
    <div class="btn-row">
      <button class="btn" onclick="lgGoAct(0,'lg-c-gate')">사례 — 주변의 논리 회로 보기</button>
      <button class="btn" onclick="go('perceptron')">4차시 · 퍼셉트론과 XOR →</button>
    </div>`,

  '전문가 시스템': `
    <p><b>정의</b> — <b>전문가 시스템</b>은 전문적 지식과 정보를 이용해 대형 <b>지식 베이스</b>를 구축하고,
      사용자가 해결해야 할 문제가 주어질 때 <b>추론</b>을 통해 응답하는 시스템입니다.
      항상 같은 순서로 문제를 처리하는 전통적 프로그램과 달리, 입력된 사실에 따라 발동하는 규칙이 달라집니다.
      구성 요소는 <b>사용자 인터페이스</b>(질의와 답변의 통로), <b>추론 엔진</b>(규칙과 사실에서 새로운 사실을 탐색),
      <b>지식 베이스</b>(전문가의 지식을 규칙으로 저장) 세 가지입니다.</p>
    <p style="margin-top:0.5rem;"><b>예시</b> — 1960년대의 <b>DENDRAL</b>은 분광 데이터로 분자 구조를 추정한 최초의 전문가 시스템이고,
      1970년대의 <b>MYCIN</b>은 세균 감염을 진단하고 항생제를 처방한 의료 시스템입니다.
      1980년대에는 <b>XCON</b>이 컴퓨터 하드웨어 구성을 자동 추천하였고, 세법의 공제 요건을 규칙으로 옮긴
      <b>세무 상담 시스템</b>도 같은 원리로 동작합니다.
      전문가 시스템은 1960년대에 개발되어 1980년대에 상업적으로 번영하였습니다.</p>
    <p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — 전개 탭 ②에서 증상(사실)을 체크하면
      조건이 맞는 규칙이 순서대로 발동하고, 후보 집합의 교집합이 좁혀지는 과정을 직접 추적하였습니다.
      사례 C에서 후보가 공집합이 되는 장면이 바로 규칙 기반 방식의 한계입니다.</p>
    <div class="btn-row">
      <button class="btn" onclick="lgGoAct(1,'lg-act1')">활동 ② 전문가 시스템으로 이동</button>
      <button class="btn" onclick="go('mlplay')">← 2차시 · AI의 학습 방식</button>
    </div>`,

  '순서도': `
    <p><b>정의</b> — 어떤 문제를 해결하는 계산 방법 또는 처리 과정의 순서를 <b>알고리즘(algorithm)</b>이라 하고,
      알고리즘을 기호와 그림으로 나타낸 것을 <b>순서도(flowchart)</b>라고 합니다.
      순서도에서 <b>타원</b>은 시작과 끝, <b>직사각형</b>은 여러 연산 및 데이터 이동 등의 처리,
      <b>마름모</b>는 자료를 비교·판단해 경우를 분류하는 것, <b>화살표(흐름선)</b>는 처리의 흐름을 나타냅니다.</p>
    <p style="margin-top:0.5rem;"><b>예시</b> — 일차방정식 ax − b = 0의 해를 구하는 순서도는
      먼저 a = 0인지 판단하고, a = 0이면 다시 b = 0인지 판단하여 "해가 무수히 많다"와 "해가 없다"로 나눕니다.
      교실 밖에서는 병원 문진표의 예·아니요 분기, 자판기의 금액 판단과 거스름돈 반환이 모두 순서도입니다.</p>
    <p style="margin-top:0.5rem;"><b>이번 차시와의 연결</b> — 전개 탭 ③에서 이차방정식의 실근 개수를 판정하는 순서도를
      한 단계씩 따라가며 변수값 표가 갱신되는 모습을 관찰하였습니다.
      "a = 0 ?"을 판별식보다 <b>먼저</b> 두어야 하는 이유를 그 과정에서 확인할 수 있었습니다.</p>
    <div class="btn-row">
      <button class="btn" onclick="lgGoAct(2,'lg-act2')">활동 ③ 순서도 트레이서로 이동</button>
      <button class="btn" onclick="go('mlplay')">← 2차시 · AI의 학습 방식</button>
    </div>`,
};

/* ── 5. 활동으로 이동하는 링크 (칩 상세 설명에서 호출) ── */
function lgGoAct(n, id){
  const root=document.getElementById('v-logic');
  if(!root) return;
  const tabs=root.querySelectorAll('.tabs .tab');
  if(tabs[n] && typeof lgTab==='function'){ try{ lgTab(n,tabs[n]); }catch(e){} }
  const el=document.getElementById(id||('lg-act'+n));
  if(!el) return;
  const hd=el.querySelector('.tgl-head');
  if(hd && !hd.classList.contains('open')) hd.click();
  if(typeof el.scrollIntoView!=='function') return;
  try{ el.scrollIntoView({behavior:'smooth', block:'start'}); }
  catch(e){ try{ el.scrollIntoView(); }catch(e2){} }
}

/* ── 6. 참고 자료 카드 (STEP 3 맨 아래) — 실존 확인된 URL만 ── */
const LG_REF_KEY='aimath.logic.customrefs';
const LG_REFS=[
  { k:'em', em:'🃏', b:'웹 활동', t:'논리 회로 · 논리집합 카드 게임',
    d:'연산 카드와 명제 카드로 논리식을 만들어 진리표를 완성하는 교실 활동 안내입니다.',
    u:'https://dshskr.notion.site/1ad7f8928da3800393d8f321a9ff5798' },
  { k:'em', em:'📖', b:'백과사전', t:'위키백과 — 논리 게이트',
    d:'AND·OR·NOT·XOR 등 논리 게이트의 기호와 진리표를 표준 정의로 정리한 문서입니다. 오늘 채점한 진리표와 비교해 보세요.',
    u:'https://ko.wikipedia.org/wiki/논리_게이트' },
  { k:'em', em:'🐶', b:'웹 활동', t:'나에게 맞는 강아지 찾기',
    d:'한국일보가 만든 전문가 시스템 체험 페이지입니다. 질문에 답할수록 규칙이 후보를 좁혀 갑니다.',
    u:'https://interactive.hankookilbo.com/v/e4fe0c1ef9294bdbb8e34c3b326ec2ed/' },
  { k:'em', em:'📖', b:'백과사전', t:'위키백과 — 전문가 시스템',
    d:'지식 베이스와 추론 엔진의 구조, 전문가 시스템의 역사와 한계를 정리한 문서입니다.',
    u:'https://ko.wikipedia.org/wiki/전문가_시스템' },
  { k:'em', em:'📖', b:'백과사전', t:'위키백과 — 순서도',
    d:'순서도에 쓰이는 기호와 표기 규칙을 정리한 문서입니다. 오늘 그린 순서도와 비교해 보세요.',
    u:'https://ko.wikipedia.org/wiki/순서도' },
  { k:'em', em:'🏫', b:'사이트', t:'EBS 이솦 (EBS SW·AI)',
    d:'인공지능 개념 강좌와 실습 자료를 더 찾아볼 수 있는 사이트입니다.',
    u:'https://www.ebssw.kr' },
];

function lgRefEsc(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function lgRefLoad(){
  try{
    const raw=localStorage.getItem(LG_REF_KEY);
    const a=raw?JSON.parse(raw):[];
    return Array.isArray(a)?a:[];
  }catch(e){ return []; }
}

function lgRefSave(a){
  try{ localStorage.setItem(LG_REF_KEY, JSON.stringify(a)); }catch(e){}
}

function lgRefCard(r, idx){
  const u=lgRefEsc(r.u);
  const th = r.k==='yt'
    ? `<span class="th"><img src="https://img.youtube.com/vi/${lgRefEsc(r.vid)}/hqdefault.jpg" alt=""`+
      ` loading="lazy" referrerpolicy="no-referrer"`+
      ` onerror="this.style.display='none';this.parentNode.insertAdjacentText('beforeend','🎬');"></span>`
    : `<span class="th">${lgRefEsc(r.em||'🔗')}</span>`;
  const rm = (idx>=0)
    ? `<button class="rm" title="이 자료 삭제" aria-label="이 자료 삭제" onclick="event.preventDefault();event.stopPropagation();lgRefDel(${idx});">×</button>`
    : '';
  return `<div style="position:relative;">${rm}`+
    `<a class="lg-ref" href="${u}" target="_blank" rel="noopener">`+
    th+
    `<span class="bd"><span class="bg">${lgRefEsc(r.b||'자료')}</span>`+
    `<span class="tt">${lgRefEsc(r.t)}</span>`+
    `<span class="ds">${lgRefEsc(r.d||'')}</span></span></a></div>`;
}

function lgRefRender(){
  const box=document.getElementById('lg-refs');
  if(!box) return;
  const mine=lgRefLoad();
  box.innerHTML =
    LG_REFS.map(r=>lgRefCard(r,-1)).join('') +
    mine.map((r,i)=>lgRefCard(r,i)).join('');
}

function lgRefForm(open){
  const f=document.getElementById('lg-refform');
  const b=document.getElementById('lg-ref-open');
  if(f) f.style.display=open?'flex':'none';
  if(b) b.style.display=open?'none':'inline-block';
  if(open){
    const u=document.getElementById('lg-ref-url');
    if(u) u.focus();
  }
}

function lgRefAdd(){
  const u=document.getElementById('lg-ref-url');
  const t=document.getElementById('lg-ref-title');
  const st=document.getElementById('lg-ref-st');
  if(!u) return;
  const url=u.value.trim();
  if(!/^https?:\/\//i.test(url)){
    if(st) st.textContent='http 또는 https로 시작하는 전체 주소를 붙여넣어 주세요.';
    return;
  }
  const title=(t&&t.value.trim())?t.value.trim():url.replace(/^https?:\/\//i,'').slice(0,40);
  const mine=lgRefLoad();
  mine.push({ k:'em', em:'🔗', b:'추가 자료', t:title, d:'교사가 추가한 자료입니다.', u:url });
  lgRefSave(mine);
  u.value=''; if(t) t.value='';
  lgRefForm(false);
  lgRefRender();
  if(st) st.textContent='자료를 추가했습니다. 이 기기에 저장되어 다음 방문 때 그대로 보입니다.';
}

function lgRefDel(i){
  const mine=lgRefLoad();
  if(i<0||i>=mine.length) return;
  mine.splice(i,1);
  lgRefSave(mine);
  lgRefRender();
  const st=document.getElementById('lg-ref-st');
  if(st) st.textContent='추가했던 자료를 삭제했습니다.';
}

/* ── 7. 초기화 — 공통 컴포넌트 호출 (뷰가 없으면 아무 것도 하지 않음) ── */
(()=>{
  const root=document.getElementById('v-logic');
  if(!root) return;
  if(typeof videoDeck==='function')   videoDeck('lg-vdeck', 'logic', LG_VIDEOS);
  if(typeof warmStepper==='function') warmStepper('lg-warm', 'lg', LG_WARM_QS);
  if(typeof quizStepper==='function') quizStepper('lg-quiz', 'lg', LG_QUIZ_QS);
  if(typeof chipDefs==='function')    chipDefs('#v-logic .lg-keys', LG_DEFS);
  lgRefRender();
})();

/* 인라인 onclick에서 쓰이는 함수의 전역 노출(모듈 번들 대비 안전장치) */
try{
  window.lgGoAct=lgGoAct;
  window.lgRefForm=lgRefForm;
  window.lgRefAdd=lgRefAdd;
  window.lgRefDel=lgRefDel;
}catch(e){}


/* ═════════ 4차시 perceptron — 보강 데이터 · 공통 컴포넌트 초기화 ═════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   4차시 · 퍼셉트론과 XOR — 보강 데이터 & 공통 컴포넌트 초기화
   접두사: pcx / PCX_  (뷰 #v-perceptron 전용 네임스페이스)

   이 파일은 core.js 의 4차시 블록(pcx*) 끝부분에 그대로 이어 붙입니다.
   여기서 호출하는 네 개의 함수는 Finalize 단계가 core.js 에 구현하는 공통 API 입니다.
     · videoDeck(컨테이너id, 슬러그, VIDEOS)
     · warmStepper(컨테이너id, 접두사, QUESTIONS)
     · quizStepper(컨테이너id, 접두사, QUESTIONS)
     · chipDefs(칩컨테이너셀렉터, DEFS)

   근거 자료
     · 동아출판 『인공지능 수학』 1단원 01·02 (뉴런의 신호 전달, 퍼셉트론의 도식화,
       가중치·활성화함수·임곗값, XOR 연립부등식의 모순, 1969 민스키·페퍼트)
     · 씨마스 『인공지능 수학』 Ⅰ단원 (활성화함수·퍼셉트론의 정의, 단층/다층 퍼셉트론,
       진리표와 논리 연산, 다층퍼셉트론의 XOR 구현 w=5,4/1,2/4,−4, 1986 오류 역전파)
     · 강의 PPT 「3~4 활성화함수를 통한 퍼셉트론의 수학적 구조 이해」(성취기준 해설)
   ═══════════════════════════════════════════════════════════════════════════ */


/* ── ① 추천 영상 (스펙 2·9 — 실존 확인된 URL만 사용) ───────────────────── */
const PCX_VIDEOS = [
  { id:'xY1lwS381lM',
    t:'인공지능의 시작, 퍼셉트론',
    s:'YTN 사이언스' },
  { id:'sq9NuWX0yow',
    t:'AI 패러다임 전쟁사 — 기호주의의 몰락과 연결주의 혁명',
    s:'유튜브 · 민스키·페퍼트의 1969년 XOR 한계 증명' }
];


/* ── ② 마중 퀴즈 (순차 공개 — warmStepper) ────────────────────────────── */
const PCX_WARMQ = [
  {
    q: 'OR의 네 점은 직선 하나로 출력이 0인 점과 1인 점을 나눌 수 있었습니다. 그렇다면 XOR는 어떨까요?',
    opts: [
      '직선 하나로 나눌 수 있다',
      '직선 하나로는 나눌 수 없다',
      '점이 네 개뿐이라 직선이 필요 없다'
    ],
    answer: 1,
    explain: 'XOR의 네 점은 출력이 0인 (0,0)·(1,1)과 출력이 1인 (1,0)·(0,1)이 서로 대각선으로 엇갈려 있습니다. '
           + '어떤 직선을 그어도 같은 출력끼리 한쪽으로 모을 수 없습니다. '
           + '오늘 활동 ②에서 슬라이더를 직접 움직여 이 사실을 확인하고, 왜 그런지를 부등식으로 증명합니다.'
  },
  {
    q: '퍼셉트론이 “출력 1”을 내놓는 상황을 수학으로 옮기면 어떻게 될까요?',
    opts: [
      'w₁x₁ + w₂x₂ ≥ θ 일 때',
      'x₁ + x₂ 가 짝수일 때',
      '가중치가 모두 양수일 때'
    ],
    answer: 0,
    explain: '퍼셉트론의 판단 기준은 단 하나, 가중합이 임곗값 이상인가입니다. '
           + '즉 w₁x₁ + w₂x₂ ≥ θ 이면 1을, 그렇지 않으면 0을 출력합니다. '
           + '이 부등식 하나가 오늘 수업 전체의 뼈대가 됩니다.'
  },
  {
    q: '퍼셉트론이라는 발상은 어디에서 왔을까요?',
    opts: [
      '사람의 뇌를 이루는 뉴런의 신호 전달 방식',
      '주판으로 수를 계산하는 방식',
      '전화 교환기가 회선을 잇는 방식'
    ],
    answer: 0,
    explain: '뉴런은 다른 뉴런에게서 받은 전기 신호의 크기가 일정한 기준치보다 크면 다음 뉴런으로 신호를 전달합니다. '
           + '이 현상을 수학적 모델로 구현한 것이 인공신경망이고, 그 기본 단위가 퍼셉트론입니다. '
           + '뉴런의 ‘기준치’가 곧 퍼셉트론의 임곗값입니다.'
  }
];


/* ── ③ 형성평가 (스텝형 — quizStepper) ────────────────────────────────── */
const PCX_QUIZQ = [
  {
    q: '두 입력값 x₁, x₂에 대해 AND(논리곱) 연산을 구현하는 가중치와 임곗값으로 알맞은 것은? '
     + '(활성화함수는 f(x) = 1 (x ≥ θ), 0 (x < θ))',
    opts: [
      'w₁ = 1, w₂ = 1, θ = 0.5',
      'w₁ = 1, w₂ = 1, θ = 1.5',
      'w₁ = −1, w₂ = −1, θ = 0.5'
    ],
    answer: 1,
    explain: 'w₁ = w₂ = 1 이면 네 줄의 가중합이 차례로 0, 1, 1, 2 입니다. '
           + '(1,1)에서만 1이 나오려면 임곗값 θ가 1과 2 사이에 있어야 하므로 θ = 1.5 가 알맞습니다. '
           + 'θ = 0.5 로 두면 OR 연산이 되고, 가중치를 음수로 두면 판정이 통째로 뒤집힙니다.'
  },
  {
    q: '퍼셉트론에서 활성화함수가 하는 일은 무엇입니까?',
    opts: [
      '입력값을 무작위로 섞는다',
      '가중합이 임곗값보다 큰지 작은지를 구별해 출력 변수에 대응시킨다',
      '가중치를 자동으로 크게 만든다'
    ],
    answer: 1,
    explain: '활성화함수는 각 입력 변수와 가중치를 곱하여 더한 값이 임곗값보다 큰지 작은지를 구별한 뒤, '
           + '그 값을 출력 변수 y에 대응시키는 함수입니다. 계단함수·시그모이드 함수·렐루 함수가 대표적입니다. '
           + '활동 ①의 조작실에서 함수를 바꾸며 출력이 어떻게 달라지는지 직접 확인했습니다.'
  },
  {
    q: '입력값 x₁ = 2, x₂ = 3 에 대한 가중치가 각각 w₁ = 0.5, w₂ = 0.2 이고 '
     + '활성화함수가 f(x) = 1 (x ≥ 1.5), 0 (x < 1.5) 인 퍼셉트론의 출력값은?',
    opts: [
      'y = 0',
      'y = 1',
      'y = 1.6'
    ],
    answer: 1,
    explain: '가중합은 s = 2 × 0.5 + 3 × 0.2 = 1.0 + 0.6 = 1.6 입니다. '
           + '1.6 은 임곗값 1.5 이상이므로 활성화함수의 값은 f(1.6) = 1 이 되어 출력값은 1입니다. '
           + '가중합 1.6 자체는 출력값이 아니라 활성화함수에 넣는 입력값이라는 점에 주의합니다.'
  },
  {
    q: '두 입력값 x₁, x₂에 대한 가중치가 각각 w₁ = 3, w₂ = 2 이고 활성화함수가 '
     + 'f(x) = 1 (x ≥ c), 0 (x < c) 일 때, OR(논리합) 연산이 가능하게 하는 임곗값 c의 범위는?',
    opts: [
      '0 < c ≤ 2',
      '2 < c ≤ 3',
      '3 < c ≤ 5'
    ],
    answer: 0,
    explain: '가중합은 (0,0)에서 0, (0,1)에서 2, (1,0)에서 3, (1,1)에서 5 입니다. '
           + '논리합은 (0,0)만 출력이 0이어야 하므로 0 < c 이고, 나머지 세 줄은 출력이 1이어야 하므로 c ≤ 2 입니다. '
           + '두 조건을 함께 만족하는 범위는 0 < c ≤ 2 입니다.'
  },
  {
    q: '단층 퍼셉트론으로 XOR(배타적 논리합)를 구현할 수 없는 이유로 가장 알맞은 것은?',
    opts: [
      '입력이 두 개뿐이라 계산량이 부족해서',
      '네 점을 직선 하나로 나눌 수 없어 연립부등식이 모순되기 때문에',
      '활성화함수가 계단함수가 아니어서'
    ],
    answer: 1,
    explain: '(1,0)과 (0,1)에서 1이 되려면 w₁ ≥ θ, w₂ ≥ θ 이고, 두 식을 더하면 w₁ + w₂ ≥ 2θ 입니다. '
           + '그런데 (1,1)에서 0이 되려면 w₁ + w₂ < θ 여야 하므로 2θ < θ, 즉 θ < 0 입니다. '
           + '이는 (0,0)에서 0이 되어야 한다는 조건 θ > 0 과 모순이므로, 네 줄을 모두 만족하는 가중치와 임곗값은 존재하지 않습니다.'
  },
  {
    q: '다층퍼셉트론이 XOR를 해결하는 원리로 알맞은 것은?',
    opts: [
      '은닉층의 두 퍼셉트론이 직선을 하나씩 그어 만든 밴드를 출력층이 골라낸다',
      '가중치를 아주 크게 키우면 직선이 휘어진다',
      '입력값을 미리 정렬해 두면 직선 하나로 나뉜다'
    ],
    answer: 0,
    explain: '은닉층의 두 퍼셉트론이 각각 직선 x₁ + x₂ = 0.5 와 x₁ + x₂ = 1.5 를 긋고, '
           + '출력층이 z₁ − z₂ 로 두 직선 사이의 띠(밴드)만 골라냅니다. 그 띠 안에 (1,0)과 (0,1)만 들어오므로 XOR가 구현됩니다. '
           + '가중치를 아무리 키워도 직선은 휘지 않으므로, 층을 쌓아 직선을 하나 더 긋는 것이 유일한 해법입니다.'
  }
];


/* ── ④ 핵심 개념 칩 상세 설명 (chipDefs — 스펙 7·8) ───────────────────── */
/*    각 항목: 교과서식 정의 → 구체 예시 → 이번 차시 활동과의 연결(스크롤 링크)
      → 이전·다음 차시 연결(go 링크)                                          */

/* 칩 상세 안의 링크 버튼이 쓰는 이동 함수 (탭 전환 + 스크롤) */
function pcxJump(tab, id){
  try{
    const btns = document.querySelectorAll('#v-perceptron .tabs .tab');
    if(btns && btns[tab] && typeof pcxTab === 'function') pcxTab(tab, btns[tab]);
    setTimeout(function(){
      const el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }, 90);
  }catch(e){}
}

const PCX_DEFS = {
  '가중합':
    '<strong>가중합 Σwx + b</strong> — 퍼셉트론에 입력되는 n개의 값 x₁, x₂, …, xₙ에 '
  + '각 입력값의 중요도를 반영하는 값인 <strong>가중치</strong> w₁, w₂, …, wₙ를 각각 곱하여 더한 값 '
  + 's = w₁x₁ + w₂x₂ + … + wₙxₙ 을 가중합이라고 합니다. '
  + '편향 b를 함께 쓰면 s = Σwᵢxᵢ + b 이고, 이때 임곗값 θ는 −b로 볼 수 있습니다. '
  + '가중합은 출력값이 아니라 <strong>활성화함수에 넣는 입력값</strong>이라는 점이 중요합니다.'
  + '<br><br><b>예시</b> ① 가중치가 w₁ = 0.5, w₂ = 0.2 인 퍼셉트론에 x₁ = 2, x₂ = 3 을 넣으면 '
  + 's = 2 × 0.5 + 3 × 0.2 = 1.6 입니다. '
  + '② 음식 맛·청결·친절에 가중치 0.5, 0.3, 0.2 를 주면 (9, 7, 3)인 음식점의 위점수는 '
  + 's = 4.5 + 2.1 + 0.6 = 7.2 가 됩니다.'
  + '<br><br><b>이번 차시와의 연결</b> — STEP 2 활동 ①의 조작실에서 w₁만 크게 키웠을 때 '
  + 'x₁을 조금만 움직여도 출력이 크게 흔들렸던 것을 떠올려 보세요. 그것이 바로 가중합이 '
  + '“어떤 입력을 더 중요하게 보는가”를 담고 있다는 증거입니다.'
  + '<br><span class="btn" style="cursor:pointer;display:inline-block;margin-top:0.5rem;" onclick="pcxJump(0,\'pc-result-card\')">활동 ① 계산 과정 보기 →</span>'
  + '<br><br><span style="font-size:0.78rem;color:var(--muted);">근거 — 동아출판 『인공지능 수학』 1단원 13쪽의 가중합·임곗값 서술을 재구성하였습니다.</span>'
  + '<br><br><b>이어지는 차시</b> — 2차시에서 배운 ‘학습’은 이 가중치를 데이터에 맞추어 고쳐 나가는 일이고, '
  + '16차시 손실함수와 경사하강법에서 그 조정 방법을 수학으로 다룹니다. '
  + '<span class="btn" style="cursor:pointer;display:inline-block;margin-top:0.4rem;" onclick="go(\'mlplay\')">2차시 학습 방식 →</span>',

  '활성화함수':
    '<strong>활성화함수 (Activation Function)</strong> — 각 입력 변수와 가중치를 각각 곱하여 더한 x의 값이 '
  + '<strong>임곗값</strong>보다 큰지 작은지를 구별한 후, x의 값을 출력 변수 y에 대응시키는 함수를 활성화함수라고 합니다. '
  + '인공신경망에서 입력된 값을 적절히 변환시켜 출력하는 역할을 하며, '
  + '뉴런이 “전기 신호가 일정한 기준치보다 크면 다음 뉴런으로 신호를 전달”하는 현상을 수학으로 옮긴 것입니다.'
  + '<br><br><b>예시</b> ① 계단함수 f(x) = 1 (x ≥ 0), 0 (x < 0) — 0과 1로 딱 잘라 판단합니다. '
  + '② 시그모이드 함수 f(x) = 1/(1 + e⁻ˣ) — 0과 1 사이를 부드럽게 잇습니다. '
  + '③ 렐루(ReLU) 함수 f(x) = x (x ≥ 0), 0 (x < 0) — 계산이 간단해 현대 딥러닝에서 널리 쓰입니다. '
  + '활성화함수로 단순한 직선 형태의 함수를 쓰면 층을 깊게 쌓는 의미가 줄어들기 때문에 직선이 아닌 함수를 씁니다.'
  + '<br><br><b>이번 차시와의 연결</b> — STEP 2 활동 ①에서 계단함수의 임곗값 θ를 넘는 순간 출력이 '
  + '0에서 1로 <b>딱 바뀌는</b> 장면을 그래프에서 확인했습니다. 시그모이드로 바꾸면 같은 자리에서 값이 '
  + '완만하게 올라가지요. 판단의 ‘단호함’을 정하는 것이 활성화함수입니다.'
  + '<br><span class="btn" style="cursor:pointer;display:inline-block;margin-top:0.5rem;" onclick="pcxJump(0,\'pc-graph\')">활동 ① 그래프에서 확인 →</span>'
  + '<br><br><span style="font-size:0.78rem;color:var(--muted);">근거 — 동아출판 『인공지능 수학』 1단원 13쪽의 활성화함수 서술을 재구성하였습니다.</span>'
  + '<br><br><b>이어지는 차시</b> — 계단함수는 미분이 불가능해 학습에 제약이 있습니다. '
  + '왜 미분 가능성이 중요한지는 16차시 손실함수·최적화에서 이어집니다.',

  '결정경계':
    '<strong>결정경계</strong> — 퍼셉트론이 출력을 1로 내는 영역과 0으로 내는 영역을 가르는 경계입니다. '
  + '두 입력 변수의 경우 부등식 w₁x₁ + w₂x₂ ≥ θ 의 경계이므로 <strong>직선 w₁x₁ + w₂x₂ = θ</strong> 하나가 됩니다. '
  + '가중치를 바꾸면 직선의 기울기가, 임곗값(또는 편향)을 바꾸면 직선의 위치가 달라집니다. '
  + '직선 하나는 평면을 두 조각으로만 자르므로, 단층 퍼셉트론은 <strong>선형 분리가 가능한 문제</strong>만 풀 수 있습니다.'
  + '<br><br><b>예시</b> ① w₁ = w₂ = 1, θ = 1.5 이면 직선 x₁ + x₂ = 1.5 가 (1,1)만 따로 떼어 내어 AND가 됩니다. '
  + '② 같은 가중치에 θ = 0.5 를 쓰면 직선 x₁ + x₂ = 0.5 가 (0,0)만 떼어 내어 OR가 됩니다. '
  + '③ 배타적 논리합(XOR)의 네 점은 대각선으로 엇갈려 있어 어떤 직선으로도 갈라놓을 수 없습니다.'
  + '<br><br><b>이번 차시와의 연결</b> — STEP 2 활동 ②에서 슬라이더를 움직일 때마다 좌표평면의 '
  + '직선이 함께 움직이고, 초록 영역이 “1을 출력하는 쪽”으로 바뀌는 것을 직접 보았습니다. '
  + 'AND와 OR는 네 점이 모두 ✓가 되었지만 XOR에서는 아무리 움직여도 세 줄까지밖에 맞지 않았지요.'
  + '<br><span class="btn" style="cursor:pointer;display:inline-block;margin-top:0.5rem;" onclick="pcxJump(1,\'pcx-lab\')">활동 ② 결정경계 조작하기 →</span>'
  + '<br><br><span style="font-size:0.78rem;color:var(--muted);">근거 — 동아출판 『인공지능 수학』 1단원 21~22쪽의 AND·OR 가중치 유도와 XOR 불가능 증명 서술을 재구성하였습니다.</span>'
  + '<br><br><b>이어지는 차시</b> — 3차시 진리표의 네 줄이 바로 이 네 점입니다. '
  + '<span class="btn" style="cursor:pointer;display:inline-block;margin-top:0.4rem;" onclick="go(\'logic\')">3차시 규칙과 논리 →</span>',

  '다층퍼셉트론':
    '<strong>다층퍼셉트론 (MLP)</strong> — 한 퍼셉트론의 출력값이 또 다른 퍼셉트론의 입력값이 되도록 하면 '
  + '여러 개의 퍼셉트론을 연결한 층 구조의 인공신경망을 만들 수 있습니다. '
  + '입력값을 보내는 단계를 <strong>입력층</strong>, 값을 받아 출력하는 단계를 <strong>출력층</strong>, '
  + '그 사이의 층을 <strong>은닉층</strong>이라고 합니다. '
  + '입력층과 출력층만 있으면 단층 퍼셉트론, 은닉층이 1개 이상 있으면 다층퍼셉트론(심층 인공신경망)이며, '
  + '입력값이 입력층 → 은닉층 → 출력층으로 차례차례 계산되어 나아가는 과정을 <strong>순전파</strong>라고 합니다.'
  + '<br><br><b>예시</b> ① 은닉층에 OR(θ = 0.5)와 AND(θ = 1.5)를 두고 출력층에서 z₁ − z₂ 를 계산하면 XOR가 만들어집니다. '
  + '② 교과서의 가중치 w₁₁ = 5, w₁₂ = 4 / w₂₁ = 1, w₂₂ = 2 / w₃₁ = 4, w₃₂ = −4 와 '
  + '활성화함수 f(x) = 1 (x ≥ 3) 을 써도 같은 결과가 나옵니다. 숫자는 달라도 구조는 같습니다.'
  + '<br><br><b>이번 차시와의 연결</b> — STEP 2 활동 ②에서 [은닉층 추가]를 누른 뒤 '
  + '네 개의 입력 버튼으로 순전파를 한 줄씩 따라가 보았습니다. '
  + '두 직선이 만든 <b>밴드</b> 안에 (1,0)과 (0,1)만 들어오는 그림이 다층퍼셉트론의 핵심입니다.'
  + '<br><span class="btn" style="cursor:pointer;display:inline-block;margin-top:0.5rem;" onclick="pcxJump(1,\'pcx-hidden\')">활동 ② 순전파 따라가기 →</span>'
  + '<br><br><span style="font-size:0.78rem;color:var(--muted);">근거 — 동아출판 『인공지능 수학』 1단원 15·23쪽 및 씨마스 『인공지능 수학』 Ⅰ단원 24쪽의 다층퍼셉트론·순전파 서술을 재구성하였습니다.</span>'
  + '<br><br><b>이어지는 차시</b> — 1969년의 한계를 넘은 1986년 오류 역전파 이후 인공신경망은 딥러닝으로 이어졌고, '
  + '15~18차시의 합성곱 신경망도 이 다층 구조 위에 서 있습니다. '
  + '<span class="btn" style="cursor:pointer;display:inline-block;margin-top:0.4rem;" onclick="go(\'intro\')">1차시 역사 타임라인 →</span>'
};


/* ── ⑤ 공통 컴포넌트 초기화 ───────────────────────────────────────────── */
(function pcxEnhance(){
  function ready(){
    return typeof videoDeck === 'function'
        && typeof warmStepper === 'function'
        && typeof quizStepper === 'function'
        && typeof chipDefs === 'function';
  }
  let tries = 0;
  function init(){
    const root = document.getElementById('v-perceptron');
    if(!root) return;                          // 뷰가 없는 페이지에서도 안전
    if(root.dataset.pcxEnh === '1') return;    // 중복 초기화 방지
    if(!ready()){
      if(tries++ < 60) setTimeout(init, 200);  // core.js 공통 API 로드 대기(최대 12초)
      return;
    }
    root.dataset.pcxEnh = '1';
    try{ videoDeck('pcx-videos', 'perceptron', PCX_VIDEOS); }catch(e){ console.error('pcx videoDeck', e); }
    try{ warmStepper('pcx-warm', 'pcx', PCX_WARMQ); }catch(e){ console.error('pcx warmStepper', e); }
    try{ quizStepper('pcx-quiz', 'pcx', PCX_QUIZQ); }catch(e){ console.error('pcx quizStepper', e); }
    try{ chipDefs('#v-perceptron .pcx-keys', PCX_DEFS); }catch(e){ console.error('pcx chipDefs', e); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('load', function(){ setTimeout(init, 120); });
})();


/* ═════════ 5차시 bias — 보강 데이터 · 공통 컴포넌트 초기화 ═════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   5차시 · 빅데이터와 편향 (bias) — 공통 컴포넌트 호출 데이터
   ───────────────────────────────────────────────────────────────────────────
   · 이 파일의 내용은 core.js 의 「5차시 · 빅데이터와 편향 (접두사 bs / BS_)」
     블록 끝(기존 bias 초기화 IIFE 자리)에 그대로 이어 붙입니다.
   · 공통 컴포넌트(quizStepper / warmStepper / videoDeck / chipDefs)는
     Finalize 단계가 core.js에 구현합니다. 여기서는 "호출하는 쪽"만 작성합니다.
   · 상수는 모두 BIAS_ 접두사, 보조 함수는 모두 bs 접두사로 네임스페이스를 둡니다.
   ═══════════════════════════════════════════════════════════════════════════ */


/* ── 1. 추천 영상 (videoDeck) ─────────────────────────────────────────────
   실존 확인된 ID만 사용합니다(KERIS 연수 패들렛 인벤토리 기준). 새 ID 창작 금지. */
const BIAS_VIDEOS = [
  {id:'RufLe4Q5FYs', t:'데이터의 편향성 ① — 인공지능이 사람을 잘못 분류한 사건', s:'유튜브 · KERIS 연수 자료'},
  {id:'i-ybvGDJ-Ng', t:'데이터의 편향성 ② — 성 편향과 인종 차별', s:'유튜브 · KERIS 연수 자료'},
];


/* ── 2. 마중 퀴즈 (warmStepper) ───────────────────────────────────────────
   라벨은 컴포넌트가 "질문 N."으로 붙입니다. 답하면 다음 질문이 순차 공개됩니다. */
const BIAS_WARM = [
  {
    q:'테스트 사진 100장 중 95장을 맞힌 AI가 있습니다. "정확도 95%"라면 안심하고 써도 될까요?',
    opts:['O — 95%면 충분히 믿을 만하다','X — 어디서 틀렸는지 봐야 한다'],
    answer:1,
    explain:'정답은 "X — 어디서 틀렸는지 봐야 한다"입니다. 95%는 전체에서 잰 값일 뿐이어서, 틀린 5%가 특정 집단에 몰려 있다면 그 집단에게는 거의 쓸모없는 AI일 수 있습니다. 오늘 STEP 2 탭 ①에서 전체 정확도 95%인데 한식 정확도는 0%인 장면을 직접 만들어 봅니다.'
  },
  {
    q:'티처블 머신으로 분리수거 분류기를 만들었습니다. 캔 35장, 컵 5장으로 학습시킨 뒤 캔 10장·컵 10장으로 시험하면 어떤 일이 자주 일어날까요?',
    opts:['컵을 캔이라고 답하는 오류가 늘어난다','캔을 컵이라고 답하는 오류가 늘어난다','40장이나 되므로 둘 다 잘 맞힌다'],
    answer:0,
    explain:'정답은 "컵을 캔이라고 답하는 오류가 늘어난다"입니다. 학습 데이터가 많은 쪽(캔)으로 답이 쏠리기 때문에, 데이터가 적은 컵이 손해를 봅니다. 데이터 수가 적은 집단이 성능 손해를 보는 것 — 이것이 편향의 가장 흔한 모습입니다.'
  },
  {
    q:'사진을 무려 1000장이나 모았습니다. 이제 편향 걱정은 없을까요?',
    opts:['O — 양이 많으면 해결된다','X — "어떤" 1000장인지가 더 중요하다'],
    answer:1,
    explain:'정답은 "X — 어떤 1000장인지가 더 중요하다"입니다. 중요한 것은 양이 아니라 대표성이어서, 1000장이 모두 한쪽 종류라면 편향은 그대로 남습니다. 오늘은 "얼마나 모아야 하는가"를 부등식으로 정확히 계산해 봅니다.'
  },
];


/* ── 3. 형성평가 (quizStepper) ────────────────────────────────────────────
   선택 즉시 정답·해설 표시 → [다음 문항] → 마지막에 총점 N/M + 문항별 복기. */
const BIAS_QUIZ = [
  {
    q:'빅데이터의 특성 5V를 바르게 묶은 것은?',
    opts:['평균·분산·표준편차·중앙값·최빈값','규모·속도·다양성·정확성·가치','규모·가격·색상·크기·무게'],
    answer:1,
    explain:'정답은 ②번 "규모·속도·다양성·정확성·가치"입니다. 규모(Volume)·속도(Velocity)·다양성(Variety) 세 가지가 본래의 특징이고, 여기에 데이터의 신뢰성을 뜻하는 정확성(Veracity)과 유용한 가치를 이끌어 내는 가치(Value)를 더해 5V라고 부릅니다. ①은 통계량, ③은 물건의 속성이므로 데이터의 특성과는 관계가 없습니다.'
  },
  {
    q:'2 MB짜리 사진 50만 장의 전체 용량으로 알맞은 것은?',
    opts:['약 1 GB','약 1 TB','약 1 PB'],
    answer:1,
    explain:'정답은 ②번 "약 1 TB"입니다. 2 MB × 500,000 = 1,000,000 MB이고, 데이터 단위는 1000배마다 이름이 바뀌므로 1,000,000 MB = 1,000 GB = 1 TB가 됩니다. 1 GB는 이보다 1000배 작고, 1 PB는 1000배 크므로 자릿수를 한 칸씩 확인하는 습관이 필요합니다.'
  },
  {
    q:'한식 53장·양식 1000장 데이터에서 "항상 양식"이라고만 답하는 모델의 전체 정확도가 95.0%로 나왔습니다. 이 수치의 해석으로 옳은 것은?',
    opts:['모델의 성능이 뛰어나다는 뜻이다','데이터 구성비가 만든 착시이며 한식 정확도는 0%다','한식 사진도 95% 맞힌다는 뜻이다'],
    answer:1,
    explain:'정답은 ②번입니다. 이 모델은 사진을 보지도 않고 "양식"이라고만 답하므로 한식은 한 장도 맞히지 못해 한식 정확도가 0%이고, 균형 정확도는 (0+100)/2 = 50%입니다. 95.0%라는 수를 만든 것은 모델의 실력이 아니라 양식 1000 : 한식 53이라는 데이터 구성비입니다.'
  },
  {
    q:'양식 1000장은 그대로 두고 한식을 x장 더 모아 한식이 전체의 40% 이상이 되게 하려면? [12인수01-03]',
    opts:['x ≥ 400','x ≥ 667','x ≥ 1000'],
    answer:1,
    explain:'정답은 ②번 "x ≥ 667"입니다. 한식 비율은 x/(1000+x)이므로 x/(1000+x) ≥ 0.4에서, 1000+x > 0이니 양변에 곱해도 부등호 방향이 바뀌지 않아 x ≥ 400 + 0.4x, 즉 0.6x ≥ 400에서 x ≥ 2000/3 = 666.6…입니다. 사진 장수는 자연수이므로 최소 667장이며, 667/1667 ≈ 0.4001로 40%를 넘고 666/1666 ≈ 0.3998로는 모자랍니다.'
  },
  {
    q:'혼동행렬이 TP=20, FN=180, FP=5, TN=995일 때, 한식에 대한 재현율(실제 한식 중 찾아낸 비율)은?',
    opts:['10%','80%','84.6%'],
    answer:0,
    explain:'정답은 ①번 10%입니다. 재현율의 분모는 "실제 한식"의 개수 TP+FN = 20+180 = 200이므로 20/200 = 0.1, 곧 10%입니다. 80%는 정밀도 TP/(TP+FP) = 20/25이고 84.6%는 정확도 (20+995)/1200이므로, 같은 표에서도 분모를 무엇으로 잡느냐에 따라 값이 전혀 달라진다는 점을 확인할 수 있습니다.'
  },
  {
    q:'2018년에 중단된 채용 인공지능 사례에서, 이 시스템이 남성 지원자를 선호하게 된 근본 원인으로 가장 알맞은 것은?',
    opts:['인공지능이 스스로 차별하려는 의도를 가졌기 때문','학습에 쓴 기존 직원 데이터가 특정 성별로 기울어 있었기 때문','학습 데이터의 전체 양이 너무 적었기 때문'],
    answer:1,
    explain:'정답은 ②번입니다. 이 기업은 개발 직군이 전체 직원의 70% 이상이었고 그 직군에 남성이 훨씬 많아, "성과가 높은 직원" 데이터 자체가 기울어 있었습니다. 인공지능은 그 데이터에 가장 잘 맞는 규칙을 찾은 것뿐이므로 원인은 의도가 아니라 데이터의 불균형이며, 10년치 자료를 썼으므로 양이 부족했던 것도 아닙니다.'
  },
];


/* ── 4. 핵심 개념 칩 상세 설명 (chipDefs) ────────────────────────────────
   키는 칩 텍스트의 "고유한 일부"입니다(부분 일치 충돌이 없도록 골랐습니다).
   각 정의는 ① 교과서식 정의 ② 구체 예시 ③ 이번 차시 활동과의 연결(+이동 버튼)
   ④ 이전·다음 차시 연결의 네 부분으로 구성합니다. */
const BIAS_DEFS = {

  '5V':
    '<p><b>빅데이터</b>는 컴퓨터 및 장치를 통해 생성되거나 저장된 정보를 뜻합니다. ' +
    '그 특징으로 <b>규모(Volume)</b>가 폭발적으로 증가하고, 시간에 따라 빠른 <b>속도(Velocity)</b>로 변화하며, ' +
    '형식이 <b>다양(Variety)</b>하다는 것을 꼽습니다. 최근에는 데이터의 내용이 정확하고 품질이 좋은지를 파악해 ' +
    '신뢰성을 높이는 <b>정확성(Veracity)</b>과, 데이터에서 유용한 가치를 이끌어 내는 <b>가치(Value)</b>를 더해 ' +
    '이를 <b>5V</b>라고 부릅니다.</p>' +
    '<p><b>예시</b> — ① 급식 사진 50만 장은 1 TB(규모), 지금 이 순간에도 쌓이는 검색·위치 기록은 속도, ' +
    '표·사진·음성·SNS 글이 섞인 자료는 다양성에 해당합니다. ' +
    '② 오늘 다루는 <b>편향</b>은 5V 가운데 <b>정확성(Veracity)이 무너진 상태</b>입니다.</p>' +
    '<p><b>이번 차시 연결</b> — STEP 2 탭 ③ 단계 1에서 2 MB × 50만 장을 직접 환산해 1 TB를 만들어 보고, ' +
    '단계 2-②의 5V 카드에서 다섯 특성을 우리 급식 도우미 AI 사례에 하나씩 대응시켰습니다.</p>' +
    '<p class="bs-src">근거 — 씨마스 『인공지능 수학』 Ⅰ단원 35~36쪽의 빅데이터 정의와 5V 서술을 재구성하였습니다.</p>' +
    '<div class="btn-row"><button class="btn" onclick="bsSee(2,\'bs-lad\')">탭 ③ 5V·단위 활동으로 이동</button></div>' +
    '<p class="bs-src">이어짐 — 1차시에서 AI를 <b>함수 f</b>로 본 뒤, 그 f를 만드는 재료가 바로 빅데이터입니다. ' +
    '<a href="#intro" onclick="go(\'intro\');return false;">1차시 보기</a> · ' +
    '<a href="#text" onclick="go(\'text\');return false;">6차시 텍스트 데이터로 이어가기</a></p>',

  '데이터 단위':
    '<p>데이터의 크기는 <b>바이트(B)</b>를 기준으로 <b>1000배(10³)</b>마다 이름이 바뀝니다. ' +
    'KB(10³ B) · MB(10⁶ B) · GB(10⁹ B) · TB(10¹² B) · PB(10¹⁵ B) · EB(10¹⁸ B) · ZB(10²¹ B) · YB(10²⁴ B) 순서입니다. ' +
    '단위 환산은 결국 <b>1000의 거듭제곱을 곱하고 나누는 일</b>이므로, 지수의 덧셈·뺄셈으로 생각하면 쉽습니다.</p>' +
    '<p><b>예시</b> — ① 2 MB짜리 사진 50만 장 = 1,000,000 MB = 1,000 GB = <b>1 TB</b>입니다. ' +
    '② 전 세계에서 한 해에 만들어지는 데이터는 <b>제타바이트(ZB)</b> 단위로 이야기되는데, ' +
    '1 ZB는 1 TB의 <b>10억 배</b>입니다.</p>' +
    '<p><b>이번 차시 연결</b> — STEP 2 탭 ③ 단계 1에서 공책으로 먼저 계산한 값을 입력하면 ' +
    '<b>환산 사다리</b>가 B에서 TB까지 한 칸씩 올라갑니다. 한 칸이 곧 1000배입니다.</p>' +
    '<p class="bs-src">근거 — 씨마스 『인공지능 수학』 Ⅰ단원 35~36쪽의 데이터 측정 단위 서술을 재구성하였습니다.</p>' +
    '<div class="btn-row"><button class="btn" onclick="bsSee(2,\'bs-tot\')">환산 사다리로 이동</button></div>' +
    '<p class="bs-src">이어짐 — 12차시에서 이미지를 <b>28×28 행렬</b>로 다룰 때, 사진 한 장의 용량이 어디서 오는지 다시 만나게 됩니다.</p>',

  '집단별':
    '<p><b>전체 정확도</b>는 시험에 쓴 전체 개수 가운데 맞힌 비율이고, <b>집단별 정확도</b>는 특정 집단 안에서만 ' +
    '맞힌 비율입니다. 두 값은 <b>분자와 분모가 서로 다른 분수</b>이므로 같은 모델을 두고 재어도 값이 크게 달라집니다. ' +
    '특히 전체 정확도는 <b>데이터 구성비</b>에 크게 좌우되어, 다수 집단의 성적이 소수 집단의 성적을 가려 버립니다.</p>' +
    '<p><b>예시</b> — ① 한식 53장·양식 1000장에서 "항상 양식"이라 답하는 모델은 전체 정확도 <b>95.0%</b>, ' +
    '한식 정확도 <b>0%</b>입니다. ② 얼굴 인식 시스템의 전체 오류율이 낮아 보여도 ' +
    '집단을 나누어 재면 어떤 집단의 오류율은 30%를 넘기도 합니다.</p>' +
    '<p><b>이번 차시 연결</b> — STEP 2 탭 ① 단계 1에서 슬라이더를 x = 53에 맞추면 ' +
    '전체·한식·균형 세 막대가 한 화면에서 벌어지는 장면을 직접 볼 수 있습니다. ' +
    '오늘 차시 제목 "정확도 95%의 함정"이 바로 그 장면입니다.</p>' +
    '<div class="btn-row"><button class="btn" onclick="bsSee(0,\'bs-x\')">탭 ① 편향 실험으로 이동</button></div>' +
    '<p class="bs-src">이어짐 — 성능을 보고할 때는 전체 정확도와 함께 <b>집단별 정확도와 그 격차(퍼센트포인트)</b>를 반드시 적습니다.</p>',

  '균형':
    '<p><b>균형 정확도</b>는 집단별 정확도를 <b>단순 평균</b>한 값입니다. 집단 A와 B가 있을 때 (A의 정확도 + B의 정확도) ÷ 2로 ' +
    '계산합니다. 집단의 <b>크기와 상관없이</b> 각 집단을 같은 비중으로 보기 때문에, ' +
    '데이터가 한쪽으로 심하게 기울어 있을 때 전체 정확도가 감추는 문제를 드러내 줍니다.</p>' +
    '<p><b>예시</b> — ① 한식 0% · 양식 100%인 모델의 균형 정확도는 (0+100)/2 = <b>50%</b>로, ' +
    '동전 던지기와 같은 수준입니다. 전체 정확도가 95%로 보이던 모델의 정체가 여기서 드러납니다. ' +
    '② 한식 데이터를 늘려 한식 정확도가 80%가 되면 균형 정확도는 (80+96)/2 = 88%로 올라갑니다.</p>' +
    '<p><b>이번 차시 연결</b> — STEP 2 탭 ① 단계 1의 <b>세 번째 막대</b>가 균형 정확도입니다. ' +
    '모델 A에서는 x를 아무리 키워도 50%에서 움직이지 않고, 모델 B에서는 x가 커질수록 올라갑니다. ' +
    '전체 정확도는 반대로 내려간다는 점을 함께 관찰해 보세요.</p>' +
    '<div class="btn-row"><button class="btn" onclick="bsSee(0,\'bs-b-bal\')">균형 정확도 막대 보기</button></div>' +
    '<p class="bs-src">주의 — 한 집단의 데이터가 0장이면 그 집단의 정확도가 정의되지 않으므로 균형 정확도도 계산할 수 없습니다.</p>',

  '부등식':
    '<p>공정성 목표를 말이 아니라 <b>수</b>로 적은 식입니다. 양식 1000장은 그대로 두고 한식을 x장 더 모을 때 ' +
    '전체는 1000 + x장, 한식은 x장이므로 "한식이 전체의 40% 이상"은 ' +
    '<b>x/(1000+x) ≥ 0.4</b>가 됩니다. 분모 1000 + x는 항상 양수이므로 양변에 곱해도 <b>부등호의 방향은 그대로</b>입니다.</p>' +
    '<div class="math" style="margin:0.6rem 0;">x ≥ 0.4(1000 + x)\n0.6x ≥ 400\nx ≥ 2000/3 = 666.666…\nx는 사진의 장수 → 자연수이므로 x ≥ 667</div>' +
    '<p><b>예시</b> — 검산해 보면 667/1667 ≈ 0.4001 ≥ 0.4 이고, 666/1666 ≈ 0.3998 &lt; 0.4 입니다. ' +
    '한 장 차이로 목표 달성 여부가 갈립니다.</p>' +
    '<p><b>이번 차시 연결</b> — STEP 2 탭 ①에서 <b>[한식 40% 목표]</b>에 체크하면 부등식 카드가 열립니다. ' +
    '공책에 먼저 풀고 답을 입력해 채점한 뒤, [슬라이더를 667로 맞추기]로 결과를 눈으로 확인합니다.</p>' +
    '<div class="btn-row"><button class="btn" onclick="bsSee(0,\'bs-goal\')">40% 목표 부등식 카드로 이동</button></div>' +
    '<p class="bs-src">이어짐 — 4차시 퍼셉트론에서 "가중합이 임곗값 이상이면 1"을 부등식으로 적었던 것과 같은 도구입니다. ' +
    '<a href="#perceptron" onclick="go(\'perceptron\');return false;">4차시 다시 보기</a></p>',

  '혼동행렬':
    '<p>시험 결과를 <b>실제 정답</b>과 <b>인공지능의 예측</b>의 조합으로 네 칸에 나누어 적은 표를 <b>혼동행렬</b>이라고 합니다. ' +
    '찾으려는 대상(여기서는 한식)을 기준으로 맞힘(TP)·놓침(FN)·헛짚음(FP)·맞힘(TN)의 네 칸이 만들어지고, ' +
    '네 칸의 합은 시험에 쓴 전체 개수와 같습니다. 정확도는 (TP+TN)/전체, 정밀도는 TP/(TP+FP), 재현율은 TP/(TP+FN)입니다.</p>' +
    '<p><b>예시</b> — ① TP=20, FN=180, FP=5, TN=995이면 정확도는 84.6%인데 재현율은 20/200 = <b>10%</b>입니다. ' +
    '한식 200장 중 20장만 찾아낸 것입니다. ② 한식을 더 모아 다시 학습하면 TP=170, FN=30이 되어 재현율은 <b>85%</b>가 되지만, ' +
    '정확도는 94.2%로 겨우 10퍼센트포인트 오를 뿐입니다.</p>' +
    '<p><b>이번 차시 연결</b> — STEP 2 탭 ②의 네 칸 계산기에 값을 넣으면 세 지표가 즉시 다시 계산됩니다. ' +
    '[예시 불러오기 ①]과 [②]를 번갈아 눌러 <b>어떤 지표가 크게 달라지는지</b> 비교해 보세요.</p>' +
    '<div class="btn-row"><button class="btn" onclick="bsSee(1,\'bs-tp\')">탭 ② 혼동행렬 계산기로 이동</button></div>' +
    '<p class="bs-src">편향은 네 칸 중 특정 칸에 오류가 몰리는 모습으로 나타납니다 — FN이 크면 놓치는 문제, FP가 크면 헛짚는 문제입니다.</p>',

  '공정성':
    '<p>인공지능이 인간의 주관적인 판단이 들어간 입력 데이터를 학습하여 <b>판단 결과가 한쪽으로 치우치거나 왜곡되는 것</b>을 ' +
    '<b>데이터 편향성</b>이라고 합니다. 데이터는 인공지능이 학습하는 수단이자 도구이므로 ' +
    '<b>원본 데이터에 존재하는 편향이나 불균형은 인공지능에도 그대로 나타납니다.</b> ' +
    '원인은 크게 <b>불균형</b>(어떤 종류가 너무 많거나 적음), <b>누락</b>(중요한 상황이 아예 빠짐), ' +
    '<b>왜곡</b>(특정 관점이 과장되어 현실과 다름)의 세 가지로 정리됩니다.</p>' +
    '<p><b>예시</b> — ① 하얀 백조 이미지만 학습한 인공지능은 검은 백조를 백조로 인식하지 못합니다. ' +
    '② 2018년 한 다국적 기업의 채용 인공지능은 개발 직군에 남성이 많았던 기존 직원 데이터를 학습해 ' +
    '\'여성\'이라는 단어가 든 이력서에 감점을 주었고, 개선을 시도했으나 결국 폐기되었습니다.</p>' +
    '<p><b>이번 차시 연결</b> — 빅데이터가 다양성을 완벽하게 공정하게 담기는 매우 어렵습니다. ' +
    '그래서 우리는 편향을 <b>수로 진단</b>합니다 — <b>① 대표성 점검(구성비) → ② 성능 격차 진단(집단별 정확도) → ' +
    '③ 개선 설계(데이터·평가·운영)</b>의 순서입니다. STEP 2 탭 ① 단계 3에서 이 절차를 정리했고, ' +
    'STEP 1의 사례 카드에서 채용 AI·얼굴 인식·캔과 컵 실험을 확인했습니다.</p>' +
    '<p class="bs-src">근거 — 씨마스 『인공지능 수학』 Ⅰ단원 40~41쪽의 데이터 편향성 정의와 사례 1·2 서술을 재구성하였습니다.</p>' +
    '<div class="btn-row"><button class="btn" onclick="bsSee(0,\'bs-goal\')">공정성 목표를 부등식으로 세우기</button></div>' +
    '<p class="bs-src">이어짐 — 2차시 티처블 머신 실습(균형 20:20 vs 불균형 5:35)의 결과를 오늘의 지표로 다시 설명해 봅시다. ' +
    '<a href="#mlplay" onclick="go(\'mlplay\');return false;">2차시 보기</a></p>',
};


/* ── 5. 보조 함수 (bs 접두사) ─────────────────────────────────────────── */

/* 칩 정의·본문에서 해당 활동으로 이동합니다. tab은 STEP 2 탭 번호(0·1·2), id는 스크롤 목표. */
function bsSee(tab, id){
  const view = document.getElementById('v-bias');
  if(!view) return;
  const tabs = view.querySelectorAll('.tabs .tab');
  if(typeof tab === 'number' && tabs[tab]) tabs[tab].click();
  const target = (id && document.getElementById(id)) || tabs[tab] || null;
  if(target && target.scrollIntoView){
    try{ target.scrollIntoView({behavior:'smooth', block:'center'}); }
    catch(e){ try{ target.scrollIntoView(); }catch(e2){} }
  }
}

/* 참고 자료 — 교사가 추가한 링크(이 기기에만 저장). videoDeck과 같은 localStorage 패턴. */
const BS_REF_KEY = 'aimath.bias.refs';
let bsRefCache = null;

function bsRefLoad(){
  if(bsRefCache) return bsRefCache;
  try{
    const raw = localStorage.getItem(BS_REF_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    bsRefCache = Array.isArray(arr) ? arr : [];
  }catch(e){ bsRefCache = []; }
  return bsRefCache;
}

function bsRefSave(){
  try{ localStorage.setItem(BS_REF_KEY, JSON.stringify(bsRefLoad())); }catch(e){}
}

function bsRefEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function bsRefRender(){
  const box = document.getElementById('bs-ref-custom');
  if(!box) return;
  const list = bsRefLoad();
  box.innerHTML = list.map((r,i)=>
    '<div class="bs-refwrap">'+
      '<a class="bs-ref" href="'+bsRefEsc(r.u)+'" target="_blank" rel="noopener">'+
        '<span class="th"><span class="bg">추가 자료</span>🔗</span>'+
        '<span class="bd"><span class="tt">'+bsRefEsc(r.t)+'</span>'+
        '<span class="ds">'+bsRefEsc(r.u)+'</span></span>'+
      '</a>'+
      '<button class="rm" type="button" title="이 자료 삭제" aria-label="이 자료 삭제" onclick="bsRefDel('+i+')">×</button>'+
    '</div>'
  ).join('');
}

function bsRefAdd(){
  const iu = document.getElementById('bs-ref-url');
  const it = document.getElementById('bs-ref-tt');
  const st = document.getElementById('bs-ref-st');
  if(!iu) return;
  const u = iu.value.trim();
  if(!/^https?:\/\//i.test(u)){
    if(st) st.textContent = 'http(s)로 시작하는 전체 주소를 붙여넣어 주세요.';
    return;
  }
  const t = (it && it.value.trim()) || u.replace(/^https?:\/\//i,'').split('/')[0];
  bsRefLoad().push({u:u, t:t});
  bsRefSave();
  iu.value = ''; if(it) it.value = '';
  if(st) st.textContent = '자료를 추가했습니다. 이 기기에만 저장됩니다.';
  bsRefRender();
}

function bsRefDel(i){
  const list = bsRefLoad();
  if(i < 0 || i >= list.length) return;
  list.splice(i,1);
  bsRefSave();
  const st = document.getElementById('bs-ref-st');
  if(st) st.textContent = '자료를 삭제했습니다.';
  bsRefRender();
}


/* ── 6. 초기화 — 공통 컴포넌트 호출 ──────────────────────────────────────
   core.js 의 기존 bias 초기화 IIFE를 이 블록으로 대체합니다.
   (기존 IIFE에 있던 bsVidRender() 호출은 videoDeck으로 대체되므로 제거합니다.) */
(function biasInit(){
  const boot = function(){
    const root = document.getElementById('v-bias');
    if(!root) return;                     // 뷰가 없어도 core.js가 죽지 않도록 가드

    // 공통 컴포넌트 (Finalize가 core.js에 구현)
    if(typeof videoDeck    === 'function') videoDeck('bs-videos', 'bias', BIAS_VIDEOS);
    if(typeof warmStepper  === 'function') warmStepper('bs-warm', 'bs', BIAS_WARM);
    if(typeof quizStepper  === 'function') quizStepper('bs-quiz', 'bs', BIAS_QUIZ);
    if(typeof chipDefs     === 'function') chipDefs('#v-bias .bs-keys', BIAS_DEFS);

    // 뷰 전용 위젯 초기 상태
    try{ bsUpdate(); }catch(e){}
    try{ bsCM(); }catch(e){}
    const note = document.getElementById('bs-cm-note');
    if(note) note.textContent = BS_CM_EX[0].n;
    bsRefRender();
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ═══════════════════════════════════════════════════════════════════════════
   30차시 카탈로그 · 차시 목록 드롭다운 · 홈 카드 · 표제부 워터마크
     AIM_LESSONS  차시 매니페스트(단일 진실 공급원) — nav 드롭다운과 홈 카드가 함께 씁니다.
     AIM_ART      차시별 16:9 인라인 SVG 일러스트(홈 썸네일 + 뷰 표제부 워터마크로 재사용)
   ═══════════════════════════════════════════════════════════════════════════ */

/* 단원(Ⅰ~Ⅴ) — r: 차시 범위 표기 */
const AIM_UNITS=[
  {u:'Ⅰ', name:'인공지능과 빅데이터',   r:'1~5차시'},
  {u:'Ⅱ', name:'텍스트 데이터 처리',    r:'6~11차시'},
  {u:'Ⅲ', name:'이미지 데이터 처리',    r:'12~19차시'},
  {u:'Ⅳ', name:'예측과 최적화',         r:'20~27차시'},
  {u:'Ⅴ', name:'인공지능과 수학 탐구',  r:'28~30차시'},
];

/* n: 차시 라벨 · t: 제목 · v: 뷰 슬러그(없으면 준비 중) · a: SVG 아트 키 · d: 홈 카드 설명 */
const AIM_LESSONS=[
  {u:0,n:'1차시',      t:'인공지능의 개념과 역사',        v:'intro',      a:'intro',
   d:'튜링 테스트 판별 게임, 규칙기반 vs 학습기반 체험, AI 역사 타임라인으로 "인공지능 = 함수 찾기"라는 관점을 세웁니다.'},
  {u:0,n:'2차시',      t:'AI의 학습 방식 — 지도·비지도·강화', v:'mlplay', a:'mlplay',
   d:'k-means 스텝 시뮬레이터와 밴딧 보상 게임으로 세 가지 학습 방식을 거리·평균·상대도수라는 수학 언어로 체험합니다.'},
  {u:0,n:'3차시',      t:'규칙으로 생각하는 AI',          v:'logic',      a:'logic',
   d:'진리표 실험실, 전문가 시스템, 순서도 트레이서로 규칙만으로 생각하는 기계가 어디까지 갈 수 있는지 확인합니다.'},
  {u:0,n:'4차시',      t:'퍼셉트론과 XOR의 벽 넘기',      v:'perceptron', a:'perceptron',
   d:'가중치 슬라이더로 AND·OR를 직접 만들고, XOR 앞에서 단층 퍼셉트론이 무너지는 것을 확인한 뒤 은닉층으로 그 벽을 넘습니다.'},
  {u:0,n:'5차시',      t:'빅데이터와 편향 — 정확도 95%의 함정', v:'bias', a:'bias',
   d:'데이터 구성을 직접 바꿔 가며 "정확도 95%의 함정"을 만들어 보고, 혼동행렬과 데이터 단위로 편향을 수치로 읽어 냅니다.'},

  {u:1,n:'6차시',      t:'텍스트를 집합으로 — 전처리와 단어집합', v:'text', a:'text',
   d:'문장을 어절로 자르고 불용어를 걸러 중복 없는 단어집합 {…}을 만듭니다. 5단계 전처리 파이프라인과 3집합 벤다이어그램으로 합집합 U(단어 사전)까지 완성합니다.'},
  {u:1,n:'7차시',      t:'텍스트를 벡터로 — 포함관계·원-핫·빈도수', v:'text', a:'text',
   d:'단어집합을 눈금이 매겨진 자로 삼아 문장을 수의 나열로 바꿉니다. 포함관계 27칸·빈도수 24칸 표를 자동 채점으로 직접 채우고, 0의 비율로 희소 표현을 확인합니다.'},
  {u:1,n:'8차시',      t:'중요한 단어 찾기 — TF-IDF', v:'tfidf', a:'tfidf',
   d:'TF→DF→IDF→TF-IDF 4단 계단을 손으로 채우고, 두 워드클라우드를 나란히 놓아 흔한 단어의 무게가 덜어지는 장면을 확인합니다.'},
  {u:1,n:'9차시',      t:'얼마나 비슷한가 — 거리로 잴까, 방향으로 잴까', v:'sim', a:'sim',
   d:'같은 데이터인데 거리로 재면 B, 방향으로 재면 C가 1위가 됩니다. 두 유사도를 캔버스에서 직접 계산하고, 순위가 뒤집히는 순간을 직접 만들어 봅니다.'},
  {u:1,n:'10차시',     t:'집합으로 마음 읽기 — 자카드 유사도와 감성 분석', v:'senti', a:'senti',
   d:'문장을 다시 집합으로 보고, 감성 사전 P·N과의 겹침을 자카드 유사도로 재어 마음을 하나의 수로 읽습니다. 기준선 k를 움직이며 판정이 뒤집히는 순간을 확인합니다.'},
  {u:1,n:'11차시',     t:'실생활 프로젝트 — 리뷰 분석과 추천', v:'review', a:'review',
   d:'별점이 4.6에서 2.2로 떨어진 분식집의 리뷰 100건에서 원인을 찾습니다. 감성 판정이 하나도 나오지 않는 순간 n(A) ≥ k·n(P) 라는 부등식을 세우고, TF-IDF로 흔한 칭찬 뒤에 숨은 단어 하나를 끌어올린 뒤, 별점 행렬로 추천까지 만들어 봅니다.'},

  {u:2,n:'12차시 도입', t:'Quick Draw — 낙서로 만나는 이미지 인식', v:'quickdraw', a:'quickdraw',
   d:'제한 시간 안에 그림을 그리면 AI가 실시간으로 추측합니다. 12차시를 여는 10분 체험 활동입니다.'},
  {u:2,n:'12차시',     t:'이미지는 행렬이다 — 숫자 인식과 MNIST', v:'mnist', a:'mnist',
   d:'손글씨를 28×28 행렬로 수집·라벨링하며, 컴퓨터의 눈에 비친 사진이 어떤 모습인지 확인합니다.'},
  {u:2,n:'13차시',     t:'이진화·XOR·해밍 거리 분류',     v:'hamming',    a:'hamming',
   d:'두 이진 데이터의 차이를 XOR로 세어 해밍 거리를 구하고, 가장 가까운 참조 숫자로 분류해 봅니다.'},
  {u:2,n:'14차시',     t:'행렬 연산으로 이미지 변형하기'},
  {u:2,n:'15차시',     t:'합성곱의 원리',                 v:'conv',       a:'conv',
   d:'CNN의 핵심 연산인 합성곱(아다마르 곱)의 원리를 이해합니다. 커널이 이미지 위를 이동하며 특징을 뽑아내는 과정을 다룹니다.'},
  {u:2,n:'16차시',     t:'커널 필터 실험실',              v:'filter',     a:'filter',
   d:'직접 이미지를 올리고 여러 커널(세로선·가로선·블러·윤곽선)을 적용해 결과를 비교합니다.'},
  {u:2,n:'17차시',     t:'풀링과 정규화',                 v:'pool',       a:'pool',
   d:'맥스 풀링으로 데이터를 압축하는 과정과, 학습 효율을 위한 정규화(X/255)를 체험합니다.'},
  {u:2,n:'18차시',     t:'CNN 파이프라인 종합',           v:'pipeline',   a:'pipeline',
   d:'이미지를 올리면 CNN의 전체 과정을 단계별로 시각화합니다. 합성곱 → 활성화 → 풀링 → 분류까지의 흐름을 확인합니다.'},
  {u:2,n:'19차시',     t:'객체 탐지와 실생활 응용',       v:'detect',     a:'detect',
   d:'학습된 모델이 이미지에서 물체를 찾아내는 과정을 체험합니다. 바운딩 박스와 신뢰도(확률)를 함께 읽습니다.'},

  {u:3,n:'20차시',     t:'데이터에서 확률 읽기'},
  {u:3,n:'21차시',     t:'조건이 있는 확률과 스팸 필터'},
  {u:3,n:'22차시',     t:'산점도와 추세선으로 예측하기'},
  {u:3,n:'23차시',     t:'어떤 추세선이 좋은가 — 곡선과 과적합'},
  {u:3,n:'24차시',     t:'손실함수 L(a)로 최적 추세선 찾기'},
  {u:3,n:'25차시',     t:'내려갈 방향 — 극한과 미분계수'},
  {u:3,n:'26차시',     t:'경사하강법 — 학습률과 수렴·발산'},
  {u:3,n:'27차시',     t:'종합 실습 — 아이스티 판매 예측 AI'},

  {u:4,n:'28차시',     t:'합리적 의사 결정 사례 분석·탐구 설계'},
  {u:4,n:'29차시',     t:'탐구 수행 — 데이터·모델링·시각화'},
  {u:4,n:'30차시',     t:'100초 발표·동료평가·성찰'},
];

/* ── 차시별 16:9 인라인 SVG 일러스트 (베이지 팔레트 · 외부 이미지 없음) ── */
const AIM_ART={
  /* 1차시 — 붐과 겨울 타임라인 곡선 */
  intro:`<svg viewBox="0 0 320 180" role="img" aria-label="인공지능 붐과 겨울을 나타낸 관심도 곡선">
    <rect width="320" height="180" fill="var(--bg)"/>
    <path d="M20 150 H300" stroke="var(--border)" stroke-width="1.5"/>
    <path d="M20 150 V24" stroke="var(--border)" stroke-width="1.5"/>
    <path d="M24 138 C60 60,78 58,96 96 C112 132,128 138,150 130 C166 124,176 66,196 62 C212 58,220 128,240 126 C258 124,268 62,300 30"
      fill="none" stroke="var(--fg)" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="96" cy="96" r="4.5" fill="var(--blue)"/><circle cx="150" cy="130" r="4.5" fill="var(--blue)"/>
    <circle cx="196" cy="62" r="4.5" fill="var(--red)"/><circle cx="300" cy="30" r="5" fill="var(--green)"/>
    <text x="92" y="118" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">겨울</text>
    <text x="150" y="150" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">겨울</text>
    <text x="196" y="50" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">붐</text>
    <text x="34" y="168" font-size="10" fill="var(--muted)" font-family="monospace">1950</text>
    <text x="272" y="168" font-size="10" fill="var(--muted)" font-family="monospace">2026</text>
  </svg>`,

  /* 2차시 — 군집 점 + 중심 × */
  mlplay:`<svg viewBox="0 0 320 180" role="img" aria-label="두 군집의 점들과 중심을 나타낸 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <circle cx="84" cy="60" r="42" fill="var(--accent)" opacity="0.22"/>
    <circle cx="216" cy="116" r="46" fill="var(--blue)" opacity="0.16"/>
    <g fill="var(--fg)">
      <circle cx="62" cy="46" r="5"/><circle cx="92" cy="38" r="5"/><circle cx="76" cy="70" r="5"/>
      <circle cx="104" cy="72" r="5"/><circle cx="58" cy="76" r="5"/>
    </g>
    <g fill="var(--blue)">
      <circle cx="196" cy="98" r="5"/><circle cx="228" cy="94" r="5"/><circle cx="210" cy="126" r="5"/>
      <circle cx="240" cy="132" r="5"/><circle cx="184" cy="128" r="5"/>
    </g>
    <g stroke="var(--red)" stroke-width="3.4" stroke-linecap="round">
      <path d="M77 51 l14 14 M91 51 l-14 14"/><path d="M205 110 l14 14 M219 110 l-14 14"/>
    </g>
    <text x="160" y="168" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">거리로 묶고 · 평균으로 중심을 옮긴다</text>
  </svg>`,

  /* 3차시 — 논리 게이트 회로 */
  logic:`<svg viewBox="0 0 320 180" role="img" aria-label="AND 게이트와 OR 게이트로 이루어진 논리 회로">
    <rect width="320" height="180" fill="var(--bg)"/>
    <g stroke="var(--muted)" stroke-width="2" fill="none">
      <path d="M24 56 H72"/><path d="M24 92 H72"/><path d="M24 130 H72"/>
      <path d="M132 74 H168"/><path d="M132 130 H150 V104 H168"/><path d="M228 96 H272"/>
    </g>
    <path d="M72 40 h26 a34 34 0 0 1 0 68 h-26 z" fill="var(--card)" stroke="var(--fg)" stroke-width="2"/>
    <text x="98" y="80" font-size="13" font-family="monospace" font-weight="700" text-anchor="middle" fill="var(--fg)">AND</text>
    <path d="M72 112 q22 18 0 36 q34 0 56 -18 q-22 -18 -56 -18 z" fill="var(--card)" stroke="var(--fg)" stroke-width="2"/>
    <text x="103" y="136" font-size="11" font-family="monospace" font-weight="700" text-anchor="middle" fill="var(--fg)">OR</text>
    <path d="M168 66 h26 a34 34 0 0 1 0 60 h-26 z" fill="var(--card)" stroke="var(--fg)" stroke-width="2"/>
    <text x="194" y="101" font-size="12" font-family="monospace" font-weight="700" text-anchor="middle" fill="var(--fg)">XOR</text>
    <circle cx="282" cy="96" r="13" fill="var(--accent)" stroke="var(--fg)" stroke-width="2"/>
    <text x="282" y="101" font-size="13" text-anchor="middle">💡</text>
    <text x="16" y="52" font-size="11" fill="var(--muted)" font-family="monospace">1</text>
    <text x="16" y="88" font-size="11" fill="var(--muted)" font-family="monospace">0</text>
    <text x="16" y="126" font-size="11" fill="var(--muted)" font-family="monospace">1</text>
  </svg>`,

  /* 4차시 — 퍼셉트론 구조도 */
  perceptron:`<svg viewBox="0 0 320 180" role="img" aria-label="입력에 가중치를 곱해 더한 뒤 활성화함수를 지나 출력이 나오는 퍼셉트론 구조도">
    <rect width="320" height="180" fill="var(--bg)"/>
    <g fill="var(--card)" stroke="var(--fg)" stroke-width="2">
      <circle cx="42" cy="52" r="17"/><circle cx="42" cy="96" r="17"/><circle cx="42" cy="140" r="17"/>
    </g>
    <text x="42" y="57" font-size="13" font-family="monospace" text-anchor="middle" fill="var(--fg)">x₁</text>
    <text x="42" y="101" font-size="13" font-family="monospace" text-anchor="middle" fill="var(--fg)">x₂</text>
    <text x="42" y="145" font-size="13" font-family="monospace" text-anchor="middle" fill="var(--fg)">1</text>
    <g stroke="var(--muted)" stroke-width="2" fill="none">
      <path d="M59 52 L136 92"/><path d="M59 96 L136 96"/><path d="M59 140 L136 102"/>
    </g>
    <text x="92" y="62" font-size="11" fill="var(--body)" font-family="monospace">w₁</text>
    <text x="92" y="90" font-size="11" fill="var(--body)" font-family="monospace">w₂</text>
    <text x="92" y="138" font-size="11" fill="var(--body)" font-family="monospace">b</text>
    <circle cx="158" cy="96" r="23" fill="var(--fg)"/>
    <text x="158" y="103" font-size="19" font-family="monospace" text-anchor="middle" fill="var(--bg)">Σ</text>
    <path d="M181 96 H206" stroke="var(--muted)" stroke-width="2"/><path d="M206 96 l-8 -5 v10 z" fill="var(--muted)"/>
    <rect x="208" y="66" width="60" height="60" rx="9" fill="var(--card)" stroke="var(--fg)" stroke-width="2"/>
    <path d="M216 116 H238 V78 H260" fill="none" stroke="var(--red)" stroke-width="2.6"/>
    <path d="M270 96 H298" stroke="var(--muted)" stroke-width="2"/><path d="M298 96 l-8 -5 v10 z" fill="var(--muted)"/>
    <text x="238" y="146" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">활성화함수</text>
    <text x="292" y="80" font-size="13" font-family="monospace" text-anchor="middle" fill="var(--fg)">y</text>
  </svg>`,

  /* 5차시 — 기울어진 저울 + 막대그래프 */
  bias:`<svg viewBox="0 0 320 180" role="img" aria-label="한쪽으로 기울어진 저울과 집단별 정확도 막대그래프">
    <rect width="320" height="180" fill="var(--bg)"/>
    <path d="M96 148 H24 M60 148 V56" stroke="var(--fg)" stroke-width="3" stroke-linecap="round"/>
    <g transform="rotate(-15 60 56)">
      <path d="M16 56 H104" stroke="var(--fg)" stroke-width="3" stroke-linecap="round"/>
      <rect x="4" y="58" width="26" height="26" rx="4" fill="var(--fg)"/>
      <rect x="88" y="58" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--fg)" stroke-width="1.5"/>
    </g>
    <circle cx="60" cy="56" r="5" fill="var(--fg)"/>
    <text x="60" y="170" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">치우친 데이터</text>
    <path d="M148 148 H300" stroke="var(--border)" stroke-width="1.5"/>
    <rect x="160" y="52"  width="30" height="96" rx="3" fill="var(--green)" opacity="0.85"/>
    <rect x="204" y="66"  width="30" height="82" rx="3" fill="var(--fg)" opacity="0.75"/>
    <rect x="248" y="112" width="30" height="36" rx="3" fill="var(--red)" opacity="0.85"/>
    <text x="175" y="44"  font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">95%</text>
    <text x="219" y="58"  font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">88%</text>
    <text x="263" y="104" font-size="11" fill="var(--red)"  font-family="monospace" text-anchor="middle">31%</text>
    <text x="224" y="168" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">전체 · 다수 · 소수 집단</text>
  </svg>`,

  /* 6~7차시 — 단어를 벡터로 */
  text:`<svg viewBox="0 0 320 180" role="img" aria-label="문장의 단어가 0과 1로 이루어진 벡터로 바뀌는 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <rect x="18" y="44" width="104" height="34" rx="8" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
    <text x="70" y="66" font-size="14" text-anchor="middle" fill="var(--fg)">사과</text>
    <rect x="18" y="100" width="104" height="34" rx="8" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
    <text x="70" y="122" font-size="14" text-anchor="middle" fill="var(--fg)">바나나</text>
    <g stroke="var(--muted)" stroke-width="2" fill="none">
      <path d="M126 61 H160"/><path d="M126 117 H160"/>
    </g>
    <path d="M160 61 l-8 -5 v10 z" fill="var(--muted)"/><path d="M160 117 l-8 -5 v10 z" fill="var(--muted)"/>
    <g font-family="monospace" font-size="14" text-anchor="middle">
      <rect x="168" y="42" width="132" height="38" rx="7" fill="var(--fg)"/>
      <text x="234" y="67" fill="var(--bg)">[1, 0, 0, 0]</text>
      <rect x="168" y="98" width="132" height="38" rx="7" fill="var(--fg)"/>
      <text x="234" y="123" fill="var(--bg)">[0, 1, 0, 0]</text>
    </g>
    <text x="160" y="166" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">단어집합 → 원-핫 벡터</text>
  </svg>`,

  /* 8차시 — 많이 나온 순서 구름 → 중요한 순서 구름 */
  tfidf:`<svg viewBox="0 0 320 180" role="img" aria-label="많이 나온 순서의 단어 구름과 중요한 순서의 단어 구름">
    <rect width="320" height="180" fill="var(--bg)"/>
    <rect x="12" y="24" width="122" height="132" rx="8" fill="var(--card)" stroke="var(--border)"/>
    <rect x="186" y="24" width="122" height="132" rx="8" fill="var(--card)" stroke="var(--border)"/>
    <text x="73" y="82" font-size="26" font-weight="700" fill="var(--fg)" text-anchor="middle">발표</text>
    <text x="45" y="114" font-size="13" fill="var(--muted)" text-anchor="middle">정부</text>
    <text x="102" y="118" font-size="13" fill="var(--muted)" text-anchor="middle">대책</text>
    <text x="70" y="142" font-size="9" fill="var(--muted)" text-anchor="middle">폭염</text>
    <text x="247" y="86" font-size="26" font-weight="700" fill="var(--fg)" text-anchor="middle">폭염</text>
    <text x="247" y="118" font-size="13" fill="var(--muted)" text-anchor="middle">온열질환</text>
    <text x="247" y="142" font-size="9" fill="var(--muted)" text-anchor="middle">발표</text>
    <path d="M142 90 H178" stroke="var(--fg)" stroke-width="3" stroke-linecap="round"/>
    <path d="M170 82 L180 90 L170 98" fill="none" stroke="var(--fg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="160" y="70" font-size="13" fill="var(--red)" text-anchor="middle">?</text>
  </svg>`,

  /* 9차시 — 거리(점선)와 각(호)을 한 그림에 겹친 도해 */
  sim:`<svg viewBox="0 0 320 180" role="img" aria-label="원점에서 뻗은 두 화살표, 끝점을 잇는 점선(거리)과 사이의 호(각)">
    <rect width="320" height="180" fill="var(--bg)"/>
    <path d="M32 150 H300" stroke="var(--border)" stroke-width="1.5"/>
    <path d="M32 150 V26" stroke="var(--border)" stroke-width="1.5"/>
    <path d="M78 150 A46 46 0 0 0 32 104" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4"/>
    <line x1="32" y1="150" x2="250" y2="58" stroke="var(--fg)" stroke-width="3.4" stroke-linecap="round"/>
    <polygon points="250,58 236,58 242,70" fill="var(--fg)"/>
    <line x1="32" y1="150" x2="238" y2="110" stroke="var(--blue)" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="10 5"/>
    <polygon points="238,110 224,107 227,120" fill="var(--blue)"/>
    <line x1="250" y1="58" x2="238" y2="110" stroke="var(--red)" stroke-width="2.4" stroke-dasharray="5 4"/>
    <circle cx="250" cy="58" r="4.5" fill="var(--fg)"/>
    <circle cx="238" cy="110" r="4.5" fill="var(--blue)"/>
    <path d="M101 137 A70 70 0 0 0 96 123" fill="none" stroke="var(--fg)" stroke-width="2.6"/>
    <text x="262" y="88" font-family="var(--mono)" font-size="12" fill="var(--red)">거리</text>
    <text x="112" y="128" font-family="var(--mono)" font-size="12" fill="var(--fg)">각</text>
    <text x="160" y="172" text-anchor="middle" font-family="var(--mono)" font-size="12" fill="var(--muted)">거리로 잴까, 방향으로 잴까</text>
  </svg>`,

  /* 10차시 — 겹친 두 원과 분수 막대 */
  senti:`<svg viewBox="0 0 320 180" role="img" aria-label="두 원이 겹친 벤다이어그램과 분수 막대">
    <rect width="320" height="180" fill="var(--bg)"/>
    <circle cx="128" cy="90" r="58" fill="var(--blue)" opacity="0.30"/>
    <circle cx="192" cy="90" r="58" fill="var(--red)" opacity="0.30"/>
    <path d="M160 34 a58 58 0 0 1 0 112 a58 58 0 0 1 0 -112 z" fill="var(--accent)"/>
    <circle cx="128" cy="90" r="58" fill="none" stroke="var(--blue)" stroke-width="2"/>
    <circle cx="192" cy="90" r="58" fill="none" stroke="var(--red)" stroke-width="2"/>
    <rect x="142" y="88" width="36" height="4" rx="2" fill="var(--fg)"/>
    <circle cx="160" cy="70" r="5" fill="var(--fg)"/>
    <circle cx="160" cy="112" r="5" fill="var(--fg)"/>
    <text x="70" y="34" font-size="12" fill="var(--blue)" font-family="monospace">P</text>
    <text x="244" y="34" font-size="12" fill="var(--red)" font-family="monospace">N</text>
  </svg>`,

  /* 11차시 — 떨어지는 별점 꺾은선과 그 아래 막대(대시보드) */
  review:`<svg viewBox="0 0 320 180" role="img" aria-label="후반이 아래로 꺾이는 꺾은선과 그 아래 막대그래프">
    <rect width="320" height="180" fill="var(--bg)"/>
    <path d="M28 152 H298" stroke="var(--border)" stroke-width="1.5"/>
    <path d="M28 152 V22" stroke="var(--border)" stroke-width="1.5"/>
    <rect x="44"  y="112" width="22" height="40" fill="var(--blue)" opacity="0.55"/>
    <rect x="94"  y="104" width="22" height="48" fill="var(--blue)" opacity="0.55"/>
    <rect x="144" y="120" width="22" height="32" fill="var(--blue)" opacity="0.55"/>
    <rect x="194" y="132" width="22" height="20" fill="var(--red)"  opacity="0.55"/>
    <rect x="244" y="138" width="22" height="14" fill="var(--red)"  opacity="0.55"/>
    <path d="M55 46 L105 50 L155 72 L205 110 L255 122"
      fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="55" cy="46" r="5" fill="var(--accent)"/>
    <circle cx="155" cy="72" r="5" fill="var(--accent)"/>
    <circle cx="205" cy="110" r="7" fill="var(--red)"/>
    <text x="55" y="36" font-size="11" fill="var(--fg)" font-family="monospace" text-anchor="middle">4.6</text>
    <text x="262" y="116" font-size="11" fill="var(--red)" font-family="monospace" text-anchor="middle">2.2</text>
  </svg>`,

  /* 12차시 도입 — Quick Draw */
  quickdraw:`<svg viewBox="0 0 320 180" role="img" aria-label="손그림 낙서를 인공지능이 알아맞히는 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <rect x="20" y="26" width="150" height="128" rx="10" fill="#fff" stroke="var(--border)" stroke-width="2"/>
    <path d="M52 118 q18 -56 44 -50 q26 6 22 50" fill="none" stroke="var(--fg)" stroke-width="4" stroke-linecap="round"/>
    <path d="M52 118 h66" stroke="var(--fg)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="76" cy="90" r="4" fill="var(--fg)"/><circle cx="98" cy="90" r="4" fill="var(--fg)"/>
    <path d="M132 138 l16 16 l-4 -20 z" fill="var(--fg)"/>
    <g stroke="var(--muted)" stroke-width="2" fill="none"><path d="M176 90 H206"/></g>
    <path d="M206 90 l-8 -5 v10 z" fill="var(--muted)"/>
    <rect x="212" y="52" width="88" height="34" rx="7" fill="var(--green)" opacity="0.85"/>
    <text x="256" y="75" font-size="13" font-family="monospace" text-anchor="middle" fill="#fff">고양이 82%</text>
    <rect x="212" y="94" width="88" height="30" rx="7" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
    <text x="256" y="114" font-size="12" font-family="monospace" text-anchor="middle" fill="var(--muted)">곰 11%</text>
    <text x="160" y="170" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">낙서 → 확률로 답하기</text>
  </svg>`,

  /* 12차시 — 픽셀 격자 숫자 */
  mnist:`<svg viewBox="0 0 320 180" role="img" aria-label="손글씨 숫자가 밝기 값을 가진 픽셀 격자로 표현된 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <g transform="translate(30,24)">
      <rect x="-3" y="-3" width="126" height="126" rx="5" fill="var(--border)"/>
      <g>
        <rect x="0"  y="0"  width="28" height="28" fill="#fff"/><rect x="30" y="0"  width="28" height="28" fill="#d8d8d8"/>
        <rect x="60" y="0"  width="28" height="28" fill="#4a4a4a"/><rect x="90" y="0"  width="28" height="28" fill="#fff"/>
        <rect x="0"  y="30" width="28" height="28" fill="#fff"/><rect x="30" y="30" width="28" height="28" fill="#2a2a2a"/>
        <rect x="60" y="30" width="28" height="28" fill="#111"/><rect x="90" y="30" width="28" height="28" fill="#fff"/>
        <rect x="0"  y="60" width="28" height="28" fill="#fff"/><rect x="30" y="60" width="28" height="28" fill="#e5e5e5"/>
        <rect x="60" y="60" width="28" height="28" fill="#111"/><rect x="90" y="60" width="28" height="28" fill="#fff"/>
        <rect x="0"  y="90" width="28" height="28" fill="#fff"/><rect x="30" y="90" width="28" height="28" fill="#8a8a8a"/>
        <rect x="60" y="90" width="28" height="28" fill="#111"/><rect x="90" y="90" width="28" height="28" fill="#c9c9c9"/>
      </g>
    </g>
    <g font-family="monospace" font-size="12" fill="var(--body)">
      <text x="176" y="46">255 200  60 255</text>
      <text x="176" y="72">255  40   0 255</text>
      <text x="176" y="98">255 230   0 255</text>
      <text x="176" y="124">255 140   0 200</text>
    </g>
    <text x="160" y="168" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">이미지 = 밝기 값의 행렬</text>
  </svg>`,

  /* 13차시 — 두 비트열의 XOR */
  hamming:`<svg viewBox="0 0 320 180" role="img" aria-label="두 비트열을 XOR 연산해 다른 자리를 세는 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <g font-family="monospace" font-size="17" text-anchor="middle">
      <g fill="var(--fg)">
        <text x="60" y="48">1</text><text x="102" y="48">0</text><text x="144" y="48">1</text>
        <text x="186" y="48">1</text><text x="228" y="48">0</text><text x="270" y="48">1</text>
      </g>
      <g fill="var(--fg)">
        <text x="60" y="88">1</text><text x="102" y="88">1</text><text x="144" y="88">1</text>
        <text x="186" y="88">0</text><text x="228" y="88">0</text><text x="270" y="88">0</text>
      </g>
      <text x="26" y="48" fill="var(--muted)" font-size="13">A</text>
      <text x="26" y="88" fill="var(--muted)" font-size="13">B</text>
      <text x="26" y="130" fill="var(--red)" font-size="13">⊕</text>
      <g fill="var(--muted)">
        <text x="60" y="130">0</text><text x="144" y="130">0</text><text x="228" y="130">0</text>
      </g>
      <g fill="var(--red)" font-weight="700">
        <text x="102" y="130">1</text><text x="186" y="130">1</text><text x="270" y="130">1</text>
      </g>
    </g>
    <path d="M40 102 H292" stroke="var(--border)" stroke-width="1.5"/>
    <text x="160" y="164" font-size="11.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">해밍 거리 d = 1 + 1 + 1 = 3</text>
  </svg>`,

  /* 15차시 — 3×3 커널 스캔 */
  conv:`<svg viewBox="0 0 320 180" role="img" aria-label="3x3 커널이 이미지 위를 이동하며 특징 맵을 만드는 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <g transform="translate(24,30)">
      <rect x="-2" y="-2" width="124" height="124" rx="4" fill="var(--border)"/>
      <g fill="var(--card)">
        <rect x="0" y="0" width="28" height="28"/><rect x="30" y="0" width="28" height="28"/>
        <rect x="60" y="0" width="28" height="28"/><rect x="90" y="0" width="28" height="28"/>
        <rect x="0" y="30" width="28" height="28"/><rect x="30" y="30" width="28" height="28"/>
        <rect x="60" y="30" width="28" height="28"/><rect x="90" y="30" width="28" height="28"/>
        <rect x="0" y="60" width="28" height="28"/><rect x="30" y="60" width="28" height="28"/>
        <rect x="60" y="60" width="28" height="28"/><rect x="90" y="60" width="28" height="28"/>
        <rect x="0" y="90" width="28" height="28"/><rect x="30" y="90" width="28" height="28"/>
        <rect x="60" y="90" width="28" height="28"/><rect x="90" y="90" width="28" height="28"/>
      </g>
      <rect x="-2" y="-2" width="92" height="92" fill="var(--accent)" opacity="0.42"/>
      <rect x="-2" y="-2" width="92" height="92" fill="none" stroke="var(--red)" stroke-width="3" rx="3"/>
    </g>
    <text x="86" y="170" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">입력 · 3×3 커널</text>
    <g stroke="var(--muted)" stroke-width="2" fill="none"><path d="M156 90 H190"/></g>
    <path d="M190 90 l-8 -5 v10 z" fill="var(--muted)"/>
    <g transform="translate(206,58)">
      <rect x="-2" y="-2" width="66" height="66" rx="4" fill="var(--border)"/>
      <rect x="0" y="0" width="30" height="30" fill="var(--fg)"/><rect x="32" y="0" width="30" height="30" fill="var(--muted)"/>
      <rect x="0" y="32" width="30" height="30" fill="var(--accent)"/><rect x="32" y="32" width="30" height="30" fill="var(--card)"/>
    </g>
    <text x="238" y="146" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">특징 맵</text>
  </svg>`,

  /* 16차시 — 필터 전/후 분할 */
  filter:`<svg viewBox="0 0 320 180" role="img" aria-label="필터 적용 전과 후의 이미지를 반으로 나누어 비교한 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <clipPath id="aimFL"><rect x="30" y="26" width="128" height="118"/></clipPath>
    <clipPath id="aimFR"><rect x="162" y="26" width="128" height="118"/></clipPath>
    <g clip-path="url(#aimFL)">
      <rect x="30" y="26" width="128" height="118" fill="var(--card)"/>
      <circle cx="94" cy="76" r="30" fill="var(--accent)"/>
      <rect x="60" y="104" width="68" height="30" rx="5" fill="var(--muted)" opacity="0.6"/>
    </g>
    <g clip-path="url(#aimFR)">
      <rect x="162" y="26" width="128" height="118" fill="#151515"/>
      <circle cx="226" cy="76" r="30" fill="none" stroke="#fff" stroke-width="3.5"/>
      <rect x="192" y="104" width="68" height="30" rx="5" fill="none" stroke="#fff" stroke-width="3"/>
    </g>
    <rect x="30" y="26" width="128" height="118" rx="6" fill="none" stroke="var(--border)" stroke-width="2"/>
    <rect x="162" y="26" width="128" height="118" rx="6" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="94"  y="164" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">원본</text>
    <text x="226" y="164" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">윤곽선 커널</text>
  </svg>`,

  /* 17차시 — 풀링 축소 격자 */
  pool:`<svg viewBox="0 0 320 180" role="img" aria-label="4x4 격자에서 최댓값만 남겨 2x2로 줄이는 맥스 풀링 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <g transform="translate(24,30)" font-family="monospace" font-size="14" text-anchor="middle">
      <rect x="-2" y="-2" width="124" height="124" rx="4" fill="var(--border)"/>
      <g fill="var(--card)">
        <rect x="0" y="0" width="28" height="28"/><rect x="30" y="0" width="28" height="28"/>
        <rect x="60" y="0" width="28" height="28"/><rect x="90" y="0" width="28" height="28"/>
        <rect x="0" y="30" width="28" height="28"/><rect x="30" y="30" width="28" height="28"/>
        <rect x="60" y="30" width="28" height="28"/><rect x="90" y="30" width="28" height="28"/>
        <rect x="0" y="60" width="28" height="28"/><rect x="30" y="60" width="28" height="28"/>
        <rect x="60" y="60" width="28" height="28"/><rect x="90" y="60" width="28" height="28"/>
        <rect x="0" y="90" width="28" height="28"/><rect x="30" y="90" width="28" height="28"/>
        <rect x="60" y="90" width="28" height="28"/><rect x="90" y="90" width="28" height="28"/>
      </g>
      <rect x="30" y="0" width="28" height="28" fill="var(--accent)"/>
      <rect x="90" y="0" width="28" height="28" fill="var(--accent)"/>
      <rect x="30" y="60" width="28" height="28" fill="var(--accent)"/>
      <rect x="60" y="90" width="28" height="28" fill="var(--accent)"/>
      <g fill="var(--body)">
        <text x="14" y="19">1</text><text x="44" y="19">9</text><text x="74" y="19">4</text><text x="104" y="19">8</text>
        <text x="14" y="49">3</text><text x="44" y="49">2</text><text x="74" y="49">1</text><text x="104" y="49">5</text>
        <text x="14" y="79">2</text><text x="44" y="79">7</text><text x="74" y="79">3</text><text x="104" y="79">1</text>
        <text x="14" y="109">1</text><text x="44" y="109">4</text><text x="74" y="109">9</text><text x="104" y="109">2</text>
      </g>
    </g>
    <g stroke="var(--muted)" stroke-width="2" fill="none"><path d="M158 90 H194"/></g>
    <path d="M194 90 l-8 -5 v10 z" fill="var(--muted)"/>
    <g transform="translate(212,58)" font-family="monospace" font-size="16" text-anchor="middle">
      <rect x="-2" y="-2" width="66" height="66" rx="4" fill="var(--border)"/>
      <rect x="0" y="0" width="30" height="30" fill="var(--accent)"/><rect x="32" y="0" width="30" height="30" fill="var(--accent)"/>
      <rect x="0" y="32" width="30" height="30" fill="var(--accent)"/><rect x="32" y="32" width="30" height="30" fill="var(--accent)"/>
      <g fill="var(--fg)" font-weight="700">
        <text x="15" y="21">9</text><text x="47" y="21">8</text><text x="15" y="53">7</text><text x="47" y="53">9</text>
      </g>
    </g>
    <text x="245" y="146" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">2×2 맥스 풀링</text>
  </svg>`,

  /* 18차시 — 단계 파이프라인 */
  pipeline:`<svg viewBox="0 0 320 180" role="img" aria-label="입력에서 합성곱, 활성화, 풀링을 거쳐 분류에 이르는 파이프라인 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <g font-family="monospace" font-size="10.5" text-anchor="middle">
      <rect x="12"  y="66" width="50" height="48" rx="7" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
      <text x="37" y="88" font-size="17">🖼️</text><text x="37" y="106" fill="var(--muted)">입력</text>
      <rect x="76"  y="66" width="50" height="48" rx="7" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
      <text x="101" y="90" font-size="13" fill="var(--fg)">＊</text><text x="101" y="106" fill="var(--muted)">합성곱</text>
      <rect x="140" y="66" width="50" height="48" rx="7" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
      <path d="M88 0 0 0" fill="none"/>
      <path d="M150 96 h14 l14 -22" fill="none" stroke="var(--red)" stroke-width="2.4"/>
      <text x="165" y="106" fill="var(--muted)">ReLU</text>
      <rect x="204" y="66" width="50" height="48" rx="7" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
      <g fill="var(--accent)"><rect x="216" y="76" width="11" height="11"/><rect x="230" y="76" width="11" height="11"/></g>
      <text x="229" y="106" fill="var(--muted)">풀링</text>
      <rect x="268" y="66" width="42" height="48" rx="7" fill="var(--fg)"/>
      <text x="289" y="88" font-size="12" fill="var(--bg)">P</text><text x="289" y="106" fill="var(--accent)">분류</text>
    </g>
    <g stroke="var(--muted)" stroke-width="1.8" fill="none">
      <path d="M64 90 H74"/><path d="M128 90 H138"/><path d="M192 90 H202"/><path d="M256 90 H266"/>
    </g>
    <text x="160" y="42" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">CNN 파이프라인</text>
    <text x="160" y="150" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">합이 1인 확률로 답한다</text>
  </svg>`,

  /* 19차시 — 바운딩 박스 */
  detect:`<svg viewBox="0 0 320 180" role="img" aria-label="사진 속 물체를 바운딩 박스와 신뢰도로 표시한 그림">
    <rect width="320" height="180" fill="var(--bg)"/>
    <rect x="26" y="22" width="268" height="132" rx="8" fill="var(--card)" stroke="var(--border)" stroke-width="2"/>
    <path d="M26 122 q46 -34 88 -6 q40 26 84 -12 q40 -34 96 6 V154 H26 Z" fill="var(--accent)" opacity="0.35"/>
    <circle cx="252" cy="52" r="14" fill="var(--accent)" opacity="0.8"/>
    <g fill="none" stroke="var(--green)" stroke-width="3">
      <rect x="52" y="60" width="76" height="76" rx="3"/>
    </g>
    <rect x="52" y="44" width="72" height="18" rx="3" fill="var(--green)"/>
    <text x="88" y="57" font-size="10.5" font-family="monospace" text-anchor="middle" fill="#fff">사람 0.94</text>
    <text x="90" y="106" font-size="30" text-anchor="middle">🧍</text>
    <g fill="none" stroke="var(--blue)" stroke-width="3">
      <rect x="168" y="82" width="94" height="54" rx="3"/>
    </g>
    <rect x="168" y="66" width="76" height="18" rx="3" fill="var(--blue)"/>
    <text x="206" y="79" font-size="10.5" font-family="monospace" text-anchor="middle" fill="#fff">자동차 0.87</text>
    <text x="214" y="122" font-size="26" text-anchor="middle">🚗</text>
    <text x="160" y="172" font-size="10.5" fill="var(--muted)" font-family="monospace" text-anchor="middle">어디에 · 무엇이 · 얼마나 확실한가</text>
  </svg>`,

  /* 준비 중 차시 — 회색 점선 */
  soon:`<svg viewBox="0 0 320 180" role="img" aria-label="준비 중인 차시임을 나타내는 회색 점선 그림">
    <rect width="320" height="180" fill="var(--card)"/>
    <rect x="34" y="34" width="252" height="112" rx="10" fill="none"
      stroke="var(--border)" stroke-width="2.5" stroke-dasharray="9 8"/>
    <g stroke="var(--border)" stroke-width="2.5" stroke-linecap="round" fill="none">
      <path d="M132 90 H188"/><path d="M160 62 V118"/>
    </g>
    <text x="160" y="160" font-size="11" fill="var(--muted)" font-family="monospace" text-anchor="middle">준비 중</text>
  </svg>`,
};

function aimArt(key){ return AIM_ART[key] || AIM_ART.soon; }
function aimLessonByView(v){
  for(let i=0;i<AIM_LESSONS.length;i++){ if(AIM_LESSONS[i].v===v) return AIM_LESSONS[i]; }
  return null;
}

/* ── 차시 목록 ▾ 드롭다운 (클릭 · 데스크톱 hover · ESC · 바깥 클릭) ── */
function aimBuildNav(){
  const panel=document.getElementById('nav-panel');
  const btn=document.getElementById('nav-menu-btn');
  const menu=document.getElementById('nav-menu');
  if(!panel||!btn||!menu) return;

  let html='';
  AIM_UNITS.forEach((u,ui)=>{
    const rows=AIM_LESSONS.filter(l=>l.u===ui);
    if(!rows.length) return;
    html+='<div class="nav-unit">'+u.u+'. '+u.name+' · '+u.r+'</div><div class="nav-list">';
    rows.forEach(l=>{
      const has=l.v&&document.getElementById('v-'+l.v);
      if(has){
        html+='<button type="button" class="nav-item" role="menuitem" data-v="'+l.v+'">'+
              '<span class="n">'+cmnEsc(l.n)+'</span><span class="t">'+cmnEsc(l.t)+'</span></button>';
      }else{
        html+='<span class="nav-item soon" aria-disabled="true">'+
              '<span class="n">'+cmnEsc(l.n)+'</span><span class="t">'+cmnEsc(l.t)+'</span>'+
              '<span class="s">준비 중</span></span>';
      }
    });
    html+='</div>';
  });
  panel.innerHTML=html;

  panel.querySelectorAll('.nav-item[data-v]').forEach(b=>{
    b.addEventListener('click',()=>{ aimNavClose(); go(b.dataset.v); });
  });

  const open=()=>{ panel.classList.add('on'); btn.setAttribute('aria-expanded','true'); };
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    if(panel.classList.contains('on')) aimNavClose(); else open();
  });

  // 데스크톱(마우스 사용 기기)에서는 hover 로도 열립니다.
  if(window.matchMedia&&window.matchMedia('(hover:hover) and (min-width:1024px)').matches){
    let t=null;
    menu.addEventListener('mouseenter',()=>{ clearTimeout(t); open(); });
    menu.addEventListener('mouseleave',()=>{ t=setTimeout(aimNavClose,260); });
  }

  document.addEventListener('click',e=>{
    if(!panel.classList.contains('on')) return;
    if(menu.contains(e.target)) return;
    aimNavClose();
  });
  document.addEventListener('keydown',e=>{
    if((e.key==='Escape'||e.key==='Esc')&&panel.classList.contains('on')){ aimNavClose(); btn.focus(); }
  });
}
function aimNavClose(){
  const panel=document.getElementById('nav-panel');
  const btn=document.getElementById('nav-menu-btn');
  if(panel) panel.classList.remove('on');
  if(btn) btn.setAttribute('aria-expanded','false');
}

/* ── 현재 차시 표시 + 드롭다운 하이라이트 (go() 에서 호출) ── */
function aimNavSync(v){
  const cur=document.getElementById('nav-cur');
  const l=aimLessonByView(v);
  if(cur) cur.textContent=(v==='home'||!l)?'':(l.n+' · '+l.t);
  const panel=document.getElementById('nav-panel');
  if(panel) panel.querySelectorAll('.nav-item').forEach(it=>{
    it.classList.toggle('cur', it.dataset && it.dataset.v===v);
  });
}

/* ── 홈 카드 그리드 — 단원 소제목 + 차시순 + 준비 중 회색 카드 ── */
function aimBuildHome(){
  const box=document.getElementById('hm-lessons');
  if(!box) return;
  let html='';
  AIM_UNITS.forEach((u,ui)=>{
    const rows=AIM_LESSONS.filter(l=>l.u===ui);
    if(!rows.length) return;
    html+='<div class="hm-unit"><h3>'+u.u+'. '+u.name+'</h3><span class="r">'+u.r+'</span></div><div class="hm-grid">';
    rows.forEach(l=>{
      const has=l.v&&document.getElementById('v-'+l.v);
      if(has){
        html+='<div class="card-link" role="link" tabindex="0" data-go="'+l.v+'">'+
                '<div class="hm-th">'+aimArt(l.a)+'</div>'+
                '<div class="hm-body"><h3>'+cmnEsc(l.n)+' · '+cmnEsc(l.t)+'</h3>'+
                '<p>'+cmnEsc(l.d||'')+'</p></div></div>';
      }else{
        html+='<div class="hm-no" aria-disabled="true">'+
                '<div class="hm-th">'+AIM_ART.soon+'</div>'+
                '<div class="hm-body"><h3>'+cmnEsc(l.n)+' · '+cmnEsc(l.t)+'</h3>'+
                '<p>아직 열리지 않은 차시입니다. 30차시 전체 흐름 안에서 이 차시가 어디에 놓이는지 확인해 두세요.</p>'+
                '<span class="badge">준비 중</span></div></div>';
      }
    });
    html+='</div>';
  });
  box.innerHTML=html;
  box.querySelectorAll('[data-go]').forEach(el=>{
    el.addEventListener('click',()=>go(el.dataset.go));
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(el.dataset.go); }
    });
  });
}

/* ── 뷰 표제부 워터마크 — 홈 카드와 같은 SVG를 옅게 재사용 ── */
function aimBuildMarks(){
  AIM_LESSONS.forEach(l=>{
    if(!l.v||!l.a) return;
    const view=document.getElementById('v-'+l.v);
    if(!view||view.querySelector('.vw-mark')) return;
    // 표제부의 .mono 를 품은 컨테이너에 워터마크를 겹칩니다(마크업 이동 없음).
    const head=view.querySelector('.mono');
    const host=head?head.parentElement:null;
    if(!host) return;
    host.classList.add('vw-wrap');
    const mark=document.createElement('div');
    mark.className='vw-mark';
    mark.setAttribute('aria-hidden','true');
    mark.innerHTML=aimArt(l.a);
    host.insertBefore(mark,host.firstChild);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   참고 자료 확장 (§25) — 학급 공유 자료함 · 교사 추가 슬롯 · 내보내기/가져오기
   각 차시의 「참고 자료」 카드 끝에 자동으로 붙습니다(뷰 HTML 수정 불필요).
   ═══════════════════════════════════════════════════════════════════════════ */
const AIM_SHARE_KEY='aimath.shared.folder';

function aimRefExtras(box, slug){
  if(!box) return;
  const CK='aimath.'+slug+'.customrefs';
  const load=()=>{ try{const a=JSON.parse(cmnGet(CK,'[]'));return Array.isArray(a)?a:[];}catch(e){return [];} };
  const save=a=>cmnSet(CK,JSON.stringify(a));

  function render(){
    const arr=load();
    const shared=cmnGet(AIM_SHARE_KEY,'');
    box.innerHTML=
      '<div class="rx-share">'+
        '<span class="ic" aria-hidden="true">📂</span>'+
        '<span class="tx"><b>학급 공유 자료함</b>'+
          (shared
            ? '선생님이 올린 자료를 모두가 보거나 내려받을 수 있습니다.'
            : '공유 폴더(구글 드라이브·패들렛 등) 주소를 한 번만 설정하면 모든 차시에 함께 나타납니다. '+
              '드라이브는 <b>링크가 있는 모든 사용자 보기</b> 권한을 권장합니다.')+
        '</span>'+
        (shared
          ? '<a class="btn cmn-go" href="'+cmnEsc(shared)+'" target="_blank" rel="noopener">우리 반 자료함 열기 ↗</a>'+
            '<button class="btn cmn-go rx-share-edit" type="button">주소 변경</button>'
          : '<button class="btn cmn-go rx-share-edit" type="button">공유 폴더 설정</button>')+
      '</div>'+
      '<div class="rx-form rx-share-form"><input class="cmn-in rx-share-u" type="url" '+
        'placeholder="https://drive.google.com/… 또는 https://padlet.com/…" value="'+cmnEsc(shared)+'">'+
        '<button class="btn cmn-go rx-share-ok" type="button">저장</button>'+
        '<button class="btn cmn-go rx-share-no" type="button">취소</button></div>'+
      '<div class="rx-list"></div>'+
      '<div class="rx-form rx-add-form">'+
        '<input class="cmn-in rx-u" type="url" placeholder="https://... (자료 주소)">'+
        '<input class="cmn-in rx-t" type="text" placeholder="자료 제목">'+
        '<button class="btn cmn-go rx-ok" type="button">추가</button>'+
        '<button class="btn cmn-go rx-no" type="button">취소</button></div>'+
      '<div class="rx-tools">'+
        '<button class="btn cmn-go rx-open" type="button">+ 자료 추가</button>'+
        '<button class="btn cmn-go rx-exp" type="button">자료 목록 내보내기</button>'+
        '<button class="btn cmn-go rx-imp" type="button">가져오기</button>'+
        '<input class="rx-file" type="file" accept="application/json,.json" hidden>'+
      '</div>'+
      '<p class="rx-note">이 기기에 추가한 자료는 이 기기에서만 보입니다. 모두에게 보이려면 '+
        '학급 공유 자료함(드라이브·패들렛)에 올리거나, 내보내기 파일을 사이트 관리자에게 전달하세요.</p>';

    const list=box.querySelector('.rx-list');
    const note=box.querySelector('.rx-note');

    arr.forEach((it,i)=>{
      const yt=cmnYtId(it.u);
      const a=document.createElement('a');
      a.className='rx-card';
      a.href=it.u; a.target='_blank'; a.rel='noopener';
      a.innerHTML='<span class="th">'+
          (yt
            ? '<img src="https://img.youtube.com/vi/'+cmnEsc(yt)+'/hqdefault.jpg" alt="" loading="lazy" '+
              'referrerpolicy="no-referrer" onerror="this.style.display=\'none\';'+
              'this.parentElement.insertAdjacentText(\'beforeend\',\'🎬\');"><span class="bg">영상</span>'
            : (/drive\.google|docs\.google/i.test(it.u) ? '📁<span class="bg">드라이브</span>'
              : /padlet\.com/i.test(it.u) ? '🧷<span class="bg">패들렛</span>'
              : '🔗<span class="bg">웹 자료</span>'))+
        '</span><span class="tx">'+cmnEsc(it.t||it.u)+'</span>';
      const rm=document.createElement('button');
      rm.type='button'; rm.className='rm'; rm.textContent='✕'; rm.title='삭제';
      rm.addEventListener('click',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const c=load(); c.splice(i,1); save(c); render();
      });
      a.appendChild(rm);
      list.appendChild(a);
    });

    const shareForm=box.querySelector('.rx-share-form');
    box.querySelector('.rx-share-edit').addEventListener('click',()=>{
      shareForm.classList.add('on');
      const u=shareForm.querySelector('.rx-share-u'); if(u) u.focus();
    });
    box.querySelector('.rx-share-no').addEventListener('click',()=>shareForm.classList.remove('on'));
    box.querySelector('.rx-share-ok').addEventListener('click',()=>{
      const u=shareForm.querySelector('.rx-share-u').value.trim();
      if(u&&!/^https?:\/\//i.test(u)){ note.textContent='http 또는 https 로 시작하는 주소를 입력해 주세요.'; return; }
      cmnSet(AIM_SHARE_KEY,u);
      aimRefExtrasAll();     // 모든 차시에 동시 반영
    });

    const addForm=box.querySelector('.rx-add-form');
    box.querySelector('.rx-open').addEventListener('click',()=>{
      addForm.classList.add('on');
      const u=addForm.querySelector('.rx-u'); if(u) u.focus();
    });
    box.querySelector('.rx-no').addEventListener('click',()=>addForm.classList.remove('on'));
    box.querySelector('.rx-ok').addEventListener('click',()=>{
      const u=addForm.querySelector('.rx-u').value.trim();
      const t=addForm.querySelector('.rx-t').value.trim();
      if(!/^https?:\/\//i.test(u)){ note.textContent='http 또는 https 로 시작하는 주소를 입력해 주세요.'; return; }
      const c=load(); c.push({u:u,t:t||u}); save(c); render();
    });

    box.querySelector('.rx-exp').addEventListener('click',()=>{
      const data={slug:slug, shared:cmnGet(AIM_SHARE_KEY,''), items:load()};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='aimath-'+slug+'-resources.json';
      document.body.appendChild(a); a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},400);
    });
    const file=box.querySelector('.rx-file');
    box.querySelector('.rx-imp').addEventListener('click',()=>file.click());
    file.addEventListener('change',()=>{
      const f=file.files&&file.files[0];
      if(!f) return;
      const rd=new FileReader();
      rd.onload=()=>{
        try{
          const d=JSON.parse(rd.result);
          const items=Array.isArray(d)?d:(Array.isArray(d.items)?d.items:[]);
          const ok=items.filter(x=>x&&/^https?:\/\//i.test(x.u));
          save(load().concat(ok));
          if(d&&d.shared&&/^https?:\/\//i.test(d.shared)) cmnSet(AIM_SHARE_KEY,d.shared);
          aimRefExtrasAll();
        }catch(e){ note.textContent='가져오기에 실패했습니다. 내보내기로 만든 JSON 파일인지 확인해 주세요.'; }
      };
      rd.readAsText(f);
      file.value='';
    });
  }
  render();
}

/* 각 차시의 「참고 자료」 카드를 찾아 확장 영역을 붙입니다. */
function aimRefExtrasAll(){
  AIM_LESSONS.forEach(l=>{
    if(!l.v) return;
    const view=document.getElementById('v-'+l.v);
    if(!view) return;
    let card=null;
    view.querySelectorAll('.card').forEach(c=>{
      if(card) return;
      const h=c.querySelector('h3');
      if(h&&/참고\s*자료/.test(h.textContent||'')) card=c;
    });
    if(!card) return;
    let box=card.querySelector(':scope>.rx');
    if(!box){
      box=document.createElement('div');
      box.className='rx';
      card.appendChild(box);
    }
    aimRefExtras(box,l.v);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   교과서 지면 캡처 — 로컬 전용 (§32·34)
   assets/textbook-local/ 은 .gitignore 로 배포에서 제외됩니다.
   파일이 없으면(=공개 배포본) onerror 로 figure 자체가 사라져 흔적이 남지 않습니다.
   ═══════════════════════════════════════════════════════════════════════════ */
const AIM_TB_PUB={'씨마스1':'씨마스 「인공지능 수학」 Ⅰ단원','동아1':'동아출판 「인공지능 수학」 1단원',
  '미래엔':'미래엔 「인공지능 수학」','천재':'천재교육 「인공지능 수학」'};

/* 차시 → 개념 → 출판사별 캡처 파일. h 는 붙일 카드 제목을 찾는 정규식입니다. */
const AIM_TBSHOTS=[
  {v:'intro', k:'인공지능의 정의', h:/인공지능이란 무엇일까/,
   fs:['동아1_p10_AI정의.jpg','미래엔_p12_AI정의.jpg','천재_p11_AI정의.jpg']},
  {v:'intro', k:'튜링 테스트', h:/튜링 테스트란 무엇인가/,
   fs:['씨마스1_p11_튜링테스트.jpg','미래엔_p21_튜링테스트.jpg','천재_p18_튜링테스트.jpg']},
  {v:'intro', k:'인공지능의 역사', h:/겨울은 왜 오고/,
   fs:['씨마스1_p13_역사연표.jpg','동아1_p27_역사연표.jpg','미래엔_p22_역사연표.jpg','천재_p34_역사연표.jpg']},

  {v:'mlplay', k:'학습의 세 방식', h:/학습 방식|기계학습|지도·비지도|세 갈래/,
   fs:['씨마스1_p7_기계학습3방식.jpg','미래엔_p15_학습3방식.jpg','천재_p12_학습3방식.jpg']},
  {v:'mlplay', k:'군집(k-means)', h:/군집|k-?means|비지도/,
   fs:['동아1_p16_군집.jpg','천재_p13_군집.jpg']},
  {v:'mlplay', k:'강화학습', h:/강화학습|보상/,
   fs:['미래엔_p16_강화학습.jpg']},

  {v:'logic', k:'진리표', h:/진리표|논리(합|곱)|논리 연산/,
   fs:['씨마스1_p15_진리표.jpg','동아1_p20_진리표.jpg','미래엔_p29_진리표.jpg','천재_p19_진리표.jpg']},
  {v:'logic', k:'전문가 시스템', h:/전문가 시스템/,
   fs:['씨마스1_p19_전문가시스템.jpg','동아1_p24_전문가시스템.jpg','미래엔_p27_전문가시스템.jpg','천재_p21_전문가시스템.jpg']},
  {v:'logic', k:'순서도', h:/순서도|알고리즘/,
   fs:['씨마스1_p21_순서도.jpg','동아1_p25_순서도.jpg','미래엔_p24_순서도.jpg','천재_p24_순서도.jpg']},

  {v:'perceptron', k:'뉴런과 퍼셉트론', h:/뉴런|퍼셉트론이란|퍼셉트론의 구조/,
   fs:['씨마스1_p9_뉴런퍼셉트론.jpg','동아1_p13_뉴런퍼셉트론.jpg','미래엔_p17_뉴런퍼셉트론.jpg','천재_p14_뉴런퍼셉트론.jpg']},
  {v:'perceptron', k:'활성화함수', h:/활성화\s?함수|계단|임곗값/,
   fs:['씨마스1_p10_활성화함수.jpg','미래엔_p19_활성화함수.jpg','천재_p15_활성화함수.jpg']},
  {v:'perceptron', k:'XOR과 다층퍼셉트론', h:/XOR|다층|은닉/,
   fs:['씨마스1_p17_XOR다층.jpg','동아1_p23_XOR다층.jpg','미래엔_p30_XOR다층.jpg','천재_p20_XOR다층.jpg']},

  {v:'bias', k:'빅데이터의 특성(5V)', h:/빅데이터|5V/,
   fs:['씨마스1_p28_빅데이터5V.jpg','동아1_p31_빅데이터5V.jpg','미래엔_p34_빅데이터5V.jpg','천재_p26_빅데이터5V.jpg']},
  {v:'bias', k:'데이터 편향', h:/편향|공정/,
   fs:['씨마스1_p33_편향.jpg','동아1_p35_편향.jpg','미래엔_p38_편향.jpg','천재_p29_편향.jpg']},
];

function aimTbFigHTML(f){
  const m=String(f).match(/^([^_]+)_p(\d+)_/);
  const pub=(m&&AIM_TB_PUB[m[1]])||'교과서';
  const pg=m?('p.'+m[2]):'';
  return '<figure class="tbshot">'+
    '<img src="assets/textbook-local/'+encodeURIComponent(f)+'" alt="교과서 지면(수업용)" loading="lazy" '+
    'onerror="var f=this.closest(\'.tbshot\');if(f&&f.parentNode)f.parentNode.removeChild(f);">'+
    '<figcaption>'+cmnEsc(pub)+' '+pg+' <span class="src">교과서 지면(수업용) — 공개 게시하지 않습니다.</span></figcaption></figure>';
}

function aimTextbookShots(){
  const byView={};
  AIM_TBSHOTS.forEach(s=>{
    const view=document.getElementById('v-'+s.v);
    if(!view) return;
    // 개념에 맞는 카드를 찾아 그 안에 붙이고, 못 찾으면 뷰 하단 모음 카드로 보냅니다.
    let host=null;
    view.querySelectorAll('.card,.info').forEach(c=>{
      if(host||c.classList.contains('tbbox')) return;
      const h=c.querySelector('h3,h4,strong');
      if(h&&s.h.test(h.textContent||'')&&!c.querySelector('.tbshot-row')) host=c;
    });
    const row='<div class="tbshot-head">교과서로 확인하기 — '+cmnEsc(s.k)+'</div>'+
      '<div class="tbshot-row">'+s.fs.map(aimTbFigHTML).join('')+'</div>';
    if(host){
      const d=document.createElement('div');
      d.className='tbshot-wrap';
      d.innerHTML=row;
      host.appendChild(d);
    }else{
      (byView[s.v]=byView[s.v]||[]).push(row);
    }
  });
  Object.keys(byView).forEach(v=>{
    const view=document.getElementById('v-'+v);
    if(!view||view.querySelector('.tbbox')) return;
    const card=document.createElement('div');
    card.className='card tbbox';
    card.innerHTML='<h3>교과서로 확인하기 — 네 출판사는 이 개념을 어떻게 설명할까</h3>'+
      '<p>같은 개념을 서로 다른 교과서가 어떤 그림과 말로 설명하는지 비교해 보세요. '+
      '수업용 자료이므로 공개 게시하지 않습니다.</p>'+byView[v].join('');
    // 학습지·프로젝트 과제 앞에 놓습니다.
    const anchor=view.querySelector('.pj')||view.querySelector('.ws');
    if(anchor) view.insertBefore(card,anchor); else view.appendChild(card);
  });
}

(function aimInitShell(){
  // 한 곳이 실패해도 나머지가 살아 있도록 각각 독립적으로 감쌉니다.
  const boot=()=>{
    try{ aimTextbookShots(); }catch(e){}
    try{ aimBuildNav(); }catch(e){ console.error('aimBuildNav',e); }
    try{ aimBuildHome(); }catch(e){ console.error('aimBuildHome',e); }
    try{ aimBuildMarks(); }catch(e){ console.error('aimBuildMarks',e); }
    try{ aimRefExtrasAll(); }catch(e){ console.error('aimRefExtrasAll',e); }
    try{ aimNavSync(currentView); }catch(e){}
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();


/* ═══════════════════════════════════════════════════════════════════════════
   학습지 섹션 공통 (§20) — 인쇄 · 교사 링크 추가
   ═══════════════════════════════════════════════════════════════════════════ */

/* 학습지 지면(.ws-sheet)만 A4로 인쇄합니다. */
function wsPrint(sheetId){
  const sheet=document.getElementById(sheetId);
  if(!sheet) return;
  document.body.classList.add('ws-printing');
  sheet.classList.add('printing');
  const cleanup=()=>{
    document.body.classList.remove('ws-printing');
    sheet.classList.remove('printing');
    window.removeEventListener('afterprint',cleanup);
  };
  window.addEventListener('afterprint',cleanup);
  setTimeout(()=>{ try{window.print();}catch(e){cleanup();} },30);
}

/* 교사가 자기 학습지 링크(구글 드라이브 등)를 걸 수 있는 슬롯 */
function wsLinks(cid, slug){
  const box=document.getElementById(cid);
  if(!box) return;
  const KEY='aimath.'+slug+'.wslinks';
  const load=()=>{ try{const a=JSON.parse(cmnGet(KEY,'[]'));return Array.isArray(a)?a:[];}catch(e){return [];} };
  const save=a=>cmnSet(KEY,JSON.stringify(a));

  function render(){
    const arr=load();
    box.innerHTML='<div class="ws-links"></div>'+
      '<div class="ws-add"><input class="cmn-in ws-u" type="url" placeholder="https://... (학습지 주소)">'+
      '<input class="cmn-in ws-t" type="text" placeholder="학습지 제목(선택)">'+
      '<button class="btn cmn-go ws-ok" type="button">추가</button>'+
      '<button class="btn cmn-go ws-no" type="button">취소</button></div>'+
      '<div class="btn-row"><button class="btn cmn-go ws-open" type="button">+ 학습지 링크 추가</button></div>'+
      '<p class="cmn-note">교사용 — 추가한 링크는 이 기기에만 저장됩니다.</p>';
    const list=box.querySelector('.ws-links');
    const form=box.querySelector('.ws-add');
    const note=box.querySelector('.cmn-note');
    arr.forEach((it,i)=>{
      const row=document.createElement('div');
      row.className='ws-link';
      row.innerHTML='<span aria-hidden="true">📄</span>'+
        '<a href="'+cmnEsc(it.u)+'" target="_blank" rel="noopener">'+cmnEsc(it.t||it.u)+' ↗</a>'+
        '<button type="button" title="삭제">✕</button>';
      row.querySelector('button').addEventListener('click',()=>{
        const a=load(); a.splice(i,1); save(a); render();
      });
      list.appendChild(row);
    });
    box.querySelector('.ws-open').addEventListener('click',()=>{
      form.classList.add('on');
      const u=form.querySelector('.ws-u'); if(u) u.focus();
    });
    box.querySelector('.ws-no').addEventListener('click',()=>{ form.classList.remove('on'); });
    box.querySelector('.ws-ok').addEventListener('click',()=>{
      const u=form.querySelector('.ws-u').value.trim();
      const t=form.querySelector('.ws-t').value.trim();
      if(!/^https?:\/\//i.test(u)){ note.textContent='http 또는 https 로 시작하는 주소를 입력해 주세요.'; return; }
      const a=load(); a.push({u:u,t:t}); save(a); render();
    });
  }
  render();
}


/* ═════════ 2차시 보강 · 작업 1 — k-means 단계 라벨 · 예시 계산 · 단계 로그 ═════════
   (mlKmStep 등 기존 함수 안에서 이 함수들을 호출하도록 좁은 범위로 별도 편집합니다) */
let mlKmLog=[], mlKmExCluster=0;

function mlKmPhase(label,cls){
  const el=document.getElementById('ml-km-phase');
  if(!el) return;
  el.textContent=label;
  el.className='ml-km-phase'+(cls?(' '+cls):'');
}

function mlKmExampleAssign(rows){
  const box=document.getElementById('ml-km-ex');
  if(!box||!rows||!rows.length) return;
  let ex=rows[0],spread=-1;
  rows.forEach(r=>{
    const mx=Math.max.apply(null,r.ds),mn=Math.min.apply(null,r.ds);
    if(mx-mn>spread){spread=mx-mn;ex=r;}
  });
  mlKmExCluster=ex.best;
  let tbl='<div class="ml-scroll"><table class="ml-tbl"><tr><th>점</th>';
  for(let j=0;j<mlKmKn;j++) tbl+=`<th>중심 ${j+1}까지</th>`;
  tbl+='</tr><tr><td>P('+mlKmN(ex.x)+', '+mlKmN(ex.y)+')</td>';
  ex.ds.forEach((d,j)=>{ tbl+=`<td${j===ex.best?' style="color:var(--green);font-weight:700;"':''}>${d.toFixed(2)}</td>`; });
  tbl+='</tr></table></div>';
  const sentence=`점 P(${mlKmN(ex.x)}, ${mlKmN(ex.y)})에서 `+
    ex.ds.map((d,j)=>`중심 ${j+1}까지 ${d.toFixed(2)}`).join(', ')+
    ` — 거리가 가장 짧은 것은 중심 ${ex.best+1}이므로, 이 점은 `+
    `<b style="color:var(--green);">중심 ${ex.best+1}에 배정</b>됩니다.`;
  box.innerHTML='<p class="fx-ttl">예시로 점 하나를 계산해 봅시다 — d = √((x₁−x₂)² + (y₁−y₂)²)</p>'+
    tbl+'<p class="fx-line">'+sentence+'</p>';
}

function mlKmExampleUpdate(from,to){
  const box=document.getElementById('ml-km-ex');
  if(!box) return;
  const j=mlKmExCluster;
  const ms=mlKmPts.filter(p=>p.c===j);
  if(!to[j]||ms.length===0) return;
  const xs=ms.map(p=>mlKmN(p.x)).join('+');
  const ys=ms.map(p=>mlKmN(p.y)).join('+');
  box.innerHTML+='<p class="fx-ttl" style="margin-top:0.6rem;">중심 '+(j+1)+'의 갱신 — (x̄, ȳ) = (Σxᵢ/n, Σyᵢ/n)</p>'+
    '<p class="fx-line">중심 '+(j+1)+'에 속한 점 '+ms.length+'개의 평균을 냅니다. '+
    'x̄ = ('+xs+') ÷ '+ms.length+' = '+to[j].x.toFixed(2)+', ȳ = ('+ys+') ÷ '+ms.length+' = '+to[j].y.toFixed(2)+
    ' → 중심이 ('+from[j].x.toFixed(2)+', '+from[j].y.toFixed(2)+')에서 ('+to[j].x.toFixed(2)+', '+to[j].y.toFixed(2)+')로 이동했습니다.</p>';
}

function mlKmRenderLog(){
  const box=document.getElementById('ml-km-log');
  if(!box) return;
  if(mlKmLog.length===0){
    box.innerHTML='<tr><td colspan="3" style="color:var(--muted);">아직 실행한 스텝이 없습니다.</td></tr>';
  }else{
    let h='<tr><th>반복</th><th>배정 → 갱신</th><th>중심 이동(최대)</th></tr>';
    mlKmLog.forEach(r=>{ h+=`<tr><td>${r.iter}</td><td>${r.msg}</td><td>${r.mv}</td></tr>`; });
    box.innerHTML=h;
  }
  const bx=document.getElementById('ml-km-logbox');
  if(bx) bx.scrollTop=bx.scrollHeight;
}

function mlKmLogPush(iter,mv){
  mlKmLog.push({iter:iter,msg:(mv<0.01?'배정 → 갱신 (중심 이동 없음 · 수렴)':'배정 → 갱신'),mv:mv.toFixed(2)});
  mlKmRenderLog();
}

function mlKmLogReset(){
  mlKmLog=[];
  mlKmRenderLog();
  mlKmPhase('아직 시작하지 않았습니다','');
  const ex=document.getElementById('ml-km-ex');
  if(ex) ex.innerHTML='';
}


/* ═════════ 2차시 보강 · 작업 2 — 밴딧 탐험/활용 판정 · 4단계 사이클 · 배지 ═════════ */
function mlBdJudge(i,prevN,prevS){
  let bestI=-1,bestR=-1;
  for(let k=0;k<3;k++){
    if(prevN[k]>0){
      const r=prevS[k]/prevN[k];
      if(r>bestR){bestR=r;bestI=k;}
    }
  }
  return (bestI===i && prevN[i]>0) ? 'exploit' : 'explore';
}

function mlBdCycleStage(stage){
  const box=document.getElementById('ml-bd-cycle');
  if(!box) return;
  box.querySelectorAll('.cy-step').forEach(el=>{
    el.classList.toggle('on',Number(el.dataset.k)===stage);
  });
}

function mlBdCyclePlay(){
  [[1,0],[2,180],[3,380],[4,580],[1,900]].forEach(([s,t])=>{
    setTimeout(()=>mlBdCycleStage(s),t);
  });
}

function mlBdBadge(kind){
  const el=document.getElementById('ml-bd-badge');
  if(!el) return;
  if(kind==='exploit'){
    el.textContent='지금 당신은 [활용] 중 — 보상률이 가장 높아 보이는 선택을 반복합니다';
    el.className='ml-badge exploit';
  }else{
    el.textContent='지금 당신은 [탐험] 중 — 아직 덜 눌러 본 선택지를 시도합니다';
    el.className='ml-badge explore';
  }
}


/* ═════════ 2차시 보강 · 작업 4 — 학습지 섹션 교사 링크 슬롯 초기화 ═════════ */
(()=>{
  const root=document.getElementById('v-mlplay');
  if(!root) return;
  if(typeof wsLinks==='function') wsLinks('ml-wslinks','mlplay');
})();


/* ●●● ANCHOR-MLPLAY ●●● (2차시 보강 코드는 이 줄 바로 위에 붙입니다) */

/* ── 8. 학습지 섹션(§20) — 교사 학습지 링크 슬롯 초기화 ── */
(()=>{
  const root=document.getElementById('v-logic');
  if(!root) return;
  if(typeof wsLinks==='function') wsLinks('lg-wslinks','logic');
})();

/* ●●● ANCHOR-LOGIC ●●● (3차시 보강 코드는 이 줄 바로 위에 붙입니다) */

/* ── 4·5차시 — 학습지 섹션(§20) — 교사 학습지 링크 슬롯 초기화 ── */
(()=>{
  const pcxRoot=document.getElementById('v-perceptron');
  if(pcxRoot && typeof wsLinks==='function') wsLinks('pcx-wslinks','perceptron');
  const bsRoot=document.getElementById('v-bias');
  if(bsRoot && typeof wsLinks==='function') wsLinks('bs-wslinks','bias');
})();

/* ●●● ANCHOR-PCXBS ●●● (4·5차시 보강 코드는 이 줄 바로 위에 붙입니다) */

/* ═════════ 1차시 — 생활 속 AI 사례 4종 (§22) ═════════
   영상 ID는 firecrawl 검색으로 찾은 뒤 img.youtube.com/vi/<ID>/hqdefault.jpg 200 과
   youtube oembed 응답(제목·채널)까지 확인한 것만 실었습니다. */
const IT_LIFE=[
  {k:'번역', em:'🌐', t:'기계 번역',
   io:'입력 = 한국어 문장 · 출력 = 영어 문장',
   d:'파파고·구글 번역은 문장을 숫자 벡터로 바꾼 뒤, 다음에 올 낱말을 확률로 골라 새 문장을 만듭니다. '
     +'예전에는 사람이 문법 규칙을 적어 넣었지만, 지금은 수많은 번역 쌍에서 규칙을 스스로 찾습니다.',
   vid:'5GXz1uhQMa0', vt:'인공지능 구글 번역기는 어떻게 번역할까?', vs:'닷페이스',
   q:'기계번역 원리'},
  {k:'생체', em:'🔓', t:'얼굴·지문 잠금 해제',
   io:'입력 = 얼굴·지문 사진 · 출력 = 본인 여부(참/거짓)',
   d:'카메라와 센서가 읽어 들인 사진을 수백 개의 수(특징)로 바꾸고, 저장해 둔 내 특징과 얼마나 가까운지를 '
     +'거리로 재어 판단합니다. 13차시의 해밍 거리와 같은 발상입니다.',
   vid:'9CXI4nxj7jU', vt:'아이폰이 얼굴로 잠금 해제하는 원리', vs:'닷페이스',
   q:'얼굴 인식 원리'},
  {k:'음성', em:'🔊', t:'인공지능 스피커',
   io:'입력 = 소리 파형 · 출력 = 글자, 그리고 명령',
   d:'소리의 파형을 잘게 잘라 수의 배열로 바꾼 뒤, 그 배열에 가장 어울리는 글자를 확률로 고릅니다. '
     +'같은 말이라도 목소리마다 파형이 다르므로, 규칙을 적는 대신 데이터로 학습시킵니다.',
   vid:'z3hNBhvkHG0', vt:'사람 말을 알아듣는 음성인식 기술 원리', vs:'안될공학',
   q:'음성 인식 원리'},
  {k:'추천', em:'🎬', t:'영상 추천',
   io:'입력 = 내가 본 영상 기록 · 출력 = 다음에 볼 영상 목록',
   d:'나와 비슷한 기록을 가진 사람들이 좋아한 영상을 찾아 순서를 매깁니다. '
     +'"비슷하다"를 재는 자가 곧 유사도이며, 11차시에서 이 계산을 직접 해 봅니다.',
   vid:'1gSOrChJ9xY', vt:'유튜브 알고리즘의 원리 (Feat. 머신 러닝)', vs:'LG디스플레이 디플',
   q:'유튜브 추천 알고리즘 원리'},
];

function itLifeRender(){
  const grid=document.getElementById('it-life');
  const panel=document.getElementById('it-life-panel');
  if(!grid||!panel) return;
  grid.innerHTML=IT_LIFE.map((c,i)=>
    '<button class="lai" type="button" data-i="'+i+'">'+
      '<span class="em" aria-hidden="true">'+c.em+'</span>'+
      '<b>'+cmnEsc(c.t)+'</b><span class="io">'+cmnEsc(c.io)+'</span></button>').join('');
  let open=-1;
  grid.querySelectorAll('.lai').forEach(b=>{
    b.addEventListener('click',()=>{
      const i=+b.dataset.i;
      grid.querySelectorAll('.lai').forEach(x=>x.classList.remove('on'));
      if(open===i){ open=-1; panel.classList.remove('on'); panel.innerHTML=''; return; }
      open=i; b.classList.add('on');
      const c=IT_LIFE[i];
      panel.innerHTML='<h4>'+cmnEsc(c.t)+' — 입력과 출력을 잇는 함수 f</h4>'+
        '<p>'+cmnEsc(c.d)+'</p>'+
        '<div class="cmn-vd-grid" style="grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));"></div>';
      const g=panel.querySelector('.cmn-vd-grid');
      if(c.vid){
        const card=document.createElement('button');
        card.type='button'; card.className='cmn-vd-card';
        card.innerHTML='<div class="cmn-vd-thumb">'+
            '<img src="https://img.youtube.com/vi/'+c.vid+'/hqdefault.jpg" alt="" loading="lazy" '+
            'referrerpolicy="no-referrer" onerror="this.style.display=\'none\';'+
            'this.parentElement.insertAdjacentText(\'beforeend\',\'🎬\');">'+
            '<span class="cmn-vd-play">▶</span></div>'+
          '<div class="cmn-vd-meta"><b>'+cmnEsc(c.vt)+'</b><span>'+cmnEsc(c.vs)+'</span></div>';
        card.addEventListener('click',()=>cmnPlay(c.vid,c.vt));
        g.appendChild(card);
      }
      const more=document.createElement('a');
      more.className='cmn-vd-card';
      more.href='https://www.youtube.com/results?search_query='+encodeURIComponent(c.q);
      more.target='_blank'; more.rel='noopener';
      more.style.textDecoration='none';
      more.innerHTML='<div class="cmn-vd-thumb"><span class="cmn-vd-emo" aria-hidden="true">🔎</span>'+
          '<span class="cmn-vd-badge">검색</span></div>'+
        '<div class="cmn-vd-meta"><b>「'+cmnEsc(c.q)+'」 영상 더 찾기</b><span>유튜브 새 탭에서 열림</span></div>';
      g.appendChild(more);
      panel.classList.add('on');
    });
  });
}

(function itInitExtra(){
  const boot=()=>{
    if(!document.getElementById('v-intro')) return;
    try{ itLifeRender(); }catch(e){}
    if(typeof wsLinks==='function') wsLinks('it-wslinks','intro');
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();

/* ●●● ANCHOR-INTRO ●●● (1차시 보강 코드는 이 줄 바로 위에 붙입니다) */

(function startRouter(){
  const start=()=>{
    const raw=(location.hash||'#home').replace('#','');
    const v=(raw && document.getElementById('v-'+raw))?raw:'home';
    go(v,false);
    try{history.replaceState({view:v},'', '#'+v);}catch(e){}
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start,0);
})();


/* ══════════ 2단원 text 뷰 코드 (unit2_build/text/core-snippet.js) ══════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   2단원 6~7차시 · text 뷰 (views/text.html)
     6차시 「텍스트를 집합으로」 접두사 tp / TP_
     7차시 「텍스트를 벡터로」  접두사 tv / TV_
     두 차시 공용                접두사 tx / TX_
   ───────────────────────────────────────────────────────────────────────────
   · core.js 맨 끝(startRouter IIFE 뒤)에 통째로 붙입니다.
   · 붙이기 전에 core.js 의 기존 ttab / oh* / bow* 블록을 삭제합니다(INTEGRATION.md A-2).
   · 공통 컴포넌트(videoDeck·warmStepper·quizStepper·chipDefs·wsPrint·wsLinks·
     initToggles·aimRefExtrasAll)는 호출만 하고 수정하지 않습니다.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ───────── 공용 텍스트 처리 엔진 (6·7·8·10차시가 함께 씁니다 — 중복 구현 금지) ───────── */

/* 문장 부호 제거 후 공백 분리 (패들렛 text_set.html / text_vector.html tokenize 계승) */
function tokenize(text){
  return String(text == null ? '' : text)
    .replace(/[.,!?;:'"()\[\]{}·…~！？、，]/g, ' ')
    .split(/\s+/)
    .filter(function (w) { return w.length > 0; });
}

/* 어말에 붙은 불용어를 긴 것부터 반복 제거 (원본 removeStopwordsFromWord 계승) */
function txStripSuffix(word, stops){
  var sorted = (stops || []).slice().sort(function (a, b) { return b.length - a.length; });
  var base = String(word || ''), suf = [], changed = true, i;
  while (changed) {
    changed = false;
    for (i = 0; i < sorted.length; i++) {
      var sw = sorted[i];
      if (sw && base.length > sw.length && base.slice(-sw.length) === sw) {
        base = base.slice(0, -sw.length);
        suf.unshift(sw);
        changed = true;
        break;
      }
    }
  }
  return { base: base, suf: suf };
}
function removeStopwordsFromWord(word, stops){ return txStripSuffix(word, stops).base; }

/* 여러 문서의 단어집합을 합쳐 전체집합 U 를 만듭니다.
   order:'corpus' 문서 등장 순서 · 'ko' 가나다순 · 'fixed' 교과서 지면 순서(fixed 배열) */
function buildUniverse(docs, opt){
  var o = opt || {}, all = [], i, j;
  for (i = 0; i < (docs || []).length; i++) {
    var d = docs[i] || [];
    for (j = 0; j < d.length; j++) if (all.indexOf(d[j]) < 0) all.push(d[j]);
  }
  if (o.order === 'ko') {
    all.sort(function (a, b) { return a.localeCompare(b, 'ko'); });
  } else if (o.order === 'fixed' && Array.isArray(o.fixed)) {
    var head = o.fixed.filter(function (w) { return all.indexOf(w) >= 0; });
    var tail = all.filter(function (w) { return head.indexOf(w) < 0; })
                  .sort(function (a, b) { return a.localeCompare(b, 'ko'); });
    all = head.concat(tail);
  }
  return all;
}

/* 단어 목록의 빈도수. U 를 주면 U 순서의 성분 배열을, 주지 않으면 빈도 객체를 돌려줍니다. */
function countFrequency(words, U){
  var f = {}, i;
  for (i = 0; i < (words || []).length; i++) f[words[i]] = (f[words[i]] || 0) + 1;
  if (!Array.isArray(U)) return f;
  return U.map(function (w) { return f[w] || 0; });
}

/* ───────── tx 공용 유틸 ───────── */

function txEsc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function txGet(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
function txSet(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
function txJson(k){ try { var a = JSON.parse(txGet(k, '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function txEl(id){ return document.getElementById(id); }
function txCalm(){
  try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { return false; }
}
function txFb(id, ok, msg, extra){
  var el = txEl(id);
  if (!el) return;
  el.className = 'tx-fb ' + (ok === null ? '' : (ok ? 'ok' : 'no'));
  el.innerHTML = (ok === null ? '' : (ok ? '✓ ' : '✗ ')) + msg +
    (extra ? '<span class="x">' + extra + '</span>' : '');
}
function txScrollTo(el){
  if (!el) return;
  try { el.scrollIntoView({ behavior: txCalm() ? 'auto' : 'smooth', block: 'start' }); }
  catch (e) { el.scrollIntoView(); }
}

/* 6·7차시 공통 localStorage 키 (설계서 §0-3 #11·#12) */
var TX_CORPUS_KEY = 'aimath.corpus.mysent';
var TX_CLASS_KEY  = 'aimath.classroom.url';
var TX_LESSON_KEY = 'aimath.text.lesson';

/* 학급 자료함 키 호환 — 설계서는 aimath.classroom.url, 공통 컴포넌트(core.js aimRefExtras)는
   aimath.shared.folder 를 씁니다. 값이 있는 쪽을 다른 쪽으로 한 번 복사해 둘을 맞춥니다. */
function txClassSync(){
  var a = txGet(TX_CLASS_KEY, ''), b = txGet('aimath.shared.folder', '');
  if (a && !b) txSet('aimath.shared.folder', a);
  else if (b && !a) txSet(TX_CLASS_KEY, b);
  return a || b || '';
}

/* 말뭉치(우리 반 문장) 읽기·쓰기 — 6차시 활동 ①, 7차시 도입이 같은 키를 씁니다. */
function txCorpusLoad(){
  var a = txJson(TX_CORPUS_KEY);
  return a.filter(function (it) { return it && typeof it.t === 'string' && it.t.trim(); });
}
function txCorpusSave(arr){ txSet(TX_CORPUS_KEY, JSON.stringify(arr || [])); }
function txCorpusAdd(text, shot, mine){
  var a = txCorpusLoad();
  a.push({ t: String(text || '').trim(), s: shot || 0, m: !!mine });
  txCorpusSave(a);
  return a;
}

/* ───────── 차시 전환 · 탭 라우팅 ───────── */

var txLessonCur = 6;

function txLesson(n){
  var s6 = txEl('tp-root'), s7 = txEl('tv-root');
  if (!s6 || !s7) return;
  var on7 = (String(n) === '7');
  s6.classList.toggle('on', !on7);
  s7.classList.toggle('on', on7);
  var c6 = txEl('tx-l6'), c7 = txEl('tx-l7');
  if (c6) c6.classList.toggle('on', !on7);
  if (c7) c7.classList.toggle('on', on7);
  txLessonCur = on7 ? 7 : 6;
  txSet(TX_LESSON_KEY, String(txLessonCur));
  var cur = txEl('nav-cur');
  if (cur) cur.textContent = on7
    ? '7차시 · 텍스트를 벡터로 — 포함관계·원-핫·빈도수'
    : '6차시 · 텍스트를 집합으로 — 전처리와 단어집합';
  var view = txEl('v-text');
  if (view && typeof initToggles === 'function') { try { initToggles(view); } catch (e) {} }
  if (on7) { try { tvInit(); } catch (e) {} } else { try { tpInit(); } catch (e) {} }
}

/* 설계서 §0-3 #1 의 확정 탭 순서를 그대로 유지하는 호환 진입점
   ttab(0)=[전처리](6차시) · ttab(1)=[포함관계] · ttab(2)=[원-핫] · ttab(3)=[빈도수] · ttab(4)=[희소vs밀집] */
function ttab(n, el){
  var i = parseInt(n, 10); if (isNaN(i)) i = 0;
  if (i <= 0) { txLesson(6); tpTab(1); }
  else { txLesson(7); tvTab(Math.min(i, 4) - 1); }
  if (el && el.classList) el.classList.add('on');
}

/* go('text','pre') 처럼 앵커로 들어오는 호출 — 설계서 §0-3 #2 표기를 그대로 지원 */
var TX_ANCHOR = { pre: 0, incl: 1, onehot: 2, freq: 3, sparse: 4, '6': 0, '7': 1 };
function txOpen(anchor){
  var k = String(anchor || '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(TX_ANCHOR, k)) ttab(TX_ANCHOR[k]);
}

/* ───────── 6차시 데이터 ───────── */

/* 기본 사전형 규칙 사전 — 교사가 이 상수 한 곳만 고쳐 늘릴 수 있습니다(설계서 §8-2). */
var TP_LEMMA = {
  '좋아요': '좋다', '좋아': '좋다', '좋은': '좋다', '좋고': '좋다',
  '가벼워서': '가볍다', '가벼운': '가볍다', '많아요': '많다', '많은': '많다',
  '커서': '크다', '큰': '크다', '크기': '크다',
  '빨라요': '빠르다', '빠른': '빠르다', '빨랐습니다': '빠르다',
  '만족합니다': '만족', '만족해요': '만족', '만족스러운': '만족',
  '감동했습니다': '감동하다', '감동적인': '감동하다',
  '불편한': '불편하다', '따뜻한': '따뜻하다', '찾아가고': '찾아가다', '소중해질': '소중하다',
  '예뻐요': '예쁘다', '먹는다': '먹다',
  '깨끗한': '깨끗하다', '깨끗하고': '깨끗하다',
  '이런': '이', '있다면': '있다', '있었습니다': '있다', '싶습니다': '싶다',
  '편의점에서': '편의점', '열쇠이며': '열쇠', '열쇠이다': '열쇠',
  '캠핑장에서': '캠핑장', '착용하세요': '착용', '증가하니': '증가'
};

var TP_STOP_BASE = ['은','는','이','가','을','를','의','에','와','과','도','로','으로','에서','까지','부터','이다','이며'];

var TP_PRESETS = [
  { k: 'chicken', ico: '🍗', n: '치킨', note: '교사 시범용',
    docs: ['나는 치킨을 좋아하고 치킨을 먹고 또 치킨을 먹는다'],
    stops: ['은','는','이','가'], uMode: 'corpus', uLabel: '문서 등장 순서' },
  { k: 'math', ico: '🔑', n: '수학·인공지능', note: '표준 예시',
    docs: ['수학 탐구는 수학 사고의 열쇠이며, 수학은 성장의 열쇠이다.',
           '수학 기반 인공지능은 인공지능 사고의 열쇠이며, 인공지능은 성장의 열쇠이다.'],
    stops: ['는','의','은'], uMode: 'ko', uLabel: '가나다순 (이 예시는 교과서 순서와 같습니다)' },
  { k: 'note', ico: '💻', n: '노트북 후기', note: '동아 Ⅱ p.48',
    docs: ['이 노트북은 디자인이 좋아요.', '이 노트북은 가벼워서 만족합니다.', '화면이 커서 만족해요. 배송도 빨라요.'],
    stops: ['이','은','가','도'], uMode: 'fixed',
    uFixed: ['노트북','디자인','좋다','가볍다','만족','화면','크다','배송','빠르다'],
    uLabel: '교과서 등장 순서 (동아 Ⅱ p.48)' },
  { k: 'conv', ico: '📚', n: '불편한 편의점', note: '씨마스 Ⅱ p.48',
    docs: ['불편한 편의점의 따뜻한 이야기에 감동했습니다.', '이런 불편한 편의점이 있다면 찾아가고 싶습니다.',
           '불편한 편의점에서 불편한 일상이 소중해질 수 있었습니다.'],
    stops: ['의','에','이','있다','싶다','수'], uMode: 'fixed',
    uFixed: ['불편하다','편의점','따뜻하다','이야기','감동하다','찾아가다','일상','소중하다'],
    uLabel: '교과서 등장 순서 (씨마스 Ⅱ p.48)' }
];

var TP_SHOTS = [
  { n: 1, cap: '다친 친구에게 뭐라고 말할까요?', alt: '축구 골대 앞에서 무릎이 까진 친구 곁에 말을 거는 친구',
    demo: '무릎에서 피가 나는데 많이 아프지 않니 괜찮아' },
  { n: 2, cap: '메뉴를 고르며 나눈 대화는?', alt: '중식당 좌석에서 메뉴판을 함께 펼쳐 보며 웃는 두 학생',
    demo: '오늘은 짜장면 말고 짬뽕을 시켜 보는 게 어떨까' },
  { n: 3, cap: '버스를 기다리며 속으로 한 생각은?', alt: '시골 버스 정류장에서 시계를 보며 초조한 표정의 학생',
    demo: '버스가 벌써 이십 분이나 늦어서 지각할 것 같다' },
  { n: 4, cap: '이 상황에서 던진 한마디는?', alt: '교실 책상에서 공부하는 친구가 게임하는 친구를 가리키는 장면',
    demo: '시험이 내일인데 게임만 하고 있으면 어떻게 하니' },
  { n: 5, cap: '이 순간의 외침은?', alt: '야구 타석에서 배트를 힘껏 휘두르는 선수',
    demo: '이번 공은 반드시 담장을 넘겨 버리겠다 힘껏 휘둘러' }
];

var TP_ORDER_ANS = ['문장 부호 제거·어절 분리', '기본 사전형 단어로 바꾸기', '불용어 제거', '중복 제거해 집합 만들기'];

var TP_VIDEOS = [
  { id: 'rJdhXFt1CQ8', t: '3. 텍스트 자료의 표현 (10:46)', s: 'mathT야나수 · 주 디딤영상' },
  { id: 'MP8XHFsBmC8', t: '【인공지능수학-미래엔】제3강 Ⅱ.자료의 표현┃1.텍스트 자료의 표현(P28~32) (9:36)', s: '중구쌤TV · 교과서 쪽수 연동' },
  { id: 'sk7V8LyrSRA', t: 'R을 활용한 텍스트마이닝 - (2) 토큰화(Tokenization)  [심화·선택]', s: '통계파랑 · 어절 분리 절차 심화' }
];

var TP_WARM = [
  { q: '다음 설명이 옳으면 O, 옳지 않으면 X를 고르세요 — "컴퓨터는 「나는 치킨을 좋아한다」라는 문장을 읽고 뜻을 먼저 이해한 다음 계산을 시작한다."',
    opts: ['O', 'X'], answer: 1,
    explain: '사람은 문장을 보는 순간 뜻을 알지만, 컴퓨터에게 이 문장은 그저 글자 코드가 이어진 줄일 뿐입니다. ' +
      '그래서 인공지능은 뜻을 이해하는 대신, 문장을 <b>단어로 자르고 → 수와 수학 기호로 바꾼 뒤</b> 계산합니다. ' +
      '오늘 배우는 전처리가 바로 그 첫 단계입니다. (씨마스 교과서 Ⅱ p.47 서술을 재구성)' },
  { q: '문서 A "수학 탐구는 수학 사고의 열쇠이며, 수학은 성장의 열쇠이다."에서 뽑아낸 단어들을 집합으로 나타낼 때, \'수학\'은 몇 번 적힐까요?',
    opts: ['① 3번 — 나온 횟수만큼 적는다', '② 1번 — 한 번만 적는다', '③ 0번 — 자주 나오면 오히려 뺀다'], answer: 1,
    explain: '집합은 <b>같은 원소를 중복해서 나열하지 않는</b> 성질이 있습니다. 그래서 <code>A = {수학, 탐구, 사고, 열쇠, 성장}</code> 처럼 ' +
      '\'수학\'은 딱 한 번만 적습니다. 이 성질이 편리하기도 하지만 아쉽기도 합니다. <b>"몇 번 나왔는지"를 잃어버리기 때문</b>입니다. ' +
      '그 아쉬움을 푸는 것이 7차시의 빈도수 벡터입니다. ' +
      '<br>· ①을 골랐다면 — 나온 순서와 횟수를 그대로 적은 것은 <b>어절을 분리한 결과</b>이지 집합이 아닙니다. 집합으로 묶는 순간 중복이 사라집니다. ' +
      '<br>· ③을 골랐다면 — 자주 나온다고 빼지는 않습니다. 다만 <b>모든 문서에 다 나오는 단어</b>라면 불용어로 정할 수는 있습니다(질문 3에서 확인). ' +
      '(씨마스 교과서 Ⅱ p.48~49 서술을 재구성)' },
  { q: '교복에 대한 학생 댓글 100개를 분석합니다. "이 분석에서는 \'교복\'이라는 단어를 불용어로 정해서 빼 버릴 수도 있다." — 옳으면 O, 옳지 않으면 X.',
    opts: ['O', 'X'], answer: 0,
    explain: '불용어는 <code>은/는/이/가</code> 처럼 정해진 목록만 뜻하지 않습니다. <b>분석 목적에 따라 사용자가 정하는 것</b>입니다. ' +
      '100개 댓글이 전부 교복 이야기라면 \'교복\'은 어느 댓글에나 들어 있어서 <b>댓글끼리 구별해 주지 못합니다.</b> ' +
      '이런 단어는 빼는 편이 분석에 유리할 수 있습니다. 오늘 활동 ②에서 불용어 칩을 직접 켜고 끄며 이 판단을 해 봅니다. ' +
      '<br>· X를 골랐다면 — 불용어를 조사·관사로만 한정하면 이런 경우를 설명할 수 없습니다. 불용어 목록은 <b>분석 프로그램마다, 목적마다 다릅니다.</b> ' +
      '(미래엔 「인공지능 수학」 Ⅱ \'참고\'란 서술을 재구성)' }
];

var TP_QUIZ = [
  { q: '다음은 텍스트 데이터 전처리의 네 단계입니다. 순서를 바르게 나열한 것은? (㉠ 불용어를 제거하고 목적에 맞는 단어를 추출한다 / ㉡ 띄어쓰기를 기준으로 어절로 분리한다 / ㉢ 숫자·문장 부호 등 불필요한 기호를 제거한다 / ㉣ 각 어절을 기본 사전형 단어로 바꾼다)',
    opts: ['① ㉢ → ㉡ → ㉣ → ㉠', '② ㉡ → ㉢ → ㉠ → ㉣', '③ ㉠ → ㉢ → ㉡ → ㉣', '④ ㉣ → ㉡ → ㉢ → ㉠'], answer: 0,
    explain: '전처리는 <b>㉢ 기호 제거 → ㉡ 어절 분리 → ㉣ 사전형 변형 → ㉠ 불용어 제거·단어 추출</b> 순으로 진행합니다. ' +
      '사전형으로 바꾸기 <b>전에</b> 어절로 나누어야 하고, 불용어 제거는 사전형이 정해진 <b>뒤에</b> 해야 정확합니다. ' +
      '(활동 ② 파이프라인의 ②·③단계에서 직접 확인했습니다.)' },
  { q: '후기 A "이 노트북은 디자인이 좋아요."에서 불용어 {이, 은, 가, 도}를 제거하고 남은 단어를 원소로 하는 단어집합 A로 옳은 것은?',
    opts: ['① A = {이, 노트북, 은, 디자인, 이, 좋다}', '② A = {노트북, 디자인, 좋다}', '③ A = {노트북, 디자인, 좋아요}', '④ A = {노트북, 좋다}'], answer: 1,
    explain: '어절 <code>이 / 노트북은 / 디자인이 / 좋아요</code> 를 사전형으로 바꾸면 <code>이 / 노트북 / 은 / 디자인 / 이 / 좋다</code> 이고, ' +
      '여기서 불용어 <code>이, 은</code> 을 지우면 <code>노트북, 디자인, 좋다</code> 가 남습니다. ' +
      '①은 불용어를 지우지 않았고, ③은 <b>기본 사전형으로 바꾸지 않은</b> 경우(\'좋아요\' → \'좋다\'), ④는 \'디자인\'을 잘못 지운 경우입니다. ' +
      '(동아 교과서 Ⅱ p.48 예시를 재구성)' },
  { q: 'A = {노트북, 디자인, 좋다}, B = {노트북, 가볍다, 만족}, C = {화면, 크다, 만족, 배송, 빠르다} 일 때 전체집합 U = A∪B∪C 의 원소 개수 n(U)는?',
    opts: ['① 9', '② 10', '③ 11', '④ 12'], answer: 0,
    explain: '세 집합의 원소를 모두 합하면 <code>3+3+5 = 11</code> 개이지만, <b>\'노트북\'이 A와 B에, \'만족\'이 B와 C에 중복</b>됩니다. ' +
      '합집합에서는 겹치는 원소를 한 번만 세므로 <code>11 − 2 = 9</code> 개입니다. ' +
      '<code>U = {노트북, 디자인, 좋다, 가볍다, 만족, 화면, 크다, 배송, 빠르다}</code>. ' +
      '③을 고른 경우는 중복을 그대로 더한 것으로, 활동 ③에서 "이미 있습니다"라며 칩이 튕겨 나오던 장면을 떠올리면 좋습니다.' },
  { q: '전체집합 U = {기반, 사고, 성장, 수학, 열쇠, 인공지능, 탐구} 의 원소에 가나다순으로 1번부터 번호를 붙였습니다. 이에 대한 설명으로 옳지 않은 것은?',
    opts: ['① \'열쇠\'의 번호는 5이다.', '② \'인공지능\'의 번호는 6이다.',
           '③ 번호가 큰 \'인공지능\'이 번호가 작은 \'수학\'보다 문서에서 더 중요한 단어이다.', '④ 번호는 단어를 구별하기 위한 이름표일 뿐이다.'],
    answer: 2,
    explain: '가나다순이므로 기반 1, 사고 2, 성장 3, 수학 4, 열쇠 5, 인공지능 6, 탐구 7 입니다. ' +
      '번호는 <b>가나다 순서</b>로 정해졌을 뿐이어서 중요도·의미와는 아무 관계가 없습니다. ' +
      '실제로 문서 A "수학 탐구는 수학 사고의 열쇠이며, 수학은 성장의 열쇠이다."에서 가장 많이 쓰인 단어는 3번 등장한 <b>\'수학\'(번호 4)</b> 입니다. ' +
      '이 한계를 넘기 위해 다음 시간에 벡터를 배웁니다. (연수교재 합본 p.58 Tip · 강의 PPT 슬라이드 6 서술을 재구성)' },
  { q: '텍스트 데이터를 집합으로만 표현할 때의 한계로 가장 알맞은 것은?',
    opts: ['① 어떤 단어가 문서에 들어 있는지 알 수 없다.', '② 문서끼리 공통으로 쓰인 단어를 찾을 수 없다.',
           '③ 단어가 몇 번 사용되었는지 알 수 없다.', '④ 불용어를 제거할 수 없다.'], answer: 2,
    explain: '집합은 원소의 <b>순서를 고려하지 않고, 중복된 원소는 한 번만</b> 나타냅니다. ' +
      '그래서 "어떤 단어가 있는가"(①)와 "어떤 단어가 공통인가"(②)는 잘 알 수 있지만, <b>등장 횟수</b>는 잃어버립니다. ' +
      '보통 어떤 단어가 문서에서 여러 번 쓰이면 중요도가 높을 가능성이 크기 때문에, 이 정보를 살리려고 다음 시간에 <b>빈도수 벡터</b>를 배웁니다. ' +
      '(씨마스 교과서 Ⅱ p.49·p.51 서술을 재구성)' }
];

var TP_CHIPS = {
  '집합·원소':
    '<p><b>정의.</b> 어떤 기준에 따라 그 대상을 분명하게 정할 수 있을 때, 그 대상들의 모임을 <b>집합</b>이라고 합니다. ' +
    '집합을 이루는 대상 하나하나를 그 집합의 <b>원소</b>라고 합니다. 집합은 중괄호 <code>{ }</code> 안에 원소를 나열해 나타내며, ' +
    '<b>같은 원소를 중복해서 쓰지 않고, 나열하는 순서도 따지지 않습니다.</b></p>' +
    '<p><b>예시.</b> <code>{1, 2, 3, 6}</code> — 6의 양의 약수의 집합. <code>{6, 3, 2, 1}</code> 이라고 써도 같은 집합입니다. / ' +
    '<code>{수학, 탐구, 사고, 열쇠, 성장}</code> — 문서 A에서 뽑아낸 단어의 집합. 문서에 \'수학\'이 세 번 나왔더라도 집합에는 <b>한 번만</b> 적습니다.</p>' +
    '<p><b>이번 차시에서는.</b> STEP 2 활동 ②의 4단계에서, 화면에 흩어져 있던 어절 칩들이 중괄호 안으로 모이면서 ' +
    '<b>중복된 칩이 스르르 겹쳐져 하나로 합쳐지는</b> 장면을 직접 보게 됩니다. ' +
    '그때 "왜 \'수학\'이 세 개가 아니라 하나만 남지?"라는 물음의 답이 바로 이 성질입니다.</p>' +
    '<p><b>앞뒤 차시 연결.</b> 1차시에서 인공지능을 "입력을 출력으로 잇는 함수"로 보았다면, 지금은 그 입력 자리에 들어갈 ' +
    '<b>문장을 수학적 대상(집합)으로 바꾸는 중</b>입니다. 다음 7차시에서는 이 집합을 벡터로 바꿉니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tpTab(1)">활동 ②로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'intro\')">1차시 · 인공지능의 개념 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'text\',\'incl\')">7차시 · 벡터로 →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.48 · 동아 교과서 Ⅱ p.47 · 미래엔 「인공지능 수학」 Ⅱ 서술을 재구성</p>',

  '불용어':
    '<p><b>정의.</b> 텍스트 데이터에는 등장하지만 <b>분석에는 쓰이지 않는 단어</b>를 <b>불용어(不用語, stopword)</b> 라고 합니다. ' +
    '조사·관사·대명사·접속사·특수 문자처럼 문장의 뼈대는 만들지만 뜻을 가르는 데는 거의 도움을 주지 않는 말들입니다. ' +
    '중요한 것은 <b>불용어 목록이 정해져 있지 않다</b>는 점입니다. 분석 프로그램마다, 그리고 분석 목적에 따라 사용자가 직접 정합니다.</p>' +
    '<p><b>예시.</b> 한국어: <code>은, 는, 이, 가, 을, 를, 의, 에, 도</code> / 영어: <code>the, a, is, and</code>. ' +
    '<b>목적에 따라 달라지는 예</b> — 학교 교복에 대한 댓글 100개를 분석한다면, 모든 댓글에 나오는 <code>교복</code>·<code>학교</code>를 ' +
    '오히려 불용어에 넣을 수 있습니다. 어느 댓글에나 있는 단어는 댓글끼리 구별해 주지 못하기 때문입니다.</p>' +
    '<p><b>이번 차시에서는.</b> 활동 ②의 3단계에서 불용어 칩을 하나씩 켜고 끄거나, 칩을 끌어다 휴지통에 버려 봅니다. ' +
    '칩 하나를 켜고 끌 때마다 아래의 단어집합과 원소 개수가 즉시 달라지는 것을 보면서, ' +
    '"<b>불용어를 어떻게 정하느냐가 곧 분석 결과를 정하는 일</b>"임을 확인하게 됩니다.</p>' +
    '<p><b>앞뒤 차시 연결.</b> 5차시에서 데이터의 치우침이 결과를 뒤흔드는 것을 보았듯, 불용어 선택도 사람이 내리는 판단입니다. ' +
    '8차시 TF-IDF는 이 판단을 <b>수치로 자동화</b>하는 방법입니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tpTab(1)">활동 ②로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'bias\')">5차시 · 데이터 편향 →</button></div>' +
    '<p class="tx-src">출처: 동아 교과서 Ⅱ p.47 · 미래엔 「인공지능 수학」 Ⅱ 참고란 · 천재 「인공지능 수학」 지도서 Ⅱ 서술을 재구성</p>',

  '단어집합':
    '<p><b>정의.</b> 텍스트 데이터에서 <b>불용어를 제거하고 남은 단어를, 중복을 허용하지 않고 모아 놓은 집합</b>을 ' +
    '<b>단어집합(vocabulary)</b> 이라고 합니다. 문서 하나에 단어집합 하나가 대응하므로, 문서 A의 단어집합은 보통 대문자 <code>A</code>로 나타냅니다. ' +
    '문서를 단어집합으로 바꾸면 "어떤 단어가 이 문서에 들어 있는가"를 집합의 언어로 말할 수 있게 됩니다.</p>' +
    '<p><b>예시.</b> 한 줄 평 A "불편한 편의점의 따뜻한 이야기에 감동했습니다." → ' +
    '<code>A = {불편하다, 편의점, 따뜻하다, 이야기, 감동하다}</code> / ' +
    '문서 A "수학 탐구는 수학 사고의 열쇠이며, 수학은 성장의 열쇠이다." → <code>A = {수학, 탐구, 사고, 열쇠, 성장}</code> (원소 5개)</p>' +
    '<p><b>이번 차시에서는.</b> 활동 ①에서 여러분이 상황 사진을 보고 직접 만든 문장이 활동 ②를 지나면 여러분만의 단어집합이 됩니다. ' +
    '그리고 활동 ③에서 모둠원의 단어집합을 겹쳐 보며 "같은 사진을 보고도 서로 다른 단어를 골랐구나"를 벤다이어그램으로 확인합니다.</p>' +
    '<p><b>앞뒤 차시 연결.</b> 단어집합은 2단원 전체의 출발점입니다. 7차시의 원-핫·빈도수 벡터, 8차시 TF-IDF, ' +
    '10차시 자카드 유사도가 모두 이 집합 위에서 계산됩니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tpTab(2)">활동 ③으로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'text\',\'incl\')">7차시 · 벡터로 →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.48 · 동아 교과서 Ⅱ p.48 서술을 재구성</p>',

  '합집합(전체집합 U)':
    '<p><b>정의.</b> 두 집합 <code>A</code>, <code>B</code>에 대하여 <code>A</code>에 속하거나 <code>B</code>에 속하는 원소 전체로 이루어진 집합을 ' +
    '<b>합집합</b>이라 하고 <code>A∪B</code>로 나타냅니다. 여러 문서의 단어집합을 모두 합한 <code>U = A∪B∪C∪…</code> 를 이 말뭉치의 ' +
    '<b>전체집합(단어 사전)</b> 이라고 합니다. 전체집합은 서로 다른 문서를 <b>같은 자로 재기 위한 공통 눈금</b>의 역할을 합니다.</p>' +
    '<p><b>예시.</b> <code>A = {노트북, 디자인, 좋다}</code>, <code>B = {노트북, 가볍다, 만족}</code>, ' +
    '<code>C = {화면, 크다, 만족, 배송, 빠르다}</code> → ' +
    '<code>U = {노트북, 디자인, 좋다, 가볍다, 만족, 화면, 크다, 배송, 빠르다}</code> (원소 9개). ' +
    '<code>A</code>에도 <code>B</code>에도 있는 \'노트북\'은 <code>U</code>에 <b>한 번만</b> 들어갑니다.</p>' +
    '<p><b>이번 차시에서는.</b> 활동 ③에서 모둠의 문장 3개를 겹쳐 <code>U</code>를 만들고, 세 원이 겹치는 벤다이어그램 위에서 ' +
    '어떤 단어가 공통이고 어떤 단어가 나만의 단어인지 눈으로 확인합니다. 그 다음 <code>U</code>를 가나다순으로 정렬해 ' +
    '<b>우리 반 단어 사전</b>을 완성합니다.</p>' +
    '<p><b>앞뒤 차시 연결.</b> 7차시에서 벡터의 <b>차원</b>이 되는 것이 바로 <code>n(U)</code>입니다. ' +
    '10차시의 자카드 유사도는 <code>n(A∩B) ÷ n(A∪B)</code> 로 정의되므로, 오늘 만든 합집합이 그대로 분모가 됩니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tpTab(2)">활동 ③으로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'text\',\'incl\')">7차시 · 벡터로 →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.48 · 미래엔 「인공지능 수학」 Ⅱ · 씨마스 「인공지능 수학」 지도서 Ⅱ 서술을 재구성</p>',

  '정수 인코딩 [참고]':
    '<p><b>정의.</b> 단어집합의 각 원소에 서로 다른 정수(번호)를 하나씩 대응시키는 것을 <b>정수 인코딩</b>이라고 합니다. ' +
    '보통 전체집합 <code>U</code>를 가나다순으로 정렬한 뒤 1번부터 차례로 번호를 붙입니다. ' +
    '이렇게 하면 컴퓨터는 \'수학\'이라는 글자 대신 <code>4</code>라는 수를 다룰 수 있습니다.</p>' +
    '<p class="tv-banner">⚠️ 주의 — 이 번호는 크기가 아닙니다. \'인공지능(6)\'이 \'수학(4)\'보다 1.5배 중요하다는 뜻이 결코 아닙니다. ' +
    '번호는 <b>이름표</b>일 뿐이고, 단어의 중요도나 의미는 전혀 담고 있지 않습니다. 이 한계 때문에 7차시에서 벡터가 등장합니다.</p>' +
    '<p><b>예시.</b> <code>U = {기반, 사고, 성장, 수학, 열쇠, 인공지능, 탐구}</code> → 기반 1, 사고 2, 성장 3, 수학 4, 열쇠 5, 인공지능 6, 탐구 7. ' +
    '문서 A "수학 탐구는 …" 는 <code>4, 7, 2, 5, 3</code> 같은 번호의 나열로 바뀝니다.</p>' +
    '<p><b>이번 차시에서는.</b> 활동 ②의 마지막 5단계에서 인코딩 표가 만들어지는 것을 보고, ' +
    '곧바로 이어지는 "번호가 크면 더 중요한가?" 판정 문제에서 스스로 반례를 만들어 봅니다.</p>' +
    '<p><b>앞뒤 차시 연결.</b> 정수 인코딩은 2022 개정 교육과정의 성취기준에 직접 등장하지 않는 <b>참고 개념</b>이라 지필·형성평가 대상이 아닙니다. ' +
    '다만 7차시 원-핫 벡터에서 "몇 번째 자리에 1을 놓을지"를 정하는 데 그대로 쓰이므로 한 번은 짚고 갑니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tpTab(1)">활동 ②로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'text\',\'onehot\')">7차시 · 원-핫 벡터 →</button></div>' +
    '<p class="tx-src">출처: 연수교재 합본 p.58 Tip · 강의 PPT(5-6차시) 슬라이드 6·12 서술을 재구성</p>'
};
/* ───────── 6차시 상태 ───────── */

var tpInited = false;
var tpShot = 0;                 /* 고른 상황 사진(1~5) */
var tpDocs = ['', ''];          /* 문서 입력칸 */
var tpStops = [];               /* [{w:'은', on:true}] */
var tpManual = {};              /* 학생이 칩을 눌러 직접 지정/해제한 단어 */
var tpPresetK = 'math';
var tpEdited = false;           /* 학생이 문서를 고치면 U 정렬을 가나다순으로 */
var tpStageI = 0;               /* 0~4 */
var tpPlayIv = null;
var tpOrder = [];               /* 순서 예측 조각 */
var tpOrdTry = 0;
var tpU = [];                   /* 활동 ③ U 상자 */
var tpUSorted = false;
var tpVSets = { A: [], B: [], C: [] };
var tpVPreset = 'note';
var tpVHi = '';                 /* 벤다이어그램에서 강조 중인 단어 */

/* ───────── 6차시 · 탭 ───────── */

function tpTab(n, el){
  var i = parseInt(n, 10) || 0, tabs = document.querySelectorAll('#tp-tabs .tab'), k;
  for (k = 0; k < tabs.length; k++) tabs[k].classList.toggle('on', k === i);
  for (k = 0; k < 3; k++) {
    var p = txEl('tpp' + k);
    if (p) p.classList.toggle('on', k === i);
  }
  if (el && el.classList) el.classList.add('on');
  if (i === 2) tpVennDraw();
  var host = txEl('tp-tabs');
  if (host && el) txScrollTo(host);
}

/* ───────── 6차시 · 활동 ① 상황 사진 · 우리 반 말뭉치 ───────── */

function tpShotsRender(){
  var box = txEl('tp-shots');
  if (!box) return;
  box.innerHTML = '';
  TP_SHOTS.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-shot' + (tpShot === s.n ? ' on' : '');
    b.setAttribute('aria-pressed', tpShot === s.n ? 'true' : 'false');
    b.innerHTML =
      '<figure class="tx-photo" style="margin:0;">' +
        '<img src="assets/situations/상황' + s.n + '.jpg" alt="' + txEsc(s.alt) + '" loading="lazy" ' +
        'onerror="this.closest(\'.tx-photo\').classList.add(\'nofoto\');">' +
        '<span class="fb" aria-hidden="true">💬</span></figure>' +
      '<span class="no">상황 ' + s.n + '</span><span class="cap">' + txEsc(s.cap) + '</span>';
    b.addEventListener('click', function () { tpShot = s.n; tpShotsRender(); });
    box.appendChild(b);
  });
}

function tpSentCount(){
  var ta = txEl('tp-sent'), el = txEl('tp-sent-cnt');
  if (!ta || !el) return;
  var n = ta.value.trim().length;
  el.textContent = '현재 글자 수 ' + n + '자' + (n >= 15 ? ' — 좋습니다.' : ' — 15자 이상으로 써 보세요.');
  el.className = 'tp-cnt' + (n >= 15 ? ' ok' : '');
}

function tpSentDemo(){
  var s = TP_SHOTS[(tpShot || 1) - 1] || TP_SHOTS[0];
  var ta = txEl('tp-sent');
  if (!ta) return;
  if (!tpShot) tpShot = s.n;
  ta.value = s.demo;
  tpShotsRender();
  tpSentCount();
}

function tpSentSave(){
  var ta = txEl('tp-sent');
  if (!ta) return;
  var t = ta.value.trim();
  if (t.length < 15) { txFb('tp-sent-fb', false, '15자 이상으로 써 주세요. 지금은 ' + t.length + '자입니다.'); return; }
  txCorpusAdd(t, tpShot || 1, true);
  ta.value = '';
  tpSentCount();
  txFb('tp-sent-fb', true, '저장했습니다. 아래 「우리 반 말뭉치」에 쌓였습니다.',
    '이 문장은 7차시 활동 ①·③과 9차시에서도 그대로 불러 씁니다.');
  tpCorpRender();
}

function tpSentGroup(){
  var s = TP_SHOTS[(tpShot || 1) - 1] || TP_SHOTS[0];
  var extra = {
    1: ['무릎에 상처가 크게 났으니 보건실에 같이 가 보자', '괜찮니 많이 아프면 잠깐 쉬었다 하자'],
    2: ['짬뽕이 맵다고 하니 오늘은 볶음밥을 시켜 볼까', '메뉴가 너무 많아서 무엇을 고를지 모르겠다'],
    3: ['버스가 오지 않아서 걸어가는 편이 빠를 것 같다', '정류장에 사람이 없어서 조금 무섭기도 하다'],
    4: ['게임은 시험 끝나고 하고 지금은 같이 공부하자', '너 때문에 나까지 집중이 안 되고 있잖아'],
    5: ['공을 끝까지 보고 힘껏 휘두르면 넘어갈 것이다', '이번에는 반드시 안타를 쳐서 점수를 내겠다']
  }[s.n] || [];
  var a = txCorpusLoad();
  extra.forEach(function (t) {
    var dup = a.some(function (it) { return it.t === t; });
    if (!dup) a.push({ t: t, s: s.n, m: false });
  });
  txCorpusSave(a);
  txFb('tp-sent-fb', true, '모둠원 문장 2개를 채웠습니다.', '활동 ③의 세 집합 A·B·C가 이 세 문장을 그대로 씁니다.');
  tpCorpRender();
}

function tpCorpDel(i){
  var a = txCorpusLoad();
  a.splice(i, 1);
  txCorpusSave(a);
  tpCorpRender();
}

function tpCorpRender(){
  var box = txEl('tp-corp'), ov = txEl('tp-ov');
  if (!box) return;
  var arr = txCorpusLoad();
  box.innerHTML = '';
  if (!arr.length) {
    box.innerHTML = '<p class="tx-note">아직 저장된 문장이 없습니다. 사진을 고르고 문장을 저장해 보세요.</p>';
    if (ov) ov.innerHTML = '';
    return;
  }
  arr.forEach(function (it, i) {
    var d = document.createElement('div');
    d.className = 'it' + (it.m ? ' mine' : '');
    d.innerHTML = '<span class="lb">' + (it.m ? '내 문장' : '모둠') + ' · 상황 ' + (it.s || '-') + '</span>' +
      '<span>' + txEsc(it.t) + '</span>';
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = '✕'; b.title = '이 문장 지우기';
    b.addEventListener('click', function () { tpCorpDel(i); });
    d.appendChild(b);
    box.appendChild(d);
  });

  /* 겹치는 단어 배지 — 두 문장 이상에 나타나는 단어 */
  if (ov) {
    var stops = TP_STOP_BASE, sets = arr.slice(0, 6).map(function (it) {
      var ws = tokenize(it.t).map(function (t) { return TP_LEMMA[t] || removeStopwordsFromWord(t, stops) || t; });
      return ws.filter(function (w) { return stops.indexOf(w) < 0 && w.length > 1; });
    });
    var cnt = {};
    sets.forEach(function (s) {
      var seen = {};
      s.forEach(function (w) { if (!seen[w]) { seen[w] = 1; cnt[w] = (cnt[w] || 0) + 1; } });
    });
    var shared = Object.keys(cnt).filter(function (w) { return cnt[w] >= 2; });
    ov.innerHTML = shared.length
      ? '<span class="b">겹치는 단어 ' + shared.length + '개</span>' +
        shared.map(function (w) { return '<span class="b">' + txEsc(w) + ' ×' + cnt[w] + '</span>'; }).join('')
      : '<span class="b">겹치는 단어 0개 — 문장을 더 모아 보세요</span>';
  }
}

/* ───────── 6차시 · 활동 ② 순서 예측 ───────── */

function tpOrdShuffle(){
  var a = TP_ORDER_ANS.slice(), i, j, t;
  for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
  if (a.join('|') === TP_ORDER_ANS.join('|')) { t = a[0]; a[0] = a[3]; a[3] = t; }
  tpOrder = a;
  tpOrdRender();
}

function tpOrdMove(i, d){
  var j = i + d;
  if (j < 0 || j >= tpOrder.length) return;
  var t = tpOrder[i]; tpOrder[i] = tpOrder[j]; tpOrder[j] = t;
  tpOrdRender();
}

function tpOrdRender(mark){
  var box = txEl('tp-ord');
  if (!box) return;
  box.innerHTML = '';
  tpOrder.forEach(function (w, i) {
    var row = document.createElement('div');
    row.className = 'row' + (mark ? (w === TP_ORDER_ANS[i] ? ' ok' : ' no') : '');
    row.innerHTML = '<span class="n">' + (i + 1) + '.</span><span class="t">' + txEsc(w) + '</span>';
    var up = document.createElement('button');
    up.type = 'button'; up.className = 'mv'; up.textContent = '▲'; up.title = '위로'; up.disabled = (i === 0);
    up.addEventListener('click', function () { tpOrdMove(i, -1); });
    var dn = document.createElement('button');
    dn.type = 'button'; dn.className = 'mv'; dn.textContent = '▼'; dn.title = '아래로'; dn.disabled = (i === tpOrder.length - 1);
    dn.addEventListener('click', function () { tpOrdMove(i, 1); });
    row.appendChild(up); row.appendChild(dn);
    box.appendChild(row);
  });
}

function tpOrdOpen(){
  var p = txEl('tp-pipe');
  if (p) p.style.display = '';
  tpRender();
}

function tpOrdCheck(){
  tpOrdTry++;
  var ok = tpOrder.join('|') === TP_ORDER_ANS.join('|');
  tpOrdRender(true);
  if (ok) {
    txFb('tp-ord-fb', true, '맞습니다. 전처리의 표준 순서입니다.',
      '㉢ 기호 제거·어절 분리 → ㉣ 기본 사전형 → ㉠ 불용어 제거 → 중복 제거해 집합 만들기. 아래 파이프라인 위젯이 열렸습니다.');
    tpOrdOpen();
    return;
  }
  if (tpOrdTry >= 2) {
    tpOrder = TP_ORDER_ANS.slice();
    tpOrdRender(true);
    txFb('tp-ord-fb', false, '두 번 시도했으니 정답 순서로 맞추어 두었습니다.',
      '사전형으로 바꾸기 <b>전에</b> 어절로 나누어야 하고, 불용어 제거는 사전형이 정해진 <b>뒤에</b> 해야 정확합니다. 아래 파이프라인 위젯이 열렸습니다.');
    tpOrdOpen();
  } else {
    txFb('tp-ord-fb', false, '아직 아닙니다. 한 번 더 시도해 보세요.',
      '힌트 — 문장 부호부터 지워야 어절을 깨끗하게 나눌 수 있습니다.');
  }
}

/* ───────── 6차시 · 활동 ② 전처리 엔진 ───────── */

/* 어절 하나를 (사전형 + 떨어져 나온 조사) 조각으로 나눕니다.
   불용어 제거를 끄면 원본 앱과 같이 어절을 그대로 둡니다(사전형 변환만 적용). */
function tpTokParts(token, stops, useStop){
  var direct = TP_LEMMA[token];
  if (direct !== undefined) return [{ w: direct, orig: token, sfx: false }];
  if (!useStop) return [{ w: token, orig: token, sfx: false }];
  var r = txStripSuffix(token, stops);
  if (!r.suf.length) return [{ w: token, orig: token, sfx: false }];
  var lem = TP_LEMMA[r.base] || r.base;
  var out = [{ w: lem, orig: token, sfx: false }];
  r.suf.forEach(function (s) { out.push({ w: s, orig: token, sfx: true }); });
  return out;
}

function tpActiveStops(){
  return tpStops.filter(function (s) { return s.on; }).map(function (s) { return s.w; });
}

function tpCompute(){
  var chk = txEl('tp-usestop');
  var useStop = chk ? chk.checked : true;
  var stops = tpActiveStops();
  var docs = [];
  tpDocs.forEach(function (t, i) {
    if (!String(t || '').trim()) return;
    var tokens = tokenize(t), parts = [];
    tokens.forEach(function (tk, ti) {
      tpTokParts(tk, stops, useStop).forEach(function (p) {
        var auto = useStop && stops.indexOf(p.w) >= 0;
        var man = Object.prototype.hasOwnProperty.call(tpManual, p.w) ? tpManual[p.w] : null;
        parts.push({ w: p.w, orig: p.orig, sfx: p.sfx, ti: ti, out: (man === null ? auto : man) });
      });
    });
    var kept = parts.filter(function (p) { return !p.out; }).map(function (p) { return p.w; });
    var set = [];
    kept.forEach(function (w) { if (set.indexOf(w) < 0) set.push(w); });
    docs.push({ label: String.fromCharCode(65 + i), text: t, tokens: tokens, parts: parts, kept: kept, set: set });
  });

  var preset = TP_PRESETS.filter(function (p) { return p.k === tpPresetK; })[0];
  var sets = docs.map(function (d) { return d.set; });
  var order = 'corpus', label = '문서 등장 순서', fixed = null;
  if (tpEdited) { order = 'ko'; label = '가나다순 (학생이 입력한 문서)'; }
  else if (preset) {
    if (preset.uMode === 'ko') { order = 'ko'; label = preset.uLabel; }
    else if (preset.uMode === 'fixed') { order = 'fixed'; fixed = preset.uFixed; label = preset.uLabel; }
    else { order = 'corpus'; label = preset.uLabel; }
  }
  var U = buildUniverse(sets, { order: order, fixed: fixed });
  var Uko = U.slice().sort(function (a, b) { return a.localeCompare(b, 'ko'); });
  return { docs: docs, U: U, Uko: Uko, order: label, useStop: useStop, stops: stops };
}

/* ───────── 6차시 · 활동 ② 화면 ───────── */

function tpPresetsRender(){
  var box = txEl('tp-presets');
  if (!box) return;
  box.innerHTML = '';
  TP_PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn tx-mini' + (p.k === tpPresetK ? ' pri' : '');
    b.innerHTML = p.ico + ' ' + txEsc(p.n) + ' <span style="opacity:.7;font-size:.85em;">' + txEsc(p.note) + '</span>';
    b.addEventListener('click', function () { tpPreset(p.k); });
    box.appendChild(b);
  });
}

function tpPreset(k){
  var p = TP_PRESETS.filter(function (x) { return x.k === k; })[0];
  if (!p) return;
  tpPresetK = k;
  tpEdited = false;
  tpManual = {};
  tpDocs = p.docs.slice();
  if (tpDocs.length < 2) tpDocs.push('');
  tpStops = p.stops.map(function (w) { return { w: w, on: true }; });
  tpStageI = 0;
  tpPresetsRender();
  tpDocsRender();
  tpStopRender();
  tpRender();
}

function tpDocsRender(){
  var box = txEl('tp-docs');
  if (!box) return;
  box.innerHTML = '';
  tpDocs.forEach(function (t, i) {
    var row = document.createElement('div');
    row.className = 'tp-doc';
    row.innerHTML = '<span class="lb">문서 ' + String.fromCharCode(65 + i) + '</span>';
    var ta = document.createElement('textarea');
    ta.className = 'tx-in'; ta.rows = 2; ta.value = t;
    ta.setAttribute('aria-label', '문서 ' + String.fromCharCode(65 + i));
    ta.addEventListener('input', function () { tpDocs[i] = ta.value; tpEdited = true; tpRender(); });
    row.appendChild(ta);
    if (tpDocs.length > 2) {
      var rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'rm'; rm.textContent = '✕'; rm.title = '이 문서 삭제';
      rm.addEventListener('click', function () { tpDocs.splice(i, 1); tpEdited = true; tpDocsRender(); tpRender(); });
      row.appendChild(rm);
    }
    box.appendChild(row);
  });
}

function tpAddDoc(){
  if (tpDocs.length >= 4) return;
  tpDocs.push('');
  tpEdited = true;
  tpDocsRender();
  tpRender();
}

function tpLoadMine(){
  var arr = txCorpusLoad();
  if (!arr.length) { txFb('tp-judge-fb', false, '저장된 문장이 없습니다.', '활동 ①에서 문장을 먼저 저장해 주세요.'); tpTab(0); return; }
  var mine = arr.filter(function (it) { return it.m; });
  var pick = (mine.length ? mine : arr).slice(-1)[0];
  tpDocs[0] = pick.t;
  tpEdited = true;
  tpDocsRender();
  tpRender();
}

function tpStopRender(){
  var box = txEl('tp-stopchips'), inp = txEl('tp-stop-in');
  if (!box) return;
  box.innerHTML = '';
  tpStops.forEach(function (s, i) {
    var b = document.createElement('span');
    b.className = 'tp-sw' + (s.on ? '' : ' off');
    b.setAttribute('role', 'button');
    b.setAttribute('tabindex', '0');
    b.setAttribute('aria-pressed', s.on ? 'true' : 'false');
    b.appendChild(document.createTextNode(s.w));
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'x'; x.textContent = '✕'; x.title = '목록에서 삭제';
    x.addEventListener('click', function (ev) { ev.stopPropagation(); tpStops.splice(i, 1); tpStopRender(); tpRender(); });
    b.appendChild(x);
    var tog = function () { s.on = !s.on; tpStopRender(); tpRender(); };
    b.addEventListener('click', tog);
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    box.appendChild(b);
  });
  var add = document.createElement('button');
  add.type = 'button'; add.className = 'btn tx-mini'; add.textContent = '+ 불용어 추가';
  add.addEventListener('click', function () {
    var w = window.prompt('불용어로 추가할 말을 입력하세요 (예: 교복)');
    if (!w) return;
    w = String(w).trim();
    if (!w) return;
    if (!tpStops.some(function (s) { return s.w === w; })) tpStops.push({ w: w, on: true });
    tpStopRender(); tpRender();
  });
  box.appendChild(add);
  if (inp) inp.value = tpStops.map(function (s) { return s.w; }).join(', ');
}

function tpStopApply(){
  var inp = txEl('tp-stop-in');
  if (!inp) return;
  var list = inp.value.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
  var seen = {};
  tpStops = list.filter(function (w) { if (seen[w]) return false; seen[w] = 1; return true; })
                .map(function (w) { return { w: w, on: true }; });
  tpStopRender();
  tpRender();
}

function tpStopPreset(kind){
  tpStops = (kind === 'none' ? [] : TP_STOP_BASE.slice()).map(function (w) { return { w: w, on: true }; });
  tpStopRender();
  tpRender();
}

/* 칩 클릭·드래그·키보드로 단어 하나를 직접 버리거나 되살립니다. */
function tpToggleWord(w){
  var d = tpCompute();
  var autoOut = d.useStop && d.stops.indexOf(w) >= 0;
  var cur = Object.prototype.hasOwnProperty.call(tpManual, w) ? tpManual[w] : autoOut;
  var want = !cur;
  if (want === autoOut) delete tpManual[w]; else tpManual[w] = want;
  if (tpStageI < 2) tpStageI = 2;
  tpRender();
}

var TP_STAGE_NAMES = ['① 원문', '② 어절 분리', '③ 불용어 제거', '④ 단어집합', '⑤ 정수 인코딩 [참고]'];

function tpStageChips(){
  var box = txEl('tp-stagechips');
  if (!box) return;
  box.innerHTML = '';
  TP_STAGE_NAMES.forEach(function (n, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-sc' + (i === tpStageI ? ' on' : '');
    b.textContent = n;
    b.addEventListener('click', function () { tpStepTo(i); });
    box.appendChild(b);
  });
  var p = txEl('tp-progress');
  if (p) p.textContent = '단계 ' + (tpStageI + 1) + ' / 5';
}

function tpStepTo(i){
  tpStageI = Math.max(0, Math.min(4, i));
  tpRender(true);
}
function tpStep(d){ tpStop(); tpStepTo(tpStageI + d); }

function tpStop(){
  if (tpPlayIv) { clearInterval(tpPlayIv); tpPlayIv = null; }
  var b = txEl('tp-play');
  if (b) b.textContent = '⏵ 자동 재생';
}

function tpPlay(){
  if (tpPlayIv) { tpStop(); return; }
  var b = txEl('tp-play');
  if (b) b.textContent = '⏸ 멈춤';
  tpStepTo(0);
  tpPlayIv = setInterval(function () {
    if (tpStageI >= 4) { tpStop(); return; }
    tpStepTo(tpStageI + 1);
  }, txCalm() ? 700 : 1500);
}

function tpTokHTML(p, cls){
  return '<span class="tp-tok ' + cls + '" tabindex="0" role="button" draggable="true" ' +
    'data-w="' + txEsc(p.w) + '" aria-pressed="' + (cls.indexOf('stop') >= 0 ? 'true' : 'false') + '" ' +
    'title="어절 ' + txEsc(p.orig) + ' / 사전형 ' + txEsc(p.w) + '">' +
    (p.orig && p.orig !== p.w ? '<span class="o">' + txEsc(p.orig) + '</span>' : '') +
    txEsc(p.w) + '</span>';
}

function tpBindToks(root){
  if (!root) return;
  root.querySelectorAll('.tp-tok').forEach(function (el) {
    var w = el.getAttribute('data-w');
    el.addEventListener('click', function () { tpToggleWord(w); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tpToggleWord(w); }
    });
    el.addEventListener('dragstart', function (e) {
      try { e.dataTransfer.setData('text/plain', w); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
    });
  });
  var bin = root.querySelector('.tp-bin');
  if (bin) {
    bin.addEventListener('dragover', function (e) { e.preventDefault(); bin.classList.add('over'); });
    bin.addEventListener('dragleave', function () { bin.classList.remove('over'); });
    bin.addEventListener('drop', function (e) {
      e.preventDefault(); bin.classList.remove('over');
      var w = '';
      try { w = e.dataTransfer.getData('text/plain'); } catch (x) {}
      if (w) tpToggleWord(w);
    });
  }
}

function tpRender(keepStage){
  var out = txEl('tp-out');
  if (!out) return;
  var d = tpCompute();
  tpStageChips();

  var enter = (!txCalm() && keepStage) ? ' enter' : '';
  var h = '';

  /* 단계 ① 원문 */
  h += '<div class="tp-stage"><p class="mat-label" style="text-align:left;">① 원문</p>';
  d.docs.forEach(function (doc) {
    h += '<div class="tp-docline"><b>문서 ' + doc.label + '</b> — ' + txEsc(doc.text) + '</div>';
  });
  h += '<p class="tx-note" style="color:var(--muted);">아직은 글자 줄일 뿐, 셀 수도 비교할 수도 없습니다.</p></div>';

  /* 단계 ② 어절 분리 · 사전형 */
  if (tpStageI >= 1) {
    h += '<div class="tp-stage"><p class="mat-label" style="text-align:left;">② 어절 분리 → 기본 사전형 단어</p>';
    d.docs.forEach(function (doc) {
      h += '<p class="tx-note"><b>문서 ' + doc.label + '</b> — 어절 ' + doc.tokens.length + '개</p><div class="tp-toks">';
      doc.parts.forEach(function (p) { h += tpTokHTML(p, 'norm' + enter); });
      h += '</div>';
    });
    h += '<p class="tx-note">사전에 없는 말은 그대로 둡니다. 규칙 사전은 <code>TP_LEMMA</code> 한 곳에서 늘릴 수 있습니다.</p></div>';
  }

  /* 단계 ③ 불용어 제거 */
  if (tpStageI >= 2) {
    var gone = 0, left = 0;
    d.docs.forEach(function (doc) { doc.parts.forEach(function (p) { if (p.out) gone++; else left++; }); });
    h += '<div class="tp-stage"><p class="mat-label" style="text-align:left;">③ 불용어 제거' +
      (d.useStop ? '' : ' — <b>건너뜀</b> (불용어 제거 적용 꺼짐)') + '</p>' +
      '<p class="tp-prog">남은 단어 ' + left + '개 / 버린 단어 ' + gone + '개</p>';
    d.docs.forEach(function (doc) {
      h += '<p class="tx-note"><b>문서 ' + doc.label + '</b></p><div class="tp-toks">';
      doc.parts.forEach(function (p) { h += tpTokHTML(p, p.out ? 'stop' : 'norm'); });
      h += '</div>';
    });
    h += '<div class="tp-bin"><p class="h">🗑 휴지통 — 칩을 끌어다 넣으면 버려집니다. ' +
      '키보드에서는 칩에 Tab으로 이동해 Enter 또는 Space를 누르세요(다시 누르면 되돌아옵니다).</p><div class="tp-toks">';
    var seen = {};
    d.docs.forEach(function (doc) {
      doc.parts.forEach(function (p) { if (p.out && !seen[p.w]) { seen[p.w] = 1; h += tpTokHTML(p, 'stop'); } });
    });
    h += '</div></div></div>';
  }

  /* 단계 ④ 단어집합 */
  if (tpStageI >= 3) {
    h += '<div class="tp-stage"><p class="mat-label" style="text-align:left;">④ 단어집합 — 중복을 한 번으로</p><div class="tp-setcards">';
    d.docs.forEach(function (doc) {
      h += '<div class="tp-setcard"><p class="tx-set">' + doc.label + ' = { ' +
        doc.set.map(txEsc).join(', ') + ' }</p><p class="n">n(' + doc.label + ') = ' + doc.set.length +
        ' · 어절 ' + doc.tokens.length + '개 → 남은 단어 ' + doc.kept.length + '개</p></div>';
    });
    h += '</div></div>';
  }

  /* 단계 ⑤ 정수 인코딩 */
  if (tpStageI >= 4) {
    h += '<div class="tp-stage"><p class="mat-label" style="text-align:left;">⑤ 정수 인코딩 <span class="tx-badge soft">참고</span></p>' +
      '<p class="tx-set">U = { ' + d.U.map(txEsc).join(', ') + ' } · n(U) = ' + d.U.length + '</p>' +
      '<p class="tx-note">정렬 기준: <b>' + txEsc(d.order) + '</b></p><div class="tx-scroll"><table class="tp-enc"><tr><th>단어</th>';
    d.U.forEach(function (w) { h += '<td' + (enter ? ' class="slide"' : '') + '>' + txEsc(w) + '</td>'; });
    h += '</tr><tr><th>번호</th>';
    d.U.forEach(function (w, i) { h += '<td class="i' + (enter ? ' slide' : '') + '">' + (i + 1) + '</td>'; });
    h += '</tr></table></div>' +
      '<p class="tv-banner">이 번호는 <b>이름표</b>입니다. 번호가 크다고 더 중요한 단어가 아닙니다.</p>' +
      '<p class="tx-note" style="color:var(--muted);">각주 — 프로그램에 따라 0번부터 시작하기도 합니다. ' +
      '이 수업은 연수교재·강의 자료·활동지와 같이 <b>1번부터</b> 붙입니다.</p></div>';
  }

  out.innerHTML = h;
  tpBindToks(out);

  /* 관찰 표 자동 채움 */
  var eo = d.docs[0];
  if (eo) {
    var chk = txEl('tp-usestop');
    var on = chk ? chk.checked : true;
    var a1 = txEl(on ? 'tp-obs-b1' : 'tp-obs-a1'), a2 = txEl(on ? 'tp-obs-b2' : 'tp-obs-a2');
    if (a1) a1.textContent = eo.tokens.length + '개';
    if (a2) a2.textContent = 'n(A) = ' + eo.set.length;
  }

  /* 활동 ③ 세 집합에 결과 반영 */
  tpVSyncFromPipe(d);
}

function tpJudge(i){
  if (i === 1) {
    txFb('tp-judge-fb', true, '맞습니다 — 번호는 중요도와 무관합니다.',
      '정수 인코딩은 단어에 <b>이름표</b>를 붙이는 일입니다. 가나다순으로 붙였으므로 \'인공지능\'이 6번인 것은 순전히 자음·모음 순서 때문입니다. ' +
      '실제로 문서 A에서 가장 많이 쓰인 단어는 3번 등장한 <b>\'수학\'(4번)</b> 입니다. 번호는 그 사실을 전혀 담지 못합니다. ' +
      '— 이 한계를 넘기 위해 7차시에서 벡터가 등장합니다.');
  } else {
    txFb('tp-judge-fb', false, '다시 생각해 봅시다. 정답은 "번호는 중요도와 무관하다"입니다.',
      '번호는 가나다 순서로 붙인 이름표일 뿐이어서, 6번이 4번보다 1.5배 중요하다는 뜻이 아닙니다. ' +
      '문서 A에서 가장 많이 쓰인 단어는 오히려 4번 \'수학\'입니다.');
  }
}

/* ───────── 6차시 · 활동 ③ 합집합 사전 ───────── */

var TP_VPRESETS = [
  { k: 'pipe', n: '활동 ② 결과 가져오기', src: 'pipe' },
  { k: 'group', n: '모둠 문장', src: 'corpus' },
  { k: 'note', n: '노트북 후기 (동아 Ⅱ p.48)',
    A: ['노트북', '디자인', '좋다'], B: ['노트북', '가볍다', '만족'], C: ['화면', '크다', '만족', '배송', '빠르다'] },
  { k: 'conv', n: '불편한 편의점 (씨마스 Ⅱ p.48)',
    A: ['불편하다', '편의점', '따뜻하다', '이야기', '감동하다'], B: ['불편하다', '편의점', '찾아가다'],
    C: ['불편하다', '편의점', '일상', '소중하다'] }
];

function tpVPresetsRender(){
  var box = txEl('tp-vpresets');
  if (!box) return;
  box.innerHTML = '';
  TP_VPRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn tx-mini' + (p.k === tpVPreset ? ' pri' : '');
    b.textContent = p.n;
    b.addEventListener('click', function () { tpVLoad(p.k); });
    box.appendChild(b);
  });
}

function tpVLoad(k){
  var p = TP_VPRESETS.filter(function (x) { return x.k === k; })[0];
  if (!p) return;
  tpVPreset = k;
  if (p.src === 'pipe') {
    var d = tpCompute();
    tpVSets = { A: (d.docs[0] || {}).set || [], B: (d.docs[1] || {}).set || [], C: (d.docs[2] || {}).set || [] };
  } else if (p.src === 'corpus') {
    var arr = txCorpusLoad().slice(-3);
    var stops = TP_STOP_BASE;
    var mk = function (t) {
      var ws = tokenize(t || '').map(function (tk) { return TP_LEMMA[tk] || removeStopwordsFromWord(tk, stops) || tk; })
        .filter(function (w) { return stops.indexOf(w) < 0; });
      var s = [];
      ws.forEach(function (w) { if (s.indexOf(w) < 0) s.push(w); });
      return s;
    };
    tpVSets = { A: mk(arr[0] && arr[0].t), B: mk(arr[1] && arr[1].t), C: mk(arr[2] && arr[2].t) };
  } else {
    tpVSets = { A: p.A.slice(), B: p.B.slice(), C: p.C.slice() };
  }
  tpUReset();
  tpVPresetsRender();
  tpSetCards();
  tpVennDraw();
}

/* 활동 ②의 결과(문서 3개까지)를 활동 ③ 집합 카드에 자동으로 넣습니다. */
function tpVSyncFromPipe(d){
  if (tpVPreset !== 'pipe') return;
  tpVSets = { A: (d.docs[0] || {}).set || [], B: (d.docs[1] || {}).set || [], C: (d.docs[2] || {}).set || [] };
  tpSetCards();
  tpVennDraw();
}

function tpSetCards(){
  var box = txEl('tp-setcards');
  if (!box) return;
  box.innerHTML = '';
  ['A', 'B', 'C'].forEach(function (L) {
    var s = tpVSets[L] || [];
    var d = document.createElement('div');
    d.className = 'tp-setcard';
    var chips = s.map(function (w) {
      return '<span class="tp-uchip" role="button" tabindex="0" data-w="' + txEsc(w) + '"' +
        (w === tpVHi ? ' style="background:var(--fg);color:var(--bg);border-color:var(--fg);"' : '') +
        '>' + txEsc(w) + '</span>';
    }).join(' ');
    d.innerHTML = '<p class="tx-set">' + L + ' = { ' + s.map(txEsc).join(', ') + ' }</p>' +
      '<p class="n">n(' + L + ') = ' + s.length + '</p><div class="tp-uchips">' + chips + '</div>';
    box.appendChild(d);
  });
  box.querySelectorAll('.tp-uchip[data-w]').forEach(function (el) {
    var w = el.getAttribute('data-w');
    var act = function () { tpVHi = (tpVHi === w ? '' : w); tpSetCards(); tpVennDraw(); };
    el.addEventListener('click', act);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });
}

function tpVennDraw(){
  var cv = txEl('tp-venn');
  if (!cv || !cv.getContext) return;
  var W = 560, H = 360;
  var dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  var g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  var css = getComputedStyle(document.documentElement);
  var col = function (n, f) { var v = css.getPropertyValue(n); return (v && v.trim()) || f; };
  var BG = col('--bg', '#f5f0ea'), FG = col('--fg', '#1a1714'), AC = col('--accent', '#c8b9a6'),
      BL = col('--blue', '#4a6b8a'), RD = col('--red', '#b44133'), MU = col('--muted', '#78726a');

  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  var A = tpVSets.A || [], B = tpVSets.B || [], C = tpVSets.C || [];
  var cA = { x: 205, y: 145, r: 108 }, cB = { x: 355, y: 145, r: 108 }, cC = { x: 280, y: 240, r: 108 };

  g.globalAlpha = 0.28;
  [[cA, AC], [cB, BL], [cC, RD]].forEach(function (p) {
    g.beginPath(); g.arc(p[0].x, p[0].y, p[0].r, 0, Math.PI * 2); g.fillStyle = p[1]; g.fill();
  });
  g.globalAlpha = 1;
  g.lineWidth = 1.6; g.strokeStyle = FG;
  [cA, cB, cC].forEach(function (p) { g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.stroke(); });

  g.font = '700 15px monospace'; g.fillStyle = FG; g.textAlign = 'center';
  g.fillText('A', 118, 62); g.fillText('B', 448, 62); g.fillText('C', 280, 350);

  var inA = function (w) { return A.indexOf(w) >= 0; },
      inB = function (w) { return B.indexOf(w) >= 0; },
      inC = function (w) { return C.indexOf(w) >= 0; };
  var all = [];
  [A, B, C].forEach(function (s) { s.forEach(function (w) { if (all.indexOf(w) < 0) all.push(w); }); });

  var regions = [
    { k: 'A',   x: 148, y: 110, ws: all.filter(function (w) { return inA(w) && !inB(w) && !inC(w); }) },
    { k: 'B',   x: 412, y: 110, ws: all.filter(function (w) { return !inA(w) && inB(w) && !inC(w); }) },
    { k: 'C',   x: 280, y: 300, ws: all.filter(function (w) { return !inA(w) && !inB(w) && inC(w); }) },
    { k: 'AB',  x: 280, y: 100, ws: all.filter(function (w) { return inA(w) && inB(w) && !inC(w); }) },
    { k: 'AC',  x: 196, y: 222, ws: all.filter(function (w) { return inA(w) && !inB(w) && inC(w); }) },
    { k: 'BC',  x: 364, y: 222, ws: all.filter(function (w) { return !inA(w) && inB(w) && inC(w); }) },
    { k: 'ABC', x: 280, y: 175, ws: all.filter(function (w) { return inA(w) && inB(w) && inC(w); }) }
  ];
  regions.forEach(function (r) {
    var y = r.y - (Math.min(r.ws.length, 4) - 1) * 8;
    r.ws.slice(0, 4).forEach(function (w, i) {
      var hi = (w === tpVHi);
      g.font = (hi ? '700 ' : '') + (r.k.length === 3 ? '12px' : '13px') + ' sans-serif';
      g.fillStyle = hi ? RD : (r.k.length >= 2 ? FG : MU);
      g.fillText(w, r.x, y + i * 17);
    });
    if (r.ws.length > 4) {
      g.font = '11px monospace'; g.fillStyle = MU;
      g.fillText('… 외 ' + (r.ws.length - 4) + '개', r.x, y + 4 * 17);
    }
  });

  var cap = txEl('tp-venn-cap');
  if (cap) {
    var abc = regions[6].ws;
    cap.innerHTML = '세 집합 모두에 있는 단어 ' + abc.length + '개' +
      (abc.length ? ' — ' + txEsc(abc.join(', ')) : '') +
      ' · n(A)+n(B)+n(C) = ' + (A.length + B.length + C.length) + ' · n(U) = ' + all.length +
      ' · 칩을 누르면 그 단어가 어느 영역에 있는지 붉게 표시됩니다.';
  }
}

/* U 상자 조립 */
function tpUReset(){
  tpU = [];
  tpUSorted = false;
  var enc = txEl('tp-uenc');
  if (enc) enc.innerHTML = '';
  tpURender('');
}

function tpURender(msg){
  var box = txEl('tp-uchips'), cnt = txEl('tp-ucnt'), ord = txEl('tp-uorder');
  if (!box) return;
  box.innerHTML = tpU.map(function (w) { return '<span class="tp-uchip">' + txEsc(w) + '</span>'; }).join(' ');
  if (cnt) cnt.textContent = 'n(U) = ' + tpU.length + (tpUSorted ? '  ·  U = { ' + tpU.join(', ') + ' }' : '');
  if (ord) ord.textContent = '정렬 기준: ' + (tpUSorted ? '가나다순' : (tpU.length ? '담은 순서' : '—'));
  if (msg) txFb('tp-u-fb', null, msg);
}

function tpUnion(step){
  var src = step === 1 ? (tpVSets.A || []).concat(tpVSets.B || []) : (tpVSets.C || []);
  if (step === 1) tpU = [];
  var dup = [];
  src.forEach(function (w) { if (tpU.indexOf(w) < 0) tpU.push(w); else if (dup.indexOf(w) < 0) dup.push(w); });
  tpUSorted = false;
  tpURender();
  var box = txEl('tp-uchips');
  if (box && dup.length && !txCalm()) {
    box.querySelectorAll('.tp-uchip').forEach(function (el) {
      if (dup.indexOf(el.textContent) >= 0) {
        el.classList.add('bounce');
        setTimeout(function () { el.classList.remove('bounce'); }, 500);
      }
    });
  }
  txFb('tp-u-fb', dup.length ? null : true,
    dup.length ? '이미 있습니다 — ' + txEsc(dup.join(', ')) + ' 은(는) U에 한 번만 들어갑니다.'
               : (step === 1 ? 'A ∪ B 를 담았습니다.' : '(A∪B) ∪ C 까지 담았습니다.'),
    'n(U) = ' + tpU.length + ' · 합집합에서 겹치는 원소는 한 번만 셉니다.');
}

function tpUSort(){
  if (!tpU.length) { txFb('tp-u-fb', false, '먼저 [A ∪ B] → [(A∪B) ∪ C] 를 눌러 U를 담아 주세요.'); return; }
  tpU.sort(function (a, b) { return a.localeCompare(b, 'ko'); });
  tpUSorted = true;
  tpURender();
  txFb('tp-u-fb', true, '가나다순으로 정렬했습니다.', 'U = { ' + txEsc(tpU.join(', ')) + ' } · n(U) = ' + tpU.length);
}

function tpUEncode(){
  var enc = txEl('tp-uenc');
  if (!enc) return;
  if (!tpU.length) { txFb('tp-u-fb', false, '먼저 U를 담고 정렬해 주세요.'); return; }
  var h = '<table class="tp-enc"><tr><th>단어</th>';
  tpU.forEach(function (w) { h += '<td>' + txEsc(w) + '</td>'; });
  h += '</tr><tr><th>번호</th>';
  tpU.forEach(function (w, i) { h += '<td class="i' + (txCalm() ? '' : ' slide') + '">' + (i + 1) + '</td>'; });
  h += '</tr></table>';
  enc.innerHTML = h +
    '<p class="tx-note" style="color:var(--muted);">번호는 이름표일 뿐입니다. 프로그램에 따라 0번부터 시작하기도 합니다.</p>';
}

function tpGuess(i){
  if (i === 1) {
    txFb('tp-guess-fb', true, '맞습니다 — 15개보다 적습니다.',
      '겹치는 단어는 <code>U</code>에 한 번만 들어가기 때문입니다. 따라서 항상 <code>n(U) ≤ n(A)+n(B)+n(C)</code> 입니다.');
  } else {
    txFb('tp-guess-fb', false, '정답은 "15개보다 적다"입니다.',
      '5+6+4 = 15 는 겹치는 단어를 여러 번 센 값입니다. 합집합에서는 겹치는 원소를 <b>한 번만</b> 세므로 15보다 작아집니다.');
  }
}

function tpGradeCheck(){
  var A = (tpVSets.A || []).length, B = (tpVSets.B || []).length, C = (tpVSets.C || []).length;
  var all = [];
  [tpVSets.A, tpVSets.B, tpVSets.C].forEach(function (s) {
    (s || []).forEach(function (w) { if (all.indexOf(w) < 0) all.push(w); });
  });
  var ans = { 'tp-gA': A, 'tp-gB': B, 'tp-gC': C, 'tp-gU': all.length };
  var ok = 0, tot = 0, detail = [];
  Object.keys(ans).forEach(function (id) {
    var el = txEl(id);
    if (!el) return;
    tot++;
    var v = parseInt(el.value, 10);
    var good = (v === ans[id]);
    el.className = 'tp-num ' + (el.value === '' ? '' : (good ? 'ok' : 'no'));
    if (good) ok++;
    detail.push(id.slice(-1) === 'U' ? 'n(U)' : ('n(' + id.slice(-1) + ')'));
  });
  if (ok === tot) {
    txFb('tp-grade-fb', true, '네 칸 모두 맞았습니다.',
      'n(A)+n(B)+n(C) = ' + (A + B + C) + ' 이고 n(U) = ' + all.length + ' 이므로, 겹쳐서 한 번만 센 횟수는 ' +
      (A + B + C - all.length) + ' 입니다. 이 아이디어가 10차시 자카드 유사도로 이어집니다.');
    var f = txEl('tp-final');
    if (f) f.innerHTML = '완성된 사전 — U = { ' +
      txEsc(all.slice().sort(function (a, b) { return a.localeCompare(b, 'ko'); }).join(', ')) + ' }';
  } else {
    txFb('tp-grade-fb', false, ok + ' / ' + tot + ' 칸이 맞았습니다. 다시 세어 보세요.',
      '집합의 원소는 <b>중복 없이</b> 셉니다. 벤다이어그램에서 겹치는 영역의 단어를 두 번 세지 않았는지 확인해 보세요.');
  }
}

/* ───────── 6차시 초기화 ───────── */

function tpInit(){
  if (tpInited) return;
  if (!txEl('tp-root')) return;
  tpInited = true;

  tpShotsRender();
  tpSentCount();
  tpCorpRender();

  tpOrder = TP_ORDER_ANS.slice();
  tpOrdShuffle();

  tpPreset('math');
  tpVPreset = 'note';
  tpVLoad('note');
  tpVPresetsRender();

  if (typeof videoDeck === 'function') videoDeck('tp-videos', 'text6', TP_VIDEOS);
  if (typeof warmStepper === 'function') warmStepper('tp-warm', 'tp', TP_WARM);
  if (typeof quizStepper === 'function') quizStepper('tp-quiz', 'tp', TP_QUIZ);
  if (typeof chipDefs === 'function') chipDefs('#v-text .tp-keys', TP_CHIPS);
  if (typeof wsLinks === 'function') wsLinks('tp-wslinks', 'text6');
}

/* ───────── 7차시 데이터 ───────── */

var TV_VIDEOS = [
  { id: '3m2oeuIbhSQ', t: '3-1. 원 핫 벡터 (5:15)', s: 'mathT야나수 〈인공지능 수학〉 · 주 디딤영상' },
  { id: 'dKYFfUtij_U', t: '[딥러닝 자연어처리] Bag of Words (5:08)', s: 'Minsuk Heo 허민석 · 빈도수 벡터' },
  { id: '80R3PprTP7U', t: '인공지능과 수학교육 2. 단어 빈도 수, 텍스트 자료의 시각화 (21:27)', s: '수학교육학자 김정현(단국대) · 선택 시청' }
];

/* 활동 ① — 노트북 후기 (동아 Ⅱ p.48·p.50 지면 순서를 하드코딩) */
var TV_INCL_DOCS = [
  { l: 'A', t: '이 노트북은 디자인이 좋아요.', s: ['노트북', '디자인', '좋다'] },
  { l: 'B', t: '이 노트북은 가벼워서 만족합니다.', s: ['노트북', '가볍다', '만족'] },
  { l: 'C', t: '화면이 커서 만족해요. 배송도 빨라요.', s: ['화면', '크다', '만족', '배송', '빠르다'] }
];
var TV_INCL_U = ['노트북', '디자인', '좋다', '가볍다', '만족', '화면', '크다', '배송', '빠르다'];

/* 활동 ② — 원-핫 (6차시에서 만든 U) */
var TV_OH_U = ['기반', '사고', '성장', '수학', '열쇠', '인공지능', '탐구'];
var TV_OH_MISSION = ['수학', '열쇠', '인공지능'];

/* 활동 ③ — 캠핑장 후기 (동아 Ⅱ p.54 표) */
var TV_TF_U = ['뷰', '좋다', '사진', '깨끗하다', '캠핑장', '차박', '온수', '화장실'];
var TV_TF_DOCS = [
  { l: '후기 A', t: '뷰가 좋아 사진이 잘 나와요. 깨끗한 캠핑장에서 사진 찍어요.' },
  { l: '후기 B', t: '뷰가 좋고, 깨끗한 차박에 좋은 캠핑장!' },
  { l: '후기 C', t: '캠핑장에 온수가 잘 나와요. 화장실도 깨끗하고 온수가 나와요.' }
];
var TV_TF_ANS = [[1, 1, 2, 1, 1, 0, 0, 0], [1, 2, 0, 1, 1, 1, 0, 0], [0, 0, 0, 1, 1, 0, 2, 1]];
var TV_TF_SURF = {
  '뷰': ['뷰'], '좋다': ['좋아', '좋고', '좋은'], '사진': ['사진'], '깨끗하다': ['깨끗한', '깨끗하고'],
  '캠핑장': ['캠핑장'], '차박': ['차박'], '온수': ['온수'], '화장실': ['화장실']
};

/* 활동 ③ 도전 — 미세먼지 기사 (활동지 문제 2) */
var TV_TF2_U = ['미세먼지', '증가', '마스크', '착용', '필수', '호흡기', '질환', '조심'];
var TV_TF2_DOCS = [
  { l: '기사 A', t: '미세먼지 증가, 마스크 착용하세요. 마스크 필수! 꼭 착용!' },
  { l: '기사 B', t: '미세먼지로 호흡기 질환이 증가하니 마스크를 착용하세요. 호흡기 질환 조심!' }
];
var TV_TF2_ANS = [[1, 1, 2, 2, 1, 0, 0, 0], [1, 1, 1, 1, 0, 2, 2, 1]];

/* 활동 ④ — 내장 리뷰 말뭉치 20건 (수업용 예시, 자체 작성) */
var TV_CORPUS20 = [
  '이 노트북은 디자인이 좋아요.', '이 노트북은 가벼워서 만족합니다.', '화면이 커서 만족해요. 배송도 빨라요.',
  '뷰가 좋아 사진이 잘 나와요.', '깨끗한 캠핑장에서 사진 찍어요.', '온수가 잘 나와서 좋았어요.',
  '화장실이 깨끗하고 관리가 잘 되어 있어요.', '차박 자리가 넓어서 편했습니다.', '가격이 저렴해서 다시 오고 싶어요.',
  '주차 공간이 부족해서 불편했습니다.', '직원이 친절해서 기분이 좋았어요.', '소음이 심해서 잠을 못 잤어요.',
  '전망이 훌륭하고 공기가 맑았습니다.', '와이파이가 느려서 답답했어요.', '침구가 깨끗해서 만족했습니다.',
  '아침 식사가 정갈하고 맛있었어요.', '위치가 좋아서 이동이 편했어요.', '난방이 약해서 조금 추웠습니다.',
  '아이들이 놀기에 안전한 공간이 있어요.', '사진 찍을 곳이 많아서 추천합니다.'
];

var TV_WARM = [
  { q: '6차시에서 만든 U = {노트북, 디자인, 좋다, 가볍다, 만족, 화면, 크다, 배송, 빠르다} 를 \'자\'로 삼아 후기 A(= {노트북, 디자인, 좋다}) 하나를 수의 나열로 적는다면, 수는 모두 몇 개가 필요할까요?',
    opts: ['① 3개 — 후기 A에 남은 단어의 개수만큼', '② 9개 — U의 원소 개수만큼', '③ 1개 — 문서마다 하나씩', '④ 정할 수 없다'],
    answer: 1,
    explain: '6차시 마지막에 "오늘 만든 <code>n(U)</code>가 다음 시간에는 <b>벡터의 차원</b>이 된다"고 예고했습니다. ' +
      'U의 <b>자리마다</b> 그 단어가 있는지 없는지를 적어야 하므로, 후기 A에 없는 \'가볍다·만족·화면…\' 자리에도 <b>0을 적습니다.</b> ' +
      '①처럼 3개만 적으면 어느 자리가 어떤 단어인지 알 수 없어 다른 후기와 나란히 놓을 수 없습니다. ' +
      '그리고 이렇게 생긴 <b>0으로 채워진 자리</b>가 오늘 활동 ④의 \'희소 벡터\' 이야기로 이어집니다.' },
  { q: '두 문장이 서로 얼마나 비슷한지 컴퓨터가 계산하려면, 두 벡터에서 먼저 같아야 하는 것은 무엇일까요?',
    opts: ['① 두 문장의 글자 수', '② 두 문장에 쓰인 단어의 순서',
           '③ 벡터의 차원(성분 개수)과, 몇 번째 자리가 어떤 단어인지', '④ 두 문장의 맞춤법'], answer: 2,
    explain: '길이가 다른 두 자로는 키를 비교할 수 없듯이, 자리의 뜻이 다른 두 벡터는 비교할 수 없습니다. ' +
      '그래서 문서마다 따로 만든 단어집합이 아니라 <b>모든 문서의 단어집합을 합친 전체집합 U를 공통의 자</b>로 삼고, ' +
      'U에 적힌 단어 순서를 그대로 벡터의 성분 순서로 씁니다. 오늘 활동 ①에서 이 \'자\'를 직접 만들어 봅니다.' },
  { q: '문서 A = "치킨 치킨 치킨 맛있다"를 (치킨, 맛있다) 순서의 벡터로 나타내면 어떻게 될까요?',
    opts: ['① (1, 1) 하나뿐입니다.', '② (3, 1) 하나뿐입니다.',
           '③ 포함관계 여부 벡터로는 (1, 1), 빈도수 벡터로는 (3, 1)이 됩니다.', '④ 이런 문장은 벡터로 나타낼 수 없습니다.'],
    answer: 2,
    explain: '같은 문서라도 <b>무엇을 재느냐에 따라 벡터가 달라집니다.</b> \'있다·없다\'만 재면 (1, 1)이고, ' +
      '\'몇 번 나왔나\'를 재면 (3, 1)입니다. 성취기준이 말하는 "<b>목적에 맞게</b> 표현한다"가 바로 이 뜻입니다. ' +
      '오늘은 세 가지 자(포함관계·원-핫·빈도수)를 차례로 써 보고, 마지막에 어느 자를 골라야 할지 판단해 봅니다.' }
];

var TV_QUIZ = [
  { q: 'U = {추천, 눈물, 감동, 영화, 지루하다, 잠, 스토리, 연기} 이고 후기 C = {스토리, 연기, 감동} 일 때, 후기 C의 포함관계 여부 벡터 c는?',
    opts: ['① (0, 0, 1, 0, 0, 0, 1, 1)', '② (1, 1, 1, 1, 0, 0, 0, 0)', '③ (0, 0, 1, 1, 0, 0, 1, 1)', '④ (1, 0, 1, 0, 0, 0, 1, 1)'],
    answer: 0,
    explain: 'U의 순서대로 자리를 세어야 합니다. \'감동\'은 셋째, \'스토리\'는 일곱째, \'연기\'는 여덟째이므로 그 세 자리만 1이고 나머지는 0입니다. ' +
      '③은 \'영화\'가 후기 C에 없는데 1로 넣은 오답이고, ④는 \'추천\'을 잘못 넣은 오답입니다. ' +
      '자리를 셀 때는 반드시 <b>U에 적힌 순서</b>를 그대로 따릅니다. (동아 교과서 Ⅱ p.51 문제 5를 재구성)' },
  { q: 'U = {기반, 사고, 성장, 수학, 열쇠, 인공지능, 탐구} 일 때, 단어 \'열쇠\'의 원-핫 벡터는?',
    opts: ['① (0, 0, 0, 1, 0, 0, 0)', '② (0, 0, 0, 0, 1, 0, 0)', '③ (0, 0, 0, 0, 0, 1, 0)', '④ (1, 1, 1, 1, 1, 1, 1)'],
    answer: 1,
    explain: '\'열쇠\'는 U에서 다섯 번째 단어이므로 <b>다섯째 성분만 1</b>이고 나머지는 모두 0입니다. ' +
      '①은 \'수학\', ③은 \'인공지능\'의 원-핫 벡터입니다. ④처럼 1이 여러 개인 벡터는 원-핫 벡터가 아닙니다. ' +
      '<b>원-핫 벡터에서 1은 정확히 하나</b>라는 점을 기억하세요.' },
  { q: '후기 C "캠핑장에 온수가 잘 나와요. 화장실도 깨끗하고 온수가 나와요."를 U = (뷰, 좋다, 사진, 깨끗하다, 캠핑장, 차박, 온수, 화장실) 순서의 빈도수 벡터로 나타내면?',
    opts: ['① (0, 0, 0, 1, 1, 0, 2, 1)', '② (0, 0, 0, 1, 1, 0, 1, 1)', '③ (0, 1, 0, 1, 1, 0, 2, 1)', '④ (1, 0, 0, 1, 1, 0, 2, 1)'],
    answer: 0,
    explain: '\'온수\'가 두 번 등장하므로 일곱째 성분이 <b>2</b>입니다. ②는 반복을 세지 않고 \'있다·없다\'로만 처리한 오답으로, ' +
      '이것은 포함관계 여부 벡터입니다. ③은 후기 C에 없는 \'좋다\'를, ④는 없는 \'뷰\'를 넣은 오답입니다. ' +
      '빈도수 벡터는 <b>등장 횟수</b>를 성분으로 씁니다. (동아 교과서 Ⅱ p.54 자료를 재구성)' },
  { q: '원-핫 벡터와 빈도수 벡터가 공통으로 가지는 한계로 알맞은 것은?',
    opts: ['① 단어가 몇 번 나왔는지 셀 수 없다.', '② 성분의 대부분이 0이며, 다루는 단어가 많아질수록 벡터의 차원이 매우 커진다.',
           '③ 두 문서를 서로 비교할 수 없다.', '④ 불용어를 제거할 수 없다.'], answer: 1,
    explain: '두 표현 모두 단어 하나가 자리 하나를 차지하므로, 어휘가 10만 개면 벡터의 차원도 10만이 됩니다. ' +
      '한 문서가 쓰는 단어는 그중 극히 일부여서 성분의 대부분이 0이 되는데, 이런 벡터를 <b>희소 벡터</b>라고 합니다. ' +
      '①은 빈도수 벡터가 해결한 문제이고, ③은 오히려 벡터로 바꾼 덕분에 가능해진 일이며, ④는 벡터 표현과 상관없는 전처리 단계의 이야기입니다. ' +
      '(씨마스 교과서 Ⅱ p.53 · 천재 「인공지능 수학」 지도서 Ⅱ 서술을 재구성)' },
  { q: '문서 P = "배송 빠르다 배송", 문서 Q = "배송 빠르다"를 (배송, 빠르다) 순서로 나타냈습니다. 옳은 설명은?',
    opts: ['① 포함관계 여부 벡터로 나타내면 두 문서가 (1, 1)로 서로 같아진다.', '② 빈도수 벡터로 나타내어도 두 문서가 서로 같아진다.',
           '③ 두 표현 모두에서 P와 Q는 서로 다른 벡터가 된다.', '④ 빈도수 벡터로 나타내면 P = (1, 1), Q = (2, 1)이 된다.'],
    answer: 0,
    explain: '포함관계 여부 벡터는 \'있다·없다\'만 보므로 P도 Q도 (1, 1)이 되어 <b>반복을 구분하지 못합니다.</b> ' +
      '반면 빈도수 벡터로는 P = (2, 1), Q = (1, 1)로 서로 달라지므로 ②·③은 틀리고, ④는 P와 Q를 바꿔 쓴 오답입니다. ' +
      '같은 두 문서라도 <b>어떤 표현을 고르느냐에 따라 \'같다\'와 \'다르다\'가 뒤집힙니다.</b> ' +
      '그래서 성취기준은 "목적에 맞게 표현"할 것을 요구합니다. 9차시에서는 이 차이가 유사도 값에 어떻게 나타나는지 확인합니다.' }
];

var TV_CHIPS = {
  '벡터·성분·차원':
    '<p><b>① 정의.</b> 하나 또는 여러 개의 데이터를 순서쌍의 형태로 표현한 것을 <b>벡터</b>라 하고, 기호로 a, b, c, …와 같이 나타냅니다. ' +
    '벡터 a = (a₁, a₂, …, a<sub>n</sub>)에서 괄호 안의 각 수를 벡터 a의 <b>성분</b>이라 하고, a₁을 첫째 성분, a₂를 둘째 성분이라고 합니다. ' +
    '<b>n개의 성분으로 이루어진 벡터를 n차원 벡터</b>라고 합니다. 두 벡터는 대응하는 성분이 모두 같을 때 서로 같습니다.</p>' +
    '<p><b>② 예시.</b> 장바구니 A에 사과 1개·오렌지 1개·바나나 2개가 들어 있다면 a = (1, 1, 2)인 3차원 벡터입니다. / ' +
    '벡터 X = (2, 1, 3, 0, 1)의 첫째 성분은 2, 넷째 성분은 0, 차원은 5입니다. / ' +
    '여기서 벡터는 \'크기와 방향을 갖는 양\'이 아니라 <b>데이터를 순서쌍으로 늘어놓은 것</b>으로 이해합니다.</p>' +
    '<p><b>③ 이번 차시 연결.</b> 오늘 만드는 모든 벡터의 차원은 <b>전체집합 U의 원소 개수</b>와 같습니다. ' +
    '활동 ①에서 단어 9개짜리 U로 9차원 벡터를, 활동 ②에서 단어 7개짜리 U로 7차원 벡터를 직접 만들어 봅니다.</p>' +
    '<p><b>④ 차시 연결.</b> ← 6차시 「텍스트를 집합으로」에서 U를 만들었습니다 / → 9차시 「유사도」에서 이 벡터들의 거리와 방향을 잽니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tvGoAct(1)">활동 ①로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'text\',\'pre\')">6차시 · 집합으로 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'sim\')">9차시 · 유사도 →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.49 · 동아 교과서 Ⅱ p.49 서술을 재구성</p>',

  '포함관계 여부 벡터':
    '<p><b>① 정의.</b> 전체집합 U의 각 단어가 해당 문서에 <b>포함되어 있으면 1, 없으면 0</b>으로 나타낸 벡터입니다. ' +
    '문서 하나가 벡터 하나에 대응하며, 벡터의 차원은 U의 원소 개수와 같습니다. ' +
    '단어가 몇 번 쓰였는지는 구분하지 않고 <b>있다·없다만</b> 기록합니다.</p>' +
    '<p><b>② 예시.</b> U = {노트북, 디자인, 좋다, 가볍다, 만족, 화면, 크다, 배송, 빠르다}일 때, ' +
    '후기 A "이 노트북은 디자인이 좋아요."는 a = (1, 1, 1, 0, 0, 0, 0, 0, 0)입니다. / ' +
    '표어 A "수학으로 혁신하고 수학으로 발전하는 인공지능!"은 U = {수학, 혁신, 발전, 인공지능, 꽃, 산물}에서 (1, 1, 1, 1, 0, 0)이 됩니다. ' +
    '\'수학\'이 두 번 쓰였지만 성분은 1입니다.</p>' +
    '<p><b>③ 이번 차시 연결.</b> 활동 ①에서 후기 세 개의 표를 직접 채워 세 벡터를 만들고, 문서를 하나 더 추가해 ' +
    '<b>다른 문장인데 같은 벡터가 되는 경우</b>를 찾아봅니다.</p>' +
    '<p><b>④ 차시 연결.</b> ← 6차시의 합집합 U 만들기 / → 10차시 자카드 유사도에서 \'있다·없다\'만으로도 유사도를 잴 수 있음을 확인합니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tvGoAct(1)">활동 ①로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'text\',\'pre\')">6차시 · 집합으로 →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.50 · 동아 교과서 Ⅱ p.50 · 미래엔 「인공지능 수학」 Ⅱ 서술을 재구성</p>',

  '원-핫 벡터':
    '<p><b>① 정의.</b> 원-핫 벡터는 <b>전체집합의 원소의 개수를 벡터의 차원</b>으로 하되, 표현하고자 하는 단어에 대응하는 성분에만 <b>1</b>을, ' +
    '그 이외의 성분에는 <b>0</b>을 부여하는 벡터입니다. 단어 간의 관계를 생각하지 않고 각 단어가 독립적으로 존재한다고 가정하며, ' +
    '<b>단어 하나마다 벡터 하나</b>가 만들어집니다.</p>' +
    '<p><b>② 예시.</b> U = {기반, 사고, 성장, 수학, 열쇠, 인공지능, 탐구}에서 \'수학\'은 네 번째 자리이므로 (0, 0, 0, 1, 0, 0, 0)입니다. / ' +
    '범주형 자료에도 씁니다. 혈액형 A·B·O·AB를 순서대로 놓으면 A형은 (1, 0, 0, 0), AB형은 (0, 0, 0, 1)입니다.</p>' +
    '<p><b>③ 이번 차시 연결.</b> 활동 ②에서 7칸 격자의 스위치를 눌러 원-핫 벡터를 만듭니다. ' +
    '이때 <b>1을 두 개 켜면 원-핫이 아니라는 피드백</b>이 뜹니다. 또 두 원-핫 벡터가 겹치는 자리가 하나도 없다는 점에서, ' +
    '원-핫만으로는 \'늑대\'와 \'개\'가 비슷하다는 사실을 나타낼 수 없음을 확인합니다.</p>' +
    '<p><b>④ 차시 연결.</b> ← 6차시 정수 인코딩(단어에 번호 붙이기)이 원-핫의 \'몇 번째 자리\'가 됩니다 / ' +
    '→ 4단원 퍼셉트론·분류에서 범주를 입력값으로 넣을 때 다시 만납니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tvGoAct(2)">활동 ②로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'text\',\'pre\')">6차시 · 정수 인코딩 →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.50 \'지식 Plus 원-핫 벡터\' · 동아 교과서 Ⅱ p.51 · 미래엔 「인공지능 수학」 Ⅱ · 천재 「인공지능 수학」 지도서 Ⅱ 서술을 재구성</p>',

  '빈도수 벡터(단어가방 모형)':
    '<p><b>① 정의.</b> 텍스트 데이터에서 불용어를 제거하고 남은 단어를 하나의 가방에 넣은 다음, 가방에 들어 있는 ' +
    '<b>단어별 빈도수를 세어 벡터의 성분으로 표현한 것을 단어가방 모형</b>이라 하고, ' +
    '단어별 빈도수를 성분으로 하는 벡터를 <b>빈도수 벡터</b>라고 합니다. 단어의 순서는 무시하고 등장 횟수만 기록합니다.</p>' +
    '<p><b>② 예시.</b> 후기 A "뷰가 좋아 사진이 잘 나와요. 깨끗한 캠핑장에서 사진 찍어요."는 ' +
    'U = {뷰, 좋다, 사진, 깨끗하다, 캠핑장, 차박, 온수, 화장실}에서 a = (1, 1, 2, 1, 1, 0, 0, 0)입니다. ' +
    '\'사진\'이 두 번 나왔으므로 셋째 성분이 2입니다. / 세 후기를 모두 합한 말뭉치의 벡터는 ' +
    'u = a + b + c = (2, 3, 2, 3, 3, 1, 2, 1)이고, 성분이 가장 큰 \'좋다·깨끗하다·캠핑장\'이 전체의 주제어가 됩니다.</p>' +
    '<p><b>③ 이번 차시 연결.</b> 활동 ③에서 24칸짜리 빈도수 표를 직접 채우면 <b>칸마다 즉시 채점</b>됩니다. ' +
    '표를 다 채우면 세 벡터가 자동으로 조립되고, 성분이 가장 큰 단어에 \'주제어\' 배지가 붙습니다.</p>' +
    '<p><b>④ 차시 연결.</b> ← 활동 ①의 포함관계 벡터로는 반복을 구분할 수 없었습니다 / ' +
    '→ 8차시 TF-IDF에서 이 빈도수(TF)에 \'흔한 단어를 깎는\' IDF를 곱합니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tvGoAct(3)">활동 ③으로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'tfidf\')">8차시 · TF-IDF →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.51~52 \'단어별 빈도수 벡터를 나타내는 과정\' · 동아 교과서 Ⅱ p.54~55 · 미래엔 「인공지능 수학」 Ⅱ 서술을 재구성</p>',

  '희소 벡터와 밀집 벡터':
    '<p><b>① 정의.</b> 원-핫 벡터나 빈도수 벡터처럼 <b>대부분의 성분이 0인 벡터를 희소(sparse) 벡터</b>라고 합니다. ' +
    '어휘가 늘어날수록 차원이 커지고 0이 차지하는 비율도 커져 저장과 계산이 비효율적이며, 단어끼리 의미가 비슷한지 나타낼 방법이 없습니다. ' +
    '이와 달리 <b>단어의 의미를 여러 차원에 나누어 실수로 표현한 낮은 차원의 벡터를 밀집(dense) 벡터</b>라고 하며, ' +
    '이렇게 만든 벡터를 단어 임베딩 벡터라고 합니다.</p>' +
    '<p><b>② 예시.</b> 주요 단어가 10만 개인 말뭉치에서 한 문서에 200개의 단어만 쓰였다면, 그 문서의 빈도수 벡터는 ' +
    '10만 개의 성분 중 최대 200개만 0이 아닙니다. 곧 <b>99.8% 이상이 0</b>입니다. / ' +
    '밀집 벡터에서는 의미가 비슷한 단어가 서로 가까이 놓여, \'왕 − 남자 + 여자 ≈ 여왕\'과 같은 관계가 벡터의 계산으로 드러납니다. ' +
    '<span class="tx-badge warn">선택 심화</span></p>' +
    '<p><b>③ 이번 차시 연결.</b> 활동 ④에서 우리가 만든 표의 <b>0의 비율을 직접 계산</b>하고, 문서 수를 늘려 가며 ' +
    '0의 비율이 어떻게 변하는지 관찰합니다. 밀집 벡터는 맛보기로만 다루며 <b>평가 대상이 아닙니다.</b></p>' +
    '<p><b>④ 차시 연결.</b> → 8차시 TF-IDF는 희소 표현을 유지한 채 성분의 \'무게\'를 바꾸는 방법입니다 / ' +
    '→ 9차시에서 희소 벡터끼리의 거리와 각을 잽니다.</p>' +
    '<div class="btn-row"><button class="btn tx-mini" type="button" onclick="tvGoAct(4)">활동 ④로 이동 →</button>' +
    '<button class="btn tx-mini" type="button" onclick="go(\'tfidf\')">8차시 · TF-IDF →</button></div>' +
    '<p class="tx-src">출처: 씨마스 교과서 Ⅱ p.53 \'원-핫 벡터나 빈도수 벡터의 두 가지 문제점\'·\'AI 스토리 단어 임베딩\' · ' +
    '천재 「인공지능 수학」 지도서 Ⅱ · 연수교재 합본 5-6차시 원고 서술을 재구성</p>'
};
/* ───────── 7차시 상태 ───────── */

var tvInited = false;
var tvU = TV_INCL_U.slice();
var tvDocs = TV_INCL_DOCS.slice();
var tvUOrderNote = '교과서 등장 순서 (동아 Ⅱ p.48)';
var tvCell = [];        /* 학생이 채운 포함관계 표 값 */
var tvTouch = [];       /* 칸을 눌러 본 적이 있는가 */
var tvOh = [];          /* 원-핫 스위치 상태 */
var tvOhStep = 0;
var tvOhDone = [];
var tvOhWordMode = true;
var tvTf = [];          /* 캠핑장 표 입력 */
var tvTf2 = [];         /* 도전 표 입력 */
var tvTfU = TV_TF_U.slice();
var tvTfDocs = TV_TF_DOCS.slice();
var tvTfAns = TV_TF_ANS.map(function (r) { return r.slice(); });
var tvTfTitle = '캠핑장 후기';
var tvDocNIdx = 0;
var TV_DOCN = [3, 5, 10, 20];
var tvSituN = 1;
var TX_ORD1 = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째', '일곱 번째', '여덟 번째', '아홉 번째', '열 번째'];
var TX_ORD2 = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째'];

function tvTab(n, el){
  var i = parseInt(n, 10) || 0, tabs = document.querySelectorAll('#tv-tabs .tab'), k;
  for (k = 0; k < tabs.length; k++) tabs[k].classList.toggle('on', k === i);
  for (k = 0; k < 4; k++) {
    var p = txEl('tvp' + k);
    if (p) p.classList.toggle('on', k === i);
  }
  if (el && el.classList) el.classList.add('on');
  if (i === 3) { tvSparsity(); tvDocN(tvDocNIdx); }
}

/* 학습 목표 카드 → 활동으로 이동 (n = 1~4) */
function tvGoAct(n){
  txLesson(7);
  tvTab(Math.max(1, Math.min(4, parseInt(n, 10) || 1)) - 1);
  txScrollTo(txEl('tv-tabs'));
}

/* ───────── 7차시 · 도입 실자료 ───────── */

function tvSituRender(){
  var box = txEl('tv-situ-btns'), fig = txEl('tv-situ');
  if (!box) return;
  box.innerHTML = '';
  [1, 2, 3, 4, 5].forEach(function (n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn tx-mini' + (n === tvSituN ? ' pri' : '');
    b.textContent = '상황 ' + n;
    b.addEventListener('click', function () {
      tvSituN = n;
      var img = fig && fig.querySelector('img');
      if (img) { fig.classList.remove('nofoto'); img.src = 'assets/situations/상황' + n + '.jpg'; }
      tvSituRender();
    });
    box.appendChild(b);
  });
}

function tvSentSave(){
  var vals = ['tv-s1', 'tv-s2', 'tv-s3'].map(function (id) {
    var el = txEl(id); return el ? el.value.trim() : '';
  }).filter(function (t) { return t.length > 0; });
  if (!vals.length) { txFb('tv-sent-fb', false, '문장을 한 개 이상 입력해 주세요.'); return; }
  var a = txCorpusLoad();
  vals.forEach(function (t) {
    if (!a.some(function (it) { return it.t === t; })) a.push({ t: t, s: tvSituN, m: true });
  });
  txCorpusSave(a);
  txFb('tv-sent-fb', true, vals.length + '개 문장을 저장했습니다.',
    '활동 ①의 [문서 추가 +]와 활동 ③의 [우리 반 문장 넣기]에서 이 문장을 그대로 불러 씁니다. (키 <code>aimath.corpus.mysent</code>)');
}

function tvSentLoad(){
  var a = txCorpusLoad().slice(-3);
  if (!a.length) { txFb('tv-sent-fb', false, '저장된 문장이 없습니다.', '6차시 활동 ①에서 문장을 먼저 모아 주세요.'); return; }
  ['tv-s1', 'tv-s2', 'tv-s3'].forEach(function (id, i) {
    var el = txEl(id);
    if (el && a[i]) el.value = a[i].t;
  });
  txFb('tv-sent-fb', true, '6차시에서 모은 문장을 불러왔습니다.', '같은 키(<code>aimath.corpus.mysent</code>)를 씁니다.');
}

/* ───────── 7차시 · 활동 ① 포함관계 여부 벡터 ───────── */

function tvInclReset(){
  tvU = TV_INCL_U.slice();
  tvDocs = TV_INCL_DOCS.map(function (d) { return { l: d.l, t: d.t, s: d.s.slice() }; });
  tvUOrderNote = '교과서 등장 순서 (동아 Ⅱ p.48)';
  tvCell = []; tvTouch = [];
  var sets = txEl('tv-sets'), ub = txEl('tv-ubox'), uo = txEl('tv-uorder'),
      tb = txEl('tv-incl-tblwrap'), vs = txEl('tv-incl-vecs');
  if (sets) sets.innerHTML = '';
  if (ub) ub.textContent = '';
  if (uo) uo.textContent = '';
  if (tb) tb.innerHTML = '';
  if (vs) vs.innerHTML = '';
  txFb('tv-incl-fb', null, '');
  tvInclProg();
}

function tvBuildSets(){
  var box = txEl('tv-sets');
  if (!box) return;
  box.innerHTML = '';
  tvDocs.forEach(function (d, i) {
    var el = document.createElement('div');
    el.className = 'tp-setcard';
    if (!txCalm()) el.style.animation = 'txSlide .3s ease-out both ' + (i * 0.12) + 's';
    el.innerHTML = '<p class="tx-note" style="margin:0;">후기 ' + txEsc(d.l) + ' — ' + txEsc(d.t) + '</p>' +
      '<p class="tx-set">' + txEsc(d.l) + ' = { ' + d.s.map(txEsc).join(', ') + ' }</p>' +
      '<p class="n">n(' + txEsc(d.l) + ') = ' + d.s.length + '</p>';
    box.appendChild(el);
  });
  txFb('tv-incl-fb', null, '단어집합을 만들었습니다. 이제 [U 만들기]로 공통의 자를 만들어 보세요.');
}

function tvBuildU(){
  var ub = txEl('tv-ubox'), uo = txEl('tv-uorder');
  if (ub) ub.innerHTML = 'U = { ' + tvU.map(txEsc).join(', ') + ' } &nbsp; <span class="tag">차원 = ' + tvU.length + '</span>';
  if (uo) uo.textContent = '정렬 기준: ' + tvUOrderNote;
  tvInclTable();
}

function tvInclAnswer(r, c){
  var d = tvDocs[r];
  return (d && d.s.indexOf(tvU[c]) >= 0) ? 1 : 0;
}

function tvInclTable(){
  var wrap = txEl('tv-incl-tblwrap');
  if (!wrap) return;
  var R = tvDocs.length, C = tvU.length, r, c;
  for (r = 0; r < R; r++) {
    if (!tvCell[r]) tvCell[r] = [];
    if (!tvTouch[r]) tvTouch[r] = [];
    for (c = 0; c < C; c++) {
      if (tvCell[r][c] === undefined) tvCell[r][c] = 0;
      if (tvTouch[r][c] === undefined) tvTouch[r][c] = false;
    }
  }
  var h = '<table class="tv-tbl"><tr><th class="rowh"></th>';
  tvU.forEach(function (w) { h += '<th>' + txEsc(w) + '</th>'; });
  h += '</tr>';
  for (r = 0; r < R; r++) {
    h += '<tr><th class="rowh">후기 ' + txEsc(tvDocs[r].l) + '</th>';
    for (c = 0; c < C; c++) {
      var t = tvTouch[r][c], ok = (tvCell[r][c] === tvInclAnswer(r, c));
      h += '<td><button type="button" class="tv-cell' + (t ? (ok ? ' ok' : ' no') : '') +
        '" data-r="' + r + '" data-c="' + c + '" aria-label="후기 ' + txEsc(tvDocs[r].l) + ' · ' + txEsc(tvU[c]) + '">' +
        tvCell[r][c] + '</button>' +
        '<span class="tv-mk ' + (t ? (ok ? 'ok' : 'no') : '') + '">' + (t ? (ok ? '✓' : '✗') : '') + '</span></td>';
    }
    h += '</tr>';
  }
  h += '</table>';
  wrap.innerHTML = h;
  wrap.querySelectorAll('.tv-cell').forEach(function (b) {
    b.addEventListener('click', function () {
      var r0 = +b.getAttribute('data-r'), c0 = +b.getAttribute('data-c');
      tvCell[r0][c0] = tvCell[r0][c0] ? 0 : 1;
      tvTouch[r0][c0] = true;
      tvInclTable();
      tvInclProg();
    });
  });
  tvInclProg();
}

function tvInclProg(){
  var R = tvDocs.length, C = tvU.length, filled = 0, right = 0, r, c;
  for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
    if (tvTouch[r] && tvTouch[r][c]) {
      filled++;
      if (tvCell[r][c] === tvInclAnswer(r, c)) right++;
    }
  }
  var tot = R * C;
  var p = txEl('tv-incl-prog'), bar = txEl('tv-incl-bar');
  if (p) p.textContent = '채운 칸 ' + filled + '/' + tot + ' · 맞은 칸 ' + right;
  if (bar) bar.style.width = (tot ? Math.round(filled / tot * 100) : 0) + '%';

  /* 행이 모두 정답이면 그 행의 벡터를 조립해 보여 줍니다. */
  var box = txEl('tv-incl-vecs');
  if (!box) return;
  var out = '';
  for (r = 0; r < R; r++) {
    var all = !!tvCell[r];
    for (c = 0; all && c < C; c++) if (tvCell[r][c] !== tvInclAnswer(r, c)) { all = false; }
    if (all) {
      var v = [];
      for (c = 0; c < C; c++) v.push(tvInclAnswer(r, c));
      out += '<p class="tv-vec' + (txCalm() ? '' : ' sl') + '">' +
        tvDocs[r].l.toLowerCase() + ' = (' + v.join(', ') + ')</p>';
    }
  }
  box.innerHTML = out;
  if (out && filled === tot && right === tot) {
    txFb('tv-incl-fb', true, '27칸을 모두 맞혔습니다.',
      '세 벡터는 모두 ' + C + '차원입니다. <b>차원이 같아야 비교가 가능</b>하며, 그 차원을 정해 주는 것이 전체집합 U입니다.');
  }
}

function tvAddDoc(){
  var arr = txCorpusLoad();
  if (!arr.length) { txFb('tv-incl-fb', false, '저장된 우리 반 문장이 없습니다.', 'STEP 1의 「같은 장면, 다른 문장」에서 문장을 먼저 저장해 주세요.'); return; }
  if (tvDocs.length >= 6) { txFb('tv-incl-fb', false, '문서는 6개까지만 추가할 수 있습니다.'); return; }
  var t = arr[arr.length - 1].t;
  var stops = TP_STOP_BASE;
  var ws = tokenize(t).map(function (tk) { return TP_LEMMA[tk] || removeStopwordsFromWord(tk, stops) || tk; })
    .filter(function (w) { return stops.indexOf(w) < 0; });
  var s = [];
  ws.forEach(function (w) { if (s.indexOf(w) < 0) s.push(w); });
  var label = String.fromCharCode(65 + tvDocs.length);
  tvDocs.push({ l: label, t: t, s: s });
  var add = s.filter(function (w) { return tvU.indexOf(w) < 0; })
              .sort(function (a, b) { return a.localeCompare(b, 'ko'); });
  tvU = tvU.concat(add);
  tvUOrderNote = '교과서 등장 순서 + 학생 입력 문서(가나다순 추가)';
  tvBuildSets();
  tvBuildU();
  txFb('tv-incl-fb', null,
    '후기 ' + label + ' 를 넣었습니다 — U에 새 단어 ' + add.length + '개가 들어와 차원이 ' + tvU.length + '이 되었습니다.',
    '표의 열이 늘어나면서 <b>기존 세 벡터의 차원도 함께 커집니다.</b> 늘어난 자리는 대부분 0으로 채워집니다(활동 ④로 이어집니다).');
}

function tvMissionCheck(){
  var ta = txEl('tv-mission');
  if (!ta) return;
  var t = ta.value.trim();
  if (!t) { txFb('tv-mission-fb', false, '문장을 입력해 주세요.'); return; }
  var stops = TP_STOP_BASE;
  var ws = tokenize(t).map(function (tk) { return TP_LEMMA[tk] || removeStopwordsFromWord(tk, stops) || tk; })
    .filter(function (w) { return stops.indexOf(w) < 0; });
  var v = tvU.map(function (w) { return ws.indexOf(w) >= 0 ? 1 : 0; });
  var c = tvU.map(function (w) { return (tvDocs[2] && tvDocs[2].s.indexOf(w) >= 0) ? 1 : 0; });
  var same = v.join(',') === c.join(',');
  var box = txEl('tv-mission-vec');
  if (box) box.innerHTML =
    '<p class="tv-vec">c &nbsp;&nbsp;&nbsp;= (' + c.join(', ') + ')</p>' +
    '<p class="tv-vec">내 문장 = (' + v.join(', ') + ')</p>';
  var diff = [];
  tvU.forEach(function (w, i) { if (v[i] !== c[i]) diff.push(w); });
  if (same) {
    txFb('tv-mission-fb', true, '성공 — 문장은 다른데 벡터는 완전히 같습니다.',
      '포함관계 여부 벡터는 \'있다·없다\'만 보므로 <b>반복도 순서도 구분하지 못합니다.</b> 이 한계가 활동 ③의 빈도수 벡터로 이어집니다.');
  } else {
    txFb('tv-mission-fb', false, '아직 다릅니다 — 어긋난 자리: ' + txEsc(diff.join(', ')),
      '후기 C의 단어집합은 { ' + txEsc((tvDocs[2] ? tvDocs[2].s : []).join(', ')) + ' } 입니다. ' +
      '같은 단어들이 모두 들어가고 다른 단어는 들어가지 않도록 문장을 고쳐 보세요. ' +
      '(예: "만족스러운 화면 크기, 배송도 빨랐습니다.")');
  }
}

/* ───────── 7차시 · 활동 ② 원-핫 벡터 ───────── */

function tvOhRender(){
  var grid = txEl('tv-oh-grid'), vec = txEl('tv-oh-vec'), goal = txEl('tv-oh-goal');
  if (!grid) return;
  if (!tvOh.length) tvOh = TV_OH_U.map(function () { return 0; });
  grid.innerHTML = '';
  TV_OH_U.forEach(function (w, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tv-sws' + (tvOh[i] ? ' on' : '');
    b.setAttribute('aria-pressed', tvOh[i] ? 'true' : 'false');
    b.innerHTML = '<span class="idx">' + (i + 1) + '번째</span><span class="w">' + txEsc(w) + '</span>' +
      '<span class="v">' + tvOh[i] + '</span>';
    b.addEventListener('click', function () { tvOh[i] = tvOh[i] ? 0 : 1; tvOhRender(); tvOhCheck(); });
    grid.appendChild(b);
  });
  if (vec) vec.textContent = '( ' + tvOh.join(', ') + ' )';
  if (goal) goal.innerHTML = tvOhStep < TV_OH_MISSION.length
    ? '미션 ' + (tvOhStep + 1) + ' / 3 — 목표 단어: <b>' + txEsc(TV_OH_MISSION[tvOhStep]) + '</b>'
    : '미션 3 / 3 완료 — [세 벡터 겹쳐 보기]를 눌러 확인해 보세요.';
}

function tvOhCheck(){
  var ones = tvOh.reduce(function (a, b) { return a + b; }, 0);
  if (ones > 1) {
    txFb('tv-oh-fb', false, '원-핫 벡터에서 1은 정확히 하나입니다. 지금은 1이 ' + ones + '개입니다.',
      '표현하려는 단어의 자리만 1로 두고 나머지는 모두 0으로 두어야 합니다.');
    return;
  }
  if (ones === 0) { txFb('tv-oh-fb', null, ''); return; }
  var idx = tvOh.indexOf(1), word = TV_OH_U[idx];
  var target = TV_OH_MISSION[tvOhStep];
  if (tvOhStep < TV_OH_MISSION.length && word === target) {
    var v = tvOh.slice();
    tvOhDone.push({ w: word, v: v });
    tvOhStep++;
    var list = txEl('tv-oh-list');
    if (list) list.innerHTML = tvOhDone.map(function (d) {
      return '<p class="tv-vec' + (txCalm() ? '' : ' sl') + '">' + txEsc(d.w) + ' = (' + d.v.join(', ') + ')</p>';
    }).join('');
    txFb('tv-oh-fb', true, '성공 — \'' + txEsc(word) + '\'은 U에서 ' + TX_ORD1[idx] + ' → ' + TX_ORD2[idx] + ' 성분만 1입니다.',
      tvOhStep < TV_OH_MISSION.length
        ? '다음 목표 단어는 <b>' + txEsc(TV_OH_MISSION[tvOhStep]) + '</b> 입니다. [모두 끄기]를 누르고 다시 만들어 보세요.'
        : '세 벡터를 모두 만들었습니다. [세 벡터 겹쳐 보기]로 겹치는 자리가 있는지 확인해 보세요.');
    tvOhRender();
  } else {
    txFb('tv-oh-fb', null, '지금 켠 자리는 ' + TX_ORD1[idx] + ' \'' + txEsc(word) + '\' 입니다.' +
      (target ? ' 목표 단어는 \'' + txEsc(target) + '\' 입니다.' : ''));
  }
}

function tvOhClear(){ tvOh = TV_OH_U.map(function () { return 0; }); tvOhRender(); txFb('tv-oh-fb', null, ''); }

function tvOhOverlap(){
  var box = txEl('tv-oh-ovl');
  if (!box) return;
  if (tvOhDone.length < 2) {
    txFb('tv-oh-fb', false, '먼저 미션을 두 개 이상 완성해 주세요.');
    return;
  }
  var h = '<table class="tv-ovl"><tr><th>단어</th>';
  TV_OH_U.forEach(function (w, i) { h += '<th>' + (i + 1) + '<br>' + txEsc(w) + '</th>'; });
  h += '</tr>';
  var sum = TV_OH_U.map(function () { return 0; });
  tvOhDone.forEach(function (d) {
    h += '<tr><th>' + txEsc(d.w) + '</th>';
    d.v.forEach(function (x, i) { sum[i] += x; h += '<td' + (x ? ' class="one"' : '') + '>' + x + '</td>'; });
    h += '</tr>';
  });
  h += '<tr><th>겹침</th>';
  var overlap = 0;
  sum.forEach(function (x) { if (x > 1) overlap++; h += '<td>' + (x > 1 ? '겹침' : '–') + '</td>'; });
  h += '</tr></table>';
  box.innerHTML = h;
  txFb('tv-oh-fb', true, '같은 자리에 1이 동시에 있는 칸: ' + overlap + '개',
    '어떤 두 단어를 골라도 겹치는 자리가 없습니다. 그래서 원-핫 벡터만으로는 ' +
    '\'늑대\'와 \'개\'가 \'늑대\'와 \'책상\'보다 가깝다는 사실을 나타낼 방법이 없습니다.');
}

function tvOhMode(){
  tvOhWordMode = !tvOhWordMode;
  var lb = txEl('tv-oh-mode');
  if (lb) lb.textContent = tvOhWordMode ? '[문서 → 벡터] ↔ [단어 → 벡터]' : '[단어 → 벡터] ↔ [문서 → 벡터]';
  txFb('tv-oh-fb', null, tvOhWordMode
    ? '지금은 <b>단어 → 벡터</b> 입니다. 표의 첫 열 머리글이 <b>단어</b>이고, 행 하나가 단어 하나를 나타냅니다(1은 정확히 하나).'
    : '활동 ①의 <b>문서 → 벡터</b> 와 비교해 보세요. 그 표는 첫 열 머리글이 <b>문서</b>였고, 행 하나가 문서 하나를 나타냈습니다(1이 여러 개).');
  var box = txEl('tv-oh-ovl');
  if (box) box.querySelectorAll('.tv-ovl th').forEach(function (th, i) {
    if (i === 0) th.textContent = tvOhWordMode ? '단어' : '문서';
  });
}
/* ───────── 7차시 · 활동 ③ 빈도수 벡터 (자동 채점) ───────── */

function tvTfMax(row){
  var m = Math.max.apply(null, row), out = [];
  row.forEach(function (v, i) { if (v === m && m > 0) out.push(i); });
  return out;
}

function tvTfGrid(which){
  var isMain = (which !== 2);
  var U = isMain ? tvTfU : TV_TF2_U;
  var docs = isMain ? tvTfDocs : TV_TF2_DOCS;
  var ans = isMain ? tvTfAns : TV_TF2_ANS;
  var val = isMain ? tvTf : tvTf2;
  var wrap = txEl(isMain ? 'tv-tf-tblwrap' : 'tv-tf2-tblwrap');
  if (!wrap) return;
  var R = docs.length, C = U.length, r, c;
  for (r = 0; r < R; r++) { if (!val[r]) val[r] = []; for (c = 0; c < C; c++) if (val[r][c] === undefined) val[r][c] = ''; }

  var h = '<table class="tv-tbl"><tr><th class="rowh"></th>';
  U.forEach(function (w) { h += '<th>' + txEsc(w) + '</th>'; });
  h += '</tr>';
  for (r = 0; r < R; r++) {
    h += '<tr><th class="rowh">' + txEsc(docs[r].l) + '</th>';
    for (c = 0; c < C; c++) {
      var v = val[r][c], done = (v !== '' && v !== null), ok = (parseInt(v, 10) === ans[r][c]);
      var heat = (done && ok && ans[r][c] > 0) ? ' style="background:rgba(200,185,166,' + Math.min(0.2 + ans[r][c] * 0.25, 0.85) + ');"' : '';
      h += '<td class="tv-heat"' + heat + '><input class="tv-in' + (done ? (ok ? ' ok' : ' no') : '') +
        '" type="number" min="0" inputmode="numeric" value="' + txEsc(v) + '" ' +
        'data-w="' + which + '" data-r="' + r + '" data-c="' + c + '" ' +
        'aria-label="' + txEsc(docs[r].l) + ' · ' + txEsc(U[c]) + '">' +
        '<span class="tv-mk ' + (done ? (ok ? 'ok' : 'no') : '') + '">' + (done ? (ok ? '✓' : '✗') : '') + '</span></td>';
    }
    h += '</tr>';
  }
  /* 합계 행 — 모든 칸이 정답일 때만 */
  var allOk = true;
  for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (parseInt(val[r][c], 10) !== ans[r][c]) allOk = false;
  if (allOk) {
    h += '<tr><th class="rowh">합계 u</th>';
    for (c = 0; c < C; c++) {
      var s = 0;
      for (r = 0; r < R; r++) s += ans[r][c];
      h += '<td style="font-family:var(--mono);font-weight:700;">' + s + '</td>';
    }
    h += '</tr>';
  }
  h += '</table>';
  wrap.innerHTML = h;

  wrap.querySelectorAll('.tv-in').forEach(function (el) {
    el.addEventListener('blur', function () { tvGradeCell(el); });
    el.addEventListener('keydown', function (e) { tvTfKey(e, el); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); tvTfHint(el); });
    var timer = null;
    el.addEventListener('touchstart', function () { timer = setTimeout(function () { tvTfHint(el); }, 600); }, { passive: true });
    el.addEventListener('touchend', function () { if (timer) clearTimeout(timer); });
  });
  tvTfProg(which);
}

function tvGradeCell(el){
  var which = +el.getAttribute('data-w'), r = +el.getAttribute('data-r'), c = +el.getAttribute('data-c');
  var isMain = (which !== 2);
  var val = isMain ? tvTf : tvTf2;
  var ans = isMain ? tvTfAns : TV_TF2_ANS;
  var v = el.value.trim();
  val[r][c] = v;
  if (v === '') { el.className = 'tv-in'; tvTfProg(which); return; }
  var ok = (parseInt(v, 10) === ans[r][c]);
  el.className = 'tv-in ' + (ok ? 'ok' : 'no' + (txCalm() ? '' : ' shake'));
  var mk = el.parentNode && el.parentNode.querySelector('.tv-mk');
  if (mk) { mk.className = 'tv-mk ' + (ok ? 'ok' : 'no'); mk.textContent = ok ? '✓' : '✗'; }
  if (!ok) txFb(isMain ? 'tv-tf-fb' : 'tv-tf-fb', false, '다시 세어 보세요.',
    '원문에서 그 단어가 나오는 곳을 하나씩 짚어 보세요. 칸을 오른쪽 클릭(또는 길게 누르기)하면 형광 표시가 됩니다.');
  else txFb('tv-tf-fb', null, '');
  tvTfGrid(which);
}

function tvTfKey(e, el){
  var which = +el.getAttribute('data-w'), r = +el.getAttribute('data-r'), c = +el.getAttribute('data-c');
  var isMain = (which !== 2);
  var R = (isMain ? tvTfDocs : TV_TF2_DOCS).length, C = (isMain ? tvTfU : TV_TF2_U).length;
  var nr = r, nc = c, move = true;
  if (e.key === 'ArrowRight' || e.key === 'Enter') nc = c + 1;
  else if (e.key === 'ArrowLeft') nc = c - 1;
  else if (e.key === 'ArrowDown') nr = r + 1;
  else if (e.key === 'ArrowUp') nr = r - 1;
  else move = false;
  if (!move) return;
  e.preventDefault();
  if (nc >= C) { nc = 0; nr = r + 1; }
  if (nc < 0) { nc = C - 1; nr = r - 1; }
  if (nr < 0 || nr >= R) return;
  tvGradeCell(el);
  var sel = '.tv-in[data-w="' + which + '"][data-r="' + nr + '"][data-c="' + nc + '"]';
  var host = txEl(isMain ? 'tv-tf-tblwrap' : 'tv-tf2-tblwrap');
  var next = host && host.querySelector(sel);
  if (next) { next.focus(); try { next.select(); } catch (x) {} }
}

function tvTfHint(el){
  var which = +el.getAttribute('data-w'), r = +el.getAttribute('data-r'), c = +el.getAttribute('data-c');
  var isMain = (which !== 2);
  var docs = isMain ? tvTfDocs : TV_TF2_DOCS;
  var U = isMain ? tvTfU : TV_TF2_U;
  var word = U[c], text = docs[r].t;
  var surf = (isMain && TV_TF_SURF[word]) ? TV_TF_SURF[word] : [word];
  var html = txEsc(text);
  surf.forEach(function (s) {
    if (!s) return;
    html = html.split(txEsc(s)).join('<span class="tv-hl">' + txEsc(s) + '</span>');
  });
  txFb('tv-tf-fb', null, '<b>' + txEsc(docs[r].l) + '</b> 에서 \'' + txEsc(word) + '\' 찾기',
    html + '<br><span style="color:var(--muted);">횟수는 알려 주지 않습니다. 형광 표시를 직접 세어 보세요.</span>');
}

function tvTfProg(which){
  var isMain = (which !== 2);
  var val = isMain ? tvTf : tvTf2;
  var ans = isMain ? tvTfAns : TV_TF2_ANS;
  var docs = isMain ? tvTfDocs : TV_TF2_DOCS;
  var U = isMain ? tvTfU : TV_TF2_U;
  var R = docs.length, C = U.length, tot = R * C, filled = 0, right = 0, r, c;
  for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
    var v = val[r] && val[r][c];
    if (v !== '' && v !== undefined && v !== null) { filled++; if (parseInt(v, 10) === ans[r][c]) right++; }
  }
  var p = txEl(isMain ? 'tv-tf-prog' : 'tv-tf2-prog'), bar = txEl(isMain ? 'tv-tf-bar' : 'tv-tf2-bar');
  if (p) p.textContent = '채운 칸 ' + filled + '/' + tot + ' · 정답 ' + right + '/' + tot;
  if (bar) bar.style.width = Math.round(filled / tot * 100) + '%';

  if (isMain) {
    var btn = txEl('tv-tf-ans');
    if (btn) {
      var need = Math.ceil(tot * 0.75);
      btn.disabled = (filled < need);
      btn.textContent = btn.disabled ? ('먼저 채워 보세요 (' + filled + '/' + tot + ')') : '정답 보기';
    }
  }

  /* 행이 모두 정답이면 벡터 조립 + 주제어 배지 */
  var box = txEl(isMain ? 'tv-tf-vecs' : 'tv-tf2-vecs');
  if (!box) return;
  var out = '', done = 0;
  for (r = 0; r < R; r++) {
    var ok = true;
    for (c = 0; c < C; c++) if (parseInt(val[r][c], 10) !== ans[r][c]) { ok = false; break; }
    if (!ok) continue;
    done++;
    var mx = tvTfMax(ans[r]).map(function (i) { return U[i]; });
    out += '<p class="tv-vec' + (txCalm() ? '' : ' sl') + '">' +
      String.fromCharCode(97 + r) + ' = (' + ans[r].join(', ') + ')' +
      '<span class="tag">주제어 ' + txEsc(mx.join(' · ')) + '</span></p>';
  }
  if (done === R) {
    var sum = [];
    for (c = 0; c < C; c++) { var s = 0; for (r = 0; r < R; r++) s += ans[r][c]; sum.push(s); }
    var smx = tvTfMax(sum).map(function (i) { return U[i]; });
    out += '<p class="tv-vec' + (txCalm() ? '' : ' sl') + '">u = ' +
      (R === 3 ? 'a + b + c' : 'a + b') + ' = (' + sum.join(', ') + ')' +
      '<span class="tag">전체 주제어 ' + txEsc(smx.join(' · ')) + '</span></p>';
    if (isMain) txFb('tv-tf-fb', true, '표를 모두 채웠습니다.',
      '합계 벡터는 각 문서 벡터의 <b>성분끼리의 합</b>과 같습니다. ' +
      '세 후기 모두에 나온 \'캠핑장\'은 성분이 크지만 <b>어느 후기의 특징도 알려 주지 못합니다</b> — 8차시로 이어지는 물음입니다.');
  }
  box.innerHTML = out;
}

function tvTfReveal(){
  var R = tvTfDocs.length, C = tvTfU.length, r, c;
  for (r = 0; r < R; r++) { tvTf[r] = []; for (c = 0; c < C; c++) tvTf[r][c] = String(tvTfAns[r][c]); }
  tvTfGrid(1);
  txFb('tv-tf-fb', null, '정답을 공개했습니다.',
    '내가 적었던 값과 어디가 달랐는지 확인해 보세요. 같은 문항이 학습지 문제 1과 1:1로 대응합니다.');
}

function tvTfReset(){
  tvTf = [];
  tvTfGrid(1);
  txFb('tv-tf-fb', null, '');
}

function tvTfMine(){
  var arr = txCorpusLoad().slice(-3);
  if (arr.length < 2) {
    txFb('tv-tf-fb', false, '우리 반 문장이 2개 이상 필요합니다.', 'STEP 1의 「같은 장면, 다른 문장」이나 6차시 활동 ①에서 문장을 모아 주세요.');
    return;
  }
  var stops = TP_STOP_BASE;
  var norm = function (t) {
    return tokenize(t).map(function (tk) { return TP_LEMMA[tk] || removeStopwordsFromWord(tk, stops) || tk; })
      .filter(function (w) { return stops.indexOf(w) < 0 && w.length > 0; });
  };
  var wordsList = arr.map(function (it) { return norm(it.t); });
  tvTfU = buildUniverse(wordsList, { order: 'ko' });
  tvTfDocs = arr.map(function (it, i) { return { l: '문장 ' + (i + 1), t: it.t }; });
  tvTfAns = wordsList.map(function (ws) { return countFrequency(ws, tvTfU); });
  tvTf = [];
  tvTfTitle = '우리 반 문장';
  tvTfGrid(1);
  var src = txEl('tv-tf-src');
  if (src) src.innerHTML = '우리 반 문장으로 만든 표입니다. U는 <b>가나다순</b>으로 정렬했습니다(학생이 입력한 문서 규칙). ' +
    '<button class="btn tx-mini" type="button" onclick="tvTfBack()">캠핑장 후기로 돌아가기</button>';
  txFb('tv-tf-fb', null, '우리 반 문장 ' + arr.length + '개로 표를 다시 만들었습니다.',
    'U = { ' + txEsc(tvTfU.join(', ')) + ' } · 차원 ' + tvTfU.length);
}

function tvTfBack(){
  tvTfU = TV_TF_U.slice();
  tvTfDocs = TV_TF_DOCS.slice();
  tvTfAns = TV_TF_ANS.map(function (r) { return r.slice(); });
  tvTf = [];
  tvTfTitle = '캠핑장 후기';
  tvTfGrid(1);
  var src = txEl('tv-tf-src');
  if (src) src.textContent = '출처: 동아 교과서 Ⅱ p.54~55 표와 벡터를 재구성 · 활동지 「활동 1(TF-IDF)3 — 벡터와 빈도수벡터」 문제 1을 웹으로 이식';
  txFb('tv-tf-fb', null, '');
}

/* ───────── 7차시 · 활동 ④ 희소 vs 밀집 ───────── */

function tvZeroCount(mat){
  var z = 0, n = 0;
  mat.forEach(function (r) { r.forEach(function (v) { n++; if (v === 0) z++; }); });
  return { cells: n, zero: z, nz: n - z, pct: n ? (z / n * 100) : 0 };
}

function tvSparsity(){
  var box = txEl('tv-zero-tbl');
  if (!box) return;
  var camp = tvZeroCount(tvTfAns);
  var inclMat = tvDocs.map(function (d, r) {
    return tvU.map(function (w, c) { return tvInclAnswer(r, c); });
  });
  var note = tvZeroCount(inclMat);
  var row = function (name, o) {
    return '<tr><th class="rowh">' + name + '</th><td>' + o.cells + '</td><td>' + o.nz + '</td><td>' + o.zero +
      '</td><td style="font-family:var(--mono);font-weight:700;">' + o.pct.toFixed(1) + '%</td></tr>';
  };
  box.innerHTML = '<table class="tv-tbl"><tr><th class="rowh">표</th><th>전체 칸</th><th>0이 아닌 칸</th><th>0인 칸</th><th>0의 비율</th></tr>' +
    row(txEsc(tvTfTitle) + ' 빈도수 표 (' + tvTfAns.length + ' × ' + tvTfU.length + ')', camp) +
    row('노트북 포함관계 표 (' + inclMat.length + ' × ' + tvU.length + ')', note) +
    '</table>';
}

function tvDocN(i){
  tvDocNIdx = Math.max(0, Math.min(TV_DOCN.length - 1, parseInt(i, 10) || 0));
  var sl = txEl('tv-docn');
  if (sl && String(sl.value) !== String(tvDocNIdx)) sl.value = tvDocNIdx;
  tvDocNBtns();

  var stops = TP_STOP_BASE;
  var pts = TV_DOCN.map(function (n) {
    var docs = TV_CORPUS20.slice(0, n).map(function (t) {
      return tokenize(t).map(function (tk) { return TP_LEMMA[tk] || removeStopwordsFromWord(tk, stops) || tk; })
        .filter(function (w) { return stops.indexOf(w) < 0 && w.length > 0; });
    });
    var U = buildUniverse(docs, { order: 'ko' });
    var mat = docs.map(function (ws) { return countFrequency(ws, U); });
    var o = tvZeroCount(mat);
    return { n: n, dim: U.length, cells: o.cells, zero: o.zero, pct: o.pct };
  });
  var cur = pts[tvDocNIdx];
  var st = txEl('tv-docn-st');
  if (st) st.textContent = '문서 ' + cur.n + '건 · 차원 n(U) = ' + cur.dim + ' · 전체 칸 ' + cur.cells +
    ' · 0인 칸 ' + cur.zero + ' (' + cur.pct.toFixed(1) + '%)';
  tvSparseChart(pts, tvDocNIdx);
}

function tvDocNBtns(){
  var box = txEl('tv-docn-btns');
  if (!box) return;
  box.innerHTML = '';
  TV_DOCN.forEach(function (n, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn tx-mini' + (i === tvDocNIdx ? ' pri' : '');
    b.textContent = n + '건';
    b.addEventListener('click', function () { tvDocN(i); });
    box.appendChild(b);
  });
}

function tvSparseChart(pts, cur){
  var cv = txEl('tv-sparse-cv');
  if (!cv || !cv.getContext) return;
  var W = 640, H = 300, dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  var g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  var css = getComputedStyle(document.documentElement);
  var col = function (n, f) { var v = css.getPropertyValue(n); return (v && v.trim()) || f; };
  var BG = col('--bg', '#f5f0ea'), FG = col('--fg', '#1a1714'), MU = col('--muted', '#78726a'),
      BD = col('--border', '#d8d0c4'), AC = col('--accent', '#c8b9a6'), RD = col('--red', '#b44133');

  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  var L = 62, R = W - 24, T = 26, B = H - 42;
  g.strokeStyle = BD; g.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach(function (p) {
    var y = B - (B - T) * p / 100;
    g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke();
    g.fillStyle = MU; g.font = '11px monospace'; g.textAlign = 'right';
    g.fillText(p + '%', L - 8, y + 4);
  });
  g.strokeStyle = FG; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.lineTo(R, B); g.stroke();

  var x = function (i) { return L + (R - L) * (i / (pts.length - 1)); };
  var y = function (p) { return B - (B - T) * p / 100; };

  g.strokeStyle = FG; g.lineWidth = 2.6;
  g.beginPath();
  pts.forEach(function (p, i) { if (i === 0) g.moveTo(x(i), y(p.pct)); else g.lineTo(x(i), y(p.pct)); });
  g.stroke();

  pts.forEach(function (p, i) {
    g.beginPath(); g.arc(x(i), y(p.pct), i === cur ? 7 : 5, 0, Math.PI * 2);
    g.fillStyle = (i === cur) ? RD : AC; g.fill();
    g.strokeStyle = FG; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = FG; g.font = (i === cur ? '700 ' : '') + '12px monospace'; g.textAlign = 'center';
    g.fillText(p.pct.toFixed(1) + '%', x(i), y(p.pct) - 13);
    g.fillStyle = MU; g.font = '11px monospace';
    g.fillText('문서 ' + p.n + '건', x(i), B + 18);
    g.fillText('차원 ' + p.dim, x(i), B + 33);
  });
  g.fillStyle = MU; g.font = '11px monospace'; g.textAlign = 'left';
  g.fillText('0인 칸의 비율', L, T - 10);
}

function tvBigCheck(){
  var el = txEl('tv-big');
  if (!el) return;
  var v = parseFloat(el.value);
  if (isNaN(v)) { txFb('tv-big-fb', false, '값을 입력해 주세요.'); return; }
  if (Math.abs(v - 99.8) <= 0.06) {
    txFb('tv-big-fb', true, '맞습니다 — 99.8%입니다.',
      '전체 칸 수는 100000, 0이 아닌 칸 수는 최대 200이므로 ' +
      '<code>1 − 200/100000 = 0.998</code>, 곧 <b>99.8%</b> 이상이 0입니다. ' +
      '이렇게 성분의 대부분이 0인 벡터를 <b>희소 벡터</b>라고 합니다.');
  } else {
    txFb('tv-big-fb', false, '다시 계산해 보세요.',
      '힌트 — 전체 칸 수(=주요 단어 수)와 0이 아닌 칸 수(=문서에 쓰인 서로 다른 단어 수)를 먼저 구하고, ' +
      '<code>1 − (0이 아닌 칸)/(전체 칸)</code> 을 백분율로 바꿉니다.');
  }
}

/* 시연용 임의의 밀집 벡터 (원본 text_vector.html generateEmbedding 이식 — 학습된 값이 아닙니다) */
function tvEmbed(word, dim){
  var hash = 0, i, out = [];
  var d = dim || 4;
  for (i = 0; i < word.length; i++) { hash = ((hash << 5) - hash) + word.charCodeAt(i); hash |= 0; }
  for (i = 0; i < d; i++) out.push((((Math.sin(hash * (i + 1)) + 1) / 2) * 2 - 1).toFixed(2));
  return out;
}

function tvEmbCards(){
  var box = txEl('tv-emb-cards');
  if (!box) return;
  box.innerHTML = ['남자', '여자', '왕', '여왕', '왕자', '공주'].map(function (w) {
    return '<div class="tv-embcard"><b>' + txEsc(w) + '</b><span>(' + tvEmbed(w, 4).join(', ') + ')</span></div>';
  }).join('');
}

/* ───────── 7차시 초기화 ───────── */

function tvInit(){
  if (tvInited) return;
  if (!txEl('tv-root')) return;
  tvInited = true;

  tvSituRender();
  tvInclReset();
  tvBuildSets();
  tvBuildU();
  tvOhRender();
  tvTfGrid(1);
  tvTfGrid(2);
  tvDocNBtns();
  tvDocN(0);
  tvSparsity();
  tvEmbCards();

  if (typeof videoDeck === 'function') videoDeck('tv-videos', 'text7', TV_VIDEOS);
  if (typeof warmStepper === 'function') warmStepper('tv-warm', 'tv', TV_WARM);
  if (typeof quizStepper === 'function') quizStepper('tv-quiz', 'tv', TV_QUIZ);
  if (typeof chipDefs === 'function') chipDefs('#v-text .tv-keys', TV_CHIPS);
  if (typeof wsLinks === 'function') wsLinks('tv-wslinks', 'text7');
  tvRefsRender();
}

/* 7차시 참고 자료 — 학급 자료함(공통 키) + 교사 추가 슬롯 1칸 */
function tvRefsRender(){
  var box = txEl('tv-refx');
  if (!box) return;
  var url = txClassSync();
  var arr = txJson('aimath.text7.refs');
  var h = '<div class="tx-refs" style="margin-top:0.8rem;">';
  h += '<a class="tx-ref" ' + (url ? 'href="' + txEsc(url) + '" target="_blank" rel="noopener"' : 'href="#" onclick="return false;"') + '>' +
    '<span class="th"><span class="bg">학급</span>🗂️</span><span class="bd"><span class="tt">학급 공유 자료함</span>' +
    '<span class="ds">' + (url ? '우리 반이 모은 한 줄 평과 벡터 표를 함께 보는 자료함입니다.'
                              : '아직 주소가 없습니다. 아래 [학급 자료함 주소 설정]에서 등록하세요. (6~10차시 공통)') +
    '</span></span></a>';
  arr.forEach(function (it, i) {
    h += '<a class="tx-ref" href="' + txEsc(it.u) + '" target="_blank" rel="noopener">' +
      '<span class="th"><span class="bg">교사 추가</span>🔗</span><span class="bd"><span class="tt">' + txEsc(it.t || it.u) + '</span>' +
      '<span class="ds">선생님이 등록한 자료입니다. <button class="btn tx-mini" type="button" data-del="' + i + '">삭제</button></span></span></a>';
  });
  h += '</div><div class="btn-row"><button class="btn tx-mini" type="button" id="tv-ref-class">학급 자료함 주소 설정</button>' +
    '<button class="btn tx-mini" type="button" id="tv-ref-add">+ 자료 추가</button></div>' +
    '<p class="cmn-note">교사용 — 추가한 자료는 이 기기에만 저장됩니다. ' +
    '(키 <code>aimath.classroom.url</code> · <code>aimath.text7.refs</code>)</p>';
  box.innerHTML = h;

  var bc = txEl('tv-ref-class');
  if (bc) bc.addEventListener('click', function () {
    var u = window.prompt('학급 자료함 주소(https://…)', txGet(TX_CLASS_KEY, ''));
    if (u === null) return;
    u = String(u).trim();
    if (u && !/^https?:\/\//i.test(u)) { alert('http 또는 https 로 시작하는 주소를 입력해 주세요.'); return; }
    txSet(TX_CLASS_KEY, u);
    txSet('aimath.shared.folder', u);
    tvRefsRender();
    if (typeof aimRefExtrasAll === 'function') { try { aimRefExtrasAll(); } catch (e) {} }
  });
  var ba = txEl('tv-ref-add');
  if (ba) ba.addEventListener('click', function () {
    var u = window.prompt('자료 주소(https://…)');
    if (!u) return;
    u = String(u).trim();
    if (!/^https?:\/\//i.test(u)) { alert('http 또는 https 로 시작하는 주소를 입력해 주세요.'); return; }
    var t = window.prompt('자료 제목') || u;
    var a = txJson('aimath.text7.refs');
    a.push({ u: u, t: String(t).trim() });
    txSet('aimath.text7.refs', JSON.stringify(a));
    tvRefsRender();
  });
  box.querySelectorAll('[data-del]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var a = txJson('aimath.text7.refs');
      a.splice(+b.getAttribute('data-del'), 1);
      txSet('aimath.text7.refs', JSON.stringify(a));
      tvRefsRender();
    });
  });
}
/* ───────── 초기화 (IIFE + null 가드 · 뷰가 없으면 조용히 통과) ───────── */

(function txBoot(){

  /* 1) go(v, anchor) 지원 — core.js 의 go() 를 감싸기만 합니다(원본 수정 없음).
        기존 호출 go(v) · go(v,false) 는 동작이 그대로입니다. */
  if (typeof window !== 'undefined' && typeof window.go === 'function' && !window.go.__txWrapped) {
    var _go = window.go;
    var go2 = function (v, arg) {
      var anchor = (typeof arg === 'string') ? arg : null;
      var push = (typeof arg === 'boolean') ? arg : true;
      _go(v, push);
      if (v === 'text') {
        try { txInit(); } catch (e) {}
        if (anchor) { try { txOpen(anchor); } catch (e) {} }
      }
    };
    go2.__txWrapped = true;
    go2.__orig = _go;
    window.go = go2;
  }

  /* 2) 홈 카드·차시 목록에서 6/7차시를 눌렀을 때 해당 차시로 들어가게 합니다.
        (매니페스트를 6차시·7차시 두 줄로 나누어 등록한 경우 라벨로 구분) */
  var sniff = function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-v],[data-go]');
    if (!el) return;
    var v = el.getAttribute('data-v') || el.getAttribute('data-go');
    if (v !== 'text') return;
    var t = (el.textContent || '');
    if (t.indexOf('7차시') >= 0) txPending = 7;
    else if (t.indexOf('6차시') >= 0) txPending = 6;
  };
  document.addEventListener('click', sniff, true);

  /* 3) 뷰 진입 시 지연 init */
  var boot = function () {
    var view = txEl('v-text');
    if (!view) return;
    txClassSync();
    var start = txPending || parseInt(txGet(TX_LESSON_KEY, '6'), 10) || 6;
    txPending = 0;
    txLesson(start === 7 ? 7 : 6);
    if (typeof initToggles === 'function') { try { initToggles(view); } catch (e) {} }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  window.txBootText = boot;
})();

var txPending = 0;

/* 뷰 전체 초기화 진입점 — go('text') 와 부트에서 함께 씁니다. */
function txInit(){
  if (!txEl('v-text')) return;
  txClassSync();
  var want = txPending || txLessonCur || parseInt(txGet(TX_LESSON_KEY, '6'), 10) || 6;
  txPending = 0;
  txLesson(want === 7 ? 7 : 6);
}


/* ══════════ 2단원 tfidf 뷰 코드 (unit2_build/tfidf/core-snippet.js) ══════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   TFIDF (8차시: 중요한 단어 찾기 — TF-IDF) — 전역 접두사 tf
   ---------------------------------------------------------------------------
   · core.js 의 「BIAS(5차시) 블록」과 「30차시 카탈로그」 사이(= AIM_LESSONS 정의 앞)에
     이 블록을 통째로 붙여 넣습니다.
   · 공통 컴포넌트(videoDeck·warmStepper·quizStepper·chipDefs·wsPrint·wsLinks·
     aimRefExtrasAll)는 재사용만 하며 수정하지 않습니다.
   · 초기화는 맨 아래 IIFE 하나뿐이며, #v-tfidf 가 없으면 즉시 반환합니다(null 가드).
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 0. 소도구 ───────────────────────────────────────────────────────────── */
function tfEl(id){ return document.getElementById(id); }
function tfEsc(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function tfGet(k,d){ try{ const v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } }
function tfSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function tfGcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=a%b; a=b; b=t; } return a||1; }

/* 유한소수를 기약분수 문자열로 — n = 3, 5 이므로 분모는 24 이내에서 반드시 잡힙니다. */
function tfRat(v){
  if(!isFinite(v)) return null;
  for(let d=1; d<=24; d++){
    const n=v*d;
    if(Math.abs(n-Math.round(n))<1e-9) return {n:Math.round(n), d:d};
  }
  return null;
}
function tfFmt(v){
  const r=tfRat(v);
  if(!r) return String(Math.round(v*1000)/1000);
  return r.d===1 ? String(r.n) : (r.n+'/'+r.d);
}
/* 분수를 세로 조판으로 보여 줍니다(정수는 그대로). */
function tfFmtHTML(v){
  const r=tfRat(v);
  if(!r) return '<span class="tf-dec">'+ (Math.round(v*1000)/1000) +'</span>';
  if(r.d===1) return String(r.n);
  return '<span class="tf-frac"><i>'+r.n+'</i><b>'+r.d+'</b></span>';
}
function tfPrefersReduce(){
  try{ return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch(e){ return false; }
}


/* ═════════ 1. 추천 영상 (videoDeck) — 검증 ID 4건, 새 ID 생성 금지 ═════════ */
const TF_VIDEOS = [
  {id:'meEchvkdB1U', t:'[딥러닝 자연어처리] TF-IDF (5:09)',
   s:'Minsuk Heo 허민석 · 주 디딤영상'},
  {id:'jwNte0PZqU8', t:'4. 텍스트 자료의 처리 (6:11)',
   s:'mathT야나수 〈인공지능 수학〉 · 교과서 흐름'},
  {id:'6Ao8-7qruSQ', t:'【인공지능수학-미래엔】제4강 — 텍스트 자료의 처리(P33~38) (12:03)',
   s:'중구쌤TV · 교재 병행'},
  {id:'8qOu6aFuqqs', t:'텍스트마이닝 — 용어빈도(tf) · 역문서빈도(idf) · tf-idf',
   s:'곽기영(국민대) · 심화·교사용'},
];


/* ═════════ 2. 마중 퀴즈 (warmStepper — 라벨 "질문 N." 순차 공개) ═════════ */
const TF_WARM = [
  {
    q:'다음 설명이 옳으면 O, 옳지 않으면 X를 고르세요. — "어떤 문서에서 가장 많이 등장한 단어가 곧 그 문서의 주제어이다."',
    opts:['O','X'],
    answer:1,
    explain:'옳지 않습니다. 예를 들어 캠핑장 후기 세 개를 모아 놓으면 \'캠핑장\'이라는 단어는 모든 후기에 빠짐없이 등장하지만, 그 단어만으로는 어느 후기가 어떤 이유로 좋다고 말하는지 전혀 알 수 없습니다. 많이 나온 단어와 그 문서를 <b>구별해 주는</b> 단어는 서로 다릅니다. 오늘은 이 둘을 수로 갈라내는 방법을 배웁니다.'
  },
  {
    q:'아래는 어느 음식점을 소개한 후기 네 개입니다. A: 추천! 위생적이고 인테리어가 예뻐서 이 음식점을 추천해요. / B: 이 음식점은 가격도 저렴하고, 맛도 좋아요! 정말 맛있어요. 추천! / C: 역시 저렴, 저렴한 가격! 예쁜 인테리어! 추천하는 음식점! / D: 뭐라 해도 맛이죠. 맛있어요! 이 음식점을 추천합니다. — 네 후기에 모두 등장하는 단어 \'추천\'은 네 후기를 서로 구별하는 데 도움이 될까요?',
    opts:['① 도움이 된다','② 도움이 되지 않는다','③ 후기 길이에 따라 다르다'],
    answer:1,
    explain:'\'추천\'은 네 후기 전부에 나오기 때문에, \'추천\'이라는 단어를 보고서는 지금 읽는 것이 A인지 D인지 알 수 없습니다. 반대로 \'위생적\'은 A에만, \'맛\'은 B와 D에만 나오므로 후기를 구별하는 데 훨씬 쓸모가 있습니다. <b>여러 문서에 두루 나오는 단어일수록 구별하는 힘이 약하다</b> — 이것이 오늘 배울 IDF의 출발점입니다.'
  },
  {
    q:'7차시에서 만든 빈도수 벡터(단어가방 모형)만으로 문서의 주제어를 찾기 어려운 이유로 가장 알맞은 것은?',
    opts:['① 빈도수 벡터는 단어의 순서를 담지 못하기 때문이다',
          '② 빈도수 벡터는 문서마다 길이가 다르기 때문이다',
          '③ 어느 문서에나 나오는 흔한 단어도 빈도수가 높게 나오기 때문이다',
          '④ 빈도수 벡터는 0이 너무 많은 희소 벡터이기 때문이다'],
    answer:2,
    explain:'①·②·④도 빈도수 벡터의 성질이지만, "주제어를 찾기 어렵다"는 문제와 직접 이어지는 것은 ③입니다. 조사나 \'그래서\', \'추천\'처럼 어느 문서에나 등장하는 단어가 높은 빈도수를 차지해 버리면, 정작 그 문서만의 단어가 묻혀 버립니다. 그래서 <b>빈도수에 \'희귀함\'이라는 가중치를 곱해 주는</b> 방법이 필요합니다.'
  },
];


/* ═════════ 3. 형성평가 (quizStepper) — 5문항, 선택 심화는 총점 제외 ═════════ */
const TF_QUIZ = [
  {
    q:'후기 A 「뷰가 좋아 사진이 잘 나와요. 깨끗한 캠핑장에서 사진 찍어요.」에서 단어 \'사진\'의 TF는 얼마입니까?',
    opts:['① 0','② 1','③ 2','④ 3'],
    answer:2,
    explain:'TF는 한 문서 안에서 그 단어가 등장한 횟수입니다. \'사진\'은 "사진이 잘 나와요"와 "사진 찍어요"에서 두 번 등장하므로 TF는 2입니다. 참고로 후기 A에 등장하지 않는 \'온수\'의 TF는 0입니다.'+
      '<span class="tf-jump"><button class="btn cmn-go" type="button" onclick="tfSee(0,\'tf-st1\')">활동 ① 1단 다시 보기</button></span>'
  },
  {
    q:'캠핑장 후기 A·B·C 세 문서(n = 3)에서 \'깨끗하다\'는 세 후기 모두에 등장합니다. \'깨끗하다\'의 IDF는 얼마입니까?',
    opts:['① 1/3','② 1','③ 3','④ 9'],
    answer:1,
    explain:'\'깨끗하다\'의 DF는 3이고 상대도수 DF/n은 3/3 = 1입니다. IDF는 이 상대도수의 역수이므로 IDF = n/DF = 3/3 = 1입니다. 모든 문서에 등장하는 단어는 n/DF 방식에서 IDF가 가질 수 있는 <b>가장 작은 값인 1</b>을 받습니다. 즉 이 방식은 흔한 단어의 가중치를 1까지만 낮춥니다.'+
      '<span class="tf-jump"><button class="btn cmn-go" type="button" onclick="tfSee(0,\'tf-st3\')">활동 ① 3단 다시 보기</button></span>'
  },
  {
    q:'후기 C에서 \'온수\'의 TF는 2이고, \'온수\'는 후기 C에만 등장합니다(n = 3). 후기 C에서 \'온수\'의 TF-IDF는 얼마입니까?',
    opts:['① 2','② 3','③ 6','④ 2/3'],
    answer:2,
    explain:'\'온수\'의 DF는 1이므로 IDF = 3/1 = 3입니다. TF-IDF = TF × IDF = 2 × 3 = 6입니다. 같은 표에서 \'캠핑장\'의 TF-IDF는 1 × 1 = 1이므로, 후기 C의 핵심 단어는 \'온수\'라고 판단할 수 있습니다. 이렇게 TF-IDF를 계산하여 문서에서 유용한 정보를 뽑아내는 것이 오늘의 성취기준입니다. <b>[12인수02-02]</b>'+
      '<span class="tf-jump"><button class="btn cmn-go" type="button" onclick="tfSee(0,\'tf-st4\')">활동 ① 4단 다시 보기</button></span>'
  },
  {
    q:'TF-IDF에 대한 설명으로 옳지 않은 것은?',
    opts:['① TF-IDF가 큰 단어는 그 문서에서 중요도가 높은 단어이다',
          '② IDF는 문서 빈도수 DF가 커질수록 작아진다',
          '③ TF-IDF가 크다·작다를 가르는 절대적인 기준값이 정해져 있다',
          '④ 모든 문서에 등장하는 단어의 TF-IDF는 그 문서의 TF 값과 같아진다(IDF = n/DF일 때)'],
    answer:2,
    explain:'③이 옳지 않습니다. TF-IDF가 크다·작다를 판단하는 절대적인 기준값은 없으며, 분석 목적에 따라 문서 안에서 상대적인 기준을 정해야 합니다(활동 ②의 기준값 슬라이더). ④는 옳습니다. 모든 문서에 등장하면 DF = n이므로 IDF = n/n = 1이 되어 TF-IDF = TF × 1 = TF가 됩니다.'+
      '<span class="tf-jump"><button class="btn cmn-go" type="button" onclick="tfSee(1,\'tf-thr\')">활동 ② 기준값 슬라이더 다시 보기</button></span>'
  },
  {
    q:'어떤 음식점 후기 A에서 \'추천\'의 TF는 2, \'위생적\'의 TF는 1입니다. 그런데 \'추천\'은 네 후기 모두에, \'위생적\'은 후기 A에만 등장합니다(n = 4). 후기 A의 핵심 단어로 더 알맞은 것과 그 이유를 바르게 짝지은 것은?',
    opts:['① 추천 — TF가 더 크기 때문',
          '② 추천 — 네 후기에 모두 나와 대표성이 있기 때문',
          '③ 위생적 — TF-IDF가 4로 \'추천\'의 2보다 크기 때문',
          '④ 위생적 — DF가 작아 TF도 작기 때문'],
    answer:2,
    explain:'\'추천\'은 DF = 4이므로 IDF = 4/4 = 1, TF-IDF = 2 × 1 = 2입니다. \'위생적\'은 DF = 1이므로 IDF = 4/1 = 4, TF-IDF = 1 × 4 = 4입니다. TF만 보면 \'추천\'이 커 보이지만 TF-IDF에서는 <b>순위가 뒤집혀</b> \'위생적\'이 후기 A의 핵심 단어가 됩니다. 오늘의 핵심 질문 "많이 나온 단어가 항상 중요한 단어일까?"에 대한 답이 바로 이 계산 안에 있습니다.'+
      '<span class="tf-jump"><button class="btn cmn-go" type="button" onclick="tfSee(2,\'tf-act3-t2\')">활동 ③ 단계 토글 2 다시 보기</button></span>'
  },
];

/* [선택 심화 · 평가 제외] 도전 문항 — 총점에 포함하지 않고 "도전 성공" 배지만 부여합니다. */
const TF_CHAL = {
  q:'전체 문서의 개수가 n = 10⁶이고 어떤 단어의 문서 빈도수가 DF = 10²일 때, IDF = log₁₀(n/DF)의 값은?',
  opts:['① 2','② 4','③ 6','④ 10⁴'],
  answer:1,
  explain:'n/DF = 10⁶/10² = 10⁴입니다. n/DF 방식이라면 IDF가 10000이라는 큰 수가 되어 계산이 불편합니다. 상용로그를 이용하면 log₁₀ 10⁴ = 4가 되어 다루기 쉬워집니다. 로그는 수가 커질수록 증가 속도를 눌러 주는 <b>브레이크</b> 역할을 합니다. 다만 이 차시의 기본 정의는 IDF = n/DF이며, 로그 정의는 심화 내용입니다.'
};


/* ═════════ 4. 핵심 개념 칩 상세 (chipDefs) ═════════
   ①정의 ②예시 ③이번 차시 활동 연결(+이동 버튼) ④이전/다음 차시 go() 링크 + 출처 줄 */
const TF_DEFS = {

  '단어 빈도수 TF':
    '<p><b>정의.</b> 단어 빈도수(TF, Term Frequency)는 <b>한 문서 안에서 어떤 단어가 등장한 횟수</b>입니다. ' +
    '기호로는 <span class="mi">TF(d, t)</span>와 같이 쓰며, 문서 d에서 단어 t가 몇 번 나왔는지를 나타냅니다. ' +
    '7차시에서 만든 빈도수 벡터의 각 성분이 바로 이 TF 값입니다.</p>' +
    '<p><b>예시.</b> 후기 A 「뷰가 좋아 사진이 잘 나와요. 깨끗한 캠핑장에서 사진 찍어요.」에서 \'사진\'은 두 번 나왔으므로 ' +
    'TF는 2이고, \'뷰\'는 한 번 나왔으므로 TF는 1입니다. 후기 A에 없는 \'온수\'의 TF는 0입니다.</p>' +
    '<p><b>이번 차시와의 연결.</b> <b>활동 ① 1단</b>에서 여러분이 직접 채우는 첫 번째 표가 TF 표입니다. ' +
    '이때 "TF가 가장 큰 단어가 정말 그 문서의 주제어인가?"를 확인해 보면, 세 후기 모두에서 \'캠핑장\'과 \'깨끗하다\'가 ' +
    '빠지지 않고 등장한다는 사실을 발견하게 됩니다. 이 발견이 오늘 IDF가 필요한 이유가 됩니다.</p>' +
    '<div class="btn-row"><button class="btn cmn-go" type="button" onclick="tfSee(0,\'tf-st1\')">활동 ① 1단으로 이동</button></div>' +
    '<p><b>이어지는 차시.</b> <a href="#text" onclick="go(\'text\');return false;">7차시 · 텍스트를 벡터로</a> 에서 만든 빈도수 벡터가 곧 TF입니다 → ' +
    '<a href="#sim" onclick="go(\'sim\');return false;">9차시 · 얼마나 비슷한가</a> 에서는 오늘 만든 TF-IDF 벡터로 문서 사이의 유사도를 잽니다.</p>' +
    '<p class="tf-src">씨마스 「인공지능 수학」 Ⅱ. 텍스트 데이터 처리 p.58, 동아출판 「인공지능 수학」 Ⅱ p.57 서술을 재구성</p>',

  '문서 빈도수 DF':
    '<p><b>정의.</b> 문서 빈도수(DF, Document Frequency)는 <b>어떤 단어가 등장한 문서의 개수</b>입니다. ' +
    'TF가 "한 문서 안에서 몇 번"을 세는 값이라면, DF는 "전체 문서 중 몇 개의 문서에" 나왔는지를 세는 값입니다. ' +
    '그래서 DF는 문서마다 달라지지 않고 말뭉치 전체에 대해 단어마다 하나씩 정해집니다.</p>' +
    '<p><b>예시.</b> 캠핑장 후기 A·B·C에서 \'캠핑장\'은 세 후기에 모두 등장하므로 DF는 3이고, ' +
    '\'화장실\'은 후기 C에만 등장하므로 DF는 1입니다. 전체 문서의 개수를 n이라 할 때 DF를 n으로 나눈 ' +
    '<span class="mi">DF/n</span>은 그 단어가 문서 전체에서 차지하는 <b>상대도수</b>가 됩니다(캠핑장 3/3 = 1, 화장실 1/3).</p>' +
    '<p><b>이번 차시와의 연결.</b> <b>활동 ① 2단</b>에서 DF와 상대도수 DF/n을 함께 채웁니다. ' +
    '이때 "DF가 크다 = 여기저기 다 나온다 = 이 문서만의 특징이 아니다"라는 관찰을 기록하게 되고, ' +
    '3단에서 IDF를 도입할 근거가 됩니다.</p>' +
    '<div class="btn-row"><button class="btn cmn-go" type="button" onclick="tfSee(0,\'tf-st2\')">활동 ① 2단으로 이동</button></div>' +
    '<p><b>참고.</b> 어떤 단어의 TF 값을 모든 문서에 대해 더한 값은 그 단어의 DF 값보다 크거나 같습니다. ' +
    '한 문서에 두 번 이상 나올 수 있기 때문입니다.</p>' +
    '<p><b>이어지는 차시.</b> <a href="#text" onclick="go(\'text\');return false;">6차시 · 텍스트를 집합으로</a> 에서 만든 단어집합의 원소 하나하나가 DF를 계산하는 단위입니다.</p>' +
    '<p class="tf-src">씨마스 「인공지능 수학」 Ⅱ p.58 및 p.60 \'지식 Plus\' 서술을 재구성</p>',

  '역문서 빈도수 IDF':
    '<p><b>정의.</b> 역문서 빈도수(IDF, Inverse Document Frequency)는 <b>상대도수 DF/n의 역수</b>, ' +
    '즉 <span class="mi">IDF = n/DF</span> 입니다. 이름의 \'역(Inverse)\'이 바로 역수를 뜻합니다. ' +
    '많은 문서에 등장하는 단어(DF가 큰 단어)의 중요도는 낮추고, 몇몇 문서에만 등장하는 단어(DF가 작은 단어)의 ' +
    '중요도는 높이는 역할을 합니다.</p>' +
    '<p><b>예시.</b> 문서가 3개일 때(n = 3), 모든 문서에 나온 \'캠핑장\'은 IDF = 3/3 = 1로 가장 작고, ' +
    '한 문서에만 나온 \'화장실\'은 IDF = 3/1 = 3으로 가장 큽니다. n/DF로 정의하므로 IDF의 최솟값은 1, 최댓값은 n입니다.</p>' +
    '<p><b>이번 차시와의 연결.</b> <b>활동 ① 3단</b>에서 여덟 개 단어의 IDF를 직접 구하며 ' +
    '"DF가 커지면 IDF가 작아진다"는 반비례 관계를 눈으로 확인합니다. <b>활동 ②</b>에서는 이 IDF가 ' +
    '워드클라우드의 글자 크기를 어떻게 바꾸어 놓는지 두 그림을 나란히 놓고 비교합니다.</p>' +
    '<div class="btn-row"><button class="btn cmn-go" type="button" onclick="tfSee(0,\'tf-st3\')">활동 ① 3단으로 이동</button></div>' +
    '<p><b>이어지는 차시.</b> <a href="#bias" onclick="go(\'bias\');return false;">5차시 · 빅데이터와 편향</a> 에서 다룬 상대도수 개념이 여기서 DF/n으로 다시 등장합니다.</p>' +
    '<p class="tf-src">씨마스 「인공지능 수학」 Ⅱ p.58, 동아출판 Ⅱ p.57, 미래엔 「인공지능 수학」 Ⅱ p.59 서술을 재구성</p>',

  'TF-IDF':
    '<p><b>정의.</b> TF-IDF는 단어 빈도수와 역문서 빈도수를 곱한 값, ' +
    '즉 <span class="mi">TF-IDF(d, t) = TF(d, t) × IDF(t)</span> 입니다. ' +
    '"그 문서에서 자주 나오면서(TF가 크고) 동시에 다른 문서에는 잘 나오지 않는(IDF가 큰) 단어"에 큰 값을 주는 지표입니다. ' +
    '이 값이 큰 단어를 그 문서의 <b>핵심 단어(주제어)</b> 로 봅니다.</p>' +
    '<p><b>예시 1.</b> 후기 A에서 \'사진\'은 TF = 2, IDF = 3이므로 TF-IDF = 6이고, ' +
    '\'캠핑장\'은 TF = 1, IDF = 1이므로 TF-IDF = 1입니다. 그래서 후기 A의 주제어는 \'사진\'이 됩니다.</p>' +
    '<p><b>예시 2.</b> 음식점 후기 A 「추천! 위생적이고 인테리어가 예뻐서 이 음식점을 추천해요.」에서는 ' +
    'TF만 보면 \'추천\'(2회)이 \'위생적\'(1회)보다 커 보입니다. 그러나 \'추천\'은 네 후기에 모두 나와 IDF = 1, ' +
    '\'위생적\'은 한 후기에만 나와 IDF = 4이므로, TF-IDF는 \'추천\' 2, \'위생적\' 4가 되어 <b>순위가 뒤집힙니다.</b></p>' +
    '<p><b>이번 차시와의 연결.</b> <b>활동 ① 4단</b>에서 24칸을 모두 채우면 문서마다 TF-IDF가 가장 큰 단어에 ' +
    '자동으로 배지가 붙습니다. <b>활동 ③ 뉴스 제목 맞히기</b>에서는 TF 상위 단어만 보고는 제목을 맞히지 못하다가, ' +
    'TF-IDF 상위 단어를 보는 순간 정답률이 뛰어오르는 것을 직접 겪게 됩니다.</p>' +
    '<div class="btn-row"><button class="btn cmn-go" type="button" onclick="tfSee(0,\'tf-st4\')">활동 ① 4단으로 이동</button></div>' +
    '<p><b>기준값에 관하여.</b> TF-IDF가 "크다·작다"를 가르는 절대적인 기준값은 없습니다. ' +
    '분석 목적에 따라 문서 안에서 상대적인 기준을 정해야 합니다. 활동 ②의 기준값 슬라이더가 이 점을 체험하도록 만든 장치입니다.</p>' +
    '<p><b>이어지는 차시.</b> <span class="tf-soon">11차시 · 리뷰 분석과 추천</span> 에서 리뷰 100건에 오늘의 계산을 그대로 적용합니다.</p>' +
    '<p class="tf-src">씨마스 「인공지능 수학」 Ⅱ p.59 및 p.59 \'정보 Plus(TF-IDF 기준값)\', 미래엔 Ⅱ p.59~60, 동아출판 Ⅱ p.58 서술을 재구성</p>',

  '[선택 심화] 로그로 정의하는 IDF':
    '<p><span class="tf-badge adv">선택 심화 · 평가 제외</span></p>' +
    '<p><b>정의.</b> 인공지능이 실제로 다루는 문서의 개수 n은 상상하기 어려울 만큼 큽니다. ' +
    '이때 IDF = n/DF로 계산하면 IDF 값이 지나치게 커져 계산이 불편해집니다. ' +
    '그래서 큰 수를 간결하게 표현하는 로그를 이용하여 <span class="mi">IDF = log₁₀(n/DF)</span>로 정의하기도 합니다.</p>' +
    '<p><b>예시.</b> n = 10⁶, DF = 10²이면 n/DF = 10⁴이라는 큰 수가 되지만, 상용로그를 이용하면 ' +
    'log₁₀ 10⁴ = 4라는 작은 수가 되어 다루기 편해집니다. 로그는 수가 커질수록 증가 속도를 부드럽게 눌러 주는 ' +
    '<b>브레이크</b> 역할을 합니다.</p>' +
    '<p><b>한 가지 더.</b> 로그 방식에서는 모든 문서에 등장하는 단어의 IDF가 log₁₀(n/n) = log₁₀ 1 = 0이 되어 ' +
    'TF-IDF가 완전히 0이 됩니다. n/DF 방식에서 IDF가 1까지만 내려가는 것과 달리, 로그 방식은 흔한 단어를 아예 지워 버립니다. ' +
    '<b>활동 ②의 IDF 방식 라디오를 로그로 바꾸면 \'정부·발표·대책\' 세 단어가 워드클라우드에서 사라지는 장면</b>을 볼 수 있습니다.</p>' +
    '<p><b>평가 범위 안내.</b> 로그의 정의와 성질은 『대수』 과목에서 배웁니다. 이 칩의 내용은 <b>선택 심화</b>이며 ' +
    '오늘의 형성평가와 지필평가 범위에 들어가지 않습니다. 기본 정의는 IDF = n/DF입니다.</p>' +
    '<div class="btn-row"><button class="btn cmn-go" type="button" onclick="tfSee(1,\'tf-idfmode\')">활동 ② 로그 라디오로 이동</button></div>' +
    '<p class="tf-src">씨마스 「인공지능 수학」 Ⅱ p.61 \'더 알아보기 — 로그로 정의하는 역문서 빈도수(IDF)\', 미래엔 Ⅱ p.61 서술을 재구성</p>',
};


/* ═════════ 5. 활동 ① 데이터 — 캠핑장 후기 (n = 3) ═════════
   §8-3 검산표: 동아출판 Ⅱ p.57~58 인쇄 표와 전 칸 일치 확인 완료. */
const TF_N = 3;
const TF_U = ['뷰','좋다','사진','깨끗하다','캠핑장','차박','온수','화장실'];
const TF_RAW = [
  {l:'A', t:'뷰가 좋아 사진이 잘 나와요. 깨끗한 캠핑장에서 사진 찍어요.'},
  {l:'B', t:'뷰가 좋고, 깨끗한 차박에 좋은 캠핑장!'},
  {l:'C', t:'캠핑장에 온수가 잘 나와요. 화장실도 깨끗하고 온수가 나와요.'},
];
const TF_TFV = [
  [1,1,2,1,1,0,0,0],
  [1,2,0,1,1,1,0,0],
  [0,0,0,1,1,0,2,1],
];
const TF_DFV  = [2,2,1,3,3,1,1,1];
const TF_RATV = TF_DFV.map(d=>d/TF_N);                    // DF/n
const TF_IDFV = TF_DFV.map(d=>TF_N/d);                    // n/DF
const TF_TIV  = TF_TFV.map(r=>r.map((v,j)=>v*TF_IDFV[j]));// TF × IDF

/* 원문 형광펜용 표층형 — 사전형 단어가 원문에서 어떤 모습으로 나타나는지 */
const TF_MARKS = {
  '뷰':['뷰'], '좋다':['좋아','좋고','좋은'], '사진':['사진'],
  '깨끗하다':['깨끗한','깨끗하고'], '캠핑장':['캠핑장'], '차박':['차박'],
  '온수':['온수'], '화장실':['화장실'],
};

/* 예시 칸(활동지와 동일) — [단, 행, 열] */
const TF_GIVEN = {
  1:[[0,0]],                       // TF(A)의 '뷰' = 1
  2:{df:[4,7]},                    // 캠핑장의 DF = 3, 화장실의 DF = 1
  3:[4,7],                         // 캠핑장의 IDF = 1, 화장실의 IDF = 3
  4:[[0,4],[2,7]],                 // TF-IDF(A)의 캠핑장 = 1, TF-IDF(C)의 화장실 = 3
};

/* ⓓ 마무리 — 문서별 상위 단어와 모범 답안 */
const TF_TOP = [
  {d:'후기 A', w:'사진 (6)',            r:'사진 찍기 좋아서'},
  {d:'후기 B', w:'좋다 (3), 차박 (3)',  r:'차박하기 좋아서'},
  {d:'후기 C', w:'온수 (6), 화장실 (3)',r:'온수가 잘 나와서'},
];


/* ═════════ 6. 활동 ②·③ 데이터 — 뉴스 말뭉치 (n = 5) ═════════
   검산 요점 ① 정부·발표·대책 DF = 5 = n → IDF = 1 (로그 방식 0)
             ② 나머지 10개 단어 DF = 1 → IDF = 5 (로그 방식 log₁₀5 ≈ 0.699)
             ③ 다섯 문서 모두 TF 상위 3개가 {정부, 발표, 대책}의 순열 */
const TF_NN = 5;
const TF_NW = ['정부','발표','대책','폭염','온열질환','배터리','충전','관중','구단','물가','장바구니','발사체','궤도'];
const TF_NTF = [
  [2,3,2,2,1,0,0,0,0,0,0,0,0],
  [2,2,3,0,0,2,2,0,0,0,0,0,0],
  [2,3,3,0,0,0,0,2,2,0,0,0,0],
  [3,2,2,0,0,0,0,0,0,2,2,0,0],
  [2,3,2,0,0,0,0,0,0,0,0,2,2],
];
const TF_NDF = TF_NW.map((w,j)=>TF_NTF.reduce((a,r)=>a+(r[j]>0?1:0),0));
const TF_DOCLB = ['①','②','③','④','⑤'];
const TF_TITLES = [
  '㉠ 「기록적 폭염 계속… 정부, 온열질환 대책 발표」',
  '㉡ 「전기차 배터리·충전 안전 대책, 정부 발표」',
  '㉢ 「프로야구 관중 1000만 돌파… 구단들 기념행사 발표」',
  '㉣ 「장바구니 물가 들썩… 정부, 물가 안정 대책 발표」',
  '㉤ 「우리 발사체, 목표 궤도 안착… 성공 발표」',
];

function tfIdfOf(j, mode){
  const df=TF_NDF[j];
  return (mode==='log') ? Math.log10(TF_NN/df) : (TF_NN/df);
}
/* 값 내림차순 → 같으면 단어집합 순서(표의 왼쪽부터) */
function tfRank(vals, k){
  const idx=vals.map((v,j)=>j).filter(j=>vals[j]>0);
  idx.sort((a,b)=> (vals[b]-vals[a]) || (a-b));
  return idx.slice(0,k);
}


/* ═════════ 7. 화면 이동 · 탭 ═════════ */
let tfTabLock = true;          // 활동 ①을 마쳐야 ②·③ 탭이 열립니다
let tfStage   = 1;             // 현재 열린 단(1~4)
let tfPassed  = {1:false,2:false,3:false,4:false};

function tfTab(n, el){
  const root=tfEl('v-tfidf'); if(!root) return;
  if(tfTabLock && n>0){
    const st=tfEl('tf-tab-st');
    if(st) st.textContent='🔒 활동 ①을 먼저 완성해 주세요. 4단(TF-IDF)까지 모두 맞히면 활동 ②·③ 탭이 열립니다.';
    return;
  }
  root.querySelectorAll('.tf-tabs .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  root.querySelectorAll('.tf-panel').forEach(p=>p.classList.remove('on'));
  const pn=tfEl('tf-p'+n);
  if(pn) pn.classList.add('on');
  const st=tfEl('tf-tab-st'); if(st) st.textContent='';
  // 캔버스는 숨겨져 있던 동안 폭을 잴 수 없으므로, 패널이 보이는 시점에 두 번 다시 그립니다.
  if(n===1){
    try{ requestAnimationFrame(()=>{ try{ tfCloudResize(); }catch(e){} }); }catch(e){}
    setTimeout(()=>{ try{ tfCloudResize(); }catch(e){} }, 60);
  }
}

function tfTabUnlock(){
  tfTabLock=false;
  const root=tfEl('v-tfidf'); if(!root) return;
  root.querySelectorAll('.tf-tabs .tab').forEach(t=>{
    t.classList.remove('lock');
    t.removeAttribute('title');
    const s=t.querySelector('.lk'); if(s) s.remove();
  });
  const st=tfEl('tf-tab-st');
  if(st) st.textContent='활동 ②·③ 탭이 열렸습니다. 이어서 진행해 보세요.';
}

/* 칩·해설에서 활동으로 이동합니다. tab은 STEP 2 탭 번호(0·1·2), id는 스크롤 목표. */
function tfSee(tab, id){
  const root=tfEl('v-tfidf'); if(!root) return;
  const tabs=root.querySelectorAll('.tf-tabs .tab');
  if(typeof tab==='number' && tabs[tab]){
    if(tab>0 && tfTabLock){
      const st=tfEl('tf-tab-st');
      if(st) st.textContent='🔒 활동 ①을 먼저 완성해 주세요. 4단까지 모두 맞히면 이 활동이 열립니다.';
      try{ tabs[0].scrollIntoView({behavior:tfPrefersReduce()?'auto':'smooth', block:'center'}); }catch(e){}
      return;
    }
    tabs[tab].click();
  }
  const target=(id && tfEl(id)) || tabs[tab] || null;
  if(target && target.scrollIntoView){
    try{ target.scrollIntoView({behavior:tfPrefersReduce()?'auto':'smooth', block:'center'}); }
    catch(e){ try{ target.scrollIntoView(); }catch(e2){} }
  }
}


/* ═════════ 8. 활동 ① — 4단 계단형 표 ═════════ */

function tfStair(){
  for(let k=1;k<=4;k++){
    const g=tfEl('tf-stair-'+k);
    if(!g) continue;
    g.classList.toggle('done', !!tfPassed[k]);
    g.classList.toggle('now', (!tfPassed[k] && k===tfStage));
  }
  const lb=tfEl('tf-stair-lb');
  if(lb) lb.textContent = tfPassed[4] ? '4단 완성 — 계단을 모두 올랐습니다.' : (tfStage+'단 진행 중 · 완료 '+[1,2,3,4].filter(k=>tfPassed[k]).length+'/4');
}

function tfNumCell(s,r,c,label){
  return '<td class="tf-c"><input class="tf-in" type="text" inputmode="numeric" maxlength="3" '+
    'data-s="'+s+'" data-r="'+r+'" data-c="'+c+'" aria-label="'+tfEsc(label)+'"></td>';
}
function tfFracCell(s,r,c,label){
  return '<td class="tf-c"><span class="tf-fin">'+
    '<input class="tf-in n" type="text" inputmode="numeric" maxlength="3" data-s="'+s+'" data-r="'+r+'" data-c="'+c+'" data-p="n" aria-label="'+tfEsc(label)+' 분자">'+
    '<i aria-hidden="true">╱</i>'+
    '<input class="tf-in d" type="text" inputmode="numeric" maxlength="3" placeholder="1" data-s="'+s+'" data-r="'+r+'" data-c="'+c+'" data-p="d" aria-label="'+tfEsc(label)+' 분모">'+
    '</span></td>';
}
function tfExCell(v){
  return '<td class="tf-c ex" title="예시로 미리 채워 둔 칸입니다">'+tfFmtHTML(v)+'<span class="tf-extag">예시</span></td>';
}
function tfHead(){
  return '<tr><th class="tf-rh"></th>'+TF_U.map(w=>'<th>'+tfEsc(w)+'</th>').join('')+'</tr>';
}

function tfStageHTML(k){
  let h='';
  if(k===1){
    h+='<div class="tf-scroll"><table class="tf-tbl">'+tfHead();
    for(let r=0;r<3;r++){
      h+='<tr><th class="tf-rh">TF('+TF_RAW[r].l+')</th>';
      for(let c=0;c<8;c++){
        h += (r===0&&c===0) ? tfExCell(1) : tfNumCell(1,r,c,'TF('+TF_RAW[r].l+') '+TF_U[c]);
      }
      h+='</tr>';
    }
    h+='</table></div>';
  }else if(k===2){
    h+='<div class="tf-scroll"><table class="tf-tbl">'+tfHead();
    h+='<tr><th class="tf-rh">DF</th>';
    for(let c=0;c<8;c++) h += (c===4||c===7) ? tfExCell(TF_DFV[c]) : tfNumCell(2,0,c,'DF '+TF_U[c]);
    h+='</tr><tr><th class="tf-rh">DF/n</th>';
    for(let c=0;c<8;c++) h += tfFracCell(2,1,c,'DF/n '+TF_U[c]);
    h+='</tr></table></div>';
  }else if(k===3){
    h+='<div class="tf-scroll"><table class="tf-tbl">'+tfHead();
    h+='<tr><th class="tf-rh">IDF</th>';
    for(let c=0;c<8;c++) h += (c===4||c===7) ? tfExCell(TF_IDFV[c]) : tfFracCell(3,0,c,'IDF '+TF_U[c]);
    h+='</tr></table></div>';
  }else{
    h+='<div class="tf-scroll"><table class="tf-tbl" id="tf-t4">'+tfHead();
    for(let r=0;r<3;r++){
      h+='<tr><th class="tf-rh">TF-IDF('+TF_RAW[r].l+')</th>';
      for(let c=0;c<8;c++){
        h += ((r===0&&c===4)||(r===2&&c===7)) ? tfExCell(TF_TIV[r][c])
                                              : tfFracCell(4,r,c,'TF-IDF('+TF_RAW[r].l+') '+TF_U[c]);
      }
      h+='</tr>';
    }
    h+='</table></div>';
  }
  return h;
}

const TF_STAGE_META = [
  null,
  {t:'1단 · 단어 빈도수 TF (24칸)',  f:'', n:'예시 칸 TF(A)의 \'뷰\' = 1 은 활동지와 똑같이 미리 채워 두었습니다. 나머지 23칸을 채우고 [1단 채점]을 누르세요.'},
  {t:'2단 · 문서 빈도수 DF와 상대도수 DF/n (16칸)', f:'DF = 그 단어가 등장한 <b>문서의 개수</b> · 상대도수 = DF/n (n = 3)', n:'예시 칸: 캠핑장의 DF = 3, 화장실의 DF = 1. 상대도수는 분자·분모 두 칸에 나누어 적습니다.'},
  {t:'3단 · 역문서 빈도수 IDF (8칸)', f:'IDF = 상대도수 DF/n 의 역수 = <b>n/DF</b> &nbsp;(n = 3)', n:'예시 칸: 캠핑장의 IDF = 1, 화장실의 IDF = 3. 정수는 분자 칸만 채우면 됩니다(분모는 1).'},
  {t:'4단 · TF-IDF (24칸)', f:'<b>TF-IDF = TF × IDF</b>', n:'예시 칸: TF-IDF(A)의 캠핑장 = 1 × 1 = 1, TF-IDF(C)의 화장실 = 1 × 3 = 3. 채운 칸을 누르면 계산 과정이 나타납니다.'},
];

function tfBuildStages(){
  const host=tfEl('tf-steps');
  if(!host) return;
  let h='';
  for(let k=1;k<=4;k++){
    const m=TF_STAGE_META[k];
    h+='<div class="tf-stage'+(k===1?' on':'')+'" id="tf-st'+k+'" data-k="'+k+'">'+
        '<h4 class="tf-stage-t">'+m.t+'</h4>'+
        (m.f?'<div class="tf-formula">'+m.f+'</div>':'')+
        '<p class="tf-stage-n">'+m.n+'</p>'+
        tfStageHTML(k)+
        '<div class="btn-row">'+
          '<button class="btn pri cmn-go" type="button" onclick="tfGrade('+k+')">'+k+'단 채점</button>'+
          '<button class="btn cmn-go" type="button" onclick="tfHint('+k+')">힌트</button>'+
          '<button class="btn cmn-go" type="button" onclick="tfClear('+k+')">이 단 지우기</button>'+
        '</div>'+
        '<div class="tf-msg" id="tf-msg'+k+'" role="status" aria-live="polite">칸을 모두 채운 뒤 [채점]을 누르세요. 맞은 칸은 초록으로 고정되고, 틀린 칸만 다시 입력할 수 있습니다.</div>'+
        (k===3?'<div class="tf-ladder" id="tf-ladder" hidden></div>':'')+
        (k===4?'<div class="tf-pop" id="tf-cellpop" hidden></div>':'')+
      '</div>';
  }
  host.innerHTML=h;
  if(host.dataset.tfBound!=='1'){
    host.addEventListener('click', tfCellClick);
    host.dataset.tfBound='1';
  }
  tfStair();
}

function tfCellsOf(k){
  const box=tfEl('tf-st'+k);
  return box ? Array.prototype.slice.call(box.querySelectorAll('.tf-in')) : [];
}

function tfExpect(k,r,c){
  if(k===1) return TF_TFV[r][c];
  if(k===2) return (r===0) ? TF_DFV[c] : TF_RATV[c];
  if(k===3) return TF_IDFV[c];
  return TF_TIV[r][c];
}

function tfReadCell(inp){
  const s=+inp.dataset.s, r=+inp.dataset.r, c=+inp.dataset.c;
  const td=inp.closest('td');
  const isFrac=!!td.querySelector('.tf-fin');
  if(!isFrac){
    const raw=inp.value.trim();
    if(raw==='') return {empty:true};
    const v=Number(raw);
    return isFinite(v) ? {v:v, reduced:true} : {bad:true};
  }
  const nEl=td.querySelector('.tf-in.n'), dEl=td.querySelector('.tf-in.d');
  const nRaw=nEl.value.trim(), dRaw=dEl.value.trim();
  if(nRaw==='') return {empty:true};
  const n=Number(nRaw), d=(dRaw===''?1:Number(dRaw));
  if(!isFinite(n)||!isFinite(d)||d===0) return {bad:true};
  const g=tfGcd(n,d);
  return {v:n/d, reduced:(n===0? true : (g===1)), n:n, d:d, s:s, r:r, c:c};
}

function tfGrade(k){
  const cells=tfCellsOf(k);
  if(!cells.length) return;
  const tds=[];
  cells.forEach(i=>{ const t=i.closest('td'); if(tds.indexOf(t)<0) tds.push(t); });
  let empty=0, wrong=0, notReduced=0;
  tds.forEach(td=>{
    const inp=td.querySelector('.tf-in');
    const res=tfReadCell(inp);
    const exp=tfExpect(k, +inp.dataset.r, +inp.dataset.c);
    td.classList.remove('ok','no');
    if(res.empty){ empty++; return; }
    if(res.bad || Math.abs(res.v-exp)>1e-9){
      wrong++;
      td.classList.add('no');
      td.querySelectorAll('.tf-in').forEach(x=>{ x.readOnly=false; });
      return;
    }
    if(res.reduced===false) notReduced++;
    td.classList.add('ok');
    td.querySelectorAll('.tf-in').forEach(x=>{ x.readOnly=true; });
  });
  const msg=tfEl('tf-msg'+k);
  const total=tds.length, right=total-wrong-empty;
  if(empty||wrong){
    if(msg){
      msg.className='tf-msg no';
      msg.innerHTML='맞은 칸 <b>'+right+'</b> / '+total+' — '+
        (empty?('아직 비어 있는 칸이 '+empty+'개 있습니다. '):'')+
        (wrong?('빨간 테두리 칸을 다시 확인해 보세요. '):'')+
        '[힌트]를 누르면 원문에서 그 단어가 나온 곳을 형광펜으로 표시해 드립니다.';
    }
    return;
  }
  tfPassed[k]=true;
  if(msg){
    msg.className='tf-msg ok';
    msg.innerHTML='✓ '+k+'단에서 직접 채워야 할 '+total+'칸을 모두 맞혔습니다.'+
      (notReduced?' <b>기약분수로 고쳐 볼까요?</b> 값이 같아 정답으로 처리했지만, 약분한 모습이 더 읽기 좋습니다.':'');
  }
  if(k===3) tfLadder();
  if(k<4){
    tfStage=k+1;
    const nx=tfEl('tf-st'+(k+1));
    if(nx){
      nx.classList.add('on');
      if(!tfPrefersReduce()) nx.classList.add('slide');
      setTimeout(()=>{ try{ nx.scrollIntoView({behavior:tfPrefersReduce()?'auto':'smooth', block:'start'}); }catch(e){} }, 120);
    }
  }else{
    tfStage=4;
    tfHeat();
    tfFinishAct1();
  }
  tfStair();
}

function tfClear(k){
  tfCellsOf(k).forEach(i=>{ i.readOnly=false; i.value=''; });
  const box=tfEl('tf-st'+k);
  if(box) box.querySelectorAll('td.tf-c').forEach(td=>td.classList.remove('ok','no'));
  const msg=tfEl('tf-msg'+k);
  if(msg){ msg.className='tf-msg'; msg.textContent='이 단을 비웠습니다. 다시 채워 보세요.'; }
}

/* [힌트] — 틀린 칸 하나를 골라 원문에서 그 단어가 나타난 부분을 형광펜으로 표시합니다.
   정답 수를 직접 알려 주지는 않습니다. */
function tfHint(k){
  const box=tfEl('tf-st'+k); if(!box) return;
  const bad=Array.prototype.slice.call(box.querySelectorAll('td.tf-c.no, td.tf-c:not(.ok):not(.ex)'))
    .filter(td=>td.querySelector('.tf-in'));
  const msg=tfEl('tf-msg'+k);
  if(!bad.length){ if(msg){ msg.className='tf-msg'; msg.textContent='먼저 칸을 채우고 [채점]을 눌러 보세요.'; } return; }
  const td=bad[0];
  const inp=td.querySelector('.tf-in');
  const c=+inp.dataset.c, r=+inp.dataset.r;
  const word=TF_U[c];
  const rows=(k===1||k===4) ? [r] : [0,1,2];
  let h='<b>힌트 — \''+tfEsc(word)+'\' 를 원문에서 찾아봅시다.</b><div class="tf-hint">';
  rows.forEach(i=>{
    h+='<p><span class="lb">후기 '+TF_RAW[i].l+'</span> '+tfMarkText(TF_RAW[i].t, word)+'</p>';
  });
  h+='</div>';
  if(k===2) h+='<p class="tf-hint-n">DF는 <b>몇 번 나왔는지</b>가 아니라 <b>몇 개의 문서에</b> 나왔는지를 셉니다.</p>';
  if(k===3) h+='<p class="tf-hint-n">IDF는 상대도수 DF/n 의 <b>역수</b>입니다. 분자와 분모를 뒤집어 보세요.</p>';
  if(k===4) h+='<p class="tf-hint-n">이 칸의 값은 같은 열의 <b>1단 TF</b>와 <b>3단 IDF</b>를 곱한 값입니다.</p>';
  if(msg){ msg.className='tf-msg hint'; msg.innerHTML=h; }
}

function tfMarkText(text, word){
  const forms=(TF_MARKS[word]||[word]).slice().sort((a,b)=>b.length-a.length);
  let out='', i=0;
  while(i<text.length){
    let hit=null;
    for(let f=0; f<forms.length; f++){
      if(text.startsWith(forms[f], i)){ hit=forms[f]; break; }
    }
    if(hit){ out+='<mark class="tf-mk">'+tfEsc(hit)+'</mark>'; i+=hit.length; }
    else { out+=tfEsc(text[i]); i++; }
  }
  return out;
}

/* 3단 통과 → IDF 반비례 막대 그래프 슬라이드-인 */
function tfLadder(){
  const box=tfEl('tf-ladder'); if(!box) return;
  const rows=[{df:1},{df:2},{df:3}];
  let h='<p class="tf-ladder-t">DF가 커지면 IDF가 작아집니다 — 반비례 관계 (n = 3)</p>';
  rows.forEach(r=>{
    const idf=TF_N/r.df;
    const words=TF_U.filter((w,j)=>TF_DFV[j]===r.df);
    h+='<div class="tf-lrow"><span class="dfl">DF = '+r.df+'</span>'+
       '<span class="tk"><span class="fl" style="width:'+(idf/TF_N*100)+'%"></span></span>'+
       '<span class="vl">IDF = '+tfFmtHTML(idf)+'</span>'+
       '<span class="ws">'+tfEsc(words.join(', '))+'</span></div>';
  });
  h+='<p class="tf-ladder-n">n = 3 이므로 IDF가 가질 수 있는 값은 3/3 = 1, 3/2, 3/1 = 3 세 가지뿐입니다. ' +
     'IDF의 <b>최솟값은 1</b>이며 0이 되지 않는다는 점도 확인해 둡시다.</p>';
  box.innerHTML=h;
  box.hidden=false;
  if(!tfPrefersReduce()) box.classList.add('slide');
}

/* 4단 완성 → 히트맵(브라운 농도) + 문서별 최댓값 🏆 */
function tfHeat(){
  const t=tfEl('tf-t4'); if(!t) return;
  t.classList.add('heat');
  const maxAll=6;
  for(let r=0;r<3;r++){
    const row=t.rows[r+1];
    if(!row) continue;
    const mx=Math.max.apply(null, TF_TIV[r]);
    for(let c=0;c<8;c++){
      const td=row.cells[c+1];
      if(!td) continue;
      const v=TF_TIV[r][c];
      td.style.setProperty('--tfh', (v/maxAll).toFixed(3));
      td.classList.add('hv');
      td.querySelectorAll('.tf-in').forEach(x=>{ x.readOnly=true; });
      if(v>0 && v===mx && !td.querySelector('.tf-trophy')){
        const s=document.createElement('span');
        s.className='tf-trophy'; s.textContent='🏆'; s.title='이 문서에서 TF-IDF가 가장 큰 단어';
        td.appendChild(s);
      }
    }
  }
}

/* 4단 셀 클릭 → 계산 과정 말풍선 */
function tfCellClick(ev){
  const td=ev.target.closest('td.tf-c');
  if(!td) return;
  const box=td.closest('.tf-stage');
  if(!box || box.dataset.k!=='4') return;
  const row=td.parentElement;
  const c=Array.prototype.indexOf.call(row.cells, td)-1;
  const r=Array.prototype.indexOf.call(row.parentElement.rows, row)-1;
  if(r<0||c<0||r>2||c>7) return;
  const pop=tfEl('tf-cellpop'); if(!pop) return;
  const tf=TF_TFV[r][c], idf=TF_IDFV[c], df=TF_DFV[c];
  pop.hidden=false;
  pop.innerHTML='<button class="x" type="button" aria-label="닫기" onclick="this.parentElement.hidden=true">✕</button>'+
    '<b>TF-IDF('+TF_RAW[r].l+', '+tfEsc(TF_U[c])+') 계산 과정</b>'+
    '<ol><li>TF('+TF_RAW[r].l+', '+tfEsc(TF_U[c])+') = <b>'+tf+'</b> — 후기 '+TF_RAW[r].l+'에서 '+tfEsc(TF_U[c])+'이(가) 나온 횟수</li>'+
    '<li>DF('+tfEsc(TF_U[c])+') = '+df+' → IDF = n/DF = 3/'+df+' = <b>'+tfFmtHTML(idf)+'</b></li>'+
    '<li>TF × IDF = '+tf+' × '+tfFmt(idf)+' = <b>'+tfFmtHTML(TF_TIV[r][c])+'</b></li></ol>';
  try{ pop.scrollIntoView({behavior:tfPrefersReduce()?'auto':'smooth', block:'nearest'}); }catch(e){}
}

/* 4단 통과 → ⓓ 상위 단어 카드 · 요약 문장 · 단계 토글 공개 · 탭 잠금 해제 */
function tfFinishAct1(){
  const wrap=tfEl('tf-act1-done');
  if(wrap){
    wrap.hidden=false;
    if(!tfPrefersReduce()) wrap.classList.add('slide');
  }
  const tgl=tfEl('tf-act1-tgl');
  if(tgl){
    tgl.hidden=false;
    if(typeof initToggles==='function'){ try{ initToggles(tgl); }catch(e){} }
  }
  const box=tfEl('tf-top');
  if(box && !box.dataset.done){
    box.dataset.done='1';
    let h='<div class="tf-scroll"><table class="tf-tbl tf-top-tbl">'+
      '<tr><th>문서</th><th>TF-IDF 상위 단어</th><th>이 후기가 말하는 좋은 이유 — 직접 한 문장으로</th></tr>';
    TF_TOP.forEach((t,i)=>{
      h+='<tr><th class="tf-rh">'+tfEsc(t.d)+'</th><td class="tf-w">'+tfEsc(t.w)+'</td>'+
         '<td><textarea class="tf-ta" rows="2" data-i="'+i+'" aria-label="'+tfEsc(t.d)+'가 말하는 좋은 이유" placeholder="예) ○○해서"></textarea></td></tr>';
    });
    h+='</table></div>';
    box.innerHTML=h;
    let saved=[];
    try{ saved=JSON.parse(tfGet('aimath.tfidf.summary','[]')); }catch(e){ saved=[]; }
    box.querySelectorAll('.tf-ta').forEach((ta,i)=>{
      if(Array.isArray(saved)&&saved[i]) ta.value=saved[i];
      ta.addEventListener('input',()=>{
        const arr=Array.prototype.map.call(box.querySelectorAll('.tf-ta'), x=>x.value);
        tfSet('aimath.tfidf.summary', JSON.stringify(arr));
      });
    });
  }
  tfTabUnlock();
}

function tfShowModel(){
  const b=tfEl('tf-top-model'); if(!b) return;
  b.hidden=!b.hidden;
}


/* ═════════ 9. 활동 ② — TF 구름 vs TF-IDF 구름 ═════════ */
let tfDoc = 0;                 // 0 = 전체 말뭉치, 1~5 = 문서 ①~⑤
let tfMode = 'ratio';          // 'ratio' | 'log'
let tfThr = 0;                 // 기준값 슬라이더

function tfWeights(kind){
  const out=[];
  for(let j=0;j<TF_NW.length;j++){
    let tf;
    if(tfDoc===0) tf=TF_NTF.reduce((a,r)=>a+r[j],0);
    else tf=TF_NTF[tfDoc-1][j];
    const v = (kind==='tf') ? tf : tf*tfIdfOf(j,tfMode);
    if(v>0) out.push({w:TF_NW[j], v:v, j:j, tf:tf});
  }
  out.sort((a,b)=> (b.v-a.v) || (a.j-b.j));
  return out;
}

function tfCloudMax(){
  const a=tfWeights('ti');
  return a.length? a[0].v : 1;
}

/* 값에 비례한 글자 크기 · 나선 배치 · 충돌 회피 */
function tfDrawCloud(cv, items){
  if(!cv||!cv.getContext) return;
  const dpr=Math.min(window.devicePixelRatio||1, 2);
  const cssW=Math.max(160, cv.clientWidth||cv.parentElement.clientWidth||280);
  const cssH=Math.max(180, Math.round(cssW*0.72));
  cv.style.height=cssH+'px';
  cv.width=Math.round(cssW*dpr);
  cv.height=Math.round(cssH*dpr);
  const g=cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,cssW,cssH);

  const cs=getComputedStyle(document.documentElement);
  const pal=[ (cs.getPropertyValue('--fg')||'#1a1714').trim(),
              (cs.getPropertyValue('--body')||'#4a443c').trim(),
              (cs.getPropertyValue('--muted')||'#78726a').trim() ];
  const font=(cs.getPropertyValue('--sans')||'sans-serif').trim();

  const placed=[];
  if(!items.length){
    g.fillStyle=pal[2];
    g.font='500 15px '+font;
    g.textAlign='center'; g.textBaseline='middle';
    g.fillText('이 방식에서는 남는 단어가 없습니다.', cssW/2, cssH/2);
    cv._tfPlaced=[]; return;
  }
  const mx=items[0].v, mn=items[items.length-1].v;
  const big=Math.min(46, Math.max(24, cssW*0.11));
  const small=Math.max(13, big*0.36);

  items.forEach((it,rank)=>{
    const t=(mx===mn)?1:((it.v-mn)/(mx-mn));
    let fs=small+(big-small)*Math.pow(t,0.65);
    g.font='700 '+fs.toFixed(1)+'px '+font;
    let w=g.measureText(it.w).width;
    while(w>cssW*0.92 && fs>11){ fs-=1; g.font='700 '+fs.toFixed(1)+'px '+font; w=g.measureText(it.w).width; }
    const h=fs*1.18;
    const bw=w+fs*0.62;            // 🏅 배지 자리를 미리 확보해 기준값이 바뀌어도 위치가 흔들리지 않습니다
    let x=cssW/2, y=cssH/2, ok=false;
    for(let s=0; s<1400; s++){
      const a=s*0.32, rr=2.1*a;
      x=cssW/2 + rr*Math.cos(a)*1.35;
      y=cssH/2 + rr*Math.sin(a)*0.68;
      const r={x:x-bw/2, y:y-h/2, w:bw, h:h};
      if(r.x<3||r.y<3||r.x+r.w>cssW-3||r.y+r.h>cssH-3) continue;
      let bad=false;
      for(let p=0;p<placed.length;p++){
        const q=placed[p];
        if(r.x<q.x+q.w+3 && r.x+r.w+3>q.x && r.y<q.y+q.h+2 && r.y+r.h+2>q.y){ bad=true; break; }
      }
      if(!bad){ ok=true; break; }
    }
    if(!ok) return;
    placed.push({x:x-bw/2, y:y-h/2, w:bw, h:h, cx:x, cy:y, fs:fs, tw:w,
                 word:it.w, v:it.v, j:it.j, tf:it.tf,
                 col:pal[rank<Math.ceil(items.length/3)?0:(rank<Math.ceil(items.length*2/3)?1:2)], font:font});
  });
  cv._tfPlaced=placed;
  tfPaintCloud(cv);
}

function tfPaintCloud(cv){
  if(!cv||!cv.getContext||!cv._tfPlaced) return;
  const dpr=Math.min(window.devicePixelRatio||1, 2);
  const g=cv.getContext('2d');
  const cssW=cv.width/dpr, cssH=cv.height/dpr;
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,cssW,cssH);
  g.textAlign='left'; g.textBaseline='middle';
  const useThr = (cv.dataset.kind==='ti');
  cv._tfPlaced.forEach(p=>{
    const on = !useThr || (p.v >= tfThr);
    g.globalAlpha = on ? 1 : 0.22;
    g.fillStyle=p.col;
    g.font='700 '+p.fs.toFixed(1)+'px '+p.font;
    g.fillText(p.word, p.x, p.cy);
    if(useThr && tfThr>0 && on){
      g.font=(p.fs*0.5).toFixed(1)+'px '+p.font;
      g.fillText('🏅', p.x+p.tw+2, p.cy - p.fs*0.22);
    }
    g.globalAlpha=1;
  });
}

function tfCloudClick(ev){
  const cv=ev.currentTarget;
  if(!cv._tfPlaced) return;
  const rect=cv.getBoundingClientRect();
  const x=ev.clientX-rect.left, y=ev.clientY-rect.top;
  let hit=null;
  cv._tfPlaced.forEach(p=>{ if(!hit && x>=p.x && x<=p.x+p.w && y>=p.y && y<=p.y+p.h) hit=p; });
  const pop=tfEl('tf-cloudpop'); if(!pop) return;
  if(!hit){ pop.hidden=true; return; }
  const idf=tfIdfOf(hit.j, tfMode);
  const df=TF_NDF[hit.j];
  const idfTxt = (tfMode==='log')
    ? ('log₁₀(5/'+df+') ≈ '+ (Math.round(idf*1000)/1000))
    : ('5/'+df+' = '+tfFmt(idf));
  pop.hidden=false;
  pop.innerHTML='<button class="x" type="button" aria-label="닫기" onclick="this.parentElement.hidden=true">✕</button>'+
    '<b>'+tfEsc(hit.word)+'</b> — '+(tfDoc===0?'전체 말뭉치':('문서 '+TF_DOCLB[tfDoc-1]))+
    '<p>TF = '+hit.tf+', IDF = '+idfTxt+', TF-IDF = '+hit.tf+' × '+
    (tfMode==='log'?(Math.round(idf*1000)/1000):tfFmt(idf))+' = <b>'+
    (tfMode==='log'?(Math.round(hit.tf*idf*1000)/1000):tfFmt(hit.tf*idf))+'</b></p>';
}

function tfCloudRender(){
  const a=tfEl('tf-cloud-tf'), b=tfEl('tf-cloud-ti');
  if(a){ a.dataset.kind='tf'; tfDrawCloud(a, tfWeights('tf')); }
  if(b){ b.dataset.kind='ti'; tfDrawCloud(b, tfWeights('ti')); }
  const sl=tfEl('tf-thr');
  if(sl){
    const mx=tfCloudMax();
    sl.max=String(Math.max(1, Math.ceil(mx)));
    sl.step=(tfMode==='log')?'0.1':'1';
    if(tfThr>Number(sl.max)){ tfThr=0; sl.value='0'; }
  }
  tfThrLabel();
  const pop=tfEl('tf-cloudpop'); if(pop) pop.hidden=true;
  const note=tfEl('tf-cloud-note');
  if(note){
    note.innerHTML = (tfDoc===0)
      ? '지금은 <b>전체 말뭉치</b>를 보고 있습니다. 다섯 문서의 TF를 모두 더한 값이므로 흔한 단어가 여전히 큽니다. 문서를 하나 골라야 <b>그 문서다운 단어</b>가 보입니다.'
      : ('지금은 <b>문서 '+TF_DOCLB[tfDoc-1]+'</b>를 보고 있습니다. 왼쪽(TF)과 오른쪽(TF-IDF)에서 가장 큰 글자가 어떻게 달라지는지 비교해 보세요.');
  }
}

function tfPickDoc(i, el){
  tfDoc=i;
  const root=tfEl('v-tfidf'); if(!root) return;
  root.querySelectorAll('#tf-doc-chips .chip').forEach(c=>c.classList.remove('on'));
  if(el) el.classList.add('on');
  tfCloudRender();
  tfRevealAct2();
}

function tfSetMode(m){
  tfMode=m;
  tfThr=0;
  const sl=tfEl('tf-thr'); if(sl) sl.value='0';
  const n=tfEl('tf-mode-note');
  if(n){
    n.innerHTML = (m==='log')
      ? '<b>[선택 심화]</b> 로그 방식입니다. DF = n = 5인 \'정부·발표·대책\'은 log₁₀(5/5) = log₁₀ 1 = <b>0</b>이 되어 오른쪽 구름에서 <b>완전히 사라집니다.</b>'
      : '기본 방식입니다. IDF = n/DF 이므로 흔한 단어의 IDF도 <b>1까지만</b> 내려갑니다. 그래서 \'정부·발표·대책\'이 오른쪽 구름에 작게나마 남아 있습니다.';
  }
  tfCloudRender();
  tfRevealAct2();
}

function tfSetThr(v){
  tfThr=Number(v)||0;
  tfThrLabel();
  const b=tfEl('tf-cloud-ti'); if(b) tfPaintCloud(b);
}
function tfThrLabel(){
  const st=tfEl('tf-thr-st'); if(!st) return;
  const items=tfWeights('ti');
  const keep=items.filter(x=>x.v>=tfThr);
  st.innerHTML='기준값 = <b>'+(Math.round(tfThr*100)/100)+'</b> · 기준값 이상인 단어 <b>'+keep.length+'</b>개에 🏅 가 붙습니다'+
    (keep.length?(' — '+tfEsc(keep.slice(0,4).map(x=>x.w).join(', '))+(keep.length>4?' …':'')):'');
}

function tfCloudResize(){
  const a=tfEl('tf-cloud-tf'), b=tfEl('tf-cloud-ti');
  if(a){ tfDrawCloud(a, tfWeights('tf')); }
  if(b){ tfDrawCloud(b, tfWeights('ti')); }
}

/* 컨테이너 폭이 바뀌면(탭 전환·회전·창 크기) 자동으로 다시 배치합니다. */
function tfObserveClouds(){
  const box=tfEl('v-tfidf') && tfEl('v-tfidf').querySelector('.tf-clouds');
  if(!box || box.dataset.tfObs==='1' || typeof ResizeObserver!=='function') return;
  box.dataset.tfObs='1';
  let w=0, t=null;
  const ro=new ResizeObserver(entries=>{
    const nw=Math.round(entries[0].contentRect.width);
    if(!nw || nw===w) return;
    w=nw;
    clearTimeout(t);
    t=setTimeout(()=>{ try{ tfCloudResize(); }catch(e){} }, 40);
  });
  ro.observe(box);
}

function tfRevealAct2(){
  const t=tfEl('tf-act2-tgl');
  if(t && t.hidden){
    t.hidden=false;
    if(typeof initToggles==='function'){ try{ initToggles(t); }catch(e){} }
  }
}


/* ═════════ 10. 활동 ③ — 뉴스 제목 맞히기 ═════════ */
let tfOrder=[0,1,2,3,4];   // 문항으로 낼 문서 순서(라운드 1·2 동일)
let tfRoundNo=0;           // 0 = 시작 전, 1 · 2
let tfQi=0;
let tfScore=[0,0];
let tfPicked=[];

function tfShuffle(a){
  const r=a.slice();
  for(let i=r.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=r[i]; r[i]=r[j]; r[j]=t; }
  return r;
}

function tfRoundStart(n){
  tfRoundNo=n; tfQi=0; tfScore[n-1]=0; tfPicked=[];
  if(n===1) tfOrder=tfShuffle([0,1,2,3,4]);
  tfRoundRender();
}

function tfRoundRender(){
  const box=tfEl('tf-round'); if(!box) return;
  if(tfRoundNo===0){
    box.innerHTML='<p class="tf-round-n">두 라운드를 <b>반드시 이 순서로</b> 진행합니다. 먼저 TF 상위 3개 단어만 보고 맞혀 보세요.</p>'+
      '<div class="btn-row"><button class="btn pri cmn-go" type="button" onclick="tfRoundStart(1)">라운드 1 시작 — TF만 보고 맞히기</button></div>';
    return;
  }
  if(tfQi>=5){ tfRoundEnd(); return; }
  const d=tfOrder[tfQi];
  const vals=TF_NW.map((w,j)=> (tfRoundNo===1) ? TF_NTF[d][j] : TF_NTF[d][j]*tfIdfOf(j,'ratio'));
  const top=tfRank(vals,3);
  let h='<div class="tf-round-hd"><b>라운드 '+tfRoundNo+' · '+(tfRoundNo===1?'TF만 보고 맞히기':'TF-IDF 상위 3개로 다시 맞히기')+'</b>'+
        '<span class="tf-round-p">문항 '+(tfQi+1)+' / 5</span></div>'+
        '<p class="tf-round-n">문서 '+TF_DOCLB[d]+' 카드 — 아래 세 단어만 보고 어떤 뉴스인지 골라 보세요.</p>'+
        '<div class="tf-wcards">';
  top.forEach(j=>{
    h+='<span class="tf-wcard">'+tfEsc(TF_NW[j])+'<i>'+
       (tfRoundNo===1?('TF '+TF_NTF[d][j]):('TF-IDF '+tfFmt(vals[j])))+'</i></span>';
  });
  h+='</div><div class="tf-opts">';
  TF_TITLES.forEach((t,k)=>{
    h+='<button class="btn cmn-opt tf-opt" type="button" onclick="tfRoundPick('+k+',this)">'+tfEsc(t)+'</button>';
  });
  h+='</div><div class="tf-msg" id="tf-round-fb" role="status" aria-live="polite"></div>';
  box.innerHTML=h;
}

function tfRoundPick(k, el){
  const box=tfEl('tf-round'); if(!box) return;
  if(box.dataset.locked==='1') return;
  box.dataset.locked='1';
  const d=tfOrder[tfQi];
  const ok=(k===d);
  if(ok) tfScore[tfRoundNo-1]++;
  tfPicked.push({d:d, k:k, ok:ok});
  box.querySelectorAll('.tf-opt').forEach((b,i)=>{ b.disabled=true; if(i===d) b.classList.add('ans'); });
  if(el) el.classList.add('pick');
  const fb=tfEl('tf-round-fb');
  if(fb){
    fb.className='tf-msg '+(ok?'ok':'no');
    fb.innerHTML=(ok?'✓ 맞았습니다. ':'✗ 아쉽습니다. ')+'정답은 <b>'+tfEsc(TF_TITLES[d])+'</b>입니다.'+
      (tfRoundNo===1?' 다섯 문서의 카드가 사실상 같은 세 단어이므로 찍을 수밖에 없습니다.':'')+
      '<span class="tf-jump"><button class="btn cmn-go" type="button" onclick="tfRoundNext()">'+
      ((tfQi===4)?'라운드 결과 보기 →':'다음 문항 →')+'</button></span>';
  }
}

function tfRoundNext(){
  const box=tfEl('tf-round'); if(box) box.dataset.locked='';
  tfQi++;
  tfRoundRender();
}

function tfRoundEnd(){
  const box=tfEl('tf-round'); if(!box) return;
  const s=tfScore[tfRoundNo-1];
  let h='<p class="tf-round-score">라운드 '+tfRoundNo+' 결과 — <b>'+s+' / 5</b></p>';
  if(tfRoundNo===1){
    h+='<p class="tf-round-n">TF 상위 3개 단어만으로는 다섯 뉴스를 구별할 수 없습니다. 이제 같은 다섯 문항을 ' +
       '<b>TF-IDF 상위 3개</b>로 다시 풀어 봅시다.</p>'+
       '<div class="btn-row"><button class="btn pri cmn-go" type="button" onclick="tfRoundStart(2)">라운드 2 시작 — TF-IDF로 다시 맞히기</button></div>';
  }else{
    h+='<div class="btn-row"><button class="btn cmn-go" type="button" onclick="tfRoundStart(1)">두 라운드 다시 하기</button></div>';
  }
  box.innerHTML=h;
  box.dataset.locked='';
  if(tfRoundNo===2) tfRoundResult();
}

function tfRoundResult(){
  const box=tfEl('tf-round-res'); if(!box) return;
  box.hidden=false;
  if(!tfPrefersReduce()) box.classList.add('slide');
  const a=tfScore[0], b=tfScore[1];
  box.innerHTML='<h4>두 라운드 비교</h4>'+
    '<div class="tf-bar"><span class="nm">TF만 볼 때</span><span class="tk"><span class="fl a" style="width:'+(a/5*100)+'%"></span></span><span class="vl">'+a+' / 5</span></div>'+
    '<div class="tf-bar"><span class="nm">TF-IDF를 볼 때</span><span class="tk"><span class="fl b" style="width:'+(b/5*100)+'%"></span></span><span class="vl">'+b+' / 5</span></div>'+
    '<p class="tf-round-n" style="margin-top:0.8rem;">아래 문장을 완성해 봅시다. 여기에 쓴 문장은 정리 단계의 <b>핵심 질문 답안 칸</b>에 자동으로 불려 옵니다.</p>'+
    '<p class="tf-fill">"TF만 볼 때 나는 <b>'+a+'</b>/5, TF-IDF를 볼 때 나는 <b>'+b+'</b>/5를 맞혔다. 그 차이가 생긴 이유는 ____________________ 때문이다."</p>'+
    '<textarea class="tf-ta" id="tf-round-note" rows="3" aria-label="차이가 생긴 이유" placeholder="그 차이가 생긴 이유를 한 문장으로 적어 보세요."></textarea>';
  const ta=tfEl('tf-round-note');
  if(ta){
    ta.value=tfGet('aimath.tfidf.round','');
    ta.addEventListener('input',()=>{
      tfSet('aimath.tfidf.round', ta.value);
      const ans=tfEl('tf-answer');
      if(ans && !ans.dataset.touched) ans.value=ta.value;
    });
  }
  const tgl=tfEl('tf-act3-tgl');
  if(tgl && tgl.hidden){
    tgl.hidden=false;
    if(typeof initToggles==='function'){ try{ initToggles(tgl); }catch(e){} }
  }
}


/* ═════════ 11. STEP 3 — 핵심 질문 답안 · 선택 심화 도전 문항 ═════════ */
function tfAnswerInit(){
  const ta=tfEl('tf-answer'); if(!ta) return;
  const saved=tfGet('aimath.tfidf.answer','');
  const rd=tfGet('aimath.tfidf.round','');
  ta.value = saved || rd || '';
  if(saved) ta.dataset.touched='1';
  ta.addEventListener('input',()=>{ ta.dataset.touched='1'; tfSet('aimath.tfidf.answer', ta.value); });
}
function tfAnswerModel(){
  const b=tfEl('tf-answer-model'); if(!b) return;
  b.hidden=!b.hidden;
}

function tfChalRender(){
  const box=tfEl('tf-chal'); if(!box) return;
  let h='<p class="tf-chal-hd"><span class="tf-badge adv">선택 심화 · 평가 제외</span>'+
        '<span class="tf-badge">『대수』를 이수한 학생용</span></p>'+
        '<p class="tf-chal-n">이 문항은 위 형성평가 총점(5점 만점)에 <b>포함되지 않습니다.</b> 맞히면 "도전 성공" 배지만 받습니다.</p>'+
        '<p class="cmn-q">'+tfEsc(TF_CHAL.q)+'</p><div class="btn-row tf-chal-opts">';
  TF_CHAL.opts.forEach((o,k)=>{ h+='<button class="btn cmn-opt" type="button" onclick="tfChalPick('+k+',this)">'+tfEsc(o)+'</button>'; });
  h+='</div><div class="tf-chal-fb"></div>';
  box.innerHTML=h;
}
function tfChalPick(k, el){
  const box=tfEl('tf-chal'); if(!box) return;
  if(box.dataset.done==='1') return;
  box.dataset.done='1';
  const ok=(k===TF_CHAL.answer);
  box.querySelectorAll('.tf-chal-opts .btn').forEach((b,i)=>{ b.disabled=true; if(i===TF_CHAL.answer) b.classList.add('ans'); });
  if(el) el.classList.add('pick');
  const fb=box.querySelector('.tf-chal-fb');
  if(fb){
    fb.innerHTML='<div class="cmn-fb '+(ok?'ok':'no')+'">'+
      (ok?'🏅 도전 성공! ':'✗ 다시 생각해 봅시다. ')+'정답은 <b>'+tfEsc(TF_CHAL.opts[TF_CHAL.answer])+'</b>입니다.'+
      '<span class="x">'+TF_CHAL.explain+'</span></div>';
  }
}


/* ═════════ 12. 초기화 (IIFE + null 가드 + 지연 init) ═════════ */
let tfInited=false;

function tfInit(){
  if(tfInited) return;
  const root=tfEl('v-tfidf');
  if(!root) return;                 // 뷰가 없어도 core.js가 죽지 않도록 가드
  tfInited=true;

  if(typeof videoDeck   === 'function') videoDeck('tf-videos','tfidf',TF_VIDEOS);
  if(typeof warmStepper === 'function') warmStepper('tf-warm','tf',TF_WARM);
  if(typeof quizStepper === 'function') quizStepper('tf-quiz','tf',TF_QUIZ);
  if(typeof chipDefs    === 'function') chipDefs('#v-tfidf .tf-keys',TF_DEFS);
  if(typeof wsLinks     === 'function') wsLinks('tf-wslinks','tfidf');

  try{ tfBuildStages(); }catch(e){ console.error('tfBuildStages',e); }
  try{ tfChalRender(); }catch(e){ console.error('tfChalRender',e); }
  try{ tfAnswerInit(); }catch(e){}
  try{ tfRoundRender(); }catch(e){}
  try{ tfSetMode('ratio'); }catch(e){}
  try{ tfNewsTable(); }catch(e){}
  try{ tfObserveClouds(); }catch(e){}

  ['tf-cloud-tf','tf-cloud-ti'].forEach(id=>{
    const cv=tfEl(id);
    if(cv && cv.dataset.tfBound!=='1'){
      cv.dataset.tfBound='1';
      cv.addEventListener('click', tfCloudClick);
    }
  });
  if(!window.__tfResizeBound){
    window.__tfResizeBound=true;
    let t=null;
    window.addEventListener('resize',()=>{
      clearTimeout(t);
      t=setTimeout(()=>{ if(tfEl('v-tfidf') && tfEl('v-tfidf').classList.contains('active')) tfCloudResize(); },180);
    });
  }
}

/* 활동 ② 말뭉치 TF 표 (제목은 활동 ③까지 가려 둡니다) */
function tfNewsTable(){
  const box=tfEl('tf-news-table'); if(!box) return;
  let h='<div class="tf-scroll"><table class="tf-tbl tf-news">'+
    '<tr><th class="tf-rh">단어</th>'+TF_DOCLB.map(l=>'<th>'+l+'</th>').join('')+'<th>DF</th><th>IDF = 5/DF</th></tr>';
  TF_NW.forEach((w,j)=>{
    h+='<tr'+(TF_NDF[j]===TF_NN?' class="common"':'')+'><th class="tf-rh">'+tfEsc(w)+'</th>';
    for(let d=0;d<5;d++) h+='<td>'+TF_NTF[d][j]+'</td>';
    h+='<td class="df">'+TF_NDF[j]+'</td><td class="idf">'+tfFmtHTML(TF_NN/TF_NDF[j])+'</td></tr>';
  });
  h+='</table></div>';
  box.innerHTML=h;
}

(function tfidfInit(){
  const boot=function(){
    if(!document.getElementById('v-tfidf')) return;
    try{ tfInit(); }catch(e){ console.error('tfInit',e); }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();

/* ●●● ANCHOR-TFIDF ●●● (8차시 보강 코드는 이 줄 바로 위에 붙입니다) */


/* ══════════ 2단원 sim 뷰 코드 (unit2_build/sim/core-snippet.js) ══════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   9차시 · 얼마나 비슷한가 — 거리로 잴까, 방향으로 잴까 (뷰 슬러그 sim / 접두사 sm)
   ───────────────────────────────────────────────────────────────────────────
   · 이 블록은 core.js 의 끝(5차시 bias 블록 뒤, AIM_LESSONS 카탈로그 앞이 아니라
     파일 맨 끝)에 그대로 이어 붙입니다.  → INTEGRATION.md §2 참고
   · 공통 컴포넌트(videoDeck / warmStepper / quizStepper / chipDefs /
     wsPrint / wsLinks / aimRefExtras)는 "호출"만 하며 수정하지 않습니다.
   · 상수는 SM_ 접두사, 상태·함수는 sm 접두사로 네임스페이스를 둡니다.
   · 표기 규약: 두 벡터의 곱셈적 결합은 언제나 "성분끼리 곱해 더한 값"으로만 씁니다
     ([12인수02-03] 유의 사항 — 해당 용어·기호는 화면·해설·인쇄물 어디에도 쓰지 않습니다).
   ═══════════════════════════════════════════════════════════════════════════ */


/* ── 1. 추천 영상 (videoDeck — 교사 추가 슬롯은 컴포넌트가 정확히 1칸 만듭니다) ── */
const SM_VIDEOS = [
  {id:'lh--n4GmDZ4', t:'11. 유사도 (8:41)',                                   s:'mathT야나수 〈인공지능 수학〉 · 주 디딤영상'},
  {id:'if6tjHAT6iM', t:'자연어처리의 유사도 측정 방법(거리측정, 코사인 유사도) (3:58)', s:'Minsuk Heo 허민석 · 거리 vs 각도 직관'},
  {id:'liNDuZDW5d4', t:'12. 유사도 분석을 이용한 텍스트 분석 (8:20)',            s:'mathT야나수 · 활동 4 미리 보기'},
];


/* ── 2. 마중 퀴즈 (warmStepper — 라벨 "질문 N."은 컴포넌트가 붙입니다) ── */
const SM_WARM = [
  {
    q:'다음 세 문장 중 서로 가장 비슷한 두 문장을 고르면? ' +
      '(1) 나는 바나나와 포도를 좋아한다. 나는 사과와 배도 좋아한다. ' +
      '(2) 너는 바나나를 좋아한다. 너는 포도, 사과, 배는 싫어한다. ' +
      '(3) 나는 포도와 사과를 좋아한다.',
    opts:['(1)과 (2)','(1)과 (3)','(2)와 (3)','어떤 기준을 정하느냐에 따라 달라진다'],
    answer:3,
    explain:'겹치는 단어의 개수만 세면 (1)과 (2)가 다섯 개(바나나·포도·사과·배·좋아하다)로 가장 많아 ①이 답처럼 보입니다. ' +
      '그런데 (2)는 "싫어한다"는 태도를 담고 있어 뜻은 (1)과 정반대입니다. 반대로 \'누가·무엇을 좋아하는가\'라는 태도를 기준으로 보면 ' +
      '(1)과 (3)이 가장 가깝습니다. 이렇게 <b>기준을 정하기 전까지 "비슷하다"는 말은 답이 정해지지 않습니다.</b> ' +
      '오늘은 그 기준을 두 가지 수(거리·방향)로 못 박아 봅니다.'
  },
  {
    q:'(O/X) 유클리드 유사도는 값이 클수록 두 텍스트가 비슷하다는 뜻이다.',
    opts:['O — 클수록 비슷하다','X — 0에 가까울수록 비슷하다'],
    answer:1,
    explain:'유클리드 유사도는 두 벡터의 끝점 사이의 <b>거리</b>를 그대로 쓰는 값입니다. 거리가 가까울수록 비슷한 것이므로 ' +
      '<b>값이 0에 가까울수록 유사</b>하다고 판단합니다. 잠시 뒤 배울 코사인 유사도는 반대로 1에 가까울수록 유사하다고 판단하므로, ' +
      '두 값을 나란히 놓고 "누가 더 큰가"로 우열을 가리면 안 됩니다.'
  },
  {
    q:'좌표평면 위의 두 점 A(1, 4), B(5, 1) 사이의 거리는?',
    opts:['3','4','5','7'],
    answer:2,
    explain:'√((5−1)² + (1−4)²) = √(16 + 9) = √25 = 5입니다. 〈공통수학2〉에서 배운 <b>두 점 사이의 거리 공식</b>이 그대로 쓰입니다. ' +
      '오늘 배울 유클리드 유사도는 이 공식을 성분이 여러 개인 n차원으로 넓힌 것뿐입니다.'
  },
];


/* ── 3. 형성평가 (quizStepper) — 5문항 · 해설에 정답 명시 + 활동 링크 ── */
const SM_QUIZ = [
  {
    q:'두 텍스트 데이터를 나타내는 벡터가 a = (0, 1, 1), b = (1, 1, 2)일 때, 유클리드 유사도 d(a, b)의 값은?',
    opts:['1','√2','√3','√5'],
    answer:1,
    explain:'d(a, b) = √((1−0)² + (1−1)² + (2−1)²) = √(1 + 0 + 1) = √2 ≈ 1.41입니다. ' +
      '성분의 차를 <b>각각 제곱해서 더한 뒤 제곱근</b>을 씌우는 순서를 지켜야 합니다. 차를 먼저 더하고 제곱하면 안 됩니다.' +
      '<span class="btn-row" style="margin-top:0.5rem;"><button class="btn" type="button" onclick="smGo(\'sm-act2\')">활동 2에서 다시 보기</button></span>'
  },
  {
    q:'코사인 유사도의 값이 1에 가까울수록 뜻하는 것은?',
    opts:['두 벡터의 크기가 서로 같다','두 벡터가 이루는 각이 0°에 가깝다','두 벡터가 서로 수직이다','두 벡터 끝점 사이의 거리가 멀다'],
    answer:1,
    explain:'코사인 유사도는 두 벡터가 이루는 각 θ에 대한 cos θ의 값과 같습니다. cos 0° = 1이므로 값이 1에 가깝다는 것은 ' +
      '<b>두 화살표가 거의 같은 방향</b>이라는 뜻입니다. 반대로 값이 0에 가까우면 θ가 90°에 가까워 방향이 전혀 닮지 않았다는 뜻입니다. ' +
      '①은 크기와는 무관하다는 점에서, ③은 값이 0일 때의 설명이라는 점에서 틀렸습니다.' +
      '<span class="btn-row" style="margin-top:0.5rem;"><button class="btn" type="button" onclick="smGo(\'sm-act3\')">활동 3에서 다시 보기</button></span>'
  },
  {
    q:'세 학생의 주말 스마트폰 사용 시간이 A(6, 2, 2), B(5, 2, 3), C(3, 1, 1)일 때, A와 가장 유사한 학생을 두 유사도로 각각 고르면?',
    opts:['둘 다 B','둘 다 C','유클리드는 B, 코사인은 C','유클리드는 C, 코사인은 B'],
    answer:2,
    explain:'d(A, B) = √2 ≈ 1.41, d(A, C) = √11 ≈ 3.32이므로 <b>거리로는 B</b>가 가깝습니다. 한편 ' +
      'C(A, B) = 40 ÷ (√44 × √38) ≈ 0.98, C(A, C) = 22 ÷ (√44 × √11) = 1.00이므로 <b>방향으로는 C</b>가 가장 유사합니다. ' +
      'C는 A의 모든 성분을 절반으로 줄인 벡터여서 방향이 완전히 같기 때문입니다. ' +
      '<b>같은 데이터라도 어떤 유사도를 쓰느냐에 따라 결과가 달라질 수 있다</b>는 것이 오늘의 핵심입니다.' +
      '<span class="btn-row" style="margin-top:0.5rem;"><button class="btn" type="button" onclick="smGo(\'sm-act4\')">활동 4 순위표에서 다시 보기</button></span>'
  },
  {
    q:'어떤 뉴스 포털이 사용자가 읽은 기사와 주제가 비슷한 기사를 추천하려고 합니다. ' +
      '단어 빈도가 읽은 기사 (호우 1, 장마 3, 침수 1, 피해 0), 후보 기사 A (3, 7, 3, 0), 후보 기사 B (1, 0, 2, 1)일 때, ' +
      '어느 기사를 추천하는 것이 알맞은지와 그 근거로 옳은 것은?',
    opts:['A — 유클리드 유사도가 더 작기 때문',
          'A — 두 기사의 단어 수 차이가 크므로 코사인 유사도로 판단해야 하며, 그 값이 0.99로 가장 크기 때문',
          'B — 유클리드 유사도가 더 작기 때문',
          'B — 코사인 유사도가 더 크기 때문'],
    answer:1,
    explain:'거리로 재면 d(읽은 기사, A) = √24 ≈ 4.90, d(읽은 기사, B) = √11 ≈ 3.32로 <b>B가 더 가깝게</b> 나옵니다. ' +
      '그러나 기사 A는 같은 주제를 훨씬 길게 다룬 글이어서 단어 수가 많을 뿐입니다. 방향으로 재면 ' +
      'C(읽은 기사, A) ≈ <b>0.99</b>, C(읽은 기사, B) ≈ <b>0.37</b>로 A가 압도적으로 유사합니다. ' +
      '<b>길이 편차가 큰 텍스트에서는 코사인 유사도를 쓰는 것이 알맞으므로</b> 기사 A를 추천합니다. ' +
      '①은 결론은 맞지만 근거가 틀렸습니다(유클리드로는 B가 더 작습니다).' +
      '<span class="btn-row" style="margin-top:0.5rem;"><button class="btn" type="button" onclick="smGo(\'sm-act4\',2)">활동 4-3 길이 편향 실험에서 다시 보기</button></span>'
  },
  {
    q:'벡터 A = (6, 2, 2)를 크기가 1인 벡터로 고치는(L2 정규화) 식으로 옳은 것은?',
    opts:['(6, 2, 2) ÷ 10','(6, 2, 2) ÷ √44','(6, 2, 2) ÷ 44','(1, 1, 1)'],
    answer:1,
    explain:'|A| = √(6² + 2² + 2²) = √44 ≈ 6.63이므로 각 성분을 √44로 나누면 (0.90, 0.30, 0.30)이 되고 크기가 1이 됩니다. ' +
      '<b>크기의 제곱(44)이 아니라 크기(√44)로 나누어야</b> 합니다. 이렇게 크기를 1로 맞추면 크기 정보가 사라지고 방향만 남아, ' +
      '거리로 재도 코사인 유사도와 같은 순위가 나옵니다.' +
      '<span class="btn-row" style="margin-top:0.5rem;"><button class="btn" type="button" onclick="smGo(\'sm-act4\',1)">활동 4-2 단위원 애니메이션 다시 보기</button></span>'
  },
];

/* 결과 화면 문구는 공통 quizStepper가 총점만 표시하므로, 총점 뒤에 한 줄을 덧붙입니다. */
const SM_QUIZ_MSG = [
  '괜찮습니다. 활동 2·3의 계산 과정 패널을 다시 열어 수를 대입한 줄을 따라 읽어 봅시다.',   /* 0 */
  '괜찮습니다. 활동 2·3의 계산 과정 패널을 다시 열어 수를 대입한 줄을 따라 읽어 봅시다.',   /* 1 */
  '괜찮습니다. 활동 2·3의 계산 과정 패널을 다시 열어 수를 대입한 줄을 따라 읽어 봅시다.',   /* 2 */
  '잘했습니다. 틀린 문항의 해설을 눌러 계산 순서를 한 번만 더 확인해 봅시다.',              /* 3 */
  '잘했습니다. 틀린 문항의 해설을 눌러 계산 순서를 한 번만 더 확인해 봅시다.',              /* 4 */
  '완벽합니다. 이제 자를 고르는 눈까지 갖췄습니다.',                                        /* 5 */
];


/* ── 4. 핵심 개념 칩 상세 (chipDefs) ─────────────────────────────────────
   키는 칩 텍스트의 고유한 일부입니다(긴 키가 먼저 매칭되므로 충돌이 없습니다).
   각 정의는 ① 정의 ② 예시 ③ 이번 차시 연결(+이동 버튼) ④ 이전·다음 차시로 구성합니다. */
const SM_DEFS = {

  '유클리드 유사도':
    '<p>두 텍스트 데이터를 위치벡터로 나타냈을 때, <b>두 끝점 사이의 거리</b>를 유클리드 유사도라고 하고 ' +
    '기호로 d(a, b)와 같이 씁니다.</p>' +
    '<div class="math" style="margin:0.6rem 0;">d(a, b) = |b − a| = √((b₁−a₁)² + (b₂−a₂)² + … + (bₙ−aₙ)²)</div>' +
    '<p>거리이므로 <b>값이 0에 가까울수록 두 데이터가 유사</b>하다고 판단합니다. ' +
    '값이 클수록 비슷하다는 뜻이 아니라는 점에 주의해야 합니다.</p>' +
    '<p><b>예시</b> — ① a=(0, 1, 1), b=(1, 1, 2) → d(a, b) = √(1+0+1) = √2 ≈ 1.41. ' +
    '② 스마트폰 사용시간 A(6,2,2)와 B(5,2,3) → d(A, B) = √2 ≈ 1.41, A와 C(3,1,1) → d(A, C) = √11 ≈ 3.32.</p>' +
    '<p><b>이번 차시 연결</b> — 활동 2에서 화살표 두 개의 끝점을 잇는 점선과 그 길이가 캔버스에 실시간으로 나타납니다. ' +
    '표의 숫자를 직접 고치면 점선의 길이와 d 값이 함께 변하는 것을 눈으로 확인하게 됩니다.</p>' +
    '<div class="btn-row"><button class="btn" type="button" onclick="smGo(\'sm-act2\')">활동 2로 이동</button></div>' +
    '<p class="sm-src">이어짐 — 2차시 k-means에서 쓴 "두 점 사이의 거리"가 n차원으로 확장된 것입니다. ' +
    '<a href="#mlplay" onclick="go(\'mlplay\');return false;">2차시 보기</a> · ' +
    '13차시에서는 같은 \'거리\' 발상을 이미지의 이진 행렬에 적용합니다. ' +
    '<a href="#hamming" onclick="go(\'hamming\');return false;">13차시 보기</a></p>' +
    '<p class="sm-src">출처 — 씨마스 「인공지능 수학」 Ⅱ 단원 p.73, 동아출판 「인공지능 수학」 Ⅱ 단원 p.68 서술을 재구성</p>',

  '코사인 유사도':
    '<p>두 텍스트 데이터를 벡터로 나타냈을 때, <b>두 벡터가 이루는 각의 코사인 값</b>으로 재는 유사도를 ' +
    '코사인 유사도라고 하고 기호로 C(a, b)와 같이 씁니다.</p>' +
    '<div class="math" style="margin:0.6rem 0;">C(a, b) = (성분끼리 곱해 더한 값) ÷ (|a| × |b|)\n' +
    '= (a₁b₁ + a₂b₂ + … + aₙbₙ) ÷ (√(a₁²+…+aₙ²) × √(b₁²+…+bₙ²))</div>' +
    '<p>두 벡터가 이루는 각이 작을수록 값이 1에 가까워지므로, <b>값이 1에 가까울수록 유사</b>하고 ' +
    '0에 가까울수록(각이 90°에 가까울수록) 유사하지 않다고 판단합니다. ' +
    '빈도수 벡터는 성분이 모두 0 이상이므로 값은 항상 0 이상 1 이하입니다.</p>' +
    '<p><b>예시</b> — ① a=(3, 1), b=(1, 2) → C(a, b) = (3+2) ÷ (√10 × √5) = 5 ÷ √50 = √2 ⁄ 2 ≈ 0.71. ' +
    '② A(6,2,2)와 C(3,1,1) → C(A, C) = 22 ÷ (√44 × √11) = 22 ÷ 22 = <b>1</b> ' +
    '(C는 A의 절반이므로 방향이 완전히 같습니다).</p>' +
    '<p><b>이번 차시 연결</b> — 활동 3에서 [방향으로 재기] 모드를 켜면 원점에서 뻗은 두 화살표 사이에 사잇각 호가 그려지고, ' +
    '각의 크기와 코사인 값이 함께 표시됩니다. 각을 좁혔다 넓히면서 값이 1과 0 사이를 오가는 것을 확인합니다.</p>' +
    '<div class="btn-row"><button class="btn" type="button" onclick="smGo(\'sm-act3\')">활동 3으로 이동</button></div>' +
    '<p class="sm-src">이어짐 — 중학교 삼각비에서 배운 코사인(이웃한 변 ÷ 빗변)이 여기서 다시 쓰입니다. ' +
    '11차시 추천 시스템에서는 이 값을 표(유사도 행렬)로 정리해 웹툰을 추천합니다.</p>' +
    '<p class="sm-src">출처 — 씨마스 「인공지능 수학」 Ⅱ 단원 p.75, 동아출판 「인공지능 수학」 Ⅱ 단원 p.69 서술을 재구성</p>',

  'L2 정규화':
    '<p>벡터의 각 성분을 그 벡터의 크기로 나누어 <b>크기가 1인 벡터로 고치는 것</b>을 L2 정규화라고 합니다. ' +
    'â = a ÷ |a|로 나타내며, 정규화한 벡터의 끝점은 모두 원점에서 거리가 1인 곳(2차원에서는 단위원 위)에 모입니다. ' +
    '크기 정보는 사라지고 <b>방향 정보만 남습니다.</b></p>' +
    '<p><b>예시</b> — ① A=(6, 2, 2) → |A| = √44 ≈ 6.63 → Â ≈ (0.90, 0.30, 0.30). ' +
    '② C=(3, 1, 1) → |C| = √11 ≈ 3.32 → Ĉ ≈ (0.90, 0.30, 0.30) — A와 완전히 겹칩니다.</p>' +
    '<p><b>이번 차시 연결</b> — 활동 4에서 [크기를 1로 맞추기] 스위치를 켜면 세 화살표가 단위원 위로 미끄러져 올라가고, ' +
    'A와 C가 포개집니다. 그 순간 거리로 잰 순위가 방향으로 잰 순위와 같아집니다 — ' +
    '"정규화는 거리로 재도 코사인처럼 판단하게 만든다"는 것을 눈으로 증명하는 장면입니다.</p>' +
    '<div class="btn-row"><button class="btn" type="button" onclick="smGo(\'sm-act4\',1)">활동 4로 이동</button></div>' +
    '<p class="sm-src">이어짐 — 8차시 TF-IDF에서 문서 길이가 긴 문서가 유리해지는 문제를 다룬 것과 같은 고민입니다. ' +
    '<a href="#tfidf" onclick="go(\'tfidf\');return false;">8차시 보기</a> · ' +
    '17차시 이미지 정규화(X ÷ 255)도 "값의 범위를 맞춘다"는 같은 발상입니다. ' +
    '<a href="#pool" onclick="go(\'pool\');return false;">17차시 보기</a></p>',

  '벡터의 크기':
    '<p>벡터 a=(a₁, a₂, …, aₙ)의 크기 |a|는 원점에서 그 벡터의 끝점까지의 거리이며 ' +
    '|a| = √(a₁² + a₂² + … + aₙ²)로 구합니다. 좌표평면에서는 선분 OA의 길이와 같습니다. ' +
    '텍스트에서는 <b>글이 길수록, 같은 단어를 많이 반복할수록 벡터의 크기가 커집니다.</b></p>' +
    '<p><b>예시</b> — ① A=(6, 2, 2)이면 |A| = √(36+4+4) = √44 ≈ 6.63입니다. ' +
    '② 같은 문장을 두 번 이어 붙이면 빈도수 벡터의 모든 성분이 2배가 되어 크기도 정확히 2배가 됩니다.</p>' +
    '<p><b>이번 차시 연결</b> — 활동 4에서 문장 하나를 그대로 복사해 두 번 이어 붙여 보면, ' +
    '<b>방향은 그대로인데 크기만 커진 벡터</b>가 만들어집니다. ' +
    '이때 거리로 재는 유사도만 값이 크게 흔들리는 것을 확인하게 됩니다.</p>' +
    '<div class="btn-row"><button class="btn" type="button" onclick="smGo(\'sm-act4\',2)">활동 4로 이동</button></div>' +
    '<p class="sm-src">이어짐 — 7차시에서 만든 원-핫 벡터·빈도수 벡터의 성분이 그대로 크기 계산에 들어갑니다. ' +
    '<a href="#text" onclick="go(\'text\');return false;">7차시 보기</a> · ' +
    '13차시 해밍 거리에서는 이진 벡터의 \'다른 자리 개수\'로 거리를 세는 또 다른 방식을 만납니다. ' +
    '<a href="#hamming" onclick="go(\'hamming\');return false;">13차시 보기</a></p>' +
    '<p class="sm-src">출처 — 씨마스 「인공지능 수학」 Ⅱ 단원 p.72 서술을 재구성</p>',

  '유사도':
    '<p>두 데이터가 얼마나 비슷한지를 <b>하나의 수로 나타낸 값</b>을 유사도라고 합니다. ' +
    '사람은 "비슷하다"를 느낌으로 말하지만, 인공지능은 비교와 정렬을 하려면 반드시 크기를 견줄 수 있는 수가 필요합니다. ' +
    '그래서 무엇을 기준으로 삼을지(겹치는 원소의 개수, 두 점 사이의 거리, 두 화살표가 이루는 각 등)를 먼저 약속한 뒤, ' +
    '그 약속대로 값을 계산합니다.</p>' +
    '<p><b>예시</b> — ① 스팸 메일 분류: 새로 온 메일의 단어 벡터가 스팸 폴더의 메일들과 얼마나 비슷한지를 수로 재어 폴더를 정합니다. ' +
    '② 표절 검사: 두 문서의 단어집합이 얼마나 겹치는지를 비율로 재어 표절률을 계산합니다.</p>' +
    '<p><b>이번 차시 연결</b> — 활동 1에서 여러분은 "무엇을 기준으로 비슷하다고 할지"를 <b>직접 정해 보고</b>, ' +
    '공통 단어의 개수만으로는 판단이 어려운 문장을 만나게 됩니다. 그 막힘이 오늘 배울 두 가지 유사도의 출발점입니다.</p>' +
    '<div class="btn-row"><button class="btn" type="button" onclick="smGo(\'sm-act1\')">활동 1로 이동</button></div>' +
    '<p class="sm-src">이어짐 — 8차시 「중요한 단어 찾기: TF-IDF」에서 만든 가중치 벡터가 오늘 비교의 재료가 됩니다. ' +
    '<a href="#tfidf" onclick="go(\'tfidf\');return false;">8차시 보기</a> · ' +
    '10차시 「집합으로 마음 읽기」에서는 벡터가 아니라 <b>집합</b>으로 유사도를 재는 자카드 유사도를 배웁니다. ' +
    '<a href="#senti" onclick="go(\'senti\');return false;">10차시 보기</a></p>',
};


/* ═══════ 5. 계산 유틸 (core.js 공용 — 11차시 review 가 그대로 재사용) ═══════ */

/* 벡터의 크기 √(Σvᵢ²) */
function smNorm2(v){
  if(!Array.isArray(v)) return 0;
  let s=0;
  for(let i=0;i<v.length;i++){ const x=Number(v[i])||0; s+=x*x; }
  return Math.sqrt(s);
}

/* 유클리드 유사도 d(a, b) = |b − a| */
function smDist(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)) return 0;
  const n=Math.max(a.length,b.length);
  let s=0;
  for(let i=0;i<n;i++){ const d=(Number(b[i])||0)-(Number(a[i])||0); s+=d*d; }
  return Math.sqrt(s);
}

/* 코사인 유사도 C(a, b) — 분자는 "성분끼리 곱해 더한 값"
   영벡터 방어: 크기가 0인 벡터가 들어오면 null 을 돌려주고 화면에서 안내합니다. */
function smCos(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)) return null;
  const na=smNorm2(a), nb=smNorm2(b);
  if(na===0||nb===0) return null;
  const n=Math.max(a.length,b.length);
  let s=0;
  for(let i=0;i<n;i++){ s+=(Number(a[i])||0)*(Number(b[i])||0); }
  let c=s/(na*nb);
  if(c>1) c=1; if(c<-1) c=-1;
  return c;
}

/* L2 정규화 â = a ÷ |a| */
function smUnit(v){
  const n=smNorm2(v);
  if(!Array.isArray(v)||n===0) return Array.isArray(v)?v.map(()=>0):[];
  return v.map(x=>(Number(x)||0)/n);
}

/* 순위표 데이터 — mode: 'dist'(작을수록 유사) | 'cos'(클수록 유사)
   반환: [{name, val, ok, rank}] (정렬 완료) */
function smRankTable(base, others, mode){
  const rows=(others||[]).map(o=>{
    const val = (mode==='cos') ? smCos(base,o.v) : smDist(base,o.v);
    return {name:o.name, val:(val===null?null:val), ok:(val!==null)};
  });
  rows.sort((x,y)=>{
    if(x.val===null) return 1;
    if(y.val===null) return -1;
    return (mode==='cos') ? (y.val-x.val) : (x.val-y.val);
  });
  rows.forEach((r,i)=>{ r.rank=i+1; });
  return rows;
}

/* 표시 자릿수 — 거리·코사인 모두 소수 둘째 자리 반올림(정수·1도 1.00 형식 유지) */
function smFix(x){ return (x===null||typeof x!=='number'||!isFinite(x)) ? '—' : x.toFixed(2); }


/* ═══════ 6. 상태 ═══════ */
const SM_AXES = ['SNS','게임','영상 시청'];
const SM_NAMES = ['A','B','C'];
const SM_DATA0 = {A:[6,2,2], B:[5,2,3], C:[3,1,1]};
const SM_KEY_DATA = 'aimath.sim.data';
const SM_KEY_ANS  = 'aimath.sim.answer';
const SM_KEY_QUIZ = 'aimath.sim.quiz';
const SM_KEY_CORPUS = 'aimath.corpus.mysent';   /* 6·7·9차시 공통 말뭉치 키 (§0-3 #12) */

let smData  = {A:SM_DATA0.A.slice(), B:SM_DATA0.B.slice(), C:SM_DATA0.C.slice()};
let smMode  = 'dist';        /* 'dist' | 'cos' — 활동 2 캔버스의 모드 */
let smNorm  = false;         /* [크기를 1로 맞추기] 스위치 */
let smAxisX = 0;             /* 가로축 항목 인덱스 (기본 SNS) */
let smAxisY = 2;             /* 세로축 항목 인덱스 (기본 영상 시청) */

let smPair2 = 'AB';
let smPair3 = 'AB';
let smGuess2 = '';
let smGuess3 = '';
let smRot = 0;               /* 활동 3 각 확인 슬라이더(도) — 미리보기 전용 */
let smNormT = 0;             /* 정규화 애니메이션 진행도 0~1 */
let smNormRaf = null;
let smA1U = [];              /* 활동 1 단어집합 */
let smA1V = [];              /* 활동 1 빈도수 벡터 */
let smA1S = [];              /* 활동 1 문장 목록 */
let smLenText = null;        /* 활동 4-3 세 글의 원문 */
let smLenPrev1 = null;       /* 이어 붙이기 직전의 문장 ① 벡터 */

const SM_REDUCE = (function(){
  try{ return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch(e){ return false; }
})();


/* ═══════ 7. 공통 소도구 ═══════ */

function smEl(id){ return document.getElementById(id); }

/* 앵커로 부드럽게 이동합니다. tab 을 주면 활동 4의 해당 패널을 먼저 엽니다. */
function smGo(id, tab){
  try{ if(currentView!=='sim' && typeof go==='function') go('sim'); }catch(e){}
  if(typeof tab==='number'){
    const btns=document.querySelectorAll('#v-sim .tabs .tab');
    if(btns[tab]) smTab(tab, btns[tab]);
  }
  const el=smEl(id);
  if(!el) return;
  try{ el.scrollIntoView({behavior:SM_REDUCE?'auto':'smooth', block:'start'}); }
  catch(e){ el.scrollIntoView(); }
}

/* 활동 4 탭 */
function smTab(n, el){
  const root=smEl('v-sim');
  if(!root) return;
  root.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  root.querySelectorAll('.tpanel').forEach(p=>p.classList.remove('on'));
  const p=smEl('sm4-'+n);
  if(p) p.classList.add('on');
  smDraw();
}


/* ═══════ 8. 캔버스 ═══════ */

/* devicePixelRatio 대응 — 반환된 ctx 는 CSS 픽셀 좌표계로 그립니다. */
function smPrep(cv){
  let w = cv.clientWidth || (cv.parentElement ? cv.parentElement.clientWidth : 0) || 560;
  w = Math.max(260, Math.min(560, Math.round(w)));
  const h = Math.round(w * (w < 400 ? 0.875 : 0.75));
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const pw = Math.round(w*dpr), ph = Math.round(h*dpr);
  if(cv.width!==pw)  cv.width = pw;
  if(cv.height!==ph) cv.height = ph;
  cv.style.height = h+'px';
  const ctx = cv.getContext('2d');
  if(!ctx) return null;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  return {ctx:ctx, w:w, h:h};
}

function smProj(name, t){
  const v = smData[name] || [0,0,0];
  const raw = [Number(v[smAxisX])||0, Number(v[smAxisY])||0];
  if(!t) return raw;
  /* 2차원 면에서 크기를 1로 맞춘 점 (단위원 위) */
  const m = Math.sqrt(raw[0]*raw[0] + raw[1]*raw[1]);
  const u = (m===0) ? [0,0] : [raw[0]/m, raw[1]/m];
  return [raw[0] + (u[0]-raw[0])*t, raw[1] + (u[1]-raw[1])*t];
}

function smArrow(ctx, x0, y0, x1, y1, color, dash){
  const dx=x1-x0, dy=y1-y0, len=Math.sqrt(dx*dx+dy*dy);
  ctx.save();
  ctx.strokeStyle=color; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.setLineDash(dash||[]);
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
  ctx.setLineDash([]);
  if(len>6){
    const a=Math.atan2(dy,dx), hd=9;
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x1-hd*Math.cos(a-0.42), y1-hd*Math.sin(a-0.42));
    ctx.lineTo(x1-hd*Math.cos(a+0.42), y1-hd*Math.sin(a+0.42));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function smCss(name, fb){
  try{
    const v=getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) ? v.trim() : fb;
  }catch(e){ return fb; }
}

/* 캔버스 한 장을 그립니다.
   opt = { mode:'dist'|'cos'|'norm', pair:'AB'|'AC'|'BC', ghost:true|false } */
function smDrawOne(cvId, opt){
  const cv=smEl(cvId);
  if(!cv) return;
  const P=smPrep(cv);
  if(!P) return;
  const ctx=P.ctx, W=P.w, H=P.h;
  const CO={
    fg:smCss('--fg','#1a1714'), bd:smCss('--border','#d8d0c4'), mu:smCss('--muted','#78726a'),
    bl:smCss('--blue','#4a6b8a'), rd:smCss('--red','#b44133'), bg:smCss('--bg','#f5f0ea'),
    ac:smCss('--accent','#c8b9a6'), cd:smCss('--card','#ebe5dc')
  };
  const STY={A:{c:CO.fg,d:[]}, B:{c:CO.bl,d:[10,5]}, C:{c:CO.rd,d:[4,4]}};

  const L=48, R=16, T=18, B=38;
  const plotW=W-L-R, plotH=H-T-B;
  const ox=L, oy=H-B;

  const t = (opt.mode==='norm') ? smNormT : 0;
  const pts={};
  SM_NAMES.forEach(n=>{ pts[n]=smProj(n,t); });

  /* 축 최댓값 — 정규화가 끝나면 0~1.2, 원 데이터는 최댓값의 1.1배(최소 8) */
  let rawMax=0;
  SM_NAMES.forEach(n=>{
    const v=smData[n]||[0,0,0];
    rawMax=Math.max(rawMax, Math.abs(Number(v[smAxisX])||0), Math.abs(Number(v[smAxisY])||0));
  });
  const axRaw=Math.max(1, Math.max(8, rawMax*1.1));
  const axMax=(opt.mode==='norm') ? (axRaw + (1.2-axRaw)*t) : axRaw;

  /* x·y 눈금 간격을 같게 두어야 각과 단위원이 왜곡되지 않습니다. */
  const unit=Math.min(plotW, plotH)/axMax;
  const px=x=>ox+x*unit, py=y=>oy-y*unit;

  ctx.fillStyle=CO.cd; ctx.fillRect(0,0,W,H);

  /* 격자 */
  const step=(axMax<=1.5)?0.2:(axMax<=12?2:5);
  ctx.save();
  ctx.strokeStyle=CO.bd; ctx.lineWidth=1;
  for(let g=step; g<=axMax+1e-9; g+=step){
    if(px(g)<W-R){ ctx.beginPath(); ctx.moveTo(px(g),oy); ctx.lineTo(px(g),T); ctx.stroke(); }
    if(py(g)>T){ ctx.beginPath(); ctx.moveTo(ox,py(g)); ctx.lineTo(W-R,py(g)); ctx.stroke(); }
  }
  ctx.restore();

  /* 단위원 (정규화 모드) */
  if(opt.mode==='norm' && smNormT>0){
    ctx.save();
    ctx.globalAlpha=Math.min(1, smNormT*3);
    ctx.strokeStyle=CO.mu; ctx.lineWidth=1.8; ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.arc(ox,oy,unit,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=CO.mu; ctx.font='11px monospace';
    ctx.fillText('1', px(1)+3, oy+14);
    ctx.fillText('1', ox-12, py(1)+4);
    ctx.restore();
  }

  /* 축 */
  ctx.save();
  ctx.strokeStyle=CO.fg; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(W-R,oy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox,T); ctx.stroke();
  ctx.fillStyle=CO.mu; ctx.font='11px monospace';
  ctx.fillText(SM_AXES[smAxisX], W-R-Math.min(70,plotW*0.3), oy+22);
  ctx.save();
  ctx.translate(12, T+Math.min(80,plotH*0.45));
  ctx.rotate(-Math.PI/2);
  ctx.fillText(SM_AXES[smAxisY], 0, 0);
  ctx.restore();
  ctx.restore();

  /* 이동 잔상 (정규화 애니메이션 중) */
  if(opt.mode==='norm' && smNormT>0 && smNormT<1 && !SM_REDUCE){
    ctx.save(); ctx.globalAlpha=0.18;
    [0.25,0.5,0.75].forEach(k=>{
      SM_NAMES.forEach(n=>{
        const q=smProj(n, smNormT*k);
        ctx.fillStyle=STY[n].c;
        ctx.beginPath(); ctx.arc(px(q[0]),py(q[1]),3,0,Math.PI*2); ctx.fill();
      });
    });
    ctx.restore();
  }

  /* 화살표 3개 */
  SM_NAMES.forEach(n=>{
    const p=pts[n];
    smArrow(ctx, ox, oy, px(p[0]), py(p[1]), STY[n].c, STY[n].d);
    ctx.save();
    ctx.fillStyle=STY[n].c;
    ctx.beginPath(); ctx.arc(px(p[0]),py(p[1]),4.5,0,Math.PI*2); ctx.fill();
    ctx.font='bold 14px sans-serif';
    ctx.fillText(n, px(p[0])+8, py(p[1])-7);
    ctx.restore();
  });

  /* A = C 배지 (정규화 완료 · 두 점이 겹칠 때) */
  if(opt.mode==='norm' && smNormT>=1){
    const a=pts.A, c=pts.C;
    if(Math.abs(a[0]-c[0])<0.02 && Math.abs(a[1]-c[1])<0.02){
      ctx.save();
      ctx.fillStyle=CO.fg;
      ctx.font='bold 14px sans-serif';
      ctx.fillText('A = C', px(a[0])+8, py(a[1])+16);
      ctx.restore();
    }
  }

  /* 거리 모드 — 두 끝점을 잇는 점선 + 중점 말풍선 */
  if(opt.mode==='dist'){
    const n1=opt.pair.charAt(0), n2=opt.pair.charAt(1);
    const p1=pts[n1], p2=pts[n2];
    ctx.save();
    ctx.strokeStyle=CO.fg; ctx.lineWidth=2; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(px(p1[0]),py(p1[1])); ctx.lineTo(px(p2[0]),py(p2[1])); ctx.stroke();
    ctx.setLineDash([]);
    const mx=(px(p1[0])+px(p2[0]))/2, my=(py(p1[1])+py(p2[1]))/2;
    const shown = smGuess2 ? ('d('+n1+', '+n2+') = '+smFix(smDist(smData[n1],smData[n2]))) : '예상을 고르면 값이 열립니다';
    ctx.font='bold 12px monospace';
    const tw=ctx.measureText(shown).width+14;
    const bx=Math.max(2, Math.min(W-tw-2, mx-tw/2)), by=Math.max(T+2, my-24);
    ctx.fillStyle=CO.bg; ctx.strokeStyle=CO.fg; ctx.lineWidth=1;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(bx,by,tw,20,6); else ctx.rect(bx,by,tw,20);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle=CO.fg;
    ctx.fillText(shown, bx+7, by+14);
    ctx.restore();
  }

  /* 방향 모드 — 원점 중심 사잇각 호 + 각·코사인 라벨 */
  if(opt.mode==='cos'){
    const n1=opt.pair.charAt(0), n2=opt.pair.charAt(1);
    let p1=pts[n1].slice(), p2=pts[n2].slice();
    if(opt.ghost && smRot!==0 && n2==='B'){ p2=smRotate(p2, smRot); }
    if(opt.ghost && smRot!==0 && n1==='B'){ p1=smRotate(p1, smRot); }
    const a1=Math.atan2(p1[1],p1[0]), a2=Math.atan2(p2[1],p2[0]);
    const l1=Math.sqrt(p1[0]*p1[0]+p1[1]*p1[1])*unit, l2=Math.sqrt(p2[0]*p2[0]+p2[1]*p2[1])*unit;

    if(opt.ghost && smRot!==0){
      const gn = (n2==='B') ? n2 : n1;
      const gp = (n2==='B') ? p2 : p1;
      ctx.save(); ctx.globalAlpha=0.85;
      smArrow(ctx, ox, oy, px(gp[0]), py(gp[1]), CO.ac, [2,3]);
      ctx.fillStyle=CO.mu; ctx.font='12px sans-serif';
      ctx.fillText(gn+'′(회전 미리보기)', px(gp[0])+8, py(gp[1])+16);
      ctx.restore();
    }

    if(l1>2 && l2>2){
      const r=Math.max(28, Math.min(60, Math.min(l1,l2)*0.55));
      const sA=-a1, eA=-a2;                       /* 캔버스 y축은 아래로 향합니다 */
      ctx.save();
      ctx.strokeStyle=CO.fg; ctx.lineWidth=2.4;
      ctx.beginPath();
      ctx.arc(ox, oy, r, Math.min(sA,eA), Math.max(sA,eA));
      ctx.stroke();
      ctx.restore();

      let deg=Math.abs(a1-a2)*180/Math.PI;
      if(deg>180) deg=360-deg;
      const cosv=Math.cos(deg*Math.PI/180);
      const mid=(sA+eA)/2;
      const lx=ox+Math.cos(mid)*(r+22), ly=oy+Math.sin(mid)*(r+22);
      ctx.save();
      ctx.font='bold 12px monospace';
      const txt = smGuess3 ? (deg.toFixed(1)+'° · '+smFix(cosv)) : '예상을 고르면 값이 열립니다';
      const tw=ctx.measureText(txt).width+12;
      const bx=Math.max(2, Math.min(W-tw-2, lx-6)), by=Math.max(T+2, Math.min(oy-20, ly-14));
      ctx.fillStyle=CO.bg; ctx.strokeStyle=CO.fg; ctx.lineWidth=1;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(bx,by,tw,19,6); else ctx.rect(bx,by,tw,19);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle=CO.fg;
      ctx.fillText(txt, bx+6, by+13);
      ctx.restore();
    }
  }
}

/* 2차원 벡터를 원점 중심으로 deg°만큼 돌립니다(미리보기 전용). */
function smRotate(p, deg){
  const r=deg*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  return [p[0]*c - p[1]*s, p[0]*s + p[1]*c];
}

/* 세 캔버스를 한꺼번에 다시 그립니다. */
function smDraw(){
  smDrawOne('sm-cv2', {mode:smMode, pair:smPair2});
  smDrawOne('sm-cv3', {mode:'cos',  pair:smPair3, ghost:true});
  smDrawOne('sm-cv4', {mode:'norm', pair:smPair2});
  const p2=smEl('sm-plane2'), p3=smEl('sm-plane3'), p4=smEl('sm-plane4');
  const label=SM_AXES[smAxisX]+' × '+SM_AXES[smAxisY];
  if(p2) p2.textContent=label;
  if(p3) p3.textContent=label;
  if(p4) p4.textContent=label;
}


/* ═══════ 9. 계산 과정 패널 ═══════ */

function smCalc(){
  /* 활동 2 — 거리 */
  const box2=smEl('sm-calc2');
  if(box2){
    if(!smGuess2){
      box2.innerHTML='<p class="lk">🔒 먼저 위에서 <b>내 예상</b>을 골라 주세요. 예상을 고르면 계산 과정이 열립니다.</p>';
    }else{
      const n1=smPair2.charAt(0), n2=smPair2.charAt(1);
      const a=smData[n1], b=smData[n2];
      const diff=a.map((x,i)=>(Number(x)||0)-(Number(b[i])||0));
      const sq=diff.map(d=>d*d);
      const sum=sq.reduce((p,c)=>p+c,0);
      box2.innerHTML=
        '<div>① 성분의 차 &nbsp; ('+diff.map(smNum).join(', ')+')</div>'+
        '<div>② 각각 제곱 &nbsp; ('+sq.map(smNum).join(', ')+')</div>'+
        '<div>③ 모두 더하기 &nbsp; '+sq.map(smNum).join(' + ')+' = '+smNum(sum)+'</div>'+
        '<div>④ 제곱근 &nbsp; <b>d('+n1+', '+n2+') = √'+smNum(sum)+' ≈ '+smFix(Math.sqrt(sum))+'</b></div>'+
        '<div style="margin-top:0.5rem;">d('+n1+', '+n2+') = √(('+
          a.map((x,i)=>smNum(x)+'−'+smNum(b[i])).join(')² + (')+')²) = √('+sq.map(smNum).join(' + ')+
          ') = √'+smNum(sum)+' ≈ '+smFix(smDist(a,b))+'</div>'+
        '<div style="margin-top:0.35rem;color:var(--muted);">차의 부호는 제곱하면 사라지므로 어느 쪽에서 빼도 값은 같습니다.</div>'+
        '<div style="margin-top:0.4rem;color:var(--muted);">세 거리 — d(A,B)='+smFix(smDist(smData.A,smData.B))+
          ' 　d(A,C)='+smFix(smDist(smData.A,smData.C))+' 　d(B,C)='+smFix(smDist(smData.B,smData.C))+'</div>';
    }
  }

  /* 활동 3 — 코사인 */
  const box3=smEl('sm-calc3');
  if(box3){
    if(!smGuess3){
      box3.innerHTML='<p class="lk">🔒 먼저 위에서 <b>내 예상</b>을 골라 주세요. 예상을 고르면 계산 과정이 열립니다.</p>';
    }else{
      const n1=smPair3.charAt(0), n2=smPair3.charAt(1);
      const a=smData[n1], b=smData[n2];
      const na=smNorm2(a), nb=smNorm2(b);
      const c=smCos(a,b);
      let html='';
      if(c===null){
        html='<p class="lk">모든 성분이 0인 문장은 방향을 정할 수 없습니다. 표의 값을 하나 이상 0보다 크게 고쳐 주세요.</p>';
      }else{
        const prod=a.map((x,i)=>(Number(x)||0)*(Number(b[i])||0));
        const s=prod.reduce((p,q)=>p+q,0);
        html=
          '<div>① 성분끼리 곱해 더한 값 &nbsp; '+a.map((x,i)=>smNum(x)+'×'+smNum(b[i])).join(' + ')+' = <b>'+smNum(s)+'</b></div>'+
          '<div>② 두 벡터의 크기 &nbsp; |'+n1+'| = √'+smNum(a.reduce((p,x)=>p+x*x,0))+' ≈ '+smFix(na)+
            ' 　|'+n2+'| = √'+smNum(b.reduce((p,x)=>p+x*x,0))+' ≈ '+smFix(nb)+'</div>'+
          '<div>③ 나누기 &nbsp; <b>C('+n1+', '+n2+') = '+smNum(s)+' ÷ '+smFix(na*nb)+' ≈ '+smFix(c)+'</b></div>'+
          '<div style="margin-top:0.4rem;color:var(--muted);">세 값 — C(A,B)='+smFix(smCos(smData.A,smData.B))+
            ' 　C(A,C)='+smFix(smCos(smData.A,smData.C))+' 　C(B,C)='+smFix(smCos(smData.B,smData.C))+'</div>';
      }
      if(smRot!==0){
        const p1=smProj(n1,0), p2r=smRotate(smProj(n2,0), smRot);
        const c2=smCos(p1,p2r);
        let deg=(c2===null)?null:Math.acos(Math.max(-1,Math.min(1,c2)))*180/Math.PI;
        html+='<div style="margin-top:0.5rem;border-top:1px dashed var(--border);padding-top:0.4rem;">'+
          '회전 미리보기 ('+smRot.toFixed(1)+'°) — 지금 보고 있는 면에서 '+n1+'와 '+n2+'′의 사잇각 '+
          (deg===null?'—':deg.toFixed(1)+'°')+' · 값 '+smFix(c2)+
          '<br><span style="color:var(--muted);">표의 값은 바뀌지 않습니다.</span></div>';
      }
      box3.innerHTML=html;
    }
  }

  /* 활동 4-2 — 정규화한 벡터 */
  const boxN=smEl('sm-normout');
  if(boxN){
    const uA=smUnit(smData.A), uB=smUnit(smData.B), uC=smUnit(smData.C);
    const z=[smNorm2(smData.A),smNorm2(smData.B),smNorm2(smData.C)];
    if(z[0]===0||z[1]===0||z[2]===0){
      boxN.innerHTML='<p class="lk">모든 성분이 0인 문장은 방향을 정할 수 없습니다. 활동 2의 표에서 값을 고쳐 주세요.</p>';
    }else{
      boxN.innerHTML=
        '<div>Â = ('+smData.A.map(smNum).join(', ')+') ÷ '+smFix(z[0])+' ≈ <b>('+uA.map(x=>x.toFixed(2)).join(', ')+')</b></div>'+
        '<div>B̂ = ('+smData.B.map(smNum).join(', ')+') ÷ '+smFix(z[1])+' ≈ <b>('+uB.map(x=>x.toFixed(2)).join(', ')+')</b></div>'+
        '<div>Ĉ = ('+smData.C.map(smNum).join(', ')+') ÷ '+smFix(z[2])+' ≈ <b>('+uC.map(x=>x.toFixed(2)).join(', ')+')</b></div>'+
        '<div style="margin-top:0.5rem;">정규화 후 거리 — d(Â, Ĉ) = <b>'+smFix(smDist(uA,uC))+'</b> 　'+
          'd(Â, B̂) = <b>'+smFix(smDist(uA,uB))+'</b></div>'+
        '<div style="margin-top:0.35rem;color:var(--muted);">스위치를 켜면 4-1 순위표의 거리 순위가 이 값으로 다시 계산됩니다.</div>';
    }
  }
}

/* 보기 좋은 수 표기 — 정수는 그대로, 소수는 필요한 자리까지만 */
function smNum(x){
  const n=Number(x)||0;
  if(Math.abs(n-Math.round(n))<1e-9) return String(Math.round(n));
  return String(Math.round(n*100)/100);
}


/* ═══════ 10. 순위표 · 역전 배지 · 미션 ═══════ */

function smRank(){
  const box=smEl('sm-ranks');
  if(!box) return;
  const useA = smNorm ? smUnit(smData.A) : smData.A;
  const others = smNorm
    ? [{name:'B', v:smUnit(smData.B)}, {name:'C', v:smUnit(smData.C)}]
    : [{name:'B', v:smData.B},        {name:'C', v:smData.C}];
  const dr = smRankTable(useA, others, 'dist');
  const cr = smRankTable(smData.A, [{name:'B',v:smData.B},{name:'C',v:smData.C}], 'cos');

  const row=(r,mode)=>'<div class="r'+(r.rank===1?' top':'')+'">'+
      '<span class="p">'+r.rank+'위</span><span class="n">'+r.name+'</span>'+
      '<span class="v">'+(mode==='cos'?'C(A,'+r.name+') = ':'d('+(smNorm?'Â, '+r.name+'̂':'A, '+r.name)+') = ')+smFix(r.val)+'</span></div>';

  box.innerHTML=
    '<div class="sm-rank"><h4>거리로 잰 순위 <span style="font-weight:400;font-size:0.85rem;color:var(--muted);">(작을수록 유사)</span></h4>'+
      dr.map(r=>row(r,'dist')).join('')+'</div>'+
    '<div class="sm-rank"><h4>방향으로 잰 순위 <span style="font-weight:400;font-size:0.85rem;color:var(--muted);">(클수록 유사)</span></h4>'+
      cr.map(r=>row(r,'cos')).join('')+'</div>';

  const flag=smEl('sm-flagbox');
  const rev = dr.length && cr.length && dr[0].name!==cr[0].name;
  if(flag){
    flag.innerHTML = rev
      ? '<span class="sm-flag rev">⚡ 순위 역전 발생 — 같은 데이터, 다른 답</span>'
      : '<span class="sm-flag same">✓ 두 자의 답이 일치했습니다</span>';
  }
  if(rev){
    box.querySelectorAll('.sm-rank .r.top').forEach(el=>{
      el.classList.remove('blink');
      void el.offsetWidth;              /* 애니메이션 재시작 */
      el.classList.add('blink');
    });
  }
  smMission(rev);
}

function smChanged(name){
  const a=smData[name], b=SM_DATA0[name];
  for(let i=0;i<3;i++){ if(Math.abs((Number(a[i])||0)-b[i])>1e-9) return true; }
  return false;
}

/* 역전의 "뚜렷함" 지표 — 두 자의 판단 차이가 클수록 큰 값 */
function smGap(){
  const dAB=smDist(smData.A,smData.B), dAC=smDist(smData.A,smData.C);
  const cAB=smCos(smData.A,smData.B), cAC=smCos(smData.A,smData.C);
  if(cAB===null||cAC===null) return -1;
  return (dAC-dAB) + (cAC-cAB);
}
const SM_GAP0 = 1.9242;   /* 초기값 (3.3166−1.4142) + (1.0000−0.9782) */

function smMission(rev){
  const box=smEl('sm-missions'), fb=smEl('sm-missfb');
  if(!box) return;
  const cCh=smChanged('C'), bCh=smChanged('B'), aCh=smChanged('A');
  const m1 = (!rev) && cCh && !bCh && !aCh;
  const m2 = rev && bCh && !cCh && !aCh && (smGap() > SM_GAP0 + 0.05);
  const e1=box.querySelector('[data-m="1"]'), e2=box.querySelector('[data-m="2"]');
  if(e1) e1.classList.toggle('done', !!m1);
  if(e2) e2.classList.toggle('done', !!m2);
  if(fb){
    if(m1){
      fb.className='sm-fb ok';
      fb.innerHTML='🎉 미션 ① 달성 — 두 순위가 같아졌습니다.'+
        '<span class="x">C를 B 쪽으로 옮기니 "크기도 방향도" 비슷해져 두 자가 같은 답을 냈습니다. ' +
        '역전은 <b>크기와 방향이 서로 다른 이야기를 할 때</b>에만 일어납니다.</span>';
    }else if(m2){
      fb.className='sm-fb ok';
      fb.innerHTML='🎉 미션 ② 달성 — 역전이 더 뚜렷해졌습니다.'+
        '<span class="x">B를 A에서 방향으로 더 멀리, 거리로는 더 가깝게 두면 두 자의 판단 차이가 커집니다. ' +
        '이것이 "어떤 자를 고르느냐"가 결과를 바꾸는 이유입니다.</span>';
    }else{
      fb.className='sm-fb';
      fb.innerHTML='';
    }
  }
}


/* ═══════ 11. 활동 2 — 표 · 예상 칩 · 채점 ═══════ */

function smBuildTable(){
  const tb=smEl('sm-dtbl');
  if(!tb) return;
  const body=tb.querySelector('tbody');
  if(!body) return;
  body.innerHTML=SM_NAMES.map(n=>
    '<tr><th>'+n+'</th>'+[0,1,2].map(i=>
      '<td><input type="number" min="0" max="10" step="0.1" value="'+smData[n][i]+
      '" data-r="'+n+'" data-c="'+i+'" aria-label="'+n+' '+SM_AXES[i]+'"></td>').join('')+'</tr>').join('');
  body.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input',()=>{
      let v=parseFloat(inp.value);
      if(isNaN(v)) v=0;
      v=Math.max(0, Math.min(10, Math.round(v*10)/10));
      smData[inp.dataset.r][Number(inp.dataset.c)]=v;
      smSaveData();
      smRefresh();
    });
  });
}

function smSaveData(){
  try{ if(typeof cmnSet==='function') cmnSet(SM_KEY_DATA, JSON.stringify(smData)); }catch(e){}
}
function smLoadData(){
  try{
    if(typeof cmnGet!=='function') return;
    const raw=cmnGet(SM_KEY_DATA,'');
    if(!raw) return;
    const d=JSON.parse(raw);
    SM_NAMES.forEach(n=>{
      if(Array.isArray(d[n]) && d[n].length===3){
        smData[n]=d[n].map(x=>Math.max(0,Math.min(10,Number(x)||0)));
      }
    });
  }catch(e){}
}

function smUnlock(which){
  const root=smEl('v-sim');
  if(!root) return;
  root.querySelectorAll('.sm-stage.locked[data-lock="'+which+'"]').forEach(d=>d.classList.remove('locked'));
  const msg=smEl(which==='a2'?'sm-lock2':'sm-lock3');
  if(msg) msg.textContent='';
}

function smRefresh(){
  smCalc();
  smRank();
  smDraw();
}


/* ═══════ 12. 활동 1 — 문장 수집 · 벡터로 보기 · 기준 칩 ═══════ */

const SM_SIT = [
  {n:1, cap:'상황 1 — 축구를 하다 무릎이 까진 친구와 그 옆에서 말을 거는 친구(말풍선 1개).'},
  {n:2, cap:'상황 2 — 중국집에서 메뉴판을 보는 두 학생(말풍선 2개).'},
  {n:3, cap:'상황 3 — 버스 정류장에서 시계를 보며 초조해하는 학생(말풍선 1개).'},
  {n:4, cap:'상황 4 — 선생님이 고르는 장면입니다.'},
  {n:5, cap:'상황 5 — 선생님이 고르는 장면입니다.'},
];

const SM_EX5 = [
  '괜찮아? 많이 아프겠다. 보건실 같이 가자.',
  '야, 무릎에서 피 난다. 빨리 보건실 가자.',
  '괜찮아, 이 정도는 참을 수 있어. 계속 하자.',
  '축구하다가 넘어졌네. 조심하지 그랬어.',
  '피 난다! 선생님 불러올게, 잠깐만 기다려.',
];

/* 6차시가 core.js에 올리는 공용 텍스트 엔진을 우선 사용하고, 없을 때만 최소 폴백을 씁니다. */
const SM_STOP = ['은','는','이','가','을','를','의','에','와','과','도','로','으로','에서','까지','부터','이다','이며'];

function smTokens(text){
  let t=null;
  if(typeof tokenize==='function'){ try{ t=tokenize(text); }catch(e){ t=null; } }
  if(!Array.isArray(t)){
    t=String(text||'').replace(/[.,!?;:'"()\[\]{}·…~“”‘’]/g,' ').split(/\s+/).filter(w=>w.length>0);
  }
  return t.map(w=>{
    /* 6차시와 같은 순서로 처리합니다 — 원형 사전(TP_LEMMA) 먼저, 없을 때만 조사 떼기.
       (이 줄이 없으면 같은 문장이 6차시에서는 '깨끗하다', 9차시에서는 '깨끗한'/'깨끗하고'
        로 갈라져 두 차시의 단어집합이 어긋납니다 — 2단원 통합 시 수정) */
    if(typeof TP_LEMMA==='object' && TP_LEMMA && TP_LEMMA[w]) return TP_LEMMA[w];
    let r=null;
    if(typeof removeStopwordsFromWord==='function'){ try{ r=removeStopwordsFromWord(w, SM_STOP); }catch(e){ r=null; } }
    if(typeof r==='string' && typeof TP_LEMMA==='object' && TP_LEMMA && TP_LEMMA[r]) return TP_LEMMA[r];
    if(typeof r!=='string'){
      r=w;
      let changed=true;
      const sorted=SM_STOP.slice().sort((a,b)=>b.length-a.length);
      while(changed){
        changed=false;
        for(let i=0;i<sorted.length;i++){
          const sw=sorted[i];
          if(r.length>sw.length && r.slice(-sw.length)===sw){ r=r.slice(0,-sw.length); changed=true; break; }
        }
      }
    }
    return r;
  }).filter(w=>w.length>0 && SM_STOP.indexOf(w)<0);
}

/* 6차시 공용 buildUniverse/countFrequency 는 «낱말 배열의 배열» 을 받습니다.
   문장 문자열을 그대로 넘기면 문자열을 한 글자씩 순회해 자모 단위 U 가 만들어지므로,
   반드시 smTokens() 로 먼저 낱말로 쪼갠 뒤 넘깁니다(2단원 통합 시 수정). */
function smUniverse(docs){
  const lists=(docs||[]).map(d=>Array.isArray(d)?d:smTokens(d));
  let u=null;
  if(typeof buildUniverse==='function'){ try{ u=buildUniverse(lists,{order:'ko'}); }catch(e){ u=null; } }
  if(Array.isArray(u) && u.length) return u;
  const set=[];
  lists.forEach(ws=>ws.forEach(w=>{ if(set.indexOf(w)<0) set.push(w); }));
  return set.sort((a,b)=>a.localeCompare(b,'ko'));
}

function smFreqVec(doc, U){
  const ws=Array.isArray(doc)?doc:smTokens(doc);
  let v=null;
  if(typeof countFrequency==='function'){ try{ v=countFrequency(ws,U); }catch(e){ v=null; } }
  if(Array.isArray(v) && v.length===U.length) return v.map(x=>Number(x)||0);
  return U.map(u=>{ let c=0; ws.forEach(w=>{ if(w===u) c++; }); return c; });
}

function smCorpusLoad(){
  try{
    if(typeof cmnGet!=='function') return [];
    const a=JSON.parse(cmnGet(SM_KEY_CORPUS,'[]'));
    return Array.isArray(a) ? a.filter(x=>typeof x==='string' && x.trim()) : [];
  }catch(e){ return []; }
}
function smCorpusSave(){
  try{ if(typeof cmnSet==='function') cmnSet(SM_KEY_CORPUS, JSON.stringify(smA1S)); }catch(e){}
}

function smSentRender(){
  const ul=smEl('sm-sentlist');
  if(!ul) return;
  ul.innerHTML='';
  smA1S.forEach((s,i)=>{
    const li=document.createElement('li');
    li.innerHTML='<span class="no">'+(i+1)+'.</span>'+((typeof cmnEsc==='function')?cmnEsc(s):s);
    const b=document.createElement('button');
    b.type='button'; b.textContent='✕'; b.title='이 문장 지우기';
    b.addEventListener('click',()=>{ smA1S.splice(i,1); smCorpusSave(); smSentRender(); });
    li.appendChild(b);
    ul.appendChild(li);
  });
}

function smVecRender(){
  const box=smEl('sm-a1vec');
  if(!box) return;
  if(smA1S.length<1){
    box.innerHTML='<p class="sm-lockmsg">문장을 한 개 이상 담은 뒤 [벡터로 보기]를 눌러 주세요.</p>';
    return;
  }
  smA1U=smUniverse(smA1S);
  smA1V=smA1S.map(s=>smFreqVec(s, smA1U));
  const esc=(typeof cmnEsc==='function')?cmnEsc:(x=>x);
  let html='<p style="margin-top:0.9rem;"><b>단어집합(전체집합 U)</b> — 원소 '+smA1U.length+'개 · '+
    '정렬 기준: <b>가나다순</b>(학생이 직접 입력한 문서)</p>'+
    '<div class="math" style="white-space:normal;">U = {'+smA1U.map(esc).join(', ')+'}</div>'+
    '<div class="sm-scroll"><table class="sm-tbl"><thead><tr><th>문장</th>'+
    smA1U.map(w=>'<th>'+esc(w)+'</th>').join('')+'</tr></thead><tbody>';
  smA1V.forEach((v,i)=>{
    html+='<tr><th>'+(i+1)+'</th>'+v.map((x,j)=>
      '<td><input type="number" min="0" max="9" step="1" value="'+x+'" data-i="'+i+'" data-j="'+j+
      '" aria-label="문장 '+(i+1)+' '+esc(smA1U[j])+' 빈도수"></td>').join('')+'</tr>';
  });
  html+='</tbody></table></div>'+
    '<p class="sm-src">열 = 단어집합의 원소, 행 = 문장. 숫자 칸은 직접 고칠 수 있습니다(7차시와 같은 방식·같은 용어).</p>';
  box.innerHTML=html;
  box.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input',()=>{
      let v=parseInt(inp.value,10);
      if(isNaN(v)||v<0) v=0;
      if(v>9) v=9;
      smA1V[Number(inp.dataset.i)][Number(inp.dataset.j)]=v;
      smRuleApply();
    });
  });
  smRuleApply();
}

let smRule='';
function smRuleApply(){
  const fb=smEl('sm-rulefb');
  if(!fb) return;
  if(!smRule){ fb.className='sm-fb'; fb.innerHTML=''; return; }
  if(smA1V.length<2){
    fb.className='sm-fb no';
    fb.innerHTML='문장이 두 개 이상이어야 두 문장을 견줄 수 있습니다.'+
      '<span class="x">[예시 문장 5개 불러오기]를 누르거나 친구의 문장을 더 담아 보세요.</span>';
    return;
  }
  const a=smA1V[0], b=smA1V[1];
  let val='', note='';
  if(smRule==='ov'){
    let c=0;
    for(let i=0;i<a.length;i++){ if(a[i]>0 && b[i]>0) c++; }
    val='겹치는 단어의 개수 = '+c+'개';
    note='개수만 세는 기준은 문장이 길수록 무조건 유리해지고, 뜻이 반대여도 구분하지 못합니다.';
  }else if(smRule==='ab'){
    let s=0;
    for(let i=0;i<a.length;i++){ s+=Math.abs(a[i]-b[i]); }
    val='성분의 차이의 합 = '+s;
    note='성분의 차이를 절댓값으로 더한 값(맨해튼 거리)입니다. 방향이 아니라 양의 차이를 봅니다.';
  }else{
    val='두 점 사이의 거리 d = '+smFix(smDist(a,b));
    note='오늘 배울 유클리드 유사도가 바로 이 값입니다. 0에 가까울수록 비슷하다고 판단합니다.';
  }
  fb.className='sm-fb ok';
  fb.innerHTML='문장 1과 문장 2를 그 기준으로 재면 — <b>'+val+'</b>'+
    '<span class="x">'+note+' 다른 칩도 눌러 값이 어떻게 달라지는지 견주어 봅시다.</span>';
}


/* ═══════ 13. 활동 4-3 — 길이 편향 실험 ═══════ */

const SM_U6 = ['도서관','과학','책','우주','로봇','축구'];
const SM_LEN0 = [
  '나는 학교 도서관에서 우주와 로봇에 관한 과학 책을 읽는 것을 좋아한다.',
  '나는 학교 도서관에 자주 간다. 도서관에서 과학 책을 읽는다. 우주와 로봇에 관한 과학 책이 특히 재미있다. 앞으로도 우주 탐사와 로봇 공학을 다룬 책을 빌려 읽을 계획이다.',
  '나는 도서관에서 축구 책을 한 권 빌렸다.',
];

function smCountSub(text, w){
  const t=String(text||'');
  let c=0, i=0;
  while((i=t.indexOf(w,i))>=0){ c++; i+=w.length; }
  return c;
}
function smLenVec(text){ return SM_U6.map(w=>smCountSub(text,w)); }

function smLenBuild(){
  const box=smEl('sm-len-in');
  if(!box) return;
  if(!smLenText) smLenText=SM_LEN0.slice();
  const esc=(typeof cmnEsc==='function')?cmnEsc:(x=>x);
  box.innerHTML=smLenText.map((t,i)=>
    '<p style="margin-top:0.8rem;font-size:0.95rem;color:var(--muted);">글 '+['①','②','③'][i]+
    (i===0?' (짧은 글)':(i===1?' (같은 주제·긴 글)':' (다른 주제·짧은 글)'))+'</p>'+
    '<textarea class="sm-ta" data-k="'+i+'" aria-label="글 '+(i+1)+'">'+esc(t)+'</textarea>').join('');
  box.querySelectorAll('textarea').forEach(ta=>{
    ta.addEventListener('input',()=>{ smLenText[Number(ta.dataset.k)]=ta.value; smLenCalc(); });
  });
  smLenCalc();
}

function smLenCalc(){
  const vt=smEl('sm-lenvec'), rt=smEl('sm-lenres');
  if(!vt||!rt) return;
  const V=smLenText.map(smLenVec);
  const vb=vt.querySelector('tbody'), rb=rt.querySelector('tbody');
  if(vb){
    vb.innerHTML=V.map((v,i)=>'<tr><th>'+['①','②','③'][i]+'</th>'+
      v.map(x=>'<td class="v">'+x+'</td>').join('')+
      '<td class="v">'+smFix(smNorm2(v))+'</td></tr>').join('');
  }
  if(rb){
    const rows=[
      {lb:'① ↔ ② (같은 주제·긴 글)', a:V[0], b:V[1]},
      {lb:'① ↔ ③ (다른 주제·짧은 글)', a:V[0], b:V[2]},
    ];
    rb.innerHTML=rows.map(r=>{
      const c=smCos(r.a,r.b);
      const nd=(c===null)?null:smDist(smUnit(r.a),smUnit(r.b));
      return '<tr><td style="text-align:left;">'+r.lb+'</td><td class="v">'+smFix(smDist(r.a,r.b))+
        '</td><td class="v">'+(c===null?'—':smFix(c))+'</td><td class="v">'+(nd===null?'—':smFix(nd))+'</td></tr>';
    }).join('');
  }
}

function smLenDup(){
  if(!smLenText) smLenText=SM_LEN0.slice();
  smLenPrev1=smLenVec(smLenText[0]);
  smLenText[0]=smLenText[0]+' '+smLenText[0];
  smLenBuild();
  const now=smLenVec(smLenText[0]);
  const fb=smEl('sm-lenfb');
  if(fb){
    const c=smCos(smLenPrev1, now);
    fb.className='sm-fb ok';
    fb.innerHTML='문장 ①을 두 번 이어 붙였습니다 — 벡터의 모든 성분이 2배가 되었습니다: ('+
      smLenPrev1.join(', ')+') → ('+now.join(', ')+')'+
      '<span class="x">원래의 ①과 견주면 <b>코사인 값은 '+smFix(c)+'</b>으로 그대로인데, ' +
      '<b>거리는 '+smFix(smDist(smLenPrev1, now))+'</b>만큼 벌어졌습니다(√5 ≈ 2.24). ' +
      '방향은 그대로인데 크기만 커졌기 때문입니다.</span>';
  }
}


/* ═══════ 14. 정규화 애니메이션 ═══════ */

function smNormAnim(on){
  if(smNormRaf){ cancelAnimationFrame(smNormRaf); smNormRaf=null; }
  if(SM_REDUCE){ smNormT = on?1:0; smDraw(); smRank(); smCalc(); return; }
  const from=smNormT, to=on?1:0;
  const CIRCLE=400, SLIDE=900;
  const total=(to===1)?(CIRCLE+SLIDE):SLIDE;
  const t0=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
  const ease=x=>(x<0.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2);
  const tick=()=>{
    const now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
    let e=(now-t0)/total;
    if(e>1) e=1;
    if(to===1){
      /* 처음 400ms는 단위원만 옅게 등장 → 그 뒤 900ms 동안 화살표가 미끄러집니다. */
      const s=Math.max(0, (e*total - CIRCLE)/SLIDE);
      smNormT = from + (1-from)*ease(Math.min(1,s));
      if(smNormT<0.001 && e>0) smNormT=0.001;   /* 단위원 페이드인용 최소값 */
    }else{
      smNormT = from*(1-ease(e));
    }
    smDraw();
    if(e<1){ smNormRaf=requestAnimationFrame(tick); }
    else{ smNormT=to; smNormRaf=null; smDraw(); smRank(); smCalc(); }
  };
  smNormRaf=requestAnimationFrame(tick);
}


/* ═══════ 15. 초기화 ═══════ */

(function simInit(){
  const boot=function(){
    const root=document.getElementById('v-sim');
    if(!root) return;                       /* 뷰가 없어도 core.js가 죽지 않도록 가드 */

    /* ── 공통 컴포넌트 ── */
    if(typeof videoDeck  ==='function') videoDeck('sm-videos','sim',SM_VIDEOS);
    if(typeof warmStepper==='function') warmStepper('smWarm','sm',SM_WARM);
    if(typeof quizStepper==='function') quizStepper('smQuiz','sm',SM_QUIZ);
    if(typeof chipDefs   ==='function') chipDefs('#v-sim .sm-keys',SM_DEFS);
    if(typeof wsLinks    ==='function') wsLinks('sm-wslinks','sim');

    /* 형성평가 총점이 나오면 결과 문구를 덧붙이고 aimath.sim.quiz 에 기록합니다.
       (공통 quizStepper 를 고치지 않고 결과 화면만 관찰합니다.) */
    const qbox=document.getElementById('smQuiz');
    if(qbox && typeof MutationObserver==='function'){
      const mo=new MutationObserver(()=>{
        const sc=qbox.querySelector('.cmn-score');
        if(!sc || sc.dataset.smDone==='1') return;
        sc.dataset.smDone='1';
        const m=(sc.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);
        const n=m?parseInt(m[1],10):0;
        try{ if(typeof cmnSet==='function') cmnSet(SM_KEY_QUIZ, JSON.stringify({score:n, total:SM_QUIZ.length, at:Date.now()})); }catch(e){}
        const p=document.createElement('p');
        p.className='cmn-note';
        p.style.fontSize='1.0rem';
        p.style.color='var(--fg)';
        p.textContent=SM_QUIZ_MSG[Math.max(0,Math.min(SM_QUIZ_MSG.length-1,n))];
        sc.parentNode.insertBefore(p, sc.nextSibling);
      });
      mo.observe(qbox,{childList:true,subtree:true});
    }

    /* ── 축 드롭다운 ── */
    const ax=document.getElementById('sm-ax'), ay=document.getElementById('sm-ay');
    if(ax&&ay){
      const opts=SM_AXES.map((a,i)=>'<option value="'+i+'">'+a+'</option>').join('');
      ax.innerHTML=opts; ay.innerHTML=opts;
      ax.value=String(smAxisX); ay.value=String(smAxisY);
      ax.addEventListener('change',()=>{ smAxisX=Number(ax.value)||0; smDraw(); });
      ay.addEventListener('change',()=>{ smAxisY=Number(ay.value)||0; smDraw(); });
    }

    /* ── 활동 2 표 ── */
    smLoadData();
    smBuildTable();
    const rst=document.getElementById('sm-reset');
    if(rst) rst.addEventListener('click',()=>{
      SM_NAMES.forEach(n=>{ smData[n]=SM_DATA0[n].slice(); });
      smSaveData(); smBuildTable(); smRefresh();
    });

    /* ── 예상 칩 (정답 잠금) ── */
    const g2=document.getElementById('sm-guess2');
    if(g2) g2.querySelectorAll('.sm-chip').forEach(b=>{
      b.addEventListener('click',()=>{
        g2.querySelectorAll('.sm-chip').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
        smGuess2=b.dataset.g;
        smUnlock('a2');
        const cos=document.querySelector('#sm-mode2 .sm-chip[data-m="cos"]');
        smRefresh();
        if(cos && smGuess3) cos.disabled=false;
      });
    });
    const g3=document.getElementById('sm-guess3');
    if(g3) g3.querySelectorAll('.sm-chip').forEach(b=>{
      b.addEventListener('click',()=>{
        g3.querySelectorAll('.sm-chip').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
        smGuess3=b.dataset.g;
        smUnlock('a3');
        const cos=document.querySelector('#sm-mode2 .sm-chip[data-m="cos"]');
        if(cos){ cos.disabled=false; cos.title='활동 3에서 배운 방향으로 재기'; }
        smRefresh();
      });
    });

    /* ── 모드 토글 · 비교 대상 칩 ── */
    const md=document.getElementById('sm-mode2');
    if(md) md.querySelectorAll('.sm-chip').forEach(b=>{
      b.addEventListener('click',()=>{
        if(b.disabled) return;
        md.querySelectorAll('.sm-chip').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
        smMode=b.dataset.m;
        smDraw();
      });
    });
    const p2=document.getElementById('sm-pair2');
    if(p2) p2.querySelectorAll('.sm-chip').forEach(b=>{
      b.addEventListener('click',()=>{
        p2.querySelectorAll('.sm-chip').forEach(x=>x.classList.remove('on'));
        b.classList.add('on'); smPair2=b.dataset.p; smCalc(); smDraw();
      });
    });
    const p3=document.getElementById('sm-pair3');
    if(p3) p3.querySelectorAll('.sm-chip').forEach(b=>{
      b.addEventListener('click',()=>{
        p3.querySelectorAll('.sm-chip').forEach(x=>x.classList.remove('on'));
        b.classList.add('on'); smPair3=b.dataset.p; smCalc(); smDraw();
      });
    });

    /* ── 회전 슬라이더 ── */
    const rot=document.getElementById('sm-rot'), rotv=document.getElementById('sm-rotv');
    if(rot) rot.addEventListener('input',()=>{
      smRot=parseFloat(rot.value)||0;
      if(rotv) rotv.textContent=smRot.toFixed(1)+'°';
      smCalc(); smDraw();
    });
    const rrs=document.getElementById('sm-rotrst');
    if(rrs) rrs.addEventListener('click',()=>{
      smRot=0;
      if(rot) rot.value='0';
      if(rotv) rotv.textContent='0.0°';
      smCalc(); smDraw();
    });

    /* ── 직접 계산 채점 ── */
    const c2=document.getElementById('sm-chk2');
    if(c2) c2.addEventListener('click',()=>{
      const inp=document.getElementById('sm-ans2'), fb=document.getElementById('sm-fb2');
      if(!inp||!fb) return;
      const v=parseFloat(inp.value);
      const ans=smDist(smData.A,smData.C);
      if(isNaN(v)){ fb.className='sm-fb no'; fb.innerHTML='값을 먼저 입력해 주세요.'; return; }
      if(Math.abs(v-ans)<=0.02){
        fb.className='sm-fb ok';
        fb.innerHTML='✓ 맞습니다. d(A, C) ≈ '+smFix(ans)+
          '<span class="x">d(A, C) = √((6−3)² + (2−1)² + (2−1)²) = √(9 + 1 + 1) = √11 ≈ 3.32입니다.</span>';
      }else{
        const d=[0,1,2].map(i=>Math.abs((smData.A[i]-smData.C[i])));
        let worst=0;
        for(let i=1;i<3;i++){ if(d[i]>d[worst]) worst=i; }
        fb.className='sm-fb no';
        fb.innerHTML='✗ 다시 계산해 봅시다.'+
          '<span class="x">힌트 — 차이가 가장 큰 항목은 <b>'+SM_AXES[worst]+'</b>('+smNum(smData.A[worst])+' − '+
          smNum(smData.C[worst])+' = '+smNum(smData.A[worst]-smData.C[worst])+')입니다. ' +
          '세 성분의 차를 <b>각각 제곱해서 더한 뒤</b> 제곱근을 씌웠는지 확인해 보세요.</span>';
      }
    });
    const c3=document.getElementById('sm-chk3');
    if(c3) c3.addEventListener('click',()=>{
      const inp=document.getElementById('sm-ans3'), fb=document.getElementById('sm-fb3');
      if(!inp||!fb) return;
      const v=parseFloat(inp.value);
      const ans=smCos(smData.B,smData.C);
      if(ans===null){ fb.className='sm-fb no'; fb.innerHTML='모든 성분이 0인 문장은 방향을 정할 수 없습니다.'; return; }
      if(isNaN(v)){ fb.className='sm-fb no'; fb.innerHTML='값을 먼저 입력해 주세요.'; return; }
      if(Math.abs(v-ans)<=0.01){
        fb.className='sm-fb ok';
        fb.innerHTML='✓ 맞습니다. C(B, C) ≈ '+smFix(ans)+
          '<span class="x">성분끼리 곱해 더한 값 = 5×3 + 2×1 + 3×1 = 20, 두 벡터의 크기의 곱 = √38 × √11 ≈ 20.45이므로 ' +
          '20 ÷ 20.45 ≈ 0.98입니다.</span>';
      }else{
        fb.className='sm-fb no';
        fb.innerHTML='✗ 다시 계산해 봅시다.'+
          '<span class="x">힌트 — 분자는 <b>성분끼리 곱해 더한 값</b>(5×3 + 2×1 + 3×1)이고, ' +
          '분모는 <b>두 벡터의 크기의 곱</b>(√(5²+2²+3²) × √(3²+1²+1²))입니다. 분모에 제곱근을 빠뜨리지 않았는지 확인해 보세요.</span>';
      }
    });

    /* ── 정규화 스위치 ── */
    const sw=document.getElementById('sm-normsw');
    if(sw) sw.addEventListener('change',()=>{ smNorm=!!sw.checked; smNormAnim(smNorm); smRank(); smCalc(); });

    /* ── 활동 1 ── */
    const thumbs=document.getElementById('sm-thumbs');
    if(thumbs){
      thumbs.innerHTML=SM_SIT.map((s,i)=>
        '<button class="sm-thumb'+(i===0?' on':'')+'" type="button" data-n="'+s.n+'" aria-label="상황 '+s.n+' 사진 고르기">'+
        '<img src="assets/situations/상황'+s.n+'.jpg" alt="" loading="lazy" '+
        'onerror="this.style.display=\'none\';this.parentNode.insertAdjacentText(\'beforeend\',\'🖼️\');">'+
        '<span class="n">'+s.n+'</span></button>').join('');
      thumbs.querySelectorAll('.sm-thumb').forEach(b=>{
        b.addEventListener('click',()=>{
          thumbs.querySelectorAll('.sm-thumb').forEach(x=>x.classList.remove('on'));
          b.classList.add('on');
          const n=Number(b.dataset.n)||1;
          const img=document.getElementById('sm-sitimg'), fig=document.getElementById('sm-sitfig');
          const cap=document.getElementById('sm-sitcap');
          if(img&&fig){
            fig.classList.remove('nofoto');
            img.style.display='';
            img.src='assets/situations/상황'+n+'.jpg';
          }
          const s=SM_SIT.filter(x=>x.n===n)[0];
          if(cap&&s) cap.textContent=s.cap+' 상황 사진은 저장소 로컬 자산(assets/situations/)으로만 제공합니다.';
        });
      });
    }

    smA1S=smCorpusLoad();
    smSentRender();

    const add=document.getElementById('sm-add');
    if(add) add.addEventListener('click',()=>{
      const ta=document.getElementById('sm-mysent');
      if(!ta) return;
      const t=ta.value.trim();
      if(!t) return;
      smA1S.push(t); smCorpusSave(); smSentRender(); ta.value='';
    });
    const ex5=document.getElementById('sm-ex5');
    if(ex5) ex5.addEventListener('click',()=>{
      SM_EX5.forEach(s=>{ if(smA1S.indexOf(s)<0) smA1S.push(s); });
      smCorpusSave(); smSentRender(); smVecRender();
    });
    const clr=document.getElementById('sm-clr');
    if(clr) clr.addEventListener('click',()=>{ smA1S=[]; smCorpusSave(); smSentRender(); smVecRender(); });
    const tov=document.getElementById('sm-tovec');
    if(tov) tov.addEventListener('click',smVecRender);

    const rules=document.getElementById('sm-rules');
    if(rules) rules.querySelectorAll('.sm-chip').forEach(b=>{
      b.addEventListener('click',()=>{
        rules.querySelectorAll('.sm-chip').forEach(x=>x.classList.remove('on'));
        b.classList.add('on'); smRule=b.dataset.rule; smRuleApply();
      });
    });

    /* ── 활동 4-3 ── */
    smLenBuild();
    const dup=document.getElementById('sm-dup');
    if(dup) dup.addEventListener('click',smLenDup);
    const lrs=document.getElementById('sm-lenrst');
    if(lrs) lrs.addEventListener('click',()=>{
      smLenText=SM_LEN0.slice(); smLenPrev1=null;
      smLenBuild();
      const fb=document.getElementById('sm-lenfb');
      if(fb){ fb.className='sm-fb'; fb.innerHTML=''; }
    });

    /* ── 단계 토글 잠금 ── */
    root.querySelectorAll('.sm-stage').forEach(d=>{
      d.addEventListener('click',e=>{
        if(!d.classList.contains('locked')) return;
        const s=e.target && e.target.closest ? e.target.closest('summary') : null;
        if(!s) return;
        e.preventDefault();
        const which=d.dataset.lock;
        const msg=document.getElementById(which==='a2'?'sm-lock2':'sm-lock3');
        if(msg) msg.textContent='먼저 값을 넣어 보세요 — 위에서 [내 예상]을 고르면 잠금이 풀립니다.';
      });
    });

    /* ── 핵심 질문 서술란 ── */
    const ans=document.getElementById('sm-answer');
    if(ans){
      try{ if(typeof cmnGet==='function') ans.value=cmnGet(SM_KEY_ANS,''); }catch(e){}
      let tm=null;
      ans.addEventListener('input',()=>{
        clearTimeout(tm);
        tm=setTimeout(()=>{
          try{ if(typeof cmnSet==='function') cmnSet(SM_KEY_ANS, ans.value); }catch(e){}
          const st=document.getElementById('sm-answerst');
          if(st) st.textContent='저장했습니다. 이 기기에만 보관됩니다.';
        },400);
      });
    }
    const tp=document.getElementById('sm-toprint');
    if(tp) tp.addEventListener('click',()=>{
      const a=document.getElementById('sm-answer'), slot=document.getElementById('sm-printans');
      if(a&&slot){
        slot.textContent=a.value||'';
        const st=document.getElementById('sm-answerst');
        if(st) st.textContent='학습지 ⑦번 칸에 넣었습니다. [학습지 인쇄]를 눌러 확인해 보세요.';
      }
    });

    /* ── 첫 렌더 ── */
    smRefresh();

    /* 폭이 바뀌면 캔버스를 다시 그립니다(devicePixelRatio·반응형 대응). */
    let rz=null;
    window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(smDraw,150); });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();


/* ══════════ 2단원 senti 뷰 코드 (unit2_build/senti/core-snippet.js) ══════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   SENTI (10차시: 집합으로 마음 읽기 — 자카드 유사도와 감성 분석) — 접두사 st
   ---------------------------------------------------------------------------
   · 이 블록은 core.js 맨 끝(1단원 블록 뒤)에 그대로 덧붙입니다.
   · 뷰(views/senti.html)가 없어도 core.js가 죽지 않도록 초기화는 IIFE + null 가드.
   · 공통 컴포넌트(videoDeck·warmStepper·quizStepper·chipDefs·wsPrint·wsLinks)는
     호출만 하고 수정하지 않습니다.
   · 집합 계산 유틸 stJ / stScore / stVerdict / stRound2 는 11차시 review 가 재사용합니다.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 0. 저장 키 (부록 F) ─────────────────────────────────────────────────── */
const ST_K_DICT  = 'aimath.senti.dict';        /* 감성 사전 P·N — 11차시 review 공유(이름 변경 금지) */
const ST_K_THR   = 'aimath.senti.k';           /* 마지막으로 정한 임계값 */
const ST_K_CLASS = 'aimath.senti.classdict';   /* 학급 사전 기여 누적 */
const ST_K_ROOM  = 'aimath.classroom.url';     /* 학급 공유 자료함(6~10차시 공통 키) */
const ST_K_ROOM_CORE = 'aimath.shared.folder'; /* core.js aimRefExtras 가 쓰는 키 — 값만 미러링 */

/* ── 1. 소도구 ───────────────────────────────────────────────────────────── */
function stEsc(s){
  if(typeof cmnEsc === 'function') return cmnEsc(s);
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function stLS(k,d){
  if(typeof cmnGet === 'function') return cmnGet(k,d);
  try{ const v = localStorage.getItem(k); return v === null ? d : v; }catch(e){ return d; }
}
function stLSSet(k,v){
  if(typeof cmnSet === 'function'){ cmnSet(k,v); return; }
  try{ localStorage.setItem(k,v); }catch(e){}
}
function stEl(id){ return document.getElementById(id); }
function stReduce(){
  try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; }
}

/* 소수점 아래 셋째 자리에서 반올림 → 둘째 자리까지(교과서 규약). 음수도 절댓값 기준으로 반올림합니다. */
function stRound2(x){
  const n = Number(x);
  if(!isFinite(n)) return 0;
  const s = n < 0 ? -1 : 1;
  return s * Math.round(Math.abs(n) * 100) / 100;
}
/* 화면 표기용 — 음수 부호는 수학 기호 −(U+2212)로 씁니다. */
function stNum(x){
  const v = stRound2(x);
  return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
}

/* ── 2. 토크나이저 (6차시 text 뷰 로직 재사용 + 어미 정규화) ─────────────── */
/* 조사 목록 — 뒤에서부터 긴 것 우선으로 떼어 냅니다. */
const ST_STOP = ['으로','에서','까지','부터','에게','한테','이다','이며',
                 '은','는','이','가','을','를','의','에','도','와','과','로'];

/* 조사처럼 보이지만 떼면 안 되는 낱말(보호 목록) — 조사를 떼는 도중에도 이 목록에 닿으면 멈춥니다. */
const ST_KEEP = ['그래도','새로','오늘','내일','정말','아무것','너무','그냥','조금','요즘',
                 '최고','최악','만족','기대','걱정','불안','자신감','스트레스','짜증','감동',
                 '몰입','추천','비추천','실망','친절','불친절','청결','저렴','포기','피곤',
                 '사과','포도','주의','고양이','참고','비교','대화','정도','제도','태도','시도'];

/* 어미 정규화 표 — 이 차시·활동지·교과서 예문을 모두 덮습니다. */
const ST_LEMMA = {
  '맛있':'맛있다','맛있는':'맛있다','맛있고':'맛있다','맛있어요':'맛있다','맛있었어요':'맛있다',
  '먹었다':'먹다','먹는다':'먹다','먹어요':'먹다','먹고':'먹다','먹은':'먹다',
  '상큼':'상큼하다','상큼한':'상큼하다','새콤':'새콤하다','새콤한':'새콤하다',
  '청결하고':'청결하다','청결한':'청결하다','깨끗한':'깨끗하다',
  '넓어서':'넓다','넓고':'넓다','넓은':'넓다','좁은':'좁다',
  '편하게':'편하다','편한':'편하다','편안한':'편하다','불편한':'불편하다',
  '많고':'많다','많은':'많다','많이':'많다','적은':'적다',
  '친절한':'친절','불친절한':'불친절','불친절해서':'불친절',
  '별로였어요':'별로다','별로였다':'별로다','별로고':'별로다','별로':'별로다',
  '힘들고':'힘들다','힘든':'힘들다','힘들어':'힘들다','힘들어요':'힘들다',
  '피곤하지만':'피곤','피곤해':'피곤','피곤하다':'피곤','피곤해요':'피곤',
  '잘':'잘하다','잘해요':'잘하다','잘하시네요':'잘하다','잘한다':'잘하다',
  '해내고':'해내다','해냈다':'해내다','싶습니다':'싶다','싶어요':'싶다','싶어':'싶다',
  '하기':'하다','하고':'하다','싫고':'싫다','싫어':'싫다','싫어요':'싫다',
  '지쳐서':'지치다','지쳤다':'지치다','지치고':'지치다',
  '포기하고':'포기','포기했다':'포기','포기하고싶다':'포기',
  '탄탄하고':'탄탄하다','탄탄한':'탄탄하다','완벽했다':'완벽하다','완벽한':'완벽하다',
  '빈약하고':'빈약하다','빈약한':'빈약하다','빈약해서':'빈약하다',
  '최악이었다':'최악','최악이다':'최악','최악이에요':'최악',
  '좋지만':'좋다','좋고':'좋다','좋은':'좋다','좋아요':'좋다','좋네요':'좋다','좋았다':'좋다',
  '개봉한':'개봉하다','괜찮아':'괜찮다','괜찮네요':'괜찮다','괜찮은':'괜찮다',
  '재미있고':'재미있다','재미있는':'재미있다','재미없는':'재미없다',
  '지루하지':'지루하다','지루한':'지루하다','행복했어요':'행복','행복하다':'행복',
  '웃었다':'웃다','웃는':'웃다','외로운':'외롭다','외로워':'외롭다',
  '느린':'느리다','빠른':'빠르다','알찬':'알차다','훌륭한':'훌륭하다','신선한':'신선하다',
  '어색한':'어색하다','뻔한':'뻔하다','아쉬운':'아쉽다','아쉽지만':'아쉽다','산만한':'산만하다',
  '불결한':'불결하다','맛없는':'맛없다','맛없어요':'맛없다'
};

/* 한 낱말에서 조사를 떼어 냅니다(text_set.html 의 removeStopwordsFromWord 와 같은 규칙 + 보호 목록). */
function stStrip(word){
  const sorted = ST_STOP.slice().sort(function(a,b){ return b.length - a.length; });
  let r = String(word || '');
  let changed = true;
  while(changed){
    if(ST_KEEP.indexOf(r) >= 0 || ST_LEMMA[r]) break;   /* 보호 낱말에 닿으면 더 떼지 않습니다 */
    changed = false;
    for(let i=0;i<sorted.length;i++){
      const sw = sorted[i];
      if(r.length > sw.length && r.slice(-sw.length) === sw){
        r = r.slice(0, r.length - sw.length);
        changed = true;
        break;
      }
    }
  }
  return r;
}

/* 어미를 규칙으로 정규화합니다(표에 없는 낱말용). */
function stLem(w){
  const s = String(w || '');
  if(!s) return s;
  const hada = ['했다','했어요','합니다','해서','하는','하며','하지만','하고','한'];
  for(let i=0;i<hada.length;i++){
    const t = hada[i];
    if(s.length > t.length && s.slice(-t.length) === t) return s.slice(0, s.length - t.length) + '하다';
  }
  const past = ['었다','았다','였다','는다','ㄴ다'];
  for(let i=0;i<past.length;i++){
    const t = past[i];
    if(s.length > t.length && s.slice(-t.length) === t) return s.slice(0, s.length - t.length) + '다';
  }
  const polite = ['어요','아요','네요','예요','에요','습니다'];
  for(let i=0;i<polite.length;i++){
    const t = polite[i];
    if(s.length > t.length && s.slice(-t.length) === t) return s.slice(0, s.length - t.length) + '다';
  }
  return s;
}

/* 문장 → 낱말 배열 (원형까지 정규화) */
function stTok(text){
  let base = null;
  if(typeof tokenize === 'function'){
    try{ base = tokenize(String(text || '')); }catch(e){ base = null; }
  }
  if(!Array.isArray(base)){
    base = String(text || '')
      .replace(/[.,!?;:'"()\[\]{}·…“”‘’~]/g,' ')
      .split(/\s+/).filter(function(w){ return w.length > 0; });
  }
  const out = [];
  base.forEach(function(raw){
    const t = String(raw || '').trim();
    if(!t) return;
    if(ST_LEMMA[t]){ out.push(ST_LEMMA[t]); return; }
    if(ST_KEEP.indexOf(t) >= 0){ out.push(t); return; }
    let w = stStrip(t);
    if(!w) return;
    if(ST_LEMMA[w]){ out.push(ST_LEMMA[w]); return; }
    if(ST_KEEP.indexOf(w) >= 0){ out.push(w); return; }
    w = stLem(w);
    if(ST_LEMMA[w]) w = ST_LEMMA[w];
    if(w) out.push(w);
  });
  return out;
}

/* 낱말 배열 → 단어집합(중복 제거, 입력 순서 유지) */
function stSet(tokens){
  const seen = {}, out = [];
  (tokens || []).forEach(function(t){
    const w = String(t || '').trim();
    if(!w || seen[w]) return;
    seen[w] = 1; out.push(w);
  });
  return out;
}

/* ── 3. 집합 계산 엔진 (11차시 review 재사용) ────────────────────────────── */
function stInter(A,B){
  const s = {}; (B||[]).forEach(function(x){ s[x] = 1; });
  return (A||[]).filter(function(x){ return s[x] === 1; });
}
function stUnion(A,B){ return stSet((A||[]).concat(B||[])); }
function stOnly(A,B){
  const s = {}; (B||[]).forEach(function(x){ s[x] = 1; });
  return (A||[]).filter(function(x){ return s[x] !== 1; });
}
/* J(A,B) = n(A∩B) / (n(A)+n(B)−n(A∩B)) — 합집합이 공집합이면 0 (0/0 방어) */
function stJ(A,B){
  const a = stSet(A), b = stSet(B);
  const i = stInter(a,b).length;
  const u = a.length + b.length - i;
  if(u <= 0) return 0;
  return i / u;
}
/* 감성 점수 = J(P,A) − J(N,A) */
function stScore(A,P,N){ return stJ(P,A) - stJ(N,A); }
/* 판정 — 원값(반올림 전)으로 계산합니다. */
function stVerdict(score,k){
  const s = Number(score), t = Math.abs(Number(k));
  if(s >= t) return '긍정';
  if(s <= -t) return '부정';
  return '중립';
}

/* ── 4. 데이터 ───────────────────────────────────────────────────────────── */

/* STEP 1 추천 영상 — 삽입 재생이 가능한 2건만 videoDeck 에 넘깁니다.
   임베드가 막힌 2건과 검색 카드는 views/senti.html 에 링크 카드로 고정 배치했습니다. */
const ST_VIDEOS = [
  { id:'2YEGyVmyGxc', t:'10. 감성 분석 (8:09)', s:'mathT야나수 〈인공지능 수학〉 · 주 디딤영상' },
  { id:'N7qzjoVOAJg', t:'텍스트마이닝 – 감성분석 (감성어휘사전 긍정/부정)', s:'곽기영 · 사전 방식' }
];

/* STEP 1 마중 퀴즈 — 라벨은 warmStepper 가 "질문 N." 으로 붙입니다. */
const ST_WARM = [
  {
    q:'두 후기의 단어집합이 A = {사과, 배, 감}, B = {사과, 배, 귤, 포도}입니다. 두 집합의 교집합의 원소 개수 ÷ 합집합의 원소 개수는 얼마일까요?',
    opts:['2/3','2/5','2/7','4/7'],
    answer:1,
    explain:'겹치는 단어는 사과, 배 두 개이므로 분자는 2입니다. 합집합은 겹친 것을 한 번만 세어 {사과, 배, 감, 귤, 포도} 다섯 개이므로 분모는 5입니다. '
      + 'n(A)+n(B) = 3+4 = 7을 그대로 분모로 쓰면(2/7) 사과·배를 두 번 세는 잘못이 됩니다. '
      + '오늘 배울 자카드 유사도는 바로 이 <b>2/5 = 0.4</b> 라는 값입니다.'
  },
  {
    q:'두 텍스트의 자카드 유사도는 아무리 이상한 문장을 넣어도 0 이상 1 이하의 값만 나옵니다. 맞을까요, 틀릴까요?',
    opts:['맞다(O)','틀리다(X)'],
    answer:0,
    explain:'교집합은 합집합에 반드시 포함되므로 n(A∩B) ≤ n(A∪B)이고, 개수는 음수가 될 수 없으므로 분자는 0 이상입니다. '
      + '따라서 값은 언제나 0과 1 사이입니다. 두 집합이 완전히 같으면 1, 겹치는 단어가 하나도 없으면 0이 됩니다. '
      + '값의 범위가 정해져 있다는 점 때문에 서로 다른 문장끼리도 같은 자로 비교할 수 있습니다.'
  },
  {
    q:'어떤 AI가 긍정 단어 사전과 부정 단어 사전만 가지고 문장의 감정을 판단합니다. 다음 중 이 방법으로 가장 판단하기 어려운 문장은 무엇일까요?',
    opts:['오늘 정말 행복했어요.','이 영화는 최악이에요.','하나도 지루하지 않았어요.','음식이 맛있었어요.'],
    answer:2,
    explain:'‘하나도 지루하지 않았어요.’에는 부정 사전에 들어 있을 법한 ‘지루하다’가 있지만, 앞뒤의 ‘하나도 ~ 않다’가 뜻을 뒤집어 실제로는 칭찬입니다. '
      + '사전은 단어 하나하나만 보고 문장의 구조는 보지 못하므로 이런 문장을 부정으로 잘못 읽습니다. '
      + '오늘 우리는 이 한계를 알고도 왜 이 방법을 쓰는지, 그리고 그 위험을 어떻게 줄이는지를 함께 다룹니다.'
  }
];

/* STEP 3 형성평가 5문항 */
const ST_QUIZ = [
  {
    q:'두 기사 제목의 단어집합이 A = {전국, 장마, 시작, 일부, 지역, 폭우, 주의}, B = {장마, 폭우, 침수, 피해, 출근길, 주의}입니다. 자카드 유사도 J(A, B)의 값은?',
    opts:['3/7','3/10','3/13','7/10'],
    answer:1,
    explain:'교집합은 {장마, 폭우, 주의}로 3개입니다. 합집합의 원소 개수는 n(A) + n(B) − n(A∩B) = 7 + 6 − 3 = 10 이므로 J(A, B) = 3/10 = 0.3 입니다. '
      + '3/13처럼 7 + 6 = 13을 분모로 쓰면 겹치는 세 단어를 두 번 세는 잘못이 됩니다. '
      + '<span class="st-back">→ 되돌아가기: <button type="button" class="btn" onclick="stSee(0,\'st-act1\')">활동 1</button></span>'
  },
  {
    q:'감성 사전이 P = {청결하다, 편하다, 좋다, 친절, 빠르다, 맛있다, 많다, 알차다, 최고, 넓다}, N = {불결하다, 불편하다, 별로다, 불친절, 느리다, 맛없다, 적다, 빈약하다, 최악, 좁다}이고, 어떤 리뷰의 단어집합이 X = {청결하다, 넓다, 편하다, 많다, 맛있다, 불친절, 별로다}입니다. k = 0.25일 때 이 리뷰의 감성 분류는?',
    opts:['긍정','중립','부정','판단할 수 없다'],
    answer:0,
    explain:'J(P, X) = 5 ÷ (10 + 7 − 5) = 5/12 ≒ 0.42, J(N, X) = 2 ÷ (10 + 7 − 2) = 2/15 ≒ 0.13 이므로 감성 점수는 0.42 − 0.13 = 0.29 입니다. '
      + '0.29 ≥ 0.25 이므로 ‘긍정’으로 분류합니다. 부정 단어가 두 개 섞여 있어도 긍정 쪽 겹침이 훨씬 크다는 점이 값에 그대로 드러납니다. '
      + '<span class="st-back">→ 되돌아가기: <button type="button" class="btn" onclick="stSee(1,\'st-act2\')">활동 2</button></span>'
  },
  {
    q:'어떤 문장의 감성 점수가 J(P, A) − J(N, A) = −0.20 입니다. 임계값을 k = 0.25에서 k = 0.10으로 낮추면 이 문장의 판정은 어떻게 달라질까요?',
    opts:['중립에서 부정으로 바뀐다','부정에서 중립으로 바뀐다','바뀌지 않는다','긍정에서 중립으로 바뀐다'],
    answer:0,
    explain:'k = 0.25일 때 중립 구간은 −0.25 &lt; 점수 &lt; 0.25 이므로 −0.20은 중립입니다. k = 0.10으로 낮추면 부정 조건 ‘점수 ≤ −k’, 곧 −0.20 ≤ −0.10 이 참이 되어 부정으로 판정됩니다. '
      + '<b>k를 낮춘다는 것은 중립 구간을 좁혀 더 예민하게 판단한다는 뜻</b>입니다. '
      + '<span class="st-back">→ 되돌아가기: <button type="button" class="btn" onclick="stSee(2,\'st-act3\')">활동 3</button></span>'
  },
  {
    q:'부정 단어 집합 N = {…, 지치다, …}에서 실수로 ‘지치다’가 빠졌습니다. ‘지치다’가 들어 있던 문장의 J(N, A) 값은 어떻게 될까요?',
    opts:['커진다','작아진다','변하지 않는다','알 수 없다'],
    answer:1,
    explain:'예를 들어 n(N) = 10, n(A) = 8, n(N∩A) = 3이면 J(N, A) = 3/15 = 0.20 입니다. ‘지치다’가 빠지면 n(N) = 9, n(N∩A) = 2가 되어 J(N, A) = 2/(9+8−2) = 2/15 ≒ 0.13 으로 줄어듭니다. '
      + '<b>사전에 단어가 빠지면 그쪽 신호가 약해져 판정을 놓칠 수 있으므로</b>, 사전이 불완전할수록 k를 낮게 잡는 편이 안전합니다. '
      + '<span class="st-back">→ 되돌아가기: <button type="button" class="btn" onclick="stSee(3,\'st-act4\')">활동 4</button></span>'
  },
  {
    q:'자카드 유사도를 이용해 문장의 감성을 분석하는 절차를 바르게 나열한 것은? (㉠ 문장을 전처리하여 단어집합 A를 만든다 / ㉡ 긍정 단어 집합 P와 부정 단어 집합 N을 구성한다 / ㉢ J(P, A) − J(N, A)를 임계값 k와 비교하여 판정한다 / ㉣ J(P, A)와 J(N, A)를 각각 구한다)',
    opts:['㉠ → ㉡ → ㉣ → ㉢','㉡ → ㉠ → ㉣ → ㉢','㉡ → ㉣ → ㉠ → ㉢','㉠ → ㉣ → ㉡ → ㉢'],
    answer:1,
    explain:'감성 사전을 먼저 만들고, 분석할 문장을 단어집합으로 바꾼 뒤, 두 자카드 유사도를 구하고, 마지막에 그 차를 기준값과 비교합니다. '
      + '특히 <b>사전을 문장보다 먼저 만드는 것</b>이 중요합니다. 문장을 먼저 보면 그 문장에 맞추어 사전을 짜게 되어 분석이 아니라 짜맞추기가 되기 때문입니다. '
      + '<span class="st-back">→ 되돌아가기: <button type="button" class="btn" onclick="stSee(1,\'st-act2\')">활동 2</button></span>'
  }
];

/* 표제부 핵심 개념 칩 상세 — chipDefs 는 칩 글자에 포함된 키를 긴 것부터 찾습니다. */
const ST_DEFS = {
  '자카드 유사도':
    '<p><b>정의.</b> 두 텍스트 데이터를 각각 단어집합 A, B로 나타냈을 때, <b>두 집합의 교집합의 원소 개수를 합집합의 원소 개수로 나눈 값</b>을 '
    + '두 텍스트 데이터의 자카드 유사도라 하고 기호로 J(A, B)와 같이 나타냅니다. 곧</p>'
    + '<p class="st-fml">J(A, B) = n(A∩B) ÷ n(A∪B) = n(A∩B) ÷ { n(A) + n(B) − n(A∩B) }</p>'
    + '<p>입니다. 이 값은 언제나 0 이상 1 이하이며, 1에 가까울수록 두 텍스트가 유사하다고, 0에 가까울수록 유사하지 않다고 판단합니다.</p>'
    + '<p><b>예시 1.</b> A = {통계, 수학, 데이터}, B = {인공지능, 과학, 수학}이면 A∩B = {수학}, A∪B = {통계, 수학, 데이터, 인공지능, 과학}이므로 J(A, B) = 1/5 = 0.2 입니다.<br>'
    + '<b>예시 2.</b> 두 집합이 완전히 같으면(A = B) 교집합과 합집합이 같아지므로 J(A, A) = 1, 공통 원소가 하나도 없으면(A∩B = ∅) J(A, B) = 0 입니다.</p>'
    + '<p><b>이번 차시 연결.</b> STEP 2 <b>활동 1</b>에서 "나는 오늘 맛있는 사과를 먹었다"류의 후기 세 개를 직접 단어집합으로 바꾸어, 분모(합집합)와 분자(교집합)를 손으로 세어 보았습니다. '
    + '그때 A와 B의 값이 2/3로 가장 컸던 이유가 바로 이 정의에 있습니다.</p>'
    + '<div class="btn-row"><button class="btn" type="button" onclick="stSee(0,\'st-act1\')">활동 1로 이동</button></div>'
    + '<p><b>이전·다음 차시.</b> 6차시에서 만든 <b>단어집합</b>이 여기서 그대로 A, B가 됩니다 → '
    + '<a href="#text" onclick="go(\'text\');return false;">6차시 보기</a> / 9차시의 유클리드·코사인은 <b>벡터</b>로 재는 방법이었습니다 → '
    + '<a href="#sim" onclick="go(\'sim\');return false;">9차시 보기</a></p>'
    + '<p class="st-src">씨마스 「인공지능 수학」 Ⅱ. 텍스트 데이터 처리 p.70 서술을 재구성 / 동아출판 「인공지능 수학」 Ⅱ 단원 p.71 서술을 재구성</p>',

  '원소 개수':
    '<p><b>정의.</b> 유한집합 A에 대하여 A의 원소의 개수를 n(A)로 나타냅니다. 두 유한집합 A, B에 대해서는 '
    + '<b>n(A∪B) = n(A) + n(B) − n(A∩B)</b> 가 성립합니다. 두 집합을 그냥 더하면 겹치는 부분을 두 번 세게 되므로, 겹친 만큼을 한 번 빼 주는 것입니다.</p>'
    + '<p><b>예시.</b> n(A) = 7, n(B) = 6, n(A∩B) = 3이면 n(A∪B) = 7 + 6 − 3 = 10이므로 J(A, B) = 3/10 = 0.3 입니다. '
    + '합집합의 원소를 일일이 나열하지 않고도 분모를 얻을 수 있습니다.</p>'
    + '<p><b>이번 차시 연결.</b> <b>활동 1</b>의 벤다이어그램에서 왼쪽만·겹침·오른쪽만 세 영역의 개수를 각각 세어 보았습니다. '
    + '분모는 세 영역 전체, 분자는 가운데 영역이었지요. 화면의 수식 카드도 이 두 줄로 자동 갱신됩니다.</p>'
    + '<div class="btn-row"><button class="btn" type="button" onclick="stSee(0,\'st-act1\')">활동 1로 이동</button></div>'
    + '<p><b>이전·다음 차시.</b> 6차시 단어집합 만들기에서 합집합을 처음 다루었습니다 → '
    + '<a href="#text" onclick="go(\'text\');return false;">6차시 보기</a></p>'
    + '<p class="st-src">씨마스 「인공지능 수학」 Ⅱ p.70 ‘배웠어요 — 원소의 개수’ 및 ‘지식 Plus — 집합의 관계와 자카드 유사도’ 서술을 재구성</p>',

  '감성 사전':
    '<p><b>정의.</b> 단어를 긍정·중립·부정 등으로 미리 분류해 모아 둔 자료를 <b>감성 사전</b>이라 합니다. 감성 사전에 없는 단어는 보통 중립으로 처리합니다. '
    + '이 차시에서는 긍정 단어의 집합을 P, 부정 단어의 집합을 N으로 두고, 분석하려는 문장의 단어집합 A와 겹치는 정도를 봅니다.</p>'
    + '<p><b>예시 1.</b> 음식점 리뷰용 사전 — P = {청결하다, 편하다, 좋다, 친절, 빠르다, 맛있다, 많다, 알차다, 최고, 넓다}, '
    + 'N = {불결하다, 불편하다, 별로다, 불친절, 느리다, 맛없다, 적다, 빈약하다, 최악, 좁다}.<br>'
    + '<b>예시 2.</b> 실제로 쓰이는 대규모 사전으로는 국립국어원 『표준국어대사전』의 뜻풀이를 분석해 만든 <b>KNU 한국어 감성 사전</b>이 있습니다'
    + '(단어를 매우 부정·부정·중립·긍정·매우 긍정으로 나누고 −2, −1, 0, 1, 2점을 부여).</p>'
    + '<p><b>이번 차시 연결.</b> <b>활동 2</b>에서 P·N 칩을 직접 넣고 빼며 사전을 만들었고, <b>활동 4</b>에서는 사전에서 단어 하나를 지우자 같은 문장의 판정이 뒤집히는 것을 보았습니다. '
    + '사전은 ‘주어진 것’이 아니라 <b>사람이 설계하는 것</b>임이 이 차시의 핵심 메시지입니다.</p>'
    + '<div class="btn-row"><button class="btn" type="button" onclick="stSee(1,\'st-act2\')">활동 2로 이동</button></div>'
    + '<p><b>이전·다음 차시.</b> 8차시 TF-IDF가 "어떤 단어가 중요한가"를 다뤘다면 사전은 "어떤 단어가 어떤 감정인가"를 다룹니다 → '
    + '<a href="#tfidf" onclick="go(\'tfidf\');return false;">8차시 보기</a> / 여기서 만든 사전은 11차시 리뷰 대시보드에 그대로 실립니다 → '
    + '<a href="#review" onclick="go(\'review\');return false;">11차시 보기</a></p>'
    + '<p class="st-src">씨마스 「인공지능 수학」 Ⅱ p.68 및 지도서 Ⅱ ‘KNU 한국어 감성 사전’ 안내 서술을 재구성 / 동아출판 「인공지능 수학」 Ⅱ p.64 감성 사전 표를 재구성</p>',

  '감성 점수':
    '<p><b>정의.</b> 문장의 단어집합을 A라 할 때, 긍정 사전과의 자카드 유사도 J(P, A)와 부정 사전과의 자카드 유사도 J(N, A)를 각각 구한 뒤, '
    + '<b>그 차</b> J(P, A) − J(N, A)를 그 문장의 감성 점수로 삼습니다. 두 값 모두 0 이상 1 이하이므로 차는 −1 이상 1 이하이며, '
    + '양수면 긍정 쪽, 음수면 부정 쪽으로 기울었다는 뜻입니다.</p>'
    + '<p><b>예시.</b> 리뷰 X의 단어집합이 X = {청결하다, 넓다, 편하다, 많다, 맛있다, 불친절, 별로다}일 때</p>'
    + '<p class="st-fml">J(P, X) = 5 ÷ (10 + 7 − 5) = 5/12 ≒ 0.42<br>J(N, X) = 2 ÷ (10 + 7 − 2) = 2/15 ≒ 0.13</p>'
    + '<p>이므로 감성 점수는 0.42 − 0.13 = 0.29 입니다.</p>'
    + '<p><b>이번 차시 연결.</b> <b>활동 2</b>의 수평 게이지가 바로 이 값을 가리키는 바늘입니다. 파란 원(P)과 빨간 원(N) 중 어느 쪽 겹침이 더 큰지가 바늘의 방향을 결정했습니다.</p>'
    + '<div class="btn-row"><button class="btn" type="button" onclick="stSee(1,\'st-act2\')">활동 2로 이동</button></div>'
    + '<p><b>이전·다음 차시.</b> 9차시 코사인 유사도도 0~1 값이었지만 ‘차’가 아니라 ‘순위’로 썼습니다 → '
    + '<a href="#sim" onclick="go(\'sim\');return false;">9차시 보기</a></p>'
    + '<p class="st-src">씨마스 「인공지능 수학」 Ⅱ p.71 서술과 계산 예를 재구성 / 연수교재 합본 p.94·96~97(07. 유사도 측정, 최화식) 서술을 재구성</p>',

  '임계값':
    '<p><b>정의.</b> 감성 점수를 긍정·중립·부정 세 가지로 나눌 때 쓰는 양수 기준값을 <b>임계값 k</b>라 합니다. 판정은 다음 세 부등식으로 정해집니다.</p>'
    + '<div class="st-scroll"><table class="st-tbl"><tr><th>판정</th><th>부등식</th></tr>'
    + '<tr><td>긍정</td><td>J(P, A) − J(N, A) ≥ k</td></tr>'
    + '<tr><td>중립</td><td>−k &lt; J(P, A) − J(N, A) &lt; k</td></tr>'
    + '<tr><td>부정</td><td>J(P, A) − J(N, A) ≤ −k</td></tr></table></div>'
    + '<p><b>예시 1.</b> 교과서에서는 일반적으로 k = 0.25를 적용합니다. 리뷰 X의 감성 점수 0.29는 0.25 이상이므로 ‘긍정’ 리뷰로 분류됩니다.<br>'
    + '<b>예시 2.</b> 같은 문장이라도 k를 0.1로 낮추면 중립 구간(−0.1, 0.1)이 좁아지므로, 애매하던 문장들이 긍정 또는 부정으로 밀려 나갑니다. '
    + '곧 <b>k는 ‘얼마나 예민하게 볼 것인가’를 정하는 손잡이</b>입니다.</p>'
    + '<p><b>이번 차시 연결.</b> <b>활동 3</b>에서 k 슬라이더를 움직이자 게이지의 회색 중립 띠가 좁아지고 넓어지며 판정 배지가 실시간으로 뒤집혔습니다. '
    + '<b>활동 4</b>에서는 상담 챗봇 상황에서 k = 0.25로는 위험 신호를 ‘중립’으로 흘려보낸다는 사실을 확인했습니다.</p>'
    + '<div class="btn-row"><button class="btn" type="button" onclick="stSee(2,\'st-act3\')">활동 3으로 이동</button></div>'
    + '<p><b>이전·다음 차시.</b> 5차시 데이터 편향에서 ‘정확도 95%의 함정’을 다룰 때에도 기준을 어디에 두느냐가 결론을 바꿨습니다 → '
    + '<a href="#bias" onclick="go(\'bias\');return false;">5차시 보기</a> / 11차시에서는 이 기준으로 리뷰 100건을 한꺼번에 분류합니다 → '
    + '<a href="#review" onclick="go(\'review\');return false;">11차시 보기</a></p>'
    + '<p class="st-src">씨마스 「인공지능 수학」 Ⅱ p.71 판정 기준 표를 재구성 / 동아출판 「인공지능 수학」 Ⅱ p.73 서술을 재구성</p>'
};

/* 감성 사전 프리셋 3종 */
const ST_PRESETS = {
  counsel:{
    name:'상담 챗봇',
    p:['괜찮다','잘하다','재미있다','편하다','만족','웃다','자신감','기대','좋다','행복'],
    n:['힘들다','지치다','불안','스트레스','걱정','짜증','외롭다','포기','피곤','싫다'],
    src:'연수교재 합본 p.96 서술을 재구성'
  },
  food:{
    name:'음식점 리뷰',
    p:['청결하다','편하다','좋다','친절','빠르다','맛있다','많다','알차다','최고','넓다'],
    n:['불결하다','불편하다','별로다','불친절','느리다','맛없다','적다','빈약하다','최악','좁다'],
    src:'씨마스 「인공지능 수학」 Ⅱ p.70 서술을 재구성'
  },
  movie:{
    name:'영화 리뷰',
    p:['탄탄하다','완벽하다','좋다','재미있다','감동','최고','훌륭하다','신선하다','몰입','추천'],
    n:['빈약하다','최악','별로다','지루하다','어색하다','실망','뻔하다','아쉽다','산만하다','비추천'],
    src:'교사 제작 활동지 「활동 3(자카드)」 연습 문제 지문을 바탕으로 구성'
  }
};

/* 예시 문장 — 교과서·활동지가 제시한 단어집합을 그대로 씁니다(손계산 값과 어긋나지 않도록). */
const ST_SENTS = [
  { k:'food-x', g:'food', t:'음식점 리뷰 X',
    s:'이 음식점은 매장이 청결하고 넓어서 편하게 식사할 수 있어요. 게다가 음식량도 많고 맛있어요. 하지만 서비스가 불친절한 점은 별로였어요.',
    set:['청결하다','넓다','편하다','많다','맛있다','불친절','별로다'],
    src:'씨마스 「인공지능 수학」 Ⅱ p.70~71의 리뷰 X를 재구성 — 교과서는 감성을 나타내는 단어만 뽑아 단어집합으로 삼았습니다.' },
  { k:'counsel-a', g:'counsel', t:'상담 문장 A',
    s:'요즘 공부가 조금 힘들고 피곤하지만, 그래도 잘 해내고 싶다.',
    set:['요즘','공부','조금','힘들다','피곤','그래도','잘하다','해내다','싶다'],
    src:'연수교재 합본 p.96~97 「AI 상담 챗봇의 감정 판단기 만들기」 예시 문장을 재구성' },
  { k:'counsel-b', g:'counsel', t:'상담 문장 B',
    s:'아무것도 하기 싫고 너무 지쳐서 그냥 포기하고 싶다.',
    set:['아무것','하다','싫다','너무','지치다','그냥','포기','싶다'],
    src:'연수교재 합본 p.96~97 「AI 상담 챗봇의 감정 판단기 만들기」 예시 문장을 재구성' },
  { k:'movie-a', g:'movie', t:'영화 후기 A',
    s:'이번에 새로 개봉한 영화는 스토리도 탄탄하고 배우들의 연기력도 정말 완벽했다.',
    set:['이번','새로','개봉하다','영화','스토리','탄탄하다','배우들','연기력','정말','완벽하다'],
    src:'교사 제작 활동지 「활동 3(유사도분석)3」 연습 문제 지문' },
  { k:'movie-b', g:'movie', t:'영화 후기 B',
    s:'이번에 새로 개봉한 영화는 스토리도 빈약하고, 배우들의 연기력도 정말 최악이었다.',
    set:['이번','새로','개봉하다','영화','스토리','빈약하다','배우들','연기력','정말','최악'],
    src:'교사 제작 활동지 「활동 3(유사도분석)3」 연습 문제 지문' },
  { k:'movie-c', g:'movie', t:'영화 후기 C',
    s:'이번에 새로 개봉한 영화는 스토리는 좋지만, 배우들의 연기력은 별로였다.',
    set:['이번','새로','개봉하다','영화','스토리','좋다','배우들','연기력','별로다'],
    src:'교사 제작 활동지 「활동 3(유사도분석)3」 연습 문제 지문' }
];

/* 활동 1 — 과일 가게 후기 세 개 (교사 제작 활동지 「활동 3(자카드 유사도)」) */
const ST_A1_DOCS = [
  { k:'A', s:'나는 오늘 맛있는 사과를 먹었다.' },
  { k:'B', s:'나는 오늘 상큼한 사과를 먹었다.' },
  { k:'C', s:'나는 내일 새콤한 사과를 먹는다.' }
];
const ST_A1_PAIRS = [['A','B'],['A','C'],['B','C']];

/* 활동 1 ⓓ 미니 확인 문제 — 일기 예보 기사 제목 */
const ST_A1_NEWS = {
  A:['전국','장마','시작','일부','지역','폭우','주의'],
  B:['장마','폭우','침수','피해','출근길','주의'],
  C:['폭우','예보','일부','지역','장마','지속']
};

/* 활동 3 [문장 3개 동시 보기] — 서로 다른 사전으로 구한 값이므로 고정값을 씁니다. */
const ST_A3_FIX = [
  { t:'문장 X', v:0.29,  d:'음식점 리뷰 사전' },
  { t:'문장 A', v:-0.06, d:'상담 챗봇 사전' },
  { t:'문장 B', v:-0.20, d:'상담 챗봇 사전' }
];

/* ── 5. 상태 ─────────────────────────────────────────────────────────────── */
let stDict = { p:[], n:[] };
let stUndoStack = [];
let stKv = 0.25;

let stA1Eye = '';
let stA1Sets = { A:[], B:[], C:[] };
let stA1Built = false;
let stA1Pair = 'AB';
let stA1Done = {};

let stA2Set = [];
let stA2Src = '';
let stA2Title = '';
let stA2Done = false;

let stA3Guess = '';
let stA3Rows = [];
let stA3Triple = false;
let stA3Sel = 2;          /* 기본은 문장 B */
let stA3Prev = {};

let stA4Scn = 'counsel';
let stA4Off = {};
let stA4Flips = 0;
let stA4Prev = '';
let stA4Cleared = false;

const stLocks = {};

/* ── 6. 잠금·이동 ────────────────────────────────────────────────────────── */
/* 단계 토글은 학생이 조작한 뒤에만 열립니다. */
function stUnlock(key){
  if(stLocks[key]) return;
  stLocks[key] = true;
  const root = stEl('v-senti');
  if(!root) return;
  root.querySelectorAll('[data-lock="' + key + '"]').forEach(function(d){
    d.classList.remove('st-locked');
    const s = d.querySelector('.st-lockmsg');
    if(s) s.remove();
  });
}
function stLockGuard(){
  const root = stEl('v-senti');
  if(!root) return;
  root.querySelectorAll('details.st-fold[data-lock]').forEach(function(d){
    const key = d.getAttribute('data-lock');
    if(stLocks[key]) return;
    d.classList.add('st-locked');
    if(!d.querySelector('.st-lockmsg')){
      const p = document.createElement('p');
      p.className = 'st-lockmsg';
      p.textContent = '🔒 ' + (d.getAttribute('data-lockmsg') || '위 조작을 마치면 열립니다.');
      d.appendChild(p);
    }
    d.addEventListener('toggle', function(){
      if(!stLocks[key] && d.open) d.open = false;
    });
  });
}

/* 탭 전환 (스코프 고정) */
function stTab(n, el){
  const root = stEl('v-senti');
  if(!root) return;
  root.querySelectorAll('.tabs .tab').forEach(function(t){ t.classList.remove('on'); });
  if(el) el.classList.add('on');
  root.querySelectorAll('.tpanel').forEach(function(p){ p.classList.remove('on'); });
  const pn = stEl('st' + n);
  if(pn) pn.classList.add('on');
  stResizeAll();
}

/* 칩 정의·학습 목표·형성평가에서 해당 활동으로 이동합니다. */
function stSee(tab, id){
  const root = stEl('v-senti');
  if(!root) return;
  const tabs = root.querySelectorAll('.tabs .tab');
  if(typeof tab === 'number' && tabs[tab]) tabs[tab].click();
  const target = (id && stEl(id)) || tabs[tab] || null;
  if(target && target.scrollIntoView){
    try{ target.scrollIntoView({ behavior: stReduce() ? 'auto' : 'smooth', block:'center' }); }
    catch(e){ try{ target.scrollIntoView(); }catch(e2){} }
  }
}

/* ── 7. 캔버스 — 벤다이어그램 ────────────────────────────────────────────── */
function stFit(cv){
  if(!cv) return null;
  const w = Math.max(220, cv.clientWidth || cv.parentElement && cv.parentElement.clientWidth || 320);
  const stack = w < 460;
  const h = stack ? Math.round(w * 1.05) : Math.round(w * 0.62);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width  = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  if(!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx:ctx, w:w, h:h, stack:stack };
}
function stCol(name, fb){
  try{
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }catch(e){ return fb; }
}
function stAlpha(hex, a){
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{6})$/i);
  if(!m) return hex;
  const n = parseInt(m[1], 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

/* A·B 두 집합의 벤다이어그램을 그립니다. opt.flash = 'L'|'I'|'R' 이면 그 영역을 강조합니다. */
function stDrawVenn(cvId, A, B, labA, labB, opt){
  const cv = stEl(cvId);
  const f = stFit(cv);
  if(!f) return;
  const ctx = f.ctx, W = f.w, H = f.h;
  const o = opt || {};
  const colA = o.colA || stCol('--blue', '#4a6b8a');
  const colB = o.colB || stCol('--red', '#b44133');
  const acc  = stCol('--accent', '#c8b9a6');
  const fg   = stCol('--fg', '#1a1714');
  const mut  = stCol('--muted', '#78726a');
  const bg   = stCol('--bg', '#f5f0ea');

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const a = stSet(A), b = stSet(B);
  const I = stInter(a, b), L = stOnly(a, b), R = stOnly(b, a);

  let cx1, cy1, cx2, cy2, r;
  if(f.stack){
    /* 375px 등 좁은 화면 — 두 원을 세로로 쌓습니다. */
    r = Math.max(52, Math.min(W * 0.40, (H - 46) / 3.05));
    cx1 = W / 2; cy1 = 23 + r;
    cx2 = W / 2; cy2 = cy1 + r * 1.05;
  }else{
    r = Math.min(W * 0.27, (H - 40) * 0.46);
    cx1 = W * 0.36; cy1 = H * 0.54;
    cx2 = W * 0.64; cy2 = H * 0.54;
  }

  /* 원 채움 */
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = stAlpha(colA, 0.20);
  ctx.beginPath(); ctx.arc(cx1, cy1, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = stAlpha(colB, 0.20);
  ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.fill();

  /* 교집합 강조 */
  ctx.save();
  ctx.beginPath(); ctx.arc(cx1, cy1, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = stAlpha(acc, 0.85);
  ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  /* 강조(점멸) 영역 */
  if(o.flash){
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = fg;
    if(o.flash === 'L'){
      ctx.beginPath(); ctx.arc(cx1, cy1, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillRect(0, 0, W, H);
    }else if(o.flash === 'R'){
      ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillRect(0, 0, W, H);
    }else if(o.flash === 'I'){
      ctx.beginPath(); ctx.arc(cx1, cy1, r, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillRect(0, 0, W, H);
    }else if(o.flash === 'U'){
      ctx.beginPath();
      ctx.arc(cx1, cy1, r, 0, Math.PI * 2);
      ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /* 테두리 */
  ctx.lineWidth = 2;
  ctx.strokeStyle = colA;
  ctx.beginPath(); ctx.arc(cx1, cy1, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = colB;
  ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.stroke();

  /* 라벨 */
  ctx.textAlign = 'center';
  ctx.font = '700 13px ' + (stCol('--mono', 'monospace') || 'monospace');
  ctx.fillStyle = colA;
  ctx.fillText(labA + '  n=' + a.length, f.stack ? cx1 : cx1 - r * 0.45, f.stack ? 15 : cy1 - r - 12);
  ctx.fillStyle = colB;
  ctx.fillText(labB + '  n=' + b.length, f.stack ? cx2 : cx2 + r * 0.45, f.stack ? H - 6 : cy2 - r - 12);

  /* 영역별 낱말 배치 */
  function words(list, x, y, maxw){
    ctx.font = '12px ' + (stCol('--sans', 'sans-serif') || 'sans-serif');
    const show = list.slice(0, 5);
    const lh = 15;
    let yy = y - (show.length - 1) * lh / 2;
    show.forEach(function(w){
      ctx.fillStyle = fg;
      let t = w;
      while(ctx.measureText(t).width > maxw && t.length > 2) t = t.slice(0, t.length - 1);
      if(t !== w) t = t + '…';
      ctx.fillText(t, x, yy);
      yy += lh;
    });
    if(list.length > show.length){
      ctx.fillStyle = mut;
      ctx.fillText('외 ' + (list.length - show.length) + '개', x, yy);
    }
  }
  /* 영역 개수 */
  function cnt(label, x, y){
    ctx.font = '700 12px ' + (stCol('--mono', 'monospace') || 'monospace');
    ctx.fillStyle = mut;
    ctx.fillText(label, x, y);
  }
  const my = (cy1 + cy2) / 2;
  if(f.stack){
    cnt('왼쪽만 ' + L.length, cx1, cy1 - r * 0.80);
    words(L, cx1, cy1 - r * 0.38, r * 1.4);
    cnt('겹침 ' + I.length, cx1, my - r * 0.24);
    words(I, cx1, my + r * 0.06, r * 1.1);
    cnt('오른쪽만 ' + R.length, cx2, cy2 + r * 0.82);
    words(R, cx2, cy2 + r * 0.40, r * 1.4);
  }else{
    cnt('왼쪽만 ' + L.length, cx1 - r * 0.52, cy1 - r * 0.62);
    words(L, cx1 - r * 0.52, cy1, r * 0.92);
    cnt('겹침 ' + I.length, (cx1 + cx2) / 2, cy1 - r * 0.62);
    words(I, (cx1 + cx2) / 2, cy1, r * 0.60);
    cnt('오른쪽만 ' + R.length, cx2 + r * 0.52, cy2 - r * 0.62);
    words(R, cx2 + r * 0.52, cy2, r * 0.92);
  }
}

/* 분수 카드의 수를 누르면 해당 영역이 점멸합니다. */
function stFlash(cvId, region, A, B, labA, labB, colA, colB){
  const reduce = stReduce();
  const draw = function(fl){ stDrawVenn(cvId, A, B, labA, labB, { flash:fl, colA:colA, colB:colB }); };
  if(reduce){ draw(region); return; }
  let on = true, n = 0;
  draw(region);
  const t = setInterval(function(){
    on = !on; n++;
    draw(on ? region : '');
    if(n >= 5){ clearInterval(t); draw(''); }
  }, 220);
}

/* ── 8. 감성 게이지 (DOM) ────────────────────────────────────────────────── */
/* needles = [{v:점수, t:이름, hi:true}] */
function stGauge(boxId, needles, k, opt){
  const box = stEl(boxId);
  if(!box) return;
  const o = opt || {};
  const kk = Math.abs(Number(k) || 0);
  const pos = function(v){
    const c = Math.max(-0.5, Math.min(0.5, Number(v) || 0));
    return ((c + 0.5) / 1) * 100;
  };
  let html = '<div class="st-g-track">'
    + '<span class="st-g-neu" style="left:' + pos(-kk) + '%;width:' + (pos(kk) - pos(-kk)) + '%;"></span>'
    + '<span class="st-g-tick" style="left:' + pos(-kk) + '%;"><i>−k</i></span>'
    + '<span class="st-g-tick" style="left:' + pos(kk) + '%;"><i>+k</i></span>'
    + '<span class="st-g-zero" style="left:50%;"></span>';
  (needles || []).forEach(function(nd, i){
    const v = Number(nd.v) || 0;
    const vd = stVerdict(v, kk);
    html += '<span class="st-g-nd ' + (vd === '긍정' ? 'pos' : vd === '부정' ? 'neg' : 'neu')
      + (nd.blink ? ' blink' : '') + '" style="left:' + pos(v) + '%;" data-i="' + i + '">'
      + '<b>' + stEsc(nd.t || '') + '</b><i>' + stNum(v) + '</i></span>';
  });
  html += '</div><div class="st-g-scale"><span>−0.5</span><span>0</span><span>+0.5</span></div>';
  if(!o.noBadge && needles && needles.length === 1){
    const vd = stVerdict(needles[0].v, kk);
    html += '<p class="st-g-badge ' + (vd === '긍정' ? 'pos' : vd === '부정' ? 'neg' : 'neu') + '">' + vd + '</p>';
  }
  box.innerHTML = html;
}

/* 경계 안내 배지 — 반올림 값과 원값이 판정 경계에 걸릴 때만 띄웁니다. */
function stEdgeNote(id, raw, disp, k){
  const el = stEl(id);
  if(!el) return;
  const kk = Math.abs(Number(k) || 0);
  const near = Math.abs(Math.abs(raw) - kk) < 0.005;
  const diff = stVerdict(raw, kk) !== stVerdict(disp, kk);
  if(near || diff){
    el.innerHTML = '⚠ 반올림한 값(' + stNum(disp) + ')과 실제 값(' + (raw < 0 ? '−' : '') + Math.abs(raw).toFixed(4)
      + ')이 판정 경계에 걸립니다. 화면의 판정은 <b>반올림하지 않은 값</b>으로 정했습니다.';
    el.classList.add('on');
  }else{
    el.textContent = '';
    el.classList.remove('on');
  }
}

/* ── 9. 활동 1 — 자카드 유사도로 재기 ────────────────────────────────────── */
function stA1Guess(pair, el){
  stA1Eye = pair;
  const root = stEl('v-senti');
  if(root) root.querySelectorAll('#st-a1-eye .chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  const p = stEl('st-a1-panel');
  if(p) p.classList.remove('st-veil');
  const m = stEl('st-a1-eyemsg');
  if(m) m.textContent = '눈으로 고른 답: ' + pair.replace('AB','A와 B').replace('AC','A와 C').replace('BC','B와 C')
    + '. 이제 이 판단을 수 하나로 바꾸어 확인해 봅시다.';
}

/* [단어집합 만들기] — 원문 → 어절 분리 → 조사·어미 정리 → 단어집합 (4단계) */
function stA1Build(){
  const box = stEl('st-a1-pipe');
  if(!box) return;
  stA1Built = true;
  const reduce = stReduce();
  box.innerHTML = '';
  ST_A1_DOCS.forEach(function(d, di){
    const raw = String(d.s).replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);
    const norm = raw.map(function(w){ return stTok(w)[0] || w; });
    stA1Sets[d.k] = stSet(norm);
    const row = document.createElement('div');
    row.className = 'st-pipe-row';
    row.innerHTML =
      '<span class="lb">후기 ' + d.k + '</span>' +
      '<div class="st-pipe-st s1"><span class="hd">① 원문</span><p>' + stEsc(d.s) + '</p></div>' +
      '<div class="st-pipe-st s2"><span class="hd">② 어절 분리</span><p>' +
        raw.map(function(w){ return '<span class="st-w0">' + stEsc(w) + '</span>'; }).join('') + '</p></div>' +
      '<div class="st-pipe-st s3"><span class="hd">③ 조사·어미 정리</span><p>' +
        raw.map(function(w, i){
          return '<span class="st-w0"><s>' + stEsc(w) + '</s> → <b>' + stEsc(norm[i]) + '</b></span>';
        }).join('') + '</p></div>' +
      '<div class="st-pipe-st s4"><span class="hd">④ 단어집합 (칸을 눌러 고칠 수 있습니다)</span>' +
        '<p class="st-setline" data-k="' + d.k + '">{ ' +
        stA1Sets[d.k].map(function(w, i){
          return '<span class="st-w" role="textbox" tabindex="0" contenteditable="true" data-k="' + d.k + '" data-i="' + i + '">'
            + stEsc(w) + '</span>' + (i < stA1Sets[d.k].length - 1 ? '<span class="cm">, </span>' : '');
        }).join('') + ' }  <b class="st-nn">n(' + d.k + ') = ' + stA1Sets[d.k].length + '</b></p></div>';
    box.appendChild(row);
    const stages = row.querySelectorAll('.st-pipe-st');
    stages.forEach(function(s, si){
      if(reduce){ s.classList.add('on'); return; }
      setTimeout(function(){ s.classList.add('on'); }, (di * 260) + (si * 240));
    });
  });

  box.querySelectorAll('.st-w').forEach(function(sp){
    const commit = function(){
      const k = sp.getAttribute('data-k');
      const i = parseInt(sp.getAttribute('data-i'), 10);
      const v = (sp.textContent || '').replace(/[{},]/g, '').trim();
      if(!v){ sp.textContent = stA1Sets[k][i]; return; }
      stA1Sets[k][i] = v;
      stA1Sets[k] = stSet(stA1Sets[k]);
      stA1Draw();
    };
    sp.addEventListener('blur', commit);
    sp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); sp.blur(); } });
  });

  const st = stEl('st-a1-st');
  if(st) st.textContent = '세 후기가 모두 단어집합이 되었습니다. 아래에서 쌍을 골라 벤다이어그램을 확인하세요.';
  stA1Draw();
}

function stA1Pick(pair, el){
  stA1Pair = pair;
  const root = stEl('v-senti');
  if(root) root.querySelectorAll('#st-a1-pair .chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  ['st-a1-i','st-a1-u','st-a1-num','st-a1-den'].forEach(function(id){
    const e = stEl(id); if(e) e.value = '';
  });
  const fb = stEl('st-a1-fb');
  if(fb){ fb.textContent = ''; fb.className = 'st-fb'; }
  stA1Draw();
}

function stA1Draw(){
  if(!stA1Built) return;
  const x = stA1Pair[0], y = stA1Pair[1];
  stDrawVenn('st-venn1', stA1Sets[x], stA1Sets[y], '후기 ' + x, '후기 ' + y, {});
  const a = stA1Sets[x], b = stA1Sets[y];
  const i = stInter(a, b).length, u = a.length + b.length - i;
  const info = stEl('st-a1-info');
  if(info){
    info.innerHTML = '<b>후기 ' + x + '</b> = { ' + a.map(stEsc).join(', ') + ' } · n = ' + a.length + '<br>'
      + '<b>후기 ' + y + '</b> = { ' + b.map(stEsc).join(', ') + ' } · n = ' + b.length
      + '<br><span class="st-hint">겹침 ' + i + '개 · 합집합 ' + u + '개 — 직접 세어 아래 칸에 적어 보세요.</span>';
  }
}

function stA1Check(){
  const x = stA1Pair[0], y = stA1Pair[1];
  const a = stA1Sets[x], b = stA1Sets[y];
  const ti = stInter(a, b).length;
  const tu = a.length + b.length - ti;
  const gi = parseInt((stEl('st-a1-i') || {}).value, 10);
  const gu = parseInt((stEl('st-a1-u') || {}).value, 10);
  const gn = parseInt((stEl('st-a1-num') || {}).value, 10);
  const gd = parseInt((stEl('st-a1-den') || {}).value, 10);
  const fb = stEl('st-a1-fb');
  if(!fb) return;
  if([gi, gu, gn, gd].some(function(v){ return isNaN(v); })){
    fb.className = 'st-fb no';
    fb.innerHTML = '네 칸을 모두 채운 뒤 [확인]을 눌러 주세요.';
    return;
  }
  const ok = (gi === ti && gu === tu && gn === ti && gd === tu);
  if(ok){
    fb.className = 'st-fb ok';
    fb.innerHTML = '✓ 맞습니다. J(' + x + ', ' + y + ') = ' + ti + '/' + tu + ' ≒ ' + stNum(ti / tu) + ' 입니다.';
    stA1Done[stA1Pair] = true;
    stUnlock('a1-sum');
    stUnlock('a1-def');
    if(Object.keys(stA1Done).length >= 3) stUnlock('a1-obs');
    stA1All();
  }else{
    let hint = '';
    if(gu === a.length + b.length || gd === a.length + b.length){
      hint = '합집합을 셀 때 겹치는 단어를 두 번 세지 않았나요? n(' + x + ') + n(' + y + ') = ' + (a.length + b.length)
        + ' 에서 겹친 ' + ti + '개를 한 번 빼야 합니다.';
    }else if(gn === tu && gd === ti){
      hint = '분자와 분모가 바뀌었습니다. <b>분자는 교집합</b>, <b>분모는 합집합</b>입니다.';
    }else if(gi !== ti){
      hint = '교집합은 두 후기에 <b>모두</b> 들어 있는 단어만 셉니다. 벤다이어그램 가운데 영역을 다시 세어 보세요.';
    }else{
      hint = '합집합은 두 후기의 단어를 모두 모으되 <b>겹치는 단어는 한 번만</b> 셉니다.';
    }
    fb.className = 'st-fb no';
    fb.innerHTML = '✗ 다시 확인해 봅시다. ' + hint;
  }
}

function stA1All(){
  const box = stEl('st-a1-bars');
  if(!box) return;
  const vals = ST_A1_PAIRS.map(function(p){
    const a = stA1Sets[p[0]], b = stA1Sets[p[1]];
    const i = stInter(a, b).length, u = a.length + b.length - i;
    return { t:p[0] + '와 ' + p[1], i:i, u:u, v:(u ? i / u : 0) };
  });
  let mx = 0;
  vals.forEach(function(v){ if(v.v > mx) mx = v.v; });
  box.innerHTML = vals.map(function(v){
    const w = mx > 0 ? Math.round(v.v / mx * 100) : 0;
    return '<div class="st-bar"><span class="nm">' + stEsc(v.t) + (v.v >= mx && mx > 0 ? ' 👑' : '') + '</span>'
      + '<span class="tk"><i style="width:' + w + '%"></i></span>'
      + '<span class="vl">' + v.i + '/' + v.u + ' ≒ ' + stNum(v.v) + '</span></div>';
  }).join('');
  box.classList.add('on');
}

/* ⓓ 미니 확인 문제 — 즉시 채점 */
function stA1News(pick, el){
  const fb = stEl('st-a1-newsfb');
  const root = stEl('v-senti');
  if(root) root.querySelectorAll('#st-a1-news .chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  if(!fb) return;
  const jab = stJ(ST_A1_NEWS.A, ST_A1_NEWS.B);
  const jac = stJ(ST_A1_NEWS.A, ST_A1_NEWS.C);
  const jbc = stJ(ST_A1_NEWS.B, ST_A1_NEWS.C);
  const ok = (pick === 'AC');
  fb.className = 'st-fb ' + (ok ? 'ok' : 'no');
  fb.innerHTML = (ok ? '✓ 맞습니다. ' : '✗ 다시 생각해 봅시다. ') + '정답은 <b>A와 C</b>입니다.<br>'
    + 'J(A, B) = 3/10 = ' + stNum(jab) + ', J(A, C) = 4/9 ≒ ' + stNum(jac) + ', J(B, C) = 2/10 = ' + stNum(jbc)
    + ' 이므로 A와 C가 가장 유사합니다.'
    + '<span class="st-src">연수교재 합본 p.94(07. 유사도 측정) 예제를 재구성</span>';
}

/* ── 10. 활동 2 — 감성 사전을 짓다 ───────────────────────────────────────── */
function stDictLoad(){
  try{
    const raw = stLS(ST_K_DICT, '');
    if(raw){
      const o = JSON.parse(raw);
      if(o && Array.isArray(o.p) && Array.isArray(o.n)){ stDict = { p:stSet(o.p), n:stSet(o.n) }; return; }
    }
  }catch(e){}
  stDict = { p:ST_PRESETS.counsel.p.slice(), n:ST_PRESETS.counsel.n.slice() };
}
function stDictSave(){
  stLSSet(ST_K_DICT, JSON.stringify({ p:stDict.p, n:stDict.n }));
}

function stDictRender(){
  ['p','n'].forEach(function(side){
    const box = stEl('st-dict-' + side);
    if(!box) return;
    box.innerHTML = stDict[side].map(function(w, i){
      return '<span class="st-dchip ' + side + '" draggable="true" data-side="' + side + '" data-i="' + i + '" tabindex="0">'
        + '<span class="tx">' + stEsc(w) + '</span>'
        + '<button type="button" class="mv" title="반대쪽 집합으로 옮기기" aria-label="' + stEsc(w) + ' 반대쪽으로 옮기기">⇄</button>'
        + '<button type="button" class="rm" title="삭제(두 번 누르기)" aria-label="' + stEsc(w) + ' 삭제">✕</button>'
        + '</span>';
    }).join('');
    box.querySelectorAll('.st-dchip').forEach(function(ch){
      const side2 = ch.getAttribute('data-side');
      const idx = parseInt(ch.getAttribute('data-i'), 10);
      ch.querySelector('.mv').addEventListener('click', function(e){ e.stopPropagation(); stDictMove(side2, idx); });
      ch.querySelector('.rm').addEventListener('click', function(e){
        e.stopPropagation();
        if(!ch.classList.contains('armed')){
          ch.classList.add('armed');
          setTimeout(function(){ ch.classList.remove('armed'); }, 2600);
          stDictMsg('한 번 더 누르면 삭제됩니다.');
          return;
        }
        stDictDel(side2, idx);
      });
      ch.addEventListener('dragstart', function(e){
        try{ e.dataTransfer.setData('text/plain', side2 + ':' + idx); }catch(err){}
      });
      ch.addEventListener('keydown', function(e){
        if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); stDictDel(side2, idx); }
      });
    });
  });
  const np = stEl('st-np'), nn = stEl('st-nn2');
  if(np) np.textContent = 'n(P) = ' + stDict.p.length;
  if(nn) nn.textContent = 'n(N) = ' + stDict.n.length;
  const ub = stEl('st-undo');
  if(ub) ub.textContent = '되돌리기' + (stUndoStack.length ? ' (' + stUndoStack.length + ')' : '');
  stDictSave();
  stA2Run(true);
  stA4Render();
}
function stDictMsg(t){
  const m = stEl('st-dict-msg');
  if(m) m.textContent = t || '';
}
function stDictAdd(side){
  const inp = stEl('st-add-' + side);
  if(!inp) return;
  const w = (inp.value || '').trim();
  if(!w) return;
  if(stDict.p.indexOf(w) >= 0 || stDict.n.indexOf(w) >= 0){
    inp.classList.add('shake');
    setTimeout(function(){ inp.classList.remove('shake'); }, 500);
    stDictMsg('이미 있는 단어입니다.');
    return;
  }
  stDict[side].push(w);
  inp.value = '';
  stDictMsg('‘' + w + '’ 을(를) ' + (side === 'p' ? '긍정 집합 P' : '부정 집합 N') + '에 넣었습니다.');
  stDictRender();
}
function stDictDel(side, i){
  const w = stDict[side][i];
  if(w === undefined) return;
  stDict[side].splice(i, 1);
  stUndoStack.push({ side:side, i:i, w:w });
  if(stUndoStack.length > 3) stUndoStack.shift();
  stDictMsg('‘' + w + '’ 을(를) 지웠습니다. [되돌리기]로 3개까지 살릴 수 있습니다.');
  stDictRender();
}
function stDictUndo(){
  const it = stUndoStack.pop();
  if(!it){ stDictMsg('되돌릴 것이 없습니다.'); return; }
  stDict[it.side].splice(Math.min(it.i, stDict[it.side].length), 0, it.w);
  stDictMsg('‘' + it.w + '’ 을(를) 되살렸습니다.');
  stDictRender();
}
function stDictMove(side, i){
  const w = stDict[side][i];
  if(w === undefined) return;
  const other = side === 'p' ? 'n' : 'p';
  stDict[side].splice(i, 1);
  if(stDict[other].indexOf(w) < 0) stDict[other].push(w);
  stDictMsg('‘' + w + '’ 을(를) ' + (other === 'p' ? '긍정 집합 P' : '부정 집합 N') + '으로 옮겼습니다.');
  stDictRender();
}
function stDictDrop(ev, side){
  ev.preventDefault();
  let d = '';
  try{ d = ev.dataTransfer.getData('text/plain'); }catch(e){}
  const m = String(d).split(':');
  if(m.length !== 2) return;
  if(m[0] === side) return;
  stDictMove(m[0], parseInt(m[1], 10));
}
function stPreset(key){
  const p = ST_PRESETS[key];
  if(!p) return;
  stDict = { p:p.p.slice(), n:p.n.slice() };
  stUndoStack = [];
  stDictMsg('‘' + p.name + '’ 기본 사전을 불러왔습니다. 자유롭게 고칠 수 있습니다.');
  const s = stEl('st-preset-src');
  if(s) s.textContent = '출처 — ' + p.src;
  stDictRender();
  const sel = stEl('st-ex-sent');
  if(sel) stSentOpts(key);
}
function stSentOpts(group){
  const sel = stEl('st-ex-sent');
  if(!sel) return;
  const list = ST_SENTS.filter(function(s){ return !group || s.g === group; });
  const use = list.length ? list : ST_SENTS;
  sel.innerHTML = '<option value="">예시 문장 고르기…</option>'
    + use.map(function(s){ return '<option value="' + s.k + '">' + stEsc(s.t) + '</option>'; }).join('');
}
function stExLoad(){
  const sel = stEl('st-ex-sent');
  const ta = stEl('st-sent');
  if(!sel || !ta || !sel.value) return;
  const s = ST_SENTS.filter(function(x){ return x.k === sel.value; })[0];
  if(!s) return;
  ta.value = s.s;
  stA2Set = s.set.slice();
  stA2Src = s.src;
  stA2Title = s.t;
  stA2Done = true;
  stUnlock('a2-obs'); stUnlock('a2-sum'); stUnlock('a2-def');
  stA2Run();
}
function stAnalyze(){
  const ta = stEl('st-sent');
  if(!ta) return;
  const txt = (ta.value || '').trim();
  if(!txt){
    const st = stEl('st-a2-st');
    if(st) st.textContent = '분석할 문장을 먼저 입력해 주세요.';
    return;
  }
  stA2Set = stSet(stTok(txt));
  stA2Src = '';
  stA2Title = '내가 넣은 문장';
  stA2Done = true;
  stUnlock('a2-obs'); stUnlock('a2-sum'); stUnlock('a2-def');
  stA2Run();
}

function stA2Run(quiet){
  const wrap = stEl('st-a2-words');
  if(!wrap) return;
  const A = stA2Set;
  if(!A.length){
    wrap.innerHTML = '<span class="st-hint">문장을 넣고 [분석]을 누르면 단어집합 A가 여기에 나타납니다.</span>';
    const na = stEl('st-na'); if(na) na.textContent = 'n(A) = 0';
    stGauge('st-gauge2', [{ v:0, t:'' }], stKv);
    return;
  }
  const P = stDict.p, N = stDict.n;
  wrap.innerHTML = A.map(function(w){
    const cls = P.indexOf(w) >= 0 ? 'p' : (N.indexOf(w) >= 0 ? 'n' : 'x');
    const tip = cls === 'x' ? ' title="사전에 없는 단어는 중립으로 처리합니다"' : '';
    return '<span class="st-achip ' + cls + '"' + tip + '>' + stEsc(w) + '</span>';
  }).join('');
  const na = stEl('st-na');
  if(na) na.textContent = 'n(A) = ' + A.length;

  const src = stEl('st-a2-src');
  if(src) src.textContent = stA2Src || '';

  const ip = stInter(P, A).length, up = P.length + A.length - ip;
  const inn = stInter(N, A).length, un = N.length + A.length - inn;
  const jp = up ? ip / up : 0, jn = un ? inn / un : 0;

  stDrawVenn('st-vennP', P, A, '긍정 사전 P', '문장 A', { colA:stCol('--blue', '#4a6b8a'), colB:stCol('--fg', '#1a1714') });
  stDrawVenn('st-vennN', N, A, '부정 사전 N', '문장 A', { colA:stCol('--red', '#b44133'), colB:stCol('--fg', '#1a1714') });

  const fmt = function(id, lab, i, nS, nA, u, j, cv, side){
    const el = stEl(id);
    if(!el) return;
    el.innerHTML = '<b>' + lab + '</b> = '
      + '<button type="button" class="st-fnum" data-r="I">' + i + '</button> ÷ ( '
      + '<button type="button" class="st-fnum" data-r="' + side + '">' + nS + '</button> + '
      + '<button type="button" class="st-fnum" data-r="A">' + nA + '</button> − '
      + '<button type="button" class="st-fnum" data-r="I">' + i + '</button> ) = '
      + '<span class="st-frac"><i>' + i + '</i><b>' + u + '</b></span> ≒ <b class="v">' + stNum(j) + '</b>';
    el.querySelectorAll('.st-fnum').forEach(function(b){
      b.addEventListener('click', function(){
        const r = b.getAttribute('data-r');
        const reg = r === 'I' ? 'I' : (r === 'A' ? 'R' : 'L');
        if(cv === 'st-vennP') stFlash(cv, reg, P, A, '긍정 사전 P', '문장 A', stCol('--blue', '#4a6b8a'), stCol('--fg', '#1a1714'));
        else stFlash(cv, reg, N, A, '부정 사전 N', '문장 A', stCol('--red', '#b44133'), stCol('--fg', '#1a1714'));
      });
    });
  };
  fmt('st-fp', 'J(P, A)', ip, P.length, A.length, up, jp, 'st-vennP', 'P');
  fmt('st-fn', 'J(N, A)', inn, N.length, A.length, un, jn, 'st-vennN', 'N');

  const raw = jp - jn;
  const disp = stRound2(stRound2(jp) - stRound2(jn));
  stGauge('st-gauge2', [{ v:raw, t:stA2Title || '' }], stKv);
  const eq = stEl('st-a2-eq');
  if(eq) eq.innerHTML = 'J(P, A) − J(N, A) = ' + stNum(jp) + ' − ' + stNum(jn) + ' = <b>' + stNum(disp) + '</b>'
    + '  <span class="st-hint">(k = ' + stKv.toFixed(2) + ' 기준 판정 : <b>' + stVerdict(raw, stKv) + '</b>)</span>';
  stEdgeNote('st-a2-edge', raw, disp, stKv);

  if(!quiet){
    const st = stEl('st-a2-st');
    if(st) st.textContent = '분석했습니다. 파란 칩은 P와, 빨간 칩은 N과 겹친 단어입니다. 회색 칩은 사전에 없어 중립으로 처리됩니다.';
  }
  stA3Render();
}

/* ── 11. 활동 3 — 기준선을 움직이다 ──────────────────────────────────────── */
function stA3Predict(v, el){
  stA3Guess = v;
  const root = stEl('v-senti');
  if(root) root.querySelectorAll('#st-a3-guess .chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  const p = stEl('st-a3-panel');
  if(p) p.classList.remove('st-veil');
  const m = stEl('st-a3-gmsg');
  if(m) m.textContent = '예상: ' + v + '. 이제 슬라이더를 움직여 확인해 보세요.';
  stA3Render();
}
function stKSet(v){
  stKv = Math.max(0, Math.min(0.5, Number(v) || 0));
  stLSSet(ST_K_THR, String(stKv));
  const lab = stEl('st-k-val');
  if(lab) lab.textContent = 'k = ' + stKv.toFixed(2);
  const s = stEl('st-k');
  if(s && Number(s.value) !== stKv) s.value = String(stKv);
  stA3Render();
  stA2Run(true);
  stA4Render();
}
function stA3Sent(i, el){
  stA3Sel = i;
  const root = stEl('v-senti');
  if(root) root.querySelectorAll('#st-a3-pick .chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  stA3Render();
}
function stA3Toggle(){
  stA3Triple = !stA3Triple;
  const b = stEl('st-a3-tri');
  if(b) b.textContent = stA3Triple ? '문장 1개만 보기' : '문장 3개 동시 보기';
  stA3Render();
}
function stA3Render(){
  const ns = ST_A3_FIX.map(function(f, i){
    const vd = stVerdict(f.v, stKv);
    const changed = (stA3Prev[i] && stA3Prev[i] !== vd);
    stA3Prev[i] = vd;
    return { v:f.v, t:f.t, blink:(changed && !stReduce()) };
  });
  const use = stA3Triple ? ns : [ns[stA3Sel]];
  stGauge('st-gauge3', use, stKv, { noBadge:stA3Triple });
  if(stA3Triple){
    const box = stEl('st-gauge3');
    if(box){
      setTimeout(function(){
        box.querySelectorAll('.st-g-nd.blink').forEach(function(n){ n.classList.remove('blink'); });
      }, 700);
    }
  }
  const cur = ST_A3_FIX[stA3Sel];
  const s = cur.v, k = stKv;
  const vd = stVerdict(s, k);
  const rows = [
    { nm:'긍정', f:'J(P,A) − J(N,A) ≥ k', chk:stNum(s) + ' ≥ ' + k.toFixed(2), ok:(s >= k) },
    { nm:'중립', f:'−k < J(P,A) − J(N,A) < k', chk:'−' + k.toFixed(2) + ' < ' + stNum(s) + ' < ' + k.toFixed(2), ok:(s > -k && s < k) },
    { nm:'부정', f:'J(P,A) − J(N,A) ≤ −k', chk:stNum(s) + ' ≤ −' + k.toFixed(2), ok:(s <= -k) }
  ];
  const card = stEl('st-a3-ineq');
  if(card){
    card.innerHTML = '<p class="st-hint">지금 보는 문장: <b>' + stEsc(cur.t) + '</b> (감성 점수 ' + stNum(cur.v) + ' · ' + stEsc(cur.d) + ')</p>'
      + rows.map(function(r){
        return '<div class="st-ineq' + (r.ok ? ' on' : '') + '"><span class="nm">' + r.nm + '</span>'
          + '<span class="fm">' + stEsc(r.f) + '</span>'
          + '<span class="ck">' + stEsc(r.chk) + ' ? → <b>' + (r.ok ? '참 ✔' : '거짓') + '</b></span></div>';
      }).join('')
      + '<p class="st-g-badge ' + (vd === '긍정' ? 'pos' : vd === '부정' ? 'neg' : 'neu') + '">판정 : ' + vd + '</p>';
  }
}
function stA3Record(){
  const row = { k:stKv, x:stVerdict(ST_A3_FIX[0].v, stKv), a:stVerdict(ST_A3_FIX[1].v, stKv), b:stVerdict(ST_A3_FIX[2].v, stKv) };
  stA3Rows.push(row);
  const box = stEl('st-a3-log');
  if(box){
    box.innerHTML = '<div class="st-scroll"><table class="st-tbl"><tr><th>k</th><th>문장 X (0.29)</th><th>문장 A (−0.06)</th><th>문장 B (−0.20)</th></tr>'
      + stA3Rows.map(function(r){
        return '<tr><td>' + r.k.toFixed(2) + '</td><td>' + r.x + '</td><td>' + r.a + '</td><td>' + r.b + '</td></tr>';
      }).join('') + '</table></div>';
  }
  const st = stEl('st-a3-st');
  if(st) st.textContent = '기록 ' + stA3Rows.length + '행' + (stA3Rows.length < 3 ? ' — 3행 이상 기록하면 아래 단계 토글이 열립니다.' : ' — 단계 토글이 열렸습니다.');
  if(stA3Rows.length >= 3){ stUnlock('a3-obs'); stUnlock('a3-sum'); stUnlock('a3-def'); }
}

/* ── 12. 활동 4 — 단어 하나가 판정을 뒤집는다 ────────────────────────────── */
function stA4Sent(){
  if(stA4Scn === 'counsel') return ST_SENTS.filter(function(s){ return s.k === 'counsel-b'; })[0];
  if(stA4Scn === 'food')    return ST_SENTS.filter(function(s){ return s.k === 'food-x'; })[0];
  return ST_SENTS.filter(function(s){ return s.k === 'movie-b'; })[0];
}
function stA4Live(){
  const P = stDict.p.filter(function(w){ return !stA4Off['p:' + w]; });
  const N = stDict.n.filter(function(w){ return !stA4Off['n:' + w]; });
  return { p:P, n:N };
}
function stA4Scen(key, el){
  stA4Scn = key;
  stA4Off = {};
  stA4Flips = 0;
  stA4Cleared = false;
  const root = stEl('v-senti');
  if(root) root.querySelectorAll('#st-a4-scn .chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  stPreset(key);
  stA4Prev = '';
  stA4Render();
}
function stA4Toggle(side, w){
  const k = side + ':' + w;
  if(stA4Off[k]) delete stA4Off[k]; else stA4Off[k] = 1;
  stUnlock('a4-obs'); stUnlock('a4-sum'); stUnlock('a4-def');
  stA4Render(true);
}
function stA4Render(count){
  const box = stEl('st-a4-dict');
  if(!box) return;
  const sent = stA4Sent();
  const A = sent ? sent.set : [];
  const live = stA4Live();

  box.innerHTML = ['p','n'].map(function(side){
    const list = stDict[side];
    return '<div class="st-a4col ' + side + '"><p class="lb">' + (side === 'p' ? '긍정 집합 P' : '부정 집합 N')
      + ' <b>n = ' + live[side].length + '</b></p><div class="st-a4chips">'
      + list.map(function(w){
        const off = !!stA4Off[side + ':' + w];
        const hit = A.indexOf(w) >= 0;
        return '<button type="button" class="st-dchip ' + side + (off ? ' off' : '') + (hit ? ' hit' : '') + '" '
          + 'data-side="' + side + '" data-w="' + stEsc(w) + '" '
          + 'aria-pressed="' + (off ? 'true' : 'false') + '">'
          + '<span class="ic">' + (off ? '🚫' : '👁') + '</span><span class="tx">' + stEsc(w) + '</span></button>';
      }).join('') + '</div></div>';
  }).join('');
  box.querySelectorAll('.st-dchip').forEach(function(b){
    b.addEventListener('click', function(){
      stA4Toggle(b.getAttribute('data-side'), b.getAttribute('data-w'));
    });
  });

  const raw = stScore(A, live.p, live.n);
  const vd = stVerdict(raw, stKv);
  if(count && stA4Prev && stA4Prev !== vd) stA4Flips++;
  stA4Prev = vd;

  stGauge('st-gauge4', [{ v:raw, t:sent ? sent.t : '' }], stKv);

  const ip = stInter(live.p, A).length, up = live.p.length + A.length - ip;
  const inn = stInter(live.n, A).length, un = live.n.length + A.length - inn;
  const jp4 = up ? ip / up : 0, jn4 = un ? inn / un : 0;
  /* 표시는 활동 2와 같은 규약 — 반올림한 두 값의 차(학생 손계산과 일치), 판정은 원값 */
  const disp4 = stRound2(stRound2(jp4) - stRound2(jn4));
  const eq = stEl('st-a4-eq');
  if(eq){
    eq.innerHTML = '<b>' + stEsc(sent ? sent.t : '') + '</b> · n(A) = ' + A.length + '<br>'
      + 'J(P, A) = ' + ip + '/' + up + ' ≒ ' + stNum(jp4) + ' · '
      + 'J(N, A) = ' + inn + '/' + un + ' ≒ ' + stNum(jn4) + '<br>'
      + '감성 점수 = ' + stNum(jp4) + ' − ' + stNum(jn4) + ' = <b>' + stNum(disp4) + '</b>'
      + ' · k = ' + stKv.toFixed(2) + ' → 판정 <b>' + vd + '</b>';
  }
  stEdgeNote('st-a4-edge', raw, disp4, stKv);
  const sb = stEl('st-a4-score');
  if(sb) sb.textContent = '판정이 바뀐 횟수: ' + stA4Flips + '회';

  /* 미션 — 판정을 바꾸는 데 필요한 최소 단어 수 */
  const ms = stEl('st-a4-mission');
  if(ms){
    const base = stVerdict(stScore(A, stDict.p, stDict.n), stKv);
    const off = Object.keys(stA4Off).length;
    if(vd !== base && off > 0){
      if(!stA4Cleared){
        stA4Cleared = true;
        const min = stA4Min(A, base);
        ms.className = 'st-fb ok';
        ms.innerHTML = '🏅 성공! 단어 <b>' + off + '개</b>를 껐더니 판정이 ‘' + base + '’ → ‘' + vd + '’ 으로 바뀌었습니다.'
          + (min > 0 ? ' 이론상 최소 개수는 <b>' + min + '개</b>입니다.' : '');
      }
    }else{
      stA4Cleared = false;
      ms.className = 'st-fb';
      ms.innerHTML = '🎯 미션 — 지금 판정은 ‘' + base + '’입니다. <b>가장 적은 수의 단어</b>만 꺼서 판정을 바꿔 보세요.'
        + (off ? ' (지금까지 끈 단어 ' + off + '개)' : '');
    }
  }
}
/* 사전에서 몇 개를 빼야 판정이 바뀌는지 완전 탐색으로 구합니다(교집합 단어만 영향을 줍니다). */
function stA4Min(A, base){
  const cand = stInter(stDict.p, A).map(function(w){ return ['p', w]; })
    .concat(stInter(stDict.n, A).map(function(w){ return ['n', w]; }));
  const m = cand.length;
  if(m === 0 || m > 14) return 0;
  let best = 0;
  for(let mask = 1; mask < (1 << m); mask++){
    let cnt = 0;
    const offp = {}, offn = {};
    for(let i = 0; i < m; i++){
      if(mask & (1 << i)){
        cnt++;
        if(cand[i][0] === 'p') offp[cand[i][1]] = 1; else offn[cand[i][1]] = 1;
      }
    }
    if(best && cnt >= best) continue;
    const P = stDict.p.filter(function(w){ return !offp[w]; });
    const N = stDict.n.filter(function(w){ return !offn[w]; });
    if(stVerdict(stScore(A, P, N), stKv) !== base){ best = cnt; }
  }
  return best;
}

/* ⓓ 학급 사전 기여 */
function stClassAdd(){
  const w = ((stEl('st-cd-w') || {}).value || '').trim();
  const r = ((stEl('st-cd-r') || {}).value || '').trim();
  const side = ((stEl('st-cd-side') || {}).value || 'p');
  const st = stEl('st-cd-st');
  if(!w){ if(st) st.textContent = '담을 단어를 먼저 적어 주세요.'; return; }
  let arr = [];
  try{ arr = JSON.parse(stLS(ST_K_CLASS, '[]')); if(!Array.isArray(arr)) arr = []; }catch(e){ arr = []; }
  arr.push({ w:w, side:side, why:r, at:new Date().toISOString().slice(0, 10) });
  stLSSet(ST_K_CLASS, JSON.stringify(arr));
  const iw = stEl('st-cd-w'); if(iw) iw.value = '';
  const ir = stEl('st-cd-r'); if(ir) ir.value = '';
  if(st) st.textContent = '학급 사전에 담았습니다(이 기기에 ' + arr.length + '건 저장). 교사 단말에서 [JSON 내보내기]로 취합합니다.';
  stClassList();
}
function stClassList(){
  const box = stEl('st-cd-list');
  if(!box) return;
  let arr = [];
  try{ arr = JSON.parse(stLS(ST_K_CLASS, '[]')); if(!Array.isArray(arr)) arr = []; }catch(e){ arr = []; }
  box.innerHTML = arr.length
    ? arr.map(function(it, i){
        return '<div class="st-cd-it"><b>' + (it.side === 'n' ? 'N' : 'P') + '</b> ' + stEsc(it.w)
          + '<span>' + stEsc(it.why || '') + '</span>'
          + '<button type="button" onclick="stClassDel(' + i + ')" aria-label="삭제">✕</button></div>';
      }).join('')
    : '<p class="st-hint">아직 담은 단어가 없습니다.</p>';
}
function stClassDel(i){
  let arr = [];
  try{ arr = JSON.parse(stLS(ST_K_CLASS, '[]')); if(!Array.isArray(arr)) arr = []; }catch(e){ arr = []; }
  arr.splice(i, 1);
  stLSSet(ST_K_CLASS, JSON.stringify(arr));
  stClassList();
}
function stClassExport(){
  let arr = [];
  try{ arr = JSON.parse(stLS(ST_K_CLASS, '[]')); if(!Array.isArray(arr)) arr = []; }catch(e){ arr = []; }
  const data = { dict:stDict, k:stKv, contributions:arr };
  const txt = JSON.stringify(data, null, 2);
  const ta = stEl('st-cd-json');
  if(ta){
    ta.value = txt;
    ta.classList.add('on');
    try{ ta.select(); }catch(e){}
  }
  const st = stEl('st-cd-st');
  if(st) st.textContent = 'JSON을 아래 칸에 펼쳤습니다. 전체를 복사해 학급 공유 자료함(패들렛 등)에 붙여 넣으세요.';
}

/* ── 13. 참고 자료 — 학급 공유 자료함(공통 키 aimath.classroom.url) ─────── */
function stRoomRender(){
  const box = stEl('st-room');
  if(!box) return;
  let url = stLS(ST_K_ROOM, '');
  if(!url){
    const legacy = stLS(ST_K_ROOM_CORE, '');
    if(legacy){ url = legacy; stLSSet(ST_K_ROOM, legacy); }
  }
  box.innerHTML = url
    ? '<a class="st-ref" href="' + stEsc(url) + '" target="_blank" rel="noopener">'
      + '<span class="th"><span class="bg">학급</span>🗂</span>'
      + '<span class="bd"><span class="tt">학급 공유 자료함</span>'
      + '<span class="ds">우리 반이 만든 감성 사전과 급식 리뷰 분석 결과를 모으는 곳입니다. 프로젝트 과제 제출물도 여기에 올립니다.</span></span></a>'
      + '<button type="button" class="btn st-roomedit">주소 변경</button>'
    : '<button type="button" class="st-ref st-refadd st-roomedit">'
      + '<span class="th">🗂</span>'
      + '<span class="bd"><span class="tt">학급 공유 자료함 설정</span>'
      + '<span class="ds">선생님이 패들렛·구글 드라이브 주소를 한 번만 넣으면 6~10차시 모든 차시에 함께 나타납니다.</span></span></button>';
  const btn = box.querySelector('.st-roomedit');
  if(btn) btn.addEventListener('click', function(){
    const f = stEl('st-room-form');
    if(f){ f.classList.add('on'); const i = stEl('st-room-u'); if(i){ i.value = url; i.focus(); } }
  });
}
function stRoomSave(){
  const i = stEl('st-room-u');
  const st = stEl('st-room-st');
  if(!i) return;
  const u = (i.value || '').trim();
  if(u && !/^https?:\/\//i.test(u)){
    if(st) st.textContent = 'http 또는 https 로 시작하는 주소를 입력해 주세요.';
    return;
  }
  stLSSet(ST_K_ROOM, u);
  stLSSet(ST_K_ROOM_CORE, u);   /* core.js 의 공유 폴더 UI와 값이 어긋나지 않도록 미러링 */
  const f = stEl('st-room-form');
  if(f) f.classList.remove('on');
  if(st) st.textContent = u ? '학급 자료함 주소를 저장했습니다. 이 기기에만 저장됩니다.' : '주소를 지웠습니다.';
  stRoomRender();
}
/* 점선 ‘＋ 자료 추가’ 카드 — core.js aimRefExtras 가 붙인 입력 폼을 엽니다. */
function stRefAdd(){
  const root = stEl('v-senti');
  if(!root) return;
  const btn = root.querySelector('.rx .rx-open');
  if(btn){
    btn.click();
    const f = root.querySelector('.rx .rx-add-form');
    if(f && f.scrollIntoView){ try{ f.scrollIntoView({ behavior:stReduce() ? 'auto' : 'smooth', block:'center' }); }catch(e){} }
    return;
  }
  const st = stEl('st-ref-st');
  if(st) st.textContent = '자료 추가 슬롯을 찾지 못했습니다. 매니페스트(AIM_LESSONS)에 senti 가 등록되어 있는지 확인해 주세요.';
}

/* ── 14. 핵심 질문 답 저장 ───────────────────────────────────────────────── */
function stAnsSave(){
  const a1 = (stEl('st-ans1') || {}).value || '';
  const a2 = (stEl('st-ans2') || {}).value || '';
  stLSSet('aimath.senti.answer', JSON.stringify({ a1:a1, a2:a2 }));
  const st = stEl('st-ans-st');
  if(st) st.textContent = '저장했습니다. 이 기기에만 저장되며 인쇄 학습지에 옮겨 적을 수 있습니다.';
}
function stAnsLoad(){
  try{
    const o = JSON.parse(stLS('aimath.senti.answer', '{}'));
    if(o && typeof o === 'object'){
      const e1 = stEl('st-ans1'), e2 = stEl('st-ans2');
      if(e1 && o.a1) e1.value = o.a1;
      if(e2 && o.a2) e2.value = o.a2;
    }
  }catch(e){}
}

/* ── 15. 리사이즈 ────────────────────────────────────────────────────────── */
function stResizeAll(){
  const root = stEl('v-senti');
  if(!root || !root.offsetParent) return;
  try{ stA1Draw(); }catch(e){}
  try{ stA2Run(true); }catch(e){}
}

/* ── 16. 초기화 (IIFE + null 가드 · 뷰가 보일 때 캔버스 재계산) ──────────── */
(function sentiInit(){
  const boot = function(){
    const root = stEl('v-senti');
    if(!root) return;                       /* 뷰가 없어도 core.js 가 죽지 않도록 */

    /* 공통 컴포넌트 — 재사용만 합니다(수정 금지). */
    if(typeof videoDeck    === 'function'){ try{ videoDeck('st-videos', 'senti', ST_VIDEOS); }catch(e){ console.error('st videoDeck', e); } }
    if(typeof warmStepper  === 'function'){ try{ warmStepper('st-warm', 'st', ST_WARM); }catch(e){ console.error('st warmStepper', e); } }
    if(typeof quizStepper  === 'function'){ try{ quizStepper('st-quiz', 'st', ST_QUIZ); }catch(e){ console.error('st quizStepper', e); } }
    if(typeof chipDefs     === 'function'){ try{ chipDefs('#v-senti .st-keys', ST_DEFS); }catch(e){ console.error('st chipDefs', e); } }
    if(typeof wsLinks      === 'function'){ try{ wsLinks('st-wslinks', 'senti'); }catch(e){ console.error('st wsLinks', e); } }

    /* 상태 복원 */
    stDictLoad();
    const savedK = parseFloat(stLS(ST_K_THR, '0.25'));
    stKv = isNaN(savedK) ? 0.25 : Math.max(0, Math.min(0.5, savedK));
    const ks = stEl('st-k');
    if(ks) ks.value = String(stKv);
    const kl = stEl('st-k-val');
    if(kl) kl.textContent = 'k = ' + stKv.toFixed(2);

    /* 사전 편집 패널 — 드롭 영역 */
    ['p','n'].forEach(function(side){
      const box = stEl('st-dict-' + side);
      if(!box) return;
      box.addEventListener('dragover', function(e){ e.preventDefault(); box.classList.add('over'); });
      box.addEventListener('dragleave', function(){ box.classList.remove('over'); });
      box.addEventListener('drop', function(e){ box.classList.remove('over'); stDictDrop(e, side); });
      const inp = stEl('st-add-' + side);
      if(inp) inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); stDictAdd(side); } });
    });

    stSentOpts('');
    stDictRender();
    stClassList();
    stRoomRender();
    stAnsLoad();
    stA3Render();
    stA4Render();
    stLockGuard();

    /* 뷰가 화면에 나타나면 캔버스를 다시 그립니다(go() 수정 없이 지연 init). */
    try{
      const mo = new MutationObserver(function(){
        if(root.classList.contains('active')) setTimeout(stResizeAll, 30);
      });
      mo.observe(root, { attributes:true, attributeFilter:['class'] });
    }catch(e){}
    let rt = null;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(stResizeAll, 160);
    });
    if(root.classList.contains('active')) setTimeout(stResizeAll, 60);
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ●●● ANCHOR-SENTI ●●● (10차시 보강 코드는 이 줄 바로 위에 붙입니다) */


/* ═══════════════════════════════════════════════════════════════════════════
   2단원 통합 — 준비 중 차시 안내 (통합 담당 추가)
     6→7→8→9→10→11 예고 체인에서 아직 뷰가 없는 차시(11차시 review 등)를 누르면
     원래 go()가 조용히 return 하여 단추가 죽은 것처럼 보였습니다.
     go()를 감싸 "준비 중" 안내를 1회 띄우고 그대로 return 합니다.
     (원본 go()는 window.go.__orig 로 계속 보존됩니다.)
   ═══════════════════════════════════════════════════════════════════════════ */
(function aimSoonNotice(){
  /* 아직 뷰가 없는 슬러그 → 차시 라벨. AIM_LESSONS에 v:가 생기면 이 표는 자동으로 무시됩니다.
     11차시 review 는 구현이 끝나 views/review.html 이 실리므로 이 표에서 뺐습니다
     (뷰가 있으면 아래 가드가 그대로 통과시킵니다). */
  const AIM_SOON_VIEWS = {};

  function aimSoonToast(v){
    const label = AIM_SOON_VIEWS[v] || '해당 차시';
    let box = document.getElementById('aim-soon-toast');
    if(!box){
      box = document.createElement('div');
      box.id = 'aim-soon-toast';
      box.setAttribute('role','status');
      box.setAttribute('aria-live','polite');
      box.style.cssText =
        'position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%);z-index:9999;'+
        'max-width:min(92vw,32rem);padding:0.85rem 1.1rem;border-radius:0.7rem;'+
        'background:var(--card,#fff);color:var(--fg,#222);border:2px solid var(--border,#ccc);'+
        'box-shadow:0 6px 22px rgba(0,0,0,0.18);font-size:1rem;line-height:1.5;text-align:center;';
      document.body.appendChild(box);
    }
    box.innerHTML = '<strong>준비 중인 차시입니다.</strong><br>' +
      '<span style="color:var(--muted,#666);">' + label + ' — 아직 열리지 않았습니다. ' +
      '위쪽 <em>[차시 목록 ▾]</em>에서 전체 흐름을 확인할 수 있습니다.</span>';
    box.style.display = 'block';
    clearTimeout(aimSoonToast._t);
    aimSoonToast._t = setTimeout(function(){ box.style.display='none'; }, 3600);
  }

  const prev = window.go;
  if(typeof prev !== 'function') return;
  window.go = function(v){
    if(v && typeof v === 'string' && !document.getElementById('v-' + v)){
      try{ aimSoonToast(v); }catch(e){}
      return;
    }
    return prev.apply(this, arguments);
  };
  window.go.__orig = prev.__orig || prev;
})();


/* ══════════ 2단원 review 뷰 코드 (11차시) ══════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   REVIEW (11차시: 실생활 프로젝트 — 리뷰 분석과 추천) — 접두사 rv
   ---------------------------------------------------------------------------
   · 이 블록은 core.js 맨 끝(10차시 senti 블록 뒤)에 그대로 덧붙입니다.
   · 뷰(views/review.html)가 없어도 core.js가 죽지 않도록 초기화는 IIFE + null 가드.
   · 새 수학을 도입하지 않습니다. 6~10차시 엔진을 그대로 호출합니다.
       6차시 text  : (표제어 후처리 rvLemma 는 tokenize 뒤에 붙는 이 차시 전용 후처리)
       8차시 tfidf : IDF = n ÷ DF 규약을 rvTfidf 가 문서 배열용으로 감쌉니다
       9차시 sim   : smNorm2 · smDist · smCos
      10차시 senti : stSet · stInter · stJ · stScore · stVerdict · stRound2
   · 공통 컴포넌트(videoDeck·warmStepper·quizStepper·chipDefs·wsPrint·wsLinks)는
     호출만 하고 수정하지 않습니다.
   · localStorage['aimath.senti.dict'] 는 **읽기 전용**입니다(10차시 자료 훼손 방지).
     11차시에서 넓힌 사전은 aimath.review.dict 에 따로 저장합니다.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 0. 저장 키 ──────────────────────────────────────────────────────────── */
const RV_K_SENTI = 'aimath.senti.dict';        /* 10차시 사전 — 읽기만 합니다 */
const RV_K_DICT  = 'aimath.review.dict';
const RV_K_K     = 'aimath.review.k';
const RV_K_DATA  = 'aimath.review.data';
const RV_K_STOP  = 'aimath.review.stop';
const RV_K_GUESS = 'aimath.review.guess';
const RV_K_DIAG  = 'aimath.review.diag';
const RV_K_REC   = 'aimath.review.rec';
const RV_K_MAT   = 'aimath.review.matrix';
const RV_K_DEB   = 'aimath.review.debate';
const RV_K_ANS   = 'aimath.review.answer';
const RV_K_ROOM  = 'aimath.classroom.url';     /* 6~11차시 공통 키 */
const RV_K_ROOM_CORE = 'aimath.shared.folder'; /* core.js aimRefExtras 키 — 값만 미러링 */

/* ── 1. 소도구 ───────────────────────────────────────────────────────────── */
function rvEl(id){ return document.getElementById(id); }
function rvEsc(s){
  if(typeof cmnEsc === 'function') return cmnEsc(s);
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function rvLS(k,d){
  if(typeof cmnGet === 'function') return cmnGet(k,d);
  try{ const v = localStorage.getItem(k); return v === null ? d : v; }catch(e){ return d; }
}
function rvLSSet(k,v){
  if(typeof cmnSet === 'function'){ cmnSet(k,v); return; }
  try{ localStorage.setItem(k,v); }catch(e){}
}
function rvReduce(){
  try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; }
}
/* 소수 둘째 자리 · 음수는 수학 기호 −(U+2212) */
function rvNum(x, d){
  const n = Number(x);
  if(!isFinite(n)) return '—';
  const p = (d === undefined) ? 2 : d;
  return (n < 0 ? '−' : '') + Math.abs(n).toFixed(p);
}
function rvSigned(x, d){
  const n = Number(x);
  if(!isFinite(n)) return '—';
  const p = (d === undefined) ? 3 : d;
  return (n < 0 ? '−' : '+') + Math.abs(n).toFixed(p);
}
function rvCss(name, fb){
  try{
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fb;
  }catch(e){ return fb; }
}
/* 두 색을 섞은 값을 직접 계산합니다(색만으로 구분하지 않지만, 진하기로 크기를 함께 보이기 위함). */
function rvRgb(h){
  const s = String(h || '').trim().replace('#','');
  if(s.length === 3) return [parseInt(s[0]+s[0],16), parseInt(s[1]+s[1],16), parseInt(s[2]+s[2],16)];
  if(s.length >= 6) return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
  return [200,185,166];
}
function rvBlend(alpha, fg, bg){
  const a = rvRgb(fg || rvCss('--accent','#c8b9a6'));
  const b = rvRgb(bg || rvCss('--card','#ebe5dc'));
  const t = Math.max(0, Math.min(1, alpha));
  return 'rgb(' + a.map(function(x,i){ return Math.round(x * t + b[i] * (1 - t)); }).join(',') + ')';
}
/* devicePixelRatio 대응 — 반환된 ctx 는 CSS 픽셀 좌표계로 그립니다. */
function rvPrep(cv){
  if(!cv) return null;
  /* cv.height 에 값을 넣으면 height 속성도 함께 바뀝니다.
     그대로 다시 읽으면 그릴 때마다 배율이 누적되어 캔버스가 계속 커지므로,
     처음 한 번만 읽어 data-rvh 에 보관해 둡니다. */
  if(!cv.dataset.rvh){
    cv.dataset.rvh = String(parseInt(cv.getAttribute('height'), 10) || 240);
  }
  const w = cv.clientWidth || (cv.parentElement ? cv.parentElement.clientWidth : 0) || 560;
  const h = parseInt(cv.dataset.rvh, 10) || 240;
  const r = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * r);
  cv.height = Math.round(h * r);
  cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(r, 0, 0, r, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx: ctx, w: w, h: h };
}

/* ── 2. 표제어 정규화 (부록 B-1) ─────────────────────────────────────────── */
/* 위에서부터 순서대로 적용하고, 이미 잡힌 글자 구간은 뒤 패턴이 다시 쓰지 못하도록 가립니다.
   6차시 tokenize() 를 고치지 않고 그 뒤에 붙는 이 차시 전용 후처리입니다. */
const RV_LEMMA = [
  ['불친절','불친절'], ['불편','불편하다'], ['맛없|맛 없','맛없다'], ['지저분|더러','지저분하다'],
  ['빈약','빈약하다'], ['최악','최악'], ['최고','최고'], ['별로','별로다'], ['실망','실망하다'],
  ['눅눅|눅어','눅눅하다'], ['셀프\\s?바','셀프바'], ['마라탕','마라탕'], ['떡볶이','떡볶이'],
  ['튀김','튀김'], ['국물','국물'], ['재료','재료'], ['채소|청경채|두부','채소'],
  ['사장님|사장','사장님'], ['직원','직원'], ['매장|자리','매장'], ['가격|가성비','가격'],
  ['줄|웨이팅|대기','줄'], ['식어|식은|식었|식고|미지근','식다'], ['비어|비었|텅','비다'],
  ['짜졌|짰|짜고|짜요|짜진|짜서','짜다'], ['오래 걸|오래 기다|한참 기다','오래걸리다'],
  ['시들','시들다'], ['아쉬','아쉽다'], ['신선','신선하다'], ['푸짐','푸짐하다'],
  ['저렴','저렴하다'], ['매콤|얼큰|맵','매콤하다'], ['뜨끈|뜨겁|따끈','뜨겁다'],
  ['다시 올|또 올|또 갈|다시 갈|재방문','재방문'], ['만족','만족하다'], ['정성','정성'],
  ['친절','친절'], ['빠르|빨라|빨랐|빨리','빠르다'], ['느리|느려|느렸','느리다'],
  ['깨끗|청결','청결하다'], ['넓','넓다'], ['좁','좁다'], ['편하|편해|편했','편하다'],
  ['알차','알차다'], ['맛있','맛있다'],
  ['좋아|좋았|좋네|좋은|좋고|좋습니|좋겠|좋다','좋다'],
  ['많아|많고|많은|많습니|많네|많다|많이','많다'],
  ['적어|적고|적은|적네','적다']
];
const RV_MASK = '\u0000';

function rvLemma(text){
  const s = String(text || '').split('');
  const out = [];
  for(let p = 0; p < RV_LEMMA.length; p++){
    const re = new RegExp(RV_LEMMA[p][0], 'g');
    const cur = s.join('');
    let m;
    while((m = re.exec(cur)) !== null){
      if(m[0] === ''){ re.lastIndex++; continue; }
      const a = m.index, b = a + m[0].length;
      let free = true;
      for(let i = a; i < b; i++){ if(s[i] === RV_MASK){ free = false; break; } }
      if(!free) continue;
      out.push(RV_LEMMA[p][1]);
      for(let i = a; i < b; i++) s[i] = RV_MASK;
    }
  }
  return out;
}

/* ── 3. 데이터 ───────────────────────────────────────────────────────────── */
/* 내장 리뷰 100건(부록 A) — 집필진이 수업용으로 직접 지어낸 가상 자료이며
   실제 업체·상호·인물과 아무 관련이 없습니다.
   대상: 학교 앞 분식집(마라탕·떡볶이) · 기간 2026-01-06 ~ 2026-05-30 · 월 20건 × 5개월.
   별도 네트워크 요청 없이 오프라인에서도 쓰이도록 core.js 안에 인라인 상수로 둡니다. */
const RV_REVIEWS = [
  {i:1,d:'01-06',s:5,t:'학교 끝나고 처음 와 봤는데 마라탕이 진짜 맛있어요. 양도 많아서 배부르게 먹었습니다.'},
  {i:2,d:'01-06',s:5,t:'떡볶이가 매콤하고 맛있어요. 사장님도 친절하셔서 기분 좋게 먹었어요.'},
  {i:3,d:'01-07',s:4,t:'마라탕 국물이 깔끔해요. 가격도 학생한테 부담 없어서 좋아요.'},
  {i:4,d:'01-08',s:5,t:'여기 마라탕 최고예요. 재료가 신선하고 매장도 넓어서 편하게 먹었어요.'},
  {i:5,d:'01-09',s:5,t:'친구 넷이 갔는데 자리가 넓고 깨끗해서 좋았습니다. 떡볶이도 맛있었어요.'},
  {i:6,d:'01-10',s:4,t:'주문하고 금방 나와요. 국물이 뜨끈하고 서빙도 빨라서 좋네요.'},
  {i:7,d:'01-12',s:5,t:'마라탕 재료를 직접 골라 담는 게 재밌어요. 종류가 많아서 고르는 재미가 있습니다.'},
  {i:8,d:'01-13',s:5,t:'국물이 얼큰하면서 깊은 맛이 나요. 사장님이 직접 육수를 우린다고 하시더라고요.'},
  {i:9,d:'01-14',s:4,t:'떡볶이 소스가 알차고 떡이 쫄깃해요. 튀김까지 시키면 최고입니다.'},
  {i:10,d:'01-15',s:5,t:'가격 대비 양이 정말 많아요. 친구들이랑 또 올 것 같아요.'},
  {i:11,d:'01-16',s:5,t:'마라탕이 맛있어서 이번 주에만 세 번 왔어요.'},
  {i:12,d:'01-19',s:4,t:'직원분들이 친절하고 응대가 빨라요. 마라탕 중간 맵기가 딱 좋습니다.'},
  {i:13,d:'01-20',s:5,t:'학교 앞에 이런 곳이 생겨서 좋아요. 떡볶이랑 마라탕 둘 다 맛있어요.'},
  {i:14,d:'01-21',s:3,t:'맛은 좋은데 자리가 조금 좁아요. 점심시간엔 앉기가 힘들었어요.'},
  {i:15,d:'01-22',s:5,t:'매콤한 국물에 밥 말아 먹으면 진짜 맛있어요. 양도 많고요.'},
  {i:16,d:'01-23',s:5,t:'사장님이 재료 하나하나 설명해 주셔서 친절하다고 느꼈어요. 정성이 보여요.'},
  {i:17,d:'01-26',s:4,t:'마라탕 맵기 조절이 잘 돼요. 매운 걸 못 먹는 친구도 맛있게 먹었어요.'},
  {i:18,d:'01-27',s:5,t:'떡볶이 국물이 진해서 맛있어요. 튀김이랑 같이 먹으니 양도 많아요.'},
  {i:19,d:'01-28',s:5,t:'매장이 깨끗하고 정리가 잘 되어 있어요. 마라탕도 맛있었습니다.'},
  {i:20,d:'01-30',s:4,t:'가격도 저렴하고 맛도 좋아요. 재료가 신선한 게 느껴집니다.'},
  {i:21,d:'02-02',s:5,t:'겨울에 먹는 마라탕은 진리네요. 국물이 뜨겁고 매콤해서 몸이 녹았어요.'},
  {i:22,d:'02-03',s:5,t:'떡볶이가 맛있어서 포장까지 했어요. 양도 푸짐합니다.'},
  {i:23,d:'02-04',s:4,t:'마라탕 재료가 신선해요. 청경채가 아삭했습니다.'},
  {i:24,d:'02-05',s:5,t:'사장님이 항상 친절하세요. 학생이라고 조금 더 담아 주셨어요.'},
  {i:25,d:'02-06',s:5,t:'마라탕 맛있고 매장도 넓어서 좋아요. 친구들이랑 오기 딱입니다.'},
  {i:26,d:'02-09',s:4,t:'가격이 저렴해서 자주 옵니다. 맛도 좋아요.'},
  {i:27,d:'02-10',s:5,t:'튀김이 바삭하고 떡볶이 소스랑 잘 어울려요. 만족스러웠습니다.'},
  {i:28,d:'02-11',s:3,t:'오늘은 국물이 조금 짰어요. 그래도 재료는 신선했습니다.'},
  {i:29,d:'02-12',s:5,t:'마라탕 진짜 맛있어요. 다시 올 것 같아요.'},
  {i:30,d:'02-13',s:4,t:'점심시간에 잠깐 줄을 섰지만 금방 빠졌어요. 마라탕은 여전히 맛있습니다.'},
  {i:31,d:'02-16',s:5,t:'매장이 깨끗하고 자리도 편해요. 떡볶이 강추합니다.'},
  {i:32,d:'02-17',s:5,t:'마라탕에 넣을 재료가 많아서 좋아요. 매번 다르게 먹을 수 있어요.'},
  {i:33,d:'02-18',s:4,t:'국물이 얼큰하고 좋습니다. 양도 많아요.'},
  {i:34,d:'02-19',s:5,t:'사장님이 정성껏 만들어 주시는 게 느껴져요. 맛있게 먹었습니다.'},
  {i:35,d:'02-20',s:4,t:'떡볶이가 매콤하고 맛있어요. 가격도 부담 없습니다.'},
  {i:36,d:'02-23',s:5,t:'친구가 추천해서 왔는데 마라탕이 정말 맛있네요. 다시 올 생각입니다.'},
  {i:37,d:'02-24',s:4,t:'서빙이 빠르고 직원분들이 친절해요. 기분 좋게 먹었어요.'},
  {i:38,d:'02-25',s:5,t:'매장이 넓고 깨끗해서 오래 앉아 있기 좋아요. 마라탕도 맛있고요.'},
  {i:39,d:'02-26',s:4,t:'줄이 조금 길어졌네요. 그래도 맛있어서 기다릴 만합니다.'},
  {i:40,d:'02-27',s:5,t:'떡볶이랑 마라탕 둘 다 만족했어요. 양이 푸짐합니다.'},
  {i:41,d:'03-02',s:4,t:'개학하고 오니 사람이 엄청 많아졌어요. 줄이 길지만 마라탕은 맛있습니다.'},
  {i:42,d:'03-03',s:3,t:'웨이팅이 20분 넘었어요. 맛은 좋은데 기다리는 게 힘드네요.'},
  {i:43,d:'03-04',s:5,t:'마라탕 여전히 맛있어요. 재료도 신선하고 국물도 얼큰합니다.'},
  {i:44,d:'03-05',s:4,t:'떡볶이가 맛있어요. 다만 점심에는 줄을 서야 합니다.'},
  {i:45,d:'03-06',s:3,t:'대기가 길어서 수업에 늦을 뻔했어요. 맛은 좋습니다.'},
  {i:46,d:'03-09',s:5,t:'사장님이 친절하시고 마라탕도 맛있어요. 자주 옵니다.'},
  {i:47,d:'03-10',s:4,t:'가격 대비 양이 많아서 좋아요. 줄만 짧으면 완벽할 텐데요.'},
  {i:48,d:'03-11',s:3,t:'오늘 국물이 좀 짰어요. 사람이 많아서 정신없는 것 같습니다.'},
  {i:49,d:'03-12',s:5,t:'떡볶이 소스가 알차고 튀김도 바삭해요. 만족합니다.'},
  {i:50,d:'03-13',s:4,t:'마라탕 재료 종류가 많아요. 고르는 재미가 있습니다.'},
  {i:51,d:'03-16',s:2,t:'줄을 30분 서서 들어갔는데 자리가 좁아서 불편했어요.'},
  {i:52,d:'03-17',s:4,t:'매콤한 국물이 좋아요. 다만 웨이팅이 아쉽습니다.'},
  {i:53,d:'03-18',s:3,t:'사람이 많다 보니 서빙이 느려졌어요. 맛은 그대로입니다.'},
  {i:54,d:'03-19',s:5,t:'마라탕 맛있고 매장도 깨끗해요. 기분 좋게 먹었습니다.'},
  {i:55,d:'03-20',s:3,t:'국물이 예전보다 짜진 것 같아요. 조금 실망했습니다.'},
  {i:56,d:'03-23',s:4,t:'떡볶이는 여전히 맛있어요. 줄이 길어서 포장했습니다.'},
  {i:57,d:'03-24',s:5,t:'사장님이 친절하게 응대해 주셨어요. 마라탕도 맛있었습니다.'},
  {i:58,d:'03-25',s:4,t:'가격이 저렴해서 좋아요. 양도 푸짐합니다.'},
  {i:59,d:'03-26',s:3,t:'대기 줄이 너무 길어요. 맛있긴 한데 오래 걸립니다.'},
  {i:60,d:'03-27',s:4,t:'마라탕 국물이 뜨겁고 좋아요. 재료도 신선합니다.'},
  {i:61,d:'04-01',s:2,t:'셀프바에 채소가 거의 비어 있었어요. 재료를 못 골라서 실망했습니다.'},
  {i:62,d:'04-02',s:4,t:'마라탕은 여전히 맛있어요. 다만 줄이 깁니다.'},
  {i:63,d:'04-03',s:2,t:'마라탕이 미지근하게 나왔어요. 국물이 식어서 맛이 덜했습니다.'},
  {i:64,d:'04-06',s:3,t:'셀프바 소스가 굳어 있었어요. 맛은 괜찮았습니다.'},
  {i:65,d:'04-07',s:4,t:'떡볶이가 맛있어요. 사장님도 친절하십니다.'},
  {i:66,d:'04-08',s:2,t:'국물이 너무 짜졌어요. 예전 맛이 아니라 아쉽습니다.'},
  {i:67,d:'04-09',s:3,t:'대기 줄이 길어서 오래 기다렸어요. 맛은 좋습니다.'},
  {i:68,d:'04-10',s:1,t:'셀프바가 정리가 안 되어 있고 채소가 시들었어요. 실망이 큽니다.'},
  {i:69,d:'04-13',s:4,t:'마라탕 재료가 많아서 좋아요. 양도 푸짐합니다.'},
  {i:70,d:'04-14',s:2,t:'음식이 다 식은 채로 나왔어요. 다시 데워 달라고 했습니다.'},
  {i:71,d:'04-15',s:3,t:'셀프바에 두부가 비어 있었어요. 그래도 사장님은 친절하셨습니다.'},
  {i:72,d:'04-16',s:2,t:'국물이 짜고 미지근해요. 예전보다 별로입니다.'},
  {i:73,d:'04-17',s:4,t:'떡볶이는 맛있어요. 줄만 짧으면 좋겠습니다.'},
  {i:74,d:'04-20',s:1,t:'셀프바 주변이 지저분했어요. 실망스러웠습니다.'},
  {i:75,d:'04-21',s:3,t:'마라탕 맛은 괜찮은데 자리가 좁아서 불편했어요.'},
  {i:76,d:'04-22',s:2,t:'재료가 신선하지 않은 것 같아요. 국물도 짰습니다.'},
  {i:77,d:'04-23',s:4,t:'사장님이 친절하시고 마라탕도 맛있어요. 줄은 길었습니다.'},
  {i:78,d:'04-24',s:2,t:'셀프바가 비어 있어서 기다렸어요. 음식도 식어서 나왔습니다.'},
  {i:79,d:'04-27',s:3,t:'떡볶이가 조금 눅눅했어요. 그래도 양은 많습니다.'},
  {i:80,d:'04-28',s:2,t:'마라탕 국물이 예전만 못해요. 짜고 실망스럽습니다.'},
  {i:81,d:'05-04',s:1,t:'셀프바에 채소가 텅 비어 있었어요. 몇 번을 말해도 채워 주지 않아 실망했습니다.'},
  {i:82,d:'05-06',s:2,t:'마라탕이 식어서 나왔어요. 국물도 짜고 예전 맛이 아닙니다.'},
  {i:83,d:'05-07',s:2,t:'셀프바 관리가 안 돼요. 소스통이 비어 있고 주변도 지저분했습니다.'},
  {i:84,d:'05-08',s:3,t:'떡볶이는 맛있어요. 다만 셀프바가 아쉽습니다.'},
  {i:85,d:'05-11',s:1,t:'음식이 미지근하고 국물이 짰어요. 정말 실망입니다.'},
  {i:86,d:'05-12',s:2,t:'셀프바에 재료가 거의 비어 있어서 고를 게 없었어요.'},
  {i:87,d:'05-13',s:4,t:'마라탕은 여전히 맛있어요. 사장님도 친절하십니다.'},
  {i:88,d:'05-14',s:1,t:'셀프바가 지저분하고 채소가 시들었어요. 실망스러워서 다시 안 올 것 같아요.'},
  {i:89,d:'05-15',s:2,t:'줄은 짧아졌는데 음식이 식어서 나왔어요. 아쉽습니다.'},
  {i:90,d:'05-18',s:2,t:'국물이 너무 짜요. 예전에는 맛있었는데 실망입니다.'},
  {i:91,d:'05-19',s:3,t:'떡볶이가 눅눅했어요. 양은 많습니다.'},
  {i:92,d:'05-20',s:1,t:'셀프바가 비어 있고 음식도 식었어요. 최악입니다.'},
  {i:93,d:'05-21',s:4,t:'마라탕 맛있게 먹었어요. 매장은 깨끗했습니다.'},
  {i:94,d:'05-22',s:2,t:'대기 줄은 없어졌지만 맛이 예전 같지 않아요. 실망했습니다.'},
  {i:95,d:'05-25',s:2,t:'셀프바 채소가 시들시들해요. 관리가 안 되는 것 같습니다.'},
  {i:96,d:'05-26',s:1,t:'마라탕이 식은 채로 나왔고 국물도 짰어요. 실망이 큽니다.'},
  {i:97,d:'05-27',s:3,t:'사장님은 친절하신데 셀프바 관리가 안 되는 게 아쉬워요.'},
  {i:98,d:'05-28',s:2,t:'재료가 비어 있어서 고를 게 없었어요. 줄 서서 들어온 보람이 없습니다.'},
  {i:99,d:'05-29',s:4,t:'떡볶이는 맛있어요. 셀프바만 채워 주시면 좋겠습니다.'},
  {i:100,d:'05-30',s:2,t:'예전에는 정말 맛있었는데 요즘은 국물이 식고 짜요. 아쉽습니다.'},
];

const RV_STOP_DOMAIN = ['마라탕','떡볶이','국물','재료','매장','채소','사장님','직원','튀김'];

/* 10차시에서 그대로 승계한 기본 감성 사전 (씨마스 Ⅱ p.70) */
const RV_DICT_BASE = {
  P:['청결하다','편하다','좋다','친절','빠르다','맛있다','많다','알차다','최고','넓다'],
  N:['불결하다','불편하다','별로다','불친절','느리다','맛없다','적다','빈약하다','최악','좁다']
};
/* 활동 2의 추천 추가 칩 — 이 자료에 맞춘 확장 */
const RV_DICT_PLUS = {
  P:['신선하다','푸짐하다','저렴하다','매콤하다','뜨겁다','재방문','만족하다','정성'],
  N:['식다','짜다','비다','실망하다','눅눅하다','오래걸리다','아쉽다','지저분하다']
};

/* 탭 ② 별점 행렬(부록 C) — null = 아직 안 봄 */
const RV_WEBTOON = {
  items:['달빛 배달부','교실 뒤 창가','검은 고양이 탐정단','1학년 3반 히어로','연습생 도시락'],
  genre:['로맨스','로맨스','추리','액션','로맨스'],
  users:['지호','서연','민준','하윤'],
  M0:[[5,4,1,null,null],[4,5,2,1,5],[1,2,5,4,2],[2,2,1,1,3]],
  me:0
};

/* STEP 1 재시청 영상 3건(§0-2 #17 — 새 자료가 아니라 복습용) */
const RV_VIDEOS = [
  {id:'2YEGyVmyGxc', t:'↺ 다시 보기 · 10차시 — 10. 감성 분석 (8:09)',
   s:'mathT야나수 〈인공지능 수학〉 · 오늘 대시보드 왼쪽 두 패널이 이 영상의 내용입니다.'},
  {id:'meEchvkdB1U', t:'↺ 다시 보기 · 8차시 — [딥러닝 자연어처리] TF-IDF (5:09)',
   s:'Minsuk Heo 허민석 · 오늘 “숨은 단어”를 끌어올리는 도구입니다. 계산 절차가 흐릿하면 5분만 다시 보세요.'},
  {id:'liNDuZDW5d4', t:'↺ 다시 보기 · 9차시 — 12. 유사도 분석을 이용한 텍스트 분석 (8:20)',
   s:'mathT야나수 · 오늘 탭 ②의 추천이 이 영상의 마지막 장면과 같은 계산입니다.'}
];

/* 마중 퀴즈 3문항 */
const RV_WARM = [
  {q:'어떤 단어가 리뷰 100건 전체에서 가장 많이 나왔습니다. 이 단어는 가게의 문제점을 찾는 데 도움이 될까요?',
   opts:['① 가장 많이 나왔으므로 가장 중요한 단서다',
         '② 모든 시기에 골고루 나온 말이면 오히려 단서가 되기 어렵다',
         '③ 횟수가 많을수록 IDF도 커지므로 중요하다',
         '④ 리뷰의 개수가 많으면 판단할 수 없다'],
   answer:1,
   explain:'8차시에서 배운 그대로입니다. 다섯 달 모두에 나온 단어는 DF가 5로 가장 커서 IDF = 5 ÷ 5 = 1로 가장 작아집니다. ' +
     '“맛있다”처럼 언제나 나오는 말은 <b>어느 달의 특징도 알려 주지 못합니다.</b> ' +
     '③은 IDF가 DF의 역수임을 거꾸로 알고 있는 경우입니다. 오늘은 이 원리로 100건 속에 한 번도 눈에 띄지 않던 단어를 끌어올립니다.'},
  {q:'감성 사전이 긍정 단어 10개, 부정 단어 10개입니다. 어떤 리뷰에서 감성 단어가 2개 잡혔고 둘 다 긍정 단어였습니다. 이때 J(P, A)의 값은?',
   opts:['① 2 ÷ (10 + 2) = 0.17','② 2 ÷ (10 + 2 − 2) = 0.20','③ 2 ÷ 2 = 1.00','④ 2 ÷ 20 = 0.10'],
   answer:1,
   explain:'A = {긍정어1, 긍정어2}는 P에 모두 들어 있으므로 P∩A의 원소는 2개, P∪A의 원소는 n(P) + n(A) − n(P∩A) = 10 + 2 − 2 = 10개입니다. ' +
     '따라서 J(P, A) = 2 ÷ 10 = 0.20입니다. <b>여기서 중요한 것은 이 값이 이 리뷰가 받을 수 있는 최댓값이라는 점입니다.</b> ' +
     '10차시의 기준값 k = 0.25와 견주어 보면 어떤 일이 벌어질까요? 오늘 활동 2에서 확인합니다.'},
  {q:'어떤 추천 서비스가 내가 좋아한 것과 비슷한 것만 계속 추천합니다. 다음 중 이 상황을 가장 잘 설명한 것은?',
   opts:['① 추천이 정확하므로 아무 문제가 없다','② 계산에 오류가 있어 생긴 일이다',
         '③ 잘 맞는 추천이 반복되면서 접하는 정보의 폭이 좁아진 것이다',
         '④ 유사도를 코사인 대신 유클리드로 바꾸면 해결된다'],
   answer:2,
   explain:'추천이 ‘틀려서’ 생긴 문제가 아니라 <b>너무 잘 맞아서</b> 생긴 문제입니다. 나와 비슷한 것만 고르는 규칙을 반복하면 ' +
     '내가 보는 세계가 점점 좁아집니다. 이것을 필터 버블(filter bubble)이라고 부릅니다. ' +
     '④처럼 자를 바꾸는 것으로는 해결되지 않습니다 — 문제는 자가 아니라 <b>“비슷한 것만 권한다”는 규칙 자체</b>에 있기 때문입니다.'}
];

/* 형성평가 5문항 */
const RV_QUIZ = [
  {q:'리뷰를 다섯 달치 문서 D1~D5로 묶었습니다. 어떤 단어가 4월과 5월 문서에만 나왔고, 5월 문서에서 9번 나왔습니다. 이 단어의 5월 TF-IDF 값은? (단, IDF = n ÷ DF, n은 전체 문서의 개수)',
   opts:['① 9','② 18','③ 22.5','④ 45'], answer:2,
   explain:'문서는 5개이므로 n = 5이고, 이 단어가 나온 문서는 4월·5월 두 개이므로 DF = 2입니다. 따라서 IDF = 5 ÷ 2 = 2.5이고, ' +
     'TF-IDF = TF × IDF = 9 × 2.5 = 22.5입니다. ①은 IDF를 곱하지 않은 값, ④는 DF로 나누지 않고 곱한 값입니다. ' +
     '→ 되돌아가기: <b>활동 3</b> [12인수02-02]'},
  {q:'같은 자료에서 ‘맛있다’는 다섯 달 모두에 나왔고 5월 문서에서 6번 나왔습니다. ‘맛있다’의 5월 TF-IDF는 6이고, 앞 문항 단어의 값은 22.5입니다. 전체 리뷰에서 나온 횟수는 ‘맛있다’가 36회, 앞 문항의 단어가 15회입니다. 이 사실이 뜻하는 것으로 가장 알맞은 것은?',
   opts:['① 횟수를 잘못 세었다','② TF-IDF는 언제나 TF보다 큰 값을 준다',
         '③ 많이 나온 단어라도 모든 시기에 골고루 나오면 특정 시기의 특징을 설명하지 못한다',
         '④ 문서 수 n을 늘리면 IDF가 작아진다'], answer:2,
   explain:'‘맛있다’는 다섯 달 모두에 나오므로 DF = 5, IDF = 5 ÷ 5 = 1로 가중치가 가장 작습니다. 반면 두 달에만 몰린 단어는 IDF가 2.5로 커집니다. ' +
     '그래서 <b>횟수가 절반도 안 되는 단어가 특징어로 뽑힙니다.</b> ④는 반대입니다 — 같은 DF에서 n이 커지면 IDF는 오히려 커집니다. → 되돌아가기: <b>활동 3</b>'},
  {q:'긍정 단어 집합 P의 원소가 10개이고 임계값이 k = 0.25입니다. 어떤 리뷰에서 감성 단어가 2개 잡혔고 둘 다 긍정 단어일 때, 이 리뷰의 판정은?',
   opts:['① 긍정','② 중립','③ 부정','④ 판단할 수 없다'], answer:1,
   explain:'A = {긍정어 2개}이므로 J(P, A) = 2 ÷ (10 + 2 − 2) = 0.20, J(N, A) = 0입니다. 감성 점수는 0.20이고 0.20 &lt; 0.25이므로 중립입니다. ' +
     '더 중요한 것은 <b>이 값이 이 리뷰가 받을 수 있는 최댓값</b>이라는 점입니다. 일반적으로 J(P, A) ≤ n(A) ÷ n(P) = 2 ÷ 10 = 0.2 이므로, ' +
     '<b>아무리 칭찬만 가득해도 k = 0.25로는 긍정이 될 수 없습니다.</b> → 되돌아가기: <b>활동 2</b>'},
  {q:'앞 문항의 상황에서 이 리뷰가 ‘긍정’으로 판정되게 하려면 어떻게 해야 할까요? 옳은 것을 모두 고르면? ㉠ 임계값 k를 0.10으로 낮춘다 ㉡ 감성 사전 P의 원소를 20개로 늘린다 ㉢ 사전에 이 자료에서 자주 쓰이는 표현을 넣는다 ㉣ 리뷰를 더 짧게 자른다',
   opts:['① ㉠','② ㉠, ㉡','③ ㉠, ㉢','④ ㉡, ㉣'], answer:2,
   explain:'㉠ k를 낮추면 n(A) ≥ k × n(P) = 0.10 × 10 = 1이 되어 판정이 가능해집니다. ㉢ 이 자료에 맞는 표현을 넣으면 n(A)가 커져 부등식이 만족됩니다. ' +
     '<b>㉡은 반대입니다</b> — n(P)가 커지면 분모가 커져 J(P, A)가 오히려 작아집니다(실제로 사전을 10개에서 18개로 늘렸더니 중립이 95건에서 100건으로 늘었습니다). ' +
     '㉣ 리뷰를 자르면 n(A)가 더 작아져 상황이 나빠집니다. <b>사전과 k, 두 손잡이를 함께 돌려야 합니다.</b> → 되돌아가기: <b>활동 2</b>'},
  {q:'네 사람이 매긴 별점으로 지호에게 웹툰을 추천하려 합니다. 공통으로 본 세 작품의 별점 벡터는 지호 (5, 4, 1), 서연 (4, 5, 2), 하윤 (2, 2, 1)입니다. 다음 서술 중 옳지 않은 것은?',
   opts:['① 유클리드 유사도로는 서연이, 코사인 유사도로는 하윤이 지호와 가장 가깝다',
         '② 하윤은 전체적으로 별점을 짜게 주지만 작품 사이의 선호 순서는 지호와 비슷하다',
         '③ 어떤 유사도를 쓰든 가장 가까운 사람은 같으므로, 유사도의 종류는 추천에 영향을 주지 않는다',
         '④ 유사도 행렬은 대각선이 모두 1이고 대각선을 기준으로 대칭이다'], answer:2,
   explain:'실제로 d(지호, 서연) = √3 ≒ 1.73으로 거리가 가장 가깝지만, 코사인 유사도는 C(지호, 하윤) ≒ 0.98로 하윤이 가장 큽니다. ' +
     '<b>자를 바꾸면 1위 이웃이 바뀌고, 그에 따라 추천의 근거와 강도도 달라집니다.</b> ②가 그 이유입니다 — 하윤의 벡터는 크기가 작아 거리는 멀지만 ' +
     '방향(선호의 모양)은 지호와 거의 같습니다. 유사도의 선택은 계산이 아니라 <b>판단</b>입니다. → 되돌아가기: <b>활동 5</b> [12인수02-03]'}
];

/* 핵심 개념 칩 상세 */
const RV_DEFS = {
  '데이터 대시보드':
    '<h4>데이터 대시보드</h4>' +
    '<p><b>정의.</b> 여러 개의 그래프·표를 한 화면에 모아, 자료 전체의 모습을 한눈에 보게 만든 화면을 <b>대시보드</b>라고 합니다. ' +
    '대시보드가 하는 일은 자료를 <b>요약</b>하는 것입니다. 리뷰 100건을 그대로 읽는 대신 ① 시간에 따른 감성 점수의 변화 ' +
    '② 긍정·중립·부정의 비율 ③ 시기마다 두드러진 단어 ④ 서로 닮은 리뷰의 묶음 — 이 네 가지 수로 바꾸어 봅니다.</p>' +
    '<p><b>예시.</b> 별점만 보면 “4.6 → 2.2로 떨어졌다”는 사실 하나뿐입니다. 그러나 월별 평균 감성 점수를 꺾은선으로 그리면 ' +
    '<b>어느 달에 꺾였는지</b>가 보이고, 그 달의 리뷰만 따로 모아 TF-IDF를 구하면 <b>왜 꺾였는지</b>가 보입니다.</p>' +
    '<p><b>이번 차시 연결.</b> 탭 ①의 네 활동이 각각 위 ①~④에 해당합니다. ' +
    '<button class="btn" type="button" onclick="rvSee(0,\'rv-act1\')">활동 1로 이동</button> ' +
    '<button class="btn" type="button" onclick="rvGo(\'text\',\'freq\')">7차시 빈도수 벡터</button></p>' +
    '<span class="rv-src">씨마스 「인공지능 수학」 Ⅱ p.66 「리뷰 분석 서비스로 기업 가치 향상」 서술을 재구성</span>',
  '시기별 문서와 TF-IDF':
    '<h4>시기별 문서와 TF-IDF</h4>' +
    '<p><b>정의.</b> 8차시에서 TF-IDF는 <b>여러 문서</b>가 있어야 구할 수 있었습니다(DF = 그 단어가 나온 문서의 개수). ' +
    '리뷰 100건은 문서가 100개인 셈이지만 한 건이 너무 짧아 그대로는 쓸모가 적습니다. 그래서 <b>같은 달의 리뷰 20건을 하나로 묶어 한 문서로</b> 봅니다. ' +
    '그러면 문서가 5개(1월~5월)인 자료가 되고, 각 달마다 <b>“그 달다운 단어”</b>를 뽑을 수 있습니다.</p>' +
    '<div class="rv-scroll"><table class="rv-tbl">' +
    '<tr><th>기호</th><th>뜻</th><th>이 자료에서</th></tr>' +
    '<tr><td>n</td><td>전체 문서의 개수</td><td>5 (1월~5월)</td></tr>' +
    '<tr><td>TF</td><td>그 달 문서에서 단어가 나온 횟수</td><td>5월 ‘셀프바’ → 9</td></tr>' +
    '<tr><td>DF</td><td>그 단어가 나온 <b>달의 개수</b></td><td>‘셀프바’ → 2 (4·5월)</td></tr>' +
    '<tr><td>IDF</td><td>n ÷ DF</td><td>5 ÷ 2 = 2.5</td></tr>' +
    '<tr><td>TF-IDF</td><td>TF × IDF</td><td>9 × 2.5 = <b>22.5</b></td></tr></table></div>' +
    '<p><b>예시.</b> ‘맛있다’는 다섯 달 모두 나오므로 DF = 5, IDF = 1입니다. 5월에 6번 나왔으니 TF-IDF는 6. ' +
    '반면 ‘셀프바’는 4·5월에만 나오므로 IDF가 2.5로 커져 TF-IDF가 22.5가 됩니다. ' +
    '<b>횟수는 ‘맛있다’가 훨씬 많은데도</b>(전체 36회 vs 15회) 5월 문서의 특징어로는 ‘셀프바’가 뽑히는 것입니다.</p>' +
    '<p><button class="btn" type="button" onclick="rvSee(0,\'rv-act3\')">활동 3으로 이동</button> ' +
    '<button class="btn" type="button" onclick="rvGo(\'tfidf\')">8차시 TF-IDF</button></p>' +
    '<span class="rv-src">씨마스 「인공지능 수학」 Ⅱ p.60~62(빈도수 벡터·주제어 추출) 및 8차시 IDF = n ÷ DF 규약을 재구성</span>',
  '판정 가능 조건':
    '<h4>판정 가능 조건 n(A) ≥ k·n(P)</h4>' +
    '<p><b>정의.</b> 10차시에서 감성 점수는 J(P, A) − J(N, A) 였고, 긍정 판정은 이 값이 <b>k 이상</b>일 때였습니다. ' +
    '그런데 자카드 유사도에는 <b>넘을 수 없는 천장</b>이 있습니다. 분자 n(P∩A)는 아무리 커도 n(A)를 넘을 수 없으므로</p>' +
    '<div class="rv-fml">J(P, A) = n(P∩A) ÷ { n(P) + n(A) − n(P∩A) } ≤ n(A) ÷ n(P)</div>' +
    '<p>입니다(등호는 A의 원소가 모두 P에 들어 있을 때). 따라서 감성 점수도 n(A) ÷ n(P)를 넘지 못하고, ' +
    '<b>긍정 판정이 가능하려면 n(A) ≥ k × n(P)</b> 여야 합니다.</p>' +
    '<p><b>예시 1.</b> 사전이 P 10개, k = 0.25일 때 → n(A) ≥ 2.5, 즉 감성 단어가 <b>3개 이상</b> 잡혀야 합니다. ' +
    '우리 리뷰는 대부분 2개이므로 <b>아무리 칭찬 일색이어도 긍정이 될 수 없습니다.</b><br>' +
    '<b>예시 2.</b> 같은 사전에서 k를 0.10으로 낮추면 n(A) ≥ 1, 감성 단어 1개만 있어도 판정이 가능해집니다.</p>' +
    '<p><button class="btn" type="button" onclick="rvSee(0,\'rv-act2\')">활동 2로 이동</button> ' +
    '<button class="btn" type="button" onclick="rvGo(\'senti\')">10차시 임계값 k</button></p>' +
    '<span class="rv-src">씨마스 「인공지능 수학」 Ⅱ p.70~71 판정 기준 표를 근거로 부등식 형태로 재구성(집필진 확장)</span>',
  '유사도 행렬':
    '<h4>유사도 행렬(대칭)</h4>' +
    '<p><b>정의.</b> 여러 대상을 서로서로 비교한 유사도 값을 <b>표로 정리한 것</b>을 유사도 행렬이라고 합니다. ' +
    'i번째 대상과 j번째 대상의 유사도를 i행 j열에 적습니다. 이 표에는 두 가지 성질이 있습니다.</p>' +
    '<ul><li><b>대각선은 모두 1</b> — 자기 자신과의 코사인 유사도는 항상 1입니다.</li>' +
    '<li><b>대각선을 접으면 포개집니다(대칭)</b> — C(a, b)와 C(b, a)는 같은 값이므로 i행 j열과 j행 i열이 같습니다. ' +
    '그래서 실제로 계산할 값은 4명이면 6개(= 4×3÷2)뿐입니다.</li></ul>' +
    '<p><b>예시.</b> 네 사람의 별점 벡터로 만든 4×4 표에서 지호 행·서연 열의 값 0.97은 서연 행·지호 열에도 그대로 나타납니다.</p>' +
    '<p><button class="btn" type="button" onclick="rvSee(1,\'rv-act5\')">활동 5로 이동</button> ' +
    '<button class="btn" type="button" onclick="rvGo(\'sim\')">9차시 유사도</button> ' +
    '<button class="btn" type="button" onclick="rvGo(\'hamming\')">13차시 해밍 거리</button></p>' +
    '<span class="rv-src">씨마스 「인공지능 수학」 Ⅱ p.81 발전 문제 05(세 사람의 선호도 벡터 사이 유사도 비교)를 표 형태로 확장·재구성</span>',
  '추천의 근거와 필터 버블':
    '<h4>추천의 근거와 필터 버블 <span class="rv-badge">참고</span></h4>' +
    '<p><b>정의.</b> 나와 취향이 비슷한 사람을 찾아, <b>그 사람이 좋아했지만 내가 아직 보지 않은 것</b>을 권하는 방식을 ' +
    '<b>협업 필터링(collaborative filtering)</b> 이라고 합니다. 여기서 ‘취향이 비슷하다’는 판단이 곧 유사도이므로, 추천은 유사도 계산 위에 세워집니다.</p>' +
    '<p>그런데 이 방식은 구조상 <b>내가 이미 좋아하는 것과 닮은 것만</b> 계속 권하게 됩니다. 그 결과 자신의 관심사와 일치하는 정보에만 계속 노출되어, ' +
    '마치 거품 안에 갇힌 것처럼 보는 세계가 좁아지는 현상을 <b>필터 버블(filter bubble)</b> 이라고 합니다.</p>' +
    '<p><b>예시.</b> 웹툰 추천에서 지호가 로맨스에 5점을 몇 번 주면, 이후 추천 목록은 로맨스로 채워집니다. ' +
    '지호는 액션 웹툰을 싫어해서가 아니라 <b>한 번도 접하지 못해서</b> 안 보게 됩니다.</p>' +
    '<p><button class="btn" type="button" onclick="rvSee(1,\'rv-act6\')">활동 6으로 이동</button> ' +
    '<button class="btn" type="button" onclick="rvGo(\'bias\')">5차시 데이터 편향</button></p>' +
    '<span class="rv-src">천재 「인공지능 수학」 교과서 p.172 「제한된 정보 환경을 조성하는 추천 서비스」 및 미래엔 「인공지능 수학」 p.158 생각 열기 사례 ㈏ 를 재구성</span>'
};

/* ── 4. 상태 ─────────────────────────────────────────────────────────────── */
let rvData    = [];            /* 분석 대상 리뷰 */
let rvDict    = {P:[], N:[]};  /* 현재 감성 사전 */
let rvDictSrc = '기본';         /* '우리 반' | '기본' */
let rvDictSkip = null;         /* 10차시 사전이 이 자료에 맞지 않아 물러난 경우 {hit, total} */
let rvKv      = 0.25;
let rvRows    = [];            /* 분석 결과 */
let rvDone    = false;         /* [분석하기]를 눌렀는가 */
let rvMonthSel   = '';
let rvVerdictSel = '';
let rvStopMode   = 1;
let rvStopList   = RV_STOP_DOMAIN.slice();
let rvCombo   = {b25:null, b10:null, w25:null, w10:null};
let rvA3Month = '05';
let rvA3Word  = '';
let rvA3Seen  = {};
let rvA3Guessed = false;
let rvSimMd   = 'cos';
let rvSimBase = 0;
let rvSimSeen = {};
let rvU = null, rvVecs = null;
let rvMat = null;
let rvMatMd = 'cos';
let rvZero = false;
let rvRecDone = false;
let rvA5Guessed = false;
let rvBubbleN = 1;
let rvBubbleMixOn = false;
let rvBubbleRan = false;

/* ── 5. 사전·데이터 로드 ─────────────────────────────────────────────────── */
function rvDictClone(d){ return {P:(d.P||[]).slice(), N:(d.N||[]).slice()}; }
function rvDictWideP(){ return RV_DICT_BASE.P.concat(RV_DICT_PLUS.P); }
function rvDictWideN(){ return RV_DICT_BASE.N.concat(RV_DICT_PLUS.N); }

/* 이 자료(리뷰)에서 실제로 나오는 낱말의 집합 — 사전이 쓸 만한지 재는 자입니다. */
let rvVocabCache = null;
function rvVocab(){
  const src = (rvData && rvData.length) ? rvData : RV_REVIEWS;
  if(rvVocabCache && rvVocabCache.src === src) return rvVocabCache.v;
  const v = {};
  src.forEach(function(r){ rvLemma(r.t).forEach(function(w){ v[w] = 1; }); });
  rvVocabCache = {src: src, v: v};
  return v;
}
/* 10차시 사전을 읽어 옵니다(쓰지 않습니다).
   ① 10차시 stDictSave() 는 {p, n} 처럼 소문자 키로 저장하므로 대·소문자 양쪽을 받습니다
      (aimath.senti.dict 는 10차시 소유 키 — 이름도 내용도 여기서 고치지 않습니다).
   ② 10차시는 학생이 손대지 않아도 자기 기본 사전(상담 문장용: 괜찮다·힘들다 …)을 이 키에 적어 둡니다.
      그 사전으로 분식집 리뷰를 재면 20개 중 2개만 걸려 100건이 통째로 중립이 되고,
      활동 2의 「긍 5 · 중 95 · 부 0」 장면(§9-1)이 무너집니다.
      그래서 저장된 사전은 「이 자료의 낱말을 실제로 잡을 수 있을 때만」 씁니다 —
      겹침이 40% 미만이면 씨마스 Ⅱ p.70 음식점 사전으로 시작하고, 그 사실을 배지에 밝힙니다.
      (이것도 이 차시의 논지 그대로입니다 — 사전은 자료가 사는 세계를 담아야 합니다.) */
function rvLoadDict(){
  let d = null;
  rvDictSkip = null;
  try{
    const raw = rvLS(RV_K_SENTI, '');
    if(raw){
      const o = JSON.parse(raw) || {};
      const P = Array.isArray(o.P) ? o.P : (Array.isArray(o.p) ? o.p : null);
      const N = Array.isArray(o.N) ? o.N : (Array.isArray(o.n) ? o.n : null);
      if(P && N && P.length && N.length){
        const all = P.concat(N);
        const voc = rvVocab();
        const hit = all.filter(function(w){ return voc[w] === 1; }).length;
        if(hit >= all.length * 0.4){
          d = {P:P.slice(), N:N.slice()};
          rvDictSrc = '우리 반';
        }else{
          rvDictSkip = {hit: hit, total: all.length};
        }
      }
    }
  }catch(e){}
  if(!d){ d = rvDictClone(RV_DICT_BASE); rvDictSrc = '기본'; }
  rvDict = d;
}
function rvLoadData(){
  const raw = rvLS(RV_K_DATA, '');
  if(raw){
    const parsed = rvParseCSV(raw);
    if(parsed.length){ rvData = parsed; return; }
  }
  rvData = RV_REVIEWS.slice();
}
/* 한 줄 = 한 건, 「날짜,별점,본문」 */
function rvParseCSV(text){
  const out = [];
  String(text || '').split(/\r?\n/).forEach(function(line){
    const s = line.trim();
    if(!s) return;
    const m = s.match(/^([0-9]{1,4}[-/.][0-9]{1,2}(?:[-/.][0-9]{1,2})?)\s*,\s*([1-5])\s*,\s*(.+)$/);
    if(!m) return;
    let d = m[1].replace(/[/.]/g, '-');
    const p = d.split('-');
    if(p.length === 3) d = ('0' + p[1]).slice(-2) + '-' + ('0' + p[2]).slice(-2);
    else d = ('0' + p[0]).slice(-2) + '-' + ('0' + p[1]).slice(-2);
    out.push({i: out.length + 1, d: d, s: parseInt(m[2], 10), t: m[3]});
  });
  return out;
}

/* ── 6. 엔진 (재사용 + 이 차시의 4개) ────────────────────────────────────── */
/* 판정 가능 조건 n(A) ≥ k·n(P) */
function rvGuard(nA, nP, k){
  const need = k * nP;
  return {possible: nA >= need - 1e-12, needed: need, actual: nA, min: Math.max(1, Math.ceil(need - 1e-12))};
}
/* 표제어 결과는 사전·k와 무관하므로 자료가 바뀔 때만 다시 계산합니다(슬라이더 반응 속도). */
let rvTokCache = null;
function rvTokens(){
  if(rvTokCache && rvTokCache.n === rvData.length && rvTokCache.src === rvData) return rvTokCache.v;
  const v = rvData.map(function(r){ return rvLemma(r.t); });
  rvTokCache = {n: rvData.length, src: rvData, v: v};
  return v;
}
function rvAnalyze(){
  const P = rvDict.P, N = rvDict.N;
  const PN = {};
  P.forEach(function(w){ PN[w] = 1; });
  N.forEach(function(w){ PN[w] = 1; });
  const TK = rvTokens();
  rvRows = rvData.map(function(r, ri){
    const toks = TK[ri];
    const A = stSet(toks).filter(function(w){ return PN[w] === 1; });
    const jp = stJ(P, A), jn = stJ(N, A);
    const sc = jp - jn;
    return {i:r.i, d:r.d, s:r.s, m:String(r.d).slice(0,2), t:r.t,
            toks:toks, A:A, jp:jp, jn:jn, sc:sc, v:stVerdict(sc, rvKv)};
  });
  return rvRows;
}
function rvMonths(){
  const seen = [], has = {};
  rvRows.forEach(function(r){ if(!has[r.m]){ has[r.m] = 1; seen.push(r.m); } });
  seen.sort();
  return seen;
}
function rvMonthStat(m){
  const mr = rvRows.filter(function(r){ return r.m === m; });
  const n = mr.length || 1;
  const c = {긍정:0, 중립:0, 부정:0};
  mr.forEach(function(r){ c[r.v]++; });
  return {m:m, n:mr.length,
          star: mr.reduce(function(a,r){ return a + r.s; }, 0) / n,
          sc:   mr.reduce(function(a,r){ return a + r.sc; }, 0) / n,
          p:c.긍정, z:c.중립, g:c.부정};
}
function rvCount(){
  const c = {긍정:0, 중립:0, 부정:0};
  rvRows.forEach(function(r){ c[r.v]++; });
  return c;
}
/* 시기별 문서로 묶기 */
function rvBucket(){
  const keys = rvMonths();
  const docs = {};
  keys.forEach(function(m){ docs[m] = {}; });
  const stop = (rvStopMode === 0) ? [] : rvStopList;
  const sp = {}; stop.forEach(function(w){ sp[w] = 1; });
  rvRows.forEach(function(r){
    r.toks.forEach(function(w){
      if(sp[w] === 1) return;
      docs[r.m][w] = (docs[r.m][w] || 0) + 1;
    });
  });
  return {keys:keys, docs:docs};
}
/* TF · DF · IDF(= n ÷ DF) · TF-IDF — 8차시 규약을 문서 배열용으로 감싼 것 */
function rvTfidf(bucket){
  const keys = bucket.keys, docs = bucket.docs, n = keys.length || 1;
  const DF = {}, total = {};
  keys.forEach(function(m){
    Object.keys(docs[m]).forEach(function(w){
      if(docs[m][w] > 0) DF[w] = (DF[w] || 0) + 1;
      total[w] = (total[w] || 0) + docs[m][w];
    });
  });
  const IDF = {}, TFIDF = {};
  Object.keys(DF).forEach(function(w){ IDF[w] = n / DF[w]; });
  keys.forEach(function(m){
    TFIDF[m] = {};
    Object.keys(docs[m]).forEach(function(w){ TFIDF[m][w] = docs[m][w] * IDF[w]; });
  });
  return {n:n, keys:keys, TF:docs, DF:DF, IDF:IDF, TFIDF:TFIDF, total:total};
}
/* 전체집합 U(가나다순)와 빈도수 벡터 — 활동 4 */
function rvBuildU(){
  const seen = {};
  rvRows.forEach(function(r){ r.toks.forEach(function(w){ seen[w] = 1; }); });
  rvU = Object.keys(seen).sort(function(a,b){ return a < b ? -1 : (a > b ? 1 : 0); });
  rvVecs = rvRows.map(function(r){
    const c = {};
    r.toks.forEach(function(w){ c[w] = (c[w] || 0) + 1; });
    return rvU.map(function(w){ return c[w] || 0; });
  });
}

/* ── 7. 화면 — 배지·경고 배너 ────────────────────────────────────────────── */
function rvBadges(){
  const box = rvEl('rv-badges');
  if(!box) return;
  const wide = rvIsWide();
  const c = rvDone ? rvCount() : null;
  box.innerHTML =
    '<span class="rv-badge">분석한 리뷰 <b>' + rvData.length + '건</b></span>' +
    '<span class="rv-badge">현재 사전: <b>P ' + rvDict.P.length + '개 / N ' + rvDict.N.length + '개</b>' +
      (wide ? ' (넓힌 사전)' : ' (10차시)') + '</span>' +
    '<span class="rv-badge">' + (rvDictSrc === '우리 반'
      ? '10차시에서 만든 <b>우리 반 사전</b>'
      : (rvDictSkip
        ? '<b>씨마스 p.70 음식점 사전</b>(10차시에 저장된 사전은 이 자료의 낱말을 ' +
          rvDictSkip.total + '개 중 <b>' + rvDictSkip.hit + '개</b>밖에 잡지 못해 쓰지 않았습니다)'
        : '<b>10차시 기본 사전</b>(저장된 사전이 없습니다)')) + '</span>' +
    '<span class="rv-badge"><b>k = ' + rvKv.toFixed(2) + '</b></span>' +
    /* 지난 시간에 [대시보드 고정]으로 정해 둔 k 가 있으면 알려 줍니다.
       화면은 §0-2 #19 에 따라 늘 0.25 에서 다시 시작하므로, 그 값을 잃지 않았음을 밝혀 둡니다. */
    (function(){
      const ks = parseFloat(rvLS(RV_K_K, ''));
      return (!isNaN(ks) && Math.abs(ks - rvKv) > 1e-9)
        ? '<span class="rv-badge">지난 시간에 정한 <b>k = ' + ks.toFixed(2) + '</b> 저장됨 — 학습지에는 이 값이 인쇄됩니다</span>'
        : '';
    })() +
    (c ? '<span class="rv-badge good">긍정 <b>' + c.긍정 + '</b></span>' +
         '<span class="rv-badge">중립 <b>' + c.중립 + '</b></span>' +
         '<span class="rv-badge hot">부정 <b>' + c.부정 + '</b></span>' +
         '<span class="rv-badge mark">' + rvData.length + '건 분석 완료</span>' : '');
}
function rvIsWide(){
  const w = rvDictWideP();
  return rvDict.P.length >= w.length;
}
/* 활동 2의 핵심 UI — 판정 불가 경고 배너 */
function rvGuardBanner(){
  const box = rvEl('rv-guard');
  if(!box) return;
  const nP = rvDict.P.length, nN = rvDict.N.length;
  const g = rvGuard(0, nP, rvKv);
  const gN = rvGuard(0, nN, rvKv);
  const nAs = rvRows.map(function(r){ return r.A.length; }).sort(function(a,b){ return a - b; });
  const med = nAs.length ? nAs[Math.floor(nAs.length / 2)] : 0;
  const able = rvRows.filter(function(r){ return r.A.length >= g.min; }).length;
  const need = rvEl('rv-k-need');
  if(need) need.innerHTML = '지금 설정에서는 감성 단어가 <b>' + g.min + '개 이상</b>이어야 긍정 판정이 가능합니다 ' +
    '(n(A) ≥ k × n(P) = ' + rvKv.toFixed(2) + ' × ' + nP + ' = ' + (rvKv * nP).toFixed(2) + ').';
  if(!rvDone){ box.classList.remove('on'); return; }
  const mxA = nAs.length ? nAs[nAs.length - 1] : 0;
  if(g.min > med){
    box.classList.add('on');
    box.innerHTML = '⚠️ <b>현재 설정으로는 이 자료에서 ‘긍정’ 판정이 나올 수 없습니다</b> — 감성 단어가 <b>' + g.min +
      '개 이상</b>이어야 합니다. 그런데 이 자료는 <b>절반이 ' + med + '개 이하</b>이고, 가장 많이 잡힌 리뷰도 <b>' +
      mxA + '개</b>뿐입니다.' +
      '<span class="sub">n(A) ≥ k × n(P) : ' + rvKv.toFixed(2) + ' × ' + nP + ' = ' + (rvKv * nP).toFixed(2) +
      ' → ' + g.min + '개 이상 (부정 쪽은 ' + rvKv.toFixed(2) + ' × ' + nN + ' = ' + (rvKv * nN).toFixed(2) +
      ' → ' + gN.min + '개 이상) · 조건을 만족하는 리뷰 ' + able + ' / ' + rvRows.length + '건' +
      ' · 계산이 틀린 것이 아니라 기준이 자료에 맞지 않은 것입니다.</span>';
  }else{
    box.classList.remove('on');
  }
}

/* ── 8. 탭·이동 ──────────────────────────────────────────────────────────── */
function rvTab(n, el){
  const root = rvEl('v-review');
  if(!root) return;
  root.querySelectorAll('.tabs .tab').forEach(function(t){ t.classList.remove('on'); });
  if(el) el.classList.add('on');
  root.querySelectorAll('.tpanel').forEach(function(p){ p.classList.remove('on'); });
  const p = rvEl('rv-p' + n);
  if(p) p.classList.add('on');
  setTimeout(rvResizeAll, 40);
}
function rvSee(tab, id){
  const root = rvEl('v-review');
  if(!root) return;
  const btns = root.querySelectorAll('.tabs .tab');
  if(btns[tab]) rvTab(tab, btns[tab]);
  const el = rvEl(id);
  if(el && el.scrollIntoView){
    try{ el.scrollIntoView({behavior: rvReduce() ? 'auto' : 'smooth', block:'start'}); }catch(e){ el.scrollIntoView(); }
  }
}
/* 다섯 자루의 자 · 개념 칩의 차시 이동 */
function rvGo(v, anchor){
  try{ go(v); }catch(e){ return; }
  if(!anchor) return;
  setTimeout(function(){
    try{
      if(v === 'text' && typeof txOpen === 'function') txOpen(anchor);
    }catch(e){}
  }, 60);
}

/* ── 9. 활동 1 — 꺾은선 ──────────────────────────────────────────────────── */
function rvPredict1(k, el){
  const box = rvEl('rv-a1-guess');
  if(box) box.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  const p = rvEl('rv-a1-panel');
  if(p) p.classList.remove('rv-veil');
  setTimeout(rvDrawLine, 30);
}
function rvDrawLine(){
  const cv = rvEl('rv-line');
  const pr = rvPrep(cv);
  if(!pr || !rvRows.length) return;
  const ctx = pr.ctx, W = pr.w, H = pr.h;
  const ms = rvMonths();
  const st = ms.map(rvMonthStat);
  const L = 42, R = W - 46, T = 22, B = H - 30;
  const fg = rvCss('--fg','#1a1714'), mu = rvCss('--muted','#78726a');
  const bd = rvCss('--border','#d8d0c4'), bl = rvCss('--blue','#4a6b8a');
  const ac = rvCss('--accent','#c8b9a6'), rd = rvCss('--red','#b44133');
  const x = function(i){ return ms.length < 2 ? (L + R) / 2 : L + (R - L) * i / (ms.length - 1); };
  const yS = function(v){ return B - (B - T) * (v - 1) / 4; };
  const lim = 0.30;
  const yC = function(v){ return B - (B - T) * (v + lim) / (2 * lim); };

  ctx.strokeStyle = bd; ctx.lineWidth = 1;
  [1,2,3,4,5].forEach(function(v){
    ctx.beginPath(); ctx.moveTo(L, yS(v)); ctx.lineTo(R, yS(v)); ctx.stroke();
  });
  /* 최대 하락 구간 음영 */
  if(rvDropMark && st.length > 1){
    let bi = 1, bd2 = 0;
    for(let i = 1; i < st.length; i++){
      const dd = st[i-1].star - st[i].star;
      if(dd > bd2){ bd2 = dd; bi = i; }
    }
    ctx.fillStyle = rd; ctx.globalAlpha = 0.12;
    ctx.fillRect(x(bi-1), T, x(bi) - x(bi-1), B - T);
    ctx.globalAlpha = 1;
    ctx.fillStyle = rd; ctx.font = '600 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('가장 크게 꺾인 구간 −' + bd2.toFixed(2), (x(bi-1) + x(bi)) / 2, T + 12);
  }
  /* 0선 */
  ctx.strokeStyle = mu; ctx.setLineDash([2,3]); ctx.beginPath();
  ctx.moveTo(L, yC(0)); ctx.lineTo(R, yC(0)); ctx.stroke(); ctx.setLineDash([]);

  /* 별점 실선 */
  ctx.strokeStyle = bl; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  st.forEach(function(s,i){ i ? ctx.lineTo(x(i), yS(s.star)) : ctx.moveTo(x(i), yS(s.star)); });
  ctx.stroke();
  ctx.fillStyle = bl;
  st.forEach(function(s,i){ ctx.beginPath(); ctx.arc(x(i), yS(s.star), 4, 0, 6.284); ctx.fill(); });

  /* 감성 긴 점선 */
  ctx.strokeStyle = ac; ctx.lineWidth = 3; ctx.setLineDash([9,5]);
  ctx.beginPath();
  st.forEach(function(s,i){
    const v = Math.max(-lim, Math.min(lim, s.sc));
    i ? ctx.lineTo(x(i), yC(v)) : ctx.moveTo(x(i), yC(v));
  });
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = ac;
  st.forEach(function(s,i){
    const v = Math.max(-lim, Math.min(lim, s.sc));
    ctx.beginPath(); ctx.rect(x(i) - 4, yC(v) - 4, 8, 8); ctx.fill();
  });

  /* 눈금·라벨 */
  ctx.fillStyle = mu; ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  [1,3,5].forEach(function(v){ ctx.fillText(String(v), L - 6, yS(v) + 3); });
  ctx.textAlign = 'left';
  [-0.3,0,0.3].forEach(function(v){ ctx.fillText(rvSigned(v,2), R + 6, yC(v) + 3); });
  ctx.textAlign = 'center';
  st.forEach(function(s,i){
    ctx.fillStyle = (rvMonthSel === s.m) ? fg : mu;
    ctx.font = (rvMonthSel === s.m) ? '700 11px monospace' : '10px monospace';
    ctx.fillText(parseInt(s.m,10) + '월', x(i), B + 16);
  });
  ctx.fillStyle = bl; ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('평균 별점', L, T - 8);
  ctx.fillStyle = mu; ctx.textAlign = 'right';
  ctx.fillText('평균 감성 점수', R, T - 8);

  cv.onclick = function(ev){
    const rect = cv.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    let best = 0, bg = 1e9;
    ms.forEach(function(m,i){ const dd = Math.abs(px - x(i)); if(dd < bg){ bg = dd; best = i; } });
    rvMonth(ms[best]);
  };
  rvA1Table(st);
}
let rvDropMark = false;
function rvMarkDrop(){ rvDropMark = !rvDropMark; rvDrawLine(); }
function rvA1Table(st){
  const t = rvEl('rv-a1-tbl');
  if(!t) return;
  let h = '<tr><th>월</th><th>리뷰 수</th><th>평균 별점</th><th>평균 감성 점수</th><th>긍정</th><th>중립</th><th>부정</th></tr>';
  st.forEach(function(s){
    h += '<tr' + (rvMonthSel === s.m ? ' class="hi"' : '') + '><th>' + parseInt(s.m,10) + '월</th><td>' + s.n +
      '</td><td>' + s.star.toFixed(2) + '</td><td' + (s.sc < 0 ? ' class="hi"' : '') + '>' + rvSigned(s.sc) +
      '</td><td>' + s.p + '</td><td>' + s.z + '</td><td>' + s.g + '</td></tr>';
  });
  t.innerHTML = h;
}
/* 달 칩의 사용 가능 여부·선택 표시를 현재 자료에 맞춥니다(학생 자료에는 없는 달이 있을 수 있습니다). */
function rvMonthChips(){
  const has = rvMonths();
  const box = rvEl('rv-a1-months');
  if(!box) return;
  box.querySelectorAll('.chip').forEach(function(c, i){
    const key = ('0' + (i + 1)).slice(-2);
    const ok = has.indexOf(key) >= 0;
    c.disabled = !ok;
    c.style.opacity = ok ? '' : '0.4';
    c.classList.toggle('on', ok && key === rvMonthSel);
  });
}
function rvMonth(m){
  const has = rvMonths();
  if(m && has.indexOf(m) < 0) m = '';         /* 학생 자료에 없는 달은 무시합니다 */
  rvMonthSel = (rvMonthSel === m) ? '' : m;
  rvMonthChips();
  const bd = rvEl('rv-a1-badges');
  if(bd){
    if(rvMonthSel){
      const s = rvMonthStat(rvMonthSel);
      bd.innerHTML = '<span class="rv-badge mark">' + parseInt(rvMonthSel,10) + '월 · <b>' + s.n +
        '건</b> · 평균 별점 <b>' + s.star.toFixed(2) + '</b> · 평균 감성 <b>' + rvSigned(s.sc) + '</b></span>';
    }else{
      bd.innerHTML = '<span class="rv-badge">달을 누르면 그 달 리뷰만 아래 목록에 남습니다.</span>';
    }
  }
  rvDrawLine();
  rvA2List();
}
function rvA1Check(k, el){
  const fb = rvEl('rv-a1-fb');
  const box = rvEl('rv-a1-q');
  if(box) box.querySelectorAll('button').forEach(function(b){ b.disabled = true; });
  if(el) el.classList.add('pri');
  if(fb) fb.className = 'rv-fb ' + (k === 2 ? 'ok' : 'no');
  if(fb) fb.innerHTML = (k === 2 ? '✓ 맞습니다. ' : '✗ 다시 보세요. ') +
    '정답은 <b>③ 3월→4월</b>입니다. 4.55 → 3.85(−0.70)보다 3.85 → 2.65(−1.20)가 큽니다. ' +
    '이제 <b>4월 리뷰 20건</b>이 첫 번째 조사 대상입니다.';
}

/* ── 10. 활동 2 — 도넛 · 히스토그램 · 사전 · k ───────────────────────────── */
function rvPat(ctx, kind, color){
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = color; g.globalAlpha = 0.35; g.fillRect(0,0,8,8); g.globalAlpha = 1;
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2;
  if(kind === 'diag'){ g.beginPath(); g.moveTo(0,8); g.lineTo(8,0); g.stroke(); }
  else if(kind === 'dot'){ g.beginPath(); g.arc(4,4,1.8,0,6.284); g.fill(); }
  else { g.fillStyle = color; g.fillRect(0,0,8,8); }
  return ctx.createPattern(c, 'repeat');
}
function rvDrawDonut(){
  const cv = rvEl('rv-donut');
  const pr = rvPrep(cv);
  if(!pr) return;
  const ctx = pr.ctx, W = pr.w, H = pr.h;
  const c = rvCount();
  const total = (c.긍정 + c.중립 + c.부정) || 1;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 14, r = R * 0.56;
  const segs = [
    {k:'긍정', v:c.긍정, col:rvCss('--blue','#4a6b8a'), pat:'solid'},
    {k:'중립', v:c.중립, col:rvCss('--muted','#78726a'), pat:'diag'},
    {k:'부정', v:c.부정, col:rvCss('--red','#b44133'),  pat:'dot'}
  ];
  let a0 = -Math.PI / 2;
  segs.forEach(function(s){
    const a1 = a0 + 6.283185 * s.v / total;
    if(s.v > 0){
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.arc(cx, cy, r, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = rvPat(ctx, s.pat, s.col);
      ctx.fill();
      ctx.strokeStyle = s.col; ctx.lineWidth = (rvVerdictSel === s.k) ? 3 : 1.2; ctx.stroke();
    }
    a0 = a1;
  });
  ctx.fillStyle = rvCss('--fg','#1a1714');
  ctx.textAlign = 'center'; ctx.font = '700 15px monospace';
  ctx.fillText(String(total) + '건', cx, cy - 2);
  ctx.font = '10px monospace'; ctx.fillStyle = rvCss('--muted','#78726a');
  ctx.fillText('긍 ' + c.긍정 + ' · 중 ' + c.중립 + ' · 부 ' + c.부정, cx, cy + 14);
  const hd = rvEl('rv-a2-head');
  if(hd) hd.textContent = '긍정 ' + c.긍정 + '건 · 중립 ' + c.중립 + '건 · 부정 ' + c.부정 + '건.';
}
function rvDrawHist(){
  const cv = rvEl('rv-hist');
  const pr = rvPrep(cv);
  if(!pr || !rvRows.length) return;
  const ctx = pr.ctx, W = pr.w, H = pr.h;
  const L = 28, R = W - 28, base = H - 42;
  const lim = 0.4;
  const x = function(v){ return L + (R - L) * (v + lim) / (2 * lim); };
  const bins = 32, cnt = new Array(bins).fill(0);
  rvRows.forEach(function(r){
    let b = Math.floor((Math.max(-lim, Math.min(lim - 1e-9, r.sc)) + lim) / (2 * lim) * bins);
    if(b < 0) b = 0; if(b >= bins) b = bins - 1;
    cnt[b]++;
  });
  const mx = Math.max.apply(null, cnt) || 1;
  /* 중립 띠 */
  ctx.fillStyle = rvCss('--card-h','#e2dbd1');
  ctx.fillRect(x(-rvKv), 16, x(rvKv) - x(-rvKv), base - 16);
  ctx.strokeStyle = rvCss('--muted','#78726a'); ctx.setLineDash([4,3]); ctx.lineWidth = 1;
  [-rvKv, rvKv].forEach(function(v){
    ctx.beginPath(); ctx.moveTo(x(v), 16); ctx.lineTo(x(v), base); ctx.stroke();
  });
  ctx.setLineDash([]);
  /* 막대 */
  const bw = (R - L) / bins;
  cnt.forEach(function(n,i){
    if(!n) return;
    const v0 = -lim + 2 * lim * i / bins;
    const h = (base - 24) * n / mx;
    ctx.fillStyle = (v0 + bw / 2 >= 0)
      ? (v0 >= rvKv ? rvCss('--blue','#4a6b8a') : rvCss('--muted','#78726a'))
      : (v0 + (2 * lim / bins) <= -rvKv ? rvCss('--red','#b44133') : rvCss('--muted','#78726a'));
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x(v0) + 1, base - h, bw - 2, h);
    ctx.globalAlpha = 1;
  });
  /* 수직선 */
  ctx.strokeStyle = rvCss('--fg','#1a1714'); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L, base); ctx.lineTo(R, base); ctx.stroke();
  ctx.fillStyle = rvCss('--muted','#78726a'); ctx.font = '10px monospace'; ctx.textAlign = 'center';
  [-0.4,-0.2,0,0.2,0.4].forEach(function(v){
    ctx.beginPath(); ctx.moveTo(x(v), base); ctx.lineTo(x(v), base + 4); ctx.stroke();
    ctx.fillText(rvSigned(v,1), x(v), base + 16);
  });
  ctx.fillStyle = rvCss('--fg','#1a1714'); ctx.font = '700 11px monospace';
  ctx.fillText('−k', x(-rvKv), base + 30);
  ctx.fillText('+k', x(rvKv), base + 30);
  ctx.font = '10px monospace'; ctx.fillStyle = rvCss('--muted','#78726a');
  ctx.fillText('회색 띠 = 중립 구간', (x(-rvKv) + x(rvKv)) / 2, 12);
}
function rvDonutPick(v, el){
  rvVerdictSel = v;
  const box = rvEl('rv-a2-slice');
  if(box) box.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  rvDrawDonut();
  rvA2List();
}
function rvRowsFiltered(){
  return rvRows.filter(function(r){
    if(rvMonthSel && r.m !== rvMonthSel) return false;
    if(rvVerdictSel && r.v !== rvVerdictSel) return false;
    return true;
  });
}
function rvVerdictCls(v){ return v === '긍정' ? 'p' : (v === '부정' ? 'n' : ''); }
function rvBodyHTML(r, mark){
  let t = rvEsc(r.t);
  if(mark && mark.length){
    mark.forEach(function(w){
      if(!w) return;
      t = t.split(rvEsc(w)).join('\u0001' + rvEsc(w) + '\u0002');
    });
    t = t.split('\u0001').join('<mark>').split('\u0002').join('</mark>');
  }
  return t;
}
function rvItemHTML(r, mark){
  return '<span class="hd">#' + r.i + ' · ' + rvEsc(r.d) + ' · ★' + r.s +
    ' · <span class="vd ' + rvVerdictCls(r.v) + '">' + r.v + '</span> · n(A)=' + r.A.length +
    ' · 점수 ' + rvSigned(r.sc) + '</span>' + rvBodyHTML(r, mark);
}
/* 목록 렌더 — 20장씩 늘려 그립니다(초기 렌더 비용 절감) */
function rvListRender(boxId, rows, onPick, markWords){
  const box = rvEl(boxId);
  if(!box) return;
  box.innerHTML = '';
  let shown = 0;
  const step = 20;
  function more(){
    const end = Math.min(shown + step, rows.length);
    for(let i = shown; i < end; i++){
      const r = rows[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rv-item';
      b.dataset.i = r.i;
      b.innerHTML = rvItemHTML(r, markWords);
      b.addEventListener('click', function(){
        box.querySelectorAll('.rv-item').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        if(onPick) onPick(r);
      });
      box.appendChild(b);
    }
    shown = end;
    const old = box.querySelector('.rv-more');
    if(old) old.parentNode.removeChild(old);
    if(shown < rows.length){
      const m = document.createElement('button');
      m.type = 'button'; m.className = 'rv-more';
      m.textContent = '더 보기 (' + shown + ' / ' + rows.length + ')';
      m.addEventListener('click', more);
      box.appendChild(m);
      try{
        const io = new IntersectionObserver(function(es){
          es.forEach(function(e){ if(e.isIntersecting){ io.disconnect(); more(); } });
        }, {root: box, threshold: 0.1});
        io.observe(m);
      }catch(e){}
    }
  }
  if(!rows.length){ box.innerHTML = '<p class="rv-hint">해당하는 리뷰가 없습니다.</p>'; return; }
  more();
}
function rvA2List(){
  const rows = rvRowsFiltered();
  rvListRender('rv-a2-list', rows, rvA2Calc);
  const out = rvEl('rv-a2-calc');
  if(out && !rows.length) out.innerHTML = '';
}
function rvA2Calc(r){
  const out = rvEl('rv-a2-calc');
  if(!out) return;
  const nP = rvDict.P.length, nN = rvDict.N.length;
  const iP = stInter(r.A, rvDict.P).length, iN = stInter(r.A, rvDict.N).length;
  const g = rvGuard(r.A.length, nP, rvKv);
  out.innerHTML =
    '<div class="rv-fml">단어집합 A ∩ (P∪N) = { ' + (r.A.length ? rvEsc(r.A.join(', ')) : '없음') + ' }　　n(A) = ' + r.A.length + '\n' +
    'J(P, A) = ' + iP + ' ÷ (' + nP + ' + ' + r.A.length + ' − ' + iP + ') = ' + r.jp.toFixed(3) + '\n' +
    'J(N, A) = ' + iN + ' ÷ (' + nN + ' + ' + r.A.length + ' − ' + iN + ') = ' + r.jn.toFixed(3) + '\n' +
    '감성 점수 = ' + r.jp.toFixed(3) + ' − ' + r.jn.toFixed(3) + ' = ' + rvSigned(r.sc) + '\n' +
    '판정: ' + rvSigned(-rvKv,2) + ' ≤ 점수 ≤ ' + rvSigned(rvKv,2) + ' 이면 중립  →  ' + r.v + '</div>' +
    (r.s <= 2 && r.v === '중립'
      ? '<div class="rv-fb no">별점 ' + r.s + '점인데 <b>중립</b>입니다. 무엇이 문제일까요?' +
        '<span style="display:block;font-weight:400;margin-top:0.3rem;">판정 가능 조건 n(A) ≥ k × n(P) = ' +
        rvKv.toFixed(2) + ' × ' + nP + ' = ' + (rvKv * nP).toFixed(2) + ' → 감성 단어가 <b>' + g.min +
        '개 이상</b>이어야 하는데 이 리뷰는 <b>' + r.A.length + '개</b>뿐입니다.</span></div>'
      : '');
}
/* 사전 칩 */
function rvDictRender(){
  const bp = rvEl('rv-dict-p'), bn = rvEl('rv-dict-n');
  if(!bp || !bn) return;
  function chips(box, side, all, on, cls){
    box.innerHTML = '<span class="rv-badge">' + (side === 'P' ? '긍정 사전 P' : '부정 사전 N') +
      ' <b>' + on.length + '개</b></span>';
    all.forEach(function(w){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (on.indexOf(w) >= 0 ? ' on' : '');
      b.textContent = w;
      b.style.borderColor = (on.indexOf(w) >= 0) ? '' : cls;
      b.addEventListener('click', function(){ rvDictChip(side, w); });
      box.appendChild(b);
    });
  }
  /* 10차시에서 만든 우리 반 사전에는 기본·추천 목록에 없는 낱말이 있을 수 있습니다.
     그 낱말도 칩으로 보여 주어야 화면의 개수와 실제 사전이 어긋나지 않습니다. */
  function withOurs(all, on){
    const extra = on.filter(function(w){ return all.indexOf(w) < 0; });
    return all.concat(extra);
  }
  chips(bp, 'P', withOurs(rvDictWideP(), rvDict.P), rvDict.P, rvCss('--blue','#4a6b8a'));
  chips(bn, 'N', withOurs(rvDictWideN(), rvDict.N), rvDict.N, rvCss('--red','#b44133'));
}
function rvDictChip(side, w){
  const arr = (side === 'P') ? rvDict.P : rvDict.N;
  const i = arr.indexOf(w);
  if(i >= 0){
    if(arr.length <= 1) return;
    arr.splice(i, 1);
  }else{
    /* 기본 사전의 원래 순서를 지키며 넣습니다. */
    const all = (side === 'P') ? rvDictWideP() : rvDictWideN();
    const pos = all.indexOf(w);
    let at = arr.length;
    for(let j = 0; j < arr.length; j++){ if(all.indexOf(arr[j]) > pos){ at = j; break; } }
    arr.splice(at, 0, w);
  }
  const st = rvEl('rv-dict-st');
  if(st) st.textContent = '사전을 고쳤습니다 — P ' + rvDict.P.length + '개 / N ' + rvDict.N.length + '개. ' +
    '(10차시의 aimath.senti.dict 는 그대로 두고, 11차시 사전만 따로 저장합니다.)';
  rvRefresh();
}
function rvDictWide(on){
  rvDict = on ? {P: rvDictWideP(), N: rvDictWideN()} : rvDictClone(RV_DICT_BASE);
  if(!on){
    /* 10차시에서 만든 우리 반 사전이 있으면 그것으로 되돌립니다. */
    rvLoadDict();
  }
  const st = rvEl('rv-dict-st');
  if(st) st.textContent = on
    ? '사전을 P 18개 / N 18개로 넓혔습니다. 중립이 어떻게 되었는지 도넛을 보세요.'
    : '10차시 사전(P ' + rvDict.P.length + ' / N ' + rvDict.N.length + ')으로 되돌렸습니다.';
  rvRefresh();
}
function rvKSet(v){
  let k = parseFloat(v);
  if(isNaN(k)) k = 0.25;
  k = Math.max(0, Math.min(0.30, Math.round(k * 100) / 100));
  rvKv = k;
  const s = rvEl('rv-k'); if(s) s.value = String(k);
  const n = rvEl('rv-k-num'); if(n) n.value = k.toFixed(2);
  const l = rvEl('rv-k-lab'); if(l) l.innerHTML = '<b>k = ' + k.toFixed(2) + '</b>';
  rvRefresh();
}
/* 네 조합 결과판 */
function rvComboMark(){
  const wide = rvIsWide();
  const kk = (Math.abs(rvKv - 0.25) < 1e-9) ? '25' : (Math.abs(rvKv - 0.10) < 1e-9 ? '10' : '');
  if(!kk) return;
  const key = (wide ? 'w' : 'b') + kk;
  const c = rvCount();
  rvCombo[key] = '긍 ' + c.긍정 + ' · 중 ' + c.중립 + ' · 부 ' + c.부정;
  ['b25','b10','w25','w10'].forEach(function(k){
    const td = rvEl('rv-c-' + k);
    if(td){ td.textContent = rvCombo[k] || '—'; td.className = rvCombo[k] ? 'hi' : ''; }
  });
  const done = ['b25','b10','w25','w10'].every(function(k){ return !!rvCombo[k]; });
  const st = rvEl('rv-a2-st');
  const left = ['b25','b10','w25','w10'].filter(function(k){ return !rvCombo[k]; }).length;
  if(st) st.textContent = done
    ? '네 조합을 모두 확인했습니다. 아래 단계 토글이 열렸습니다.'
    : '남은 조합 ' + left + '칸 — 사전(기본/넓힘)과 k(0.25/0.10)를 조합해 모두 눌러 보세요.';
  ['rv-a2-f1','rv-a2-f2','rv-a2-f3','rv-a2-f4'].forEach(function(id){ rvLock(id, done); });
  const lm = rvEl('rv-a2-lock');
  if(lm) lm.style.display = done ? 'none' : '';
}
function rvFix(){
  rvLSSet(RV_K_DICT, JSON.stringify({P: rvDict.P, N: rvDict.N}));
  rvLSSet(RV_K_K, String(rvKv));
  const st = rvEl('rv-fix-st');
  const c = rvCount();
  if(st) st.textContent = '이 설정(P ' + rvDict.P.length + ' / N ' + rvDict.N.length + ' · k = ' + rvKv.toFixed(2) +
    ')으로 대시보드를 고정했습니다 — 긍 ' + c.긍정 + ' · 중 ' + c.중립 + ' · 부 ' + c.부정 +
    '. 10차시 감성 사전(aimath.senti.dict)은 건드리지 않았습니다.';
  rvA2Month();
}
function rvA2Month(){
  const t = rvEl('rv-a2-month');
  if(!t) return;
  const ms = rvMonths();
  let firstNeg = '';
  let h = '<tr><th>월</th><th>평균 감성 점수</th><th>평균 별점</th><th>긍정</th><th>중립</th><th>부정</th></tr>';
  ms.forEach(function(m){
    const s = rvMonthStat(m);
    if(!firstNeg && s.sc < 0) firstNeg = m;
    h += '<tr><th>' + parseInt(m,10) + '월</th><td' + (s.sc < 0 ? ' class="hi"' : '') + '>' + rvSigned(s.sc) +
      '</td><td>' + s.star.toFixed(2) + '</td><td>' + s.p + '</td><td>' + s.z + '</td><td>' + s.g + '</td></tr>';
  });
  const c = rvCount();
  const allStar = rvRows.reduce(function(a,r){ return a + r.s; }, 0) / (rvRows.length || 1);
  h += '<tr><th>전체</th><td>—</td><td>' + allStar.toFixed(2) + '</td><td>' + c.긍정 + '</td><td>' + c.중립 +
    '</td><td>' + c.부정 + '</td></tr>';
  t.innerHTML = h;
  /* 「○월에 처음으로 음수」 배지는 [대시보드 고정] 안내문(#rv-fix-st)과 자리를 다투지 않도록
     전용 칸(#rv-neg-st)에 매번 다시 씁니다. 고정 뒤에도 이 배지가 남아 있어야
     활동 3(“4월에 무슨 일이 있었나”)로 넘어가는 장면이 성립합니다. */
  const ng = rvEl('rv-neg-st');
  if(ng){
    ng.innerHTML = firstNeg
      ? '<span class="rv-badge hot"><b>' + parseInt(firstNeg,10) +
        '월</b>에 평균 감성 점수가 <b>처음으로 음수</b>가 되었습니다.</span>' +
        '<span class="rv-badge">이제 ' + parseInt(firstNeg,10) + '월에 무슨 일이 있었는지 찾을 차례입니다 → 활동 3</span>'
      : '<span class="rv-badge">아직 평균 감성 점수가 음수인 달이 없습니다 — 사전과 k를 함께 조정해 보세요.</span>';
  }
}
function rvLock(id, open){
  const el = rvEl(id);
  if(!el) return;
  el.classList.toggle('rv-locked', !open);
  if(!open){
    el.open = false;
    if(!el.dataset.rvGuard){
      el.dataset.rvGuard = '1';
      el.addEventListener('click', function(ev){
        if(el.classList.contains('rv-locked')){ ev.preventDefault(); }
      });
    }
  }
}

/* ── 11. 활동 3 — TF vs TF-IDF ───────────────────────────────────────────── */
function rvGuessSave(){
  const i = rvEl('rv-a3-guess');
  const st = rvEl('rv-a3-st');
  const v = i ? (i.value || '').trim() : '';
  if(!v){ if(st) st.textContent = '한 낱말이라도 적어 보세요. 틀려도 좋습니다.'; return; }
  rvLSSet(RV_K_GUESS, v);
  rvA3Guessed = true;
  const p = rvEl('rv-a3-panel');
  if(p) p.classList.remove('rv-veil');
  if(st) st.textContent = '‘' + v + '’ 로 저장했습니다. 이제 아래에서 달을 바꿔 가며 확인해 보세요.';
  const mine = rvEl('rv-a3-mine'); if(mine) mine.textContent = v;
  rvA3Render();
  rvA3Gate();
}
function rvStop(mode, el){
  rvStopMode = mode;
  const box = rvEl('rv-a3-stop');
  if(box) box.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  const ed = rvEl('rv-a3-stopedit');
  if(ed) ed.style.display = (mode === 2) ? '' : 'none';
  if(mode === 0) rvStopList = [];
  if(mode === 1) rvStopList = RV_STOP_DOMAIN.slice();
  if(mode === 2){
    const inp = rvEl('rv-a3-stopin');
    if(inp && !inp.value) inp.value = RV_STOP_DOMAIN.join(', ');
    rvStopEdit();
    return;
  }
  rvLSSet(RV_K_STOP, JSON.stringify({mode: rvStopMode, list: rvStopList}));
  rvA3Render();
}
function rvStopEdit(){
  const inp = rvEl('rv-a3-stopin');
  rvStopList = inp ? String(inp.value || '').split(/[,\s]+/).filter(function(x){ return !!x; }) : [];
  rvStopMode = 2;
  rvLSSet(RV_K_STOP, JSON.stringify({mode: rvStopMode, list: rvStopList}));
  rvA3Render();
}
function rvPickMonth3(m, el){
  rvA3Month = m;
  rvA3Seen[m] = 1;
  const box = rvEl('rv-a3-months');
  if(box) box.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  rvA3Render();
  rvA3Gate();
}
function rvA3Gate(){
  const open = rvA3Guessed && Object.keys(rvA3Seen).length >= 2;
  ['rv-a3-f1','rv-a3-f2','rv-a3-f3','rv-a3-f4'].forEach(function(id){ rvLock(id, open); });
  const lm = rvEl('rv-a3-lock');
  if(lm) lm.style.display = open ? 'none' : '';
}
/* 막대 목록 — 인라인 핸들러 대신 DOM 이벤트로 붙입니다(단어에 따옴표가 섞여도 안전). */
function rvBars(box, items, max, pickable){
  if(!box) return;
  box.innerHTML = '';
  items.forEach(function(it){
    const pct = max ? Math.round(it.v / max * 100) : 0;
    const row = document.createElement('div');
    row.className = 'rv-bar1' + (it.w === rvA3Word ? ' pick' : '');
    const inner = document.createElement(pickable ? 'button' : 'span');
    if(pickable){ inner.type = 'button'; }
    else { inner.style.cssText = 'display:flex;align-items:center;gap:0.5rem;width:100%;'; }
    inner.innerHTML = '<span class="nm">' + rvEsc(it.w) + '</span>' +
      '<span class="tk"><i style="width:' + pct + '%"></i></span>' +
      '<span class="vl">' + rvEsc(it.lab) + '</span>';
    if(pickable) inner.addEventListener('click', function(){ rvWordPick(it.w); });
    row.appendChild(inner);
    box.appendChild(row);
  });
}
function rvA3Render(){
  if(!rvRows.length) return;
  const tf = rvTfidf(rvBucket());
  /* 같은 횟수면 먼저 나온 단어가 앞 — 정렬이 안정적이므로 삽입 순서(= 처음 나온 순서)가 유지됩니다. */
  const totalTop = Object.keys(tf.total).sort(function(a,b){
    return tf.total[b] - tf.total[a];
  }).slice(0, 10);
  const left = rvEl('rv-a3-tf');
  if(left){
    const mx = totalTop.length ? tf.total[totalTop[0]] : 1;
    rvBars(left, totalTop.map(function(w,i){
      return {w:w, v:tf.total[w], lab:(i+1) + '위 ' + tf.total[w] + '회'};
    }), mx, true);
  }
  /* 학생이 자기 자료를 넣으면 달 구성이 달라집니다 — 없는 달은 마지막 문서로 대신하고 칩을 잠급니다. */
  if(!tf.TFIDF[rvA3Month]) rvA3Month = tf.keys[tf.keys.length - 1] || '';
  const m = rvA3Month;
  const chipBox = rvEl('rv-a3-months');
  if(chipBox){
    chipBox.querySelectorAll('.chip').forEach(function(c, i){
      const key = ('0' + (i + 1)).slice(-2);
      const has = tf.keys.indexOf(key) >= 0;
      c.disabled = !has;
      c.style.opacity = has ? '' : '0.4';
      c.classList.toggle('on', has && key === m);
    });
  }
  const t5 = Object.keys(tf.TFIDF[m] || {}).sort(function(a,b){
    return tf.TFIDF[m][b] - tf.TFIDF[m][a];
  }).slice(0, 5);
  const right = rvEl('rv-a3-tfidf');
  if(right){
    const mx = t5.length ? tf.TFIDF[m][t5[0]] : 1;
    rvBars(right, t5.map(function(w,i){
      return {w:w, v:tf.TFIDF[m][w], lab:(i+1) + '위 ' + tf.TFIDF[m][w].toFixed(2)};
    }), mx, true);
  }
  /* 순위 이동 안내 */
  const mv = rvEl('rv-a3-move');
  if(mv){
    const moved = t5.map(function(w){
      const li = totalTop.indexOf(w);
      return rvEsc(w) + '(전체 ' + (li >= 0 ? (li + 1) + '위' : '10위 밖') + ' → ' + parseInt(m,10) + '월 ' + (t5.indexOf(w) + 1) + '위)';
    });
    mv.innerHTML = '순위 이동 — ' + moved.join(' · ');
  }
  if(!rvA3Word || !tf.DF[rvA3Word]) rvA3Word = t5[0] || totalTop[0] || '';
  rvStair(tf);
}
function rvWordPick(w){
  rvA3Word = w;
  rvA3Render();
}
function rvStair(tf){
  const t = rvEl('rv-a3-stair');
  if(!t) return;
  const w = rvA3Word;
  if(!w || !tf.DF[w]){ t.innerHTML = ''; return; }
  const m = rvA3Month;
  const TF = (tf.TF[m] && tf.TF[m][w]) || 0;
  const DF = tf.DF[w], IDF = tf.IDF[w];
  t.innerHTML =
    '<tr><th>단어</th><th>① TF (' + parseInt(m,10) + '월 문서)</th><th>② DF (나온 달의 수)</th>' +
    '<th>③ IDF = n ÷ DF</th><th>④ TF-IDF = TF × IDF</th><th>전체 횟수</th></tr>' +
    '<tr><th>' + rvEsc(w) + '</th><td>' + TF + '</td><td>' + DF + '</td><td>' + tf.n + ' ÷ ' + DF + ' = ' +
    IDF.toFixed(2) + '</td><td class="hi">' + TF + ' × ' + IDF.toFixed(2) + ' = ' + (TF * IDF).toFixed(2) +
    '</td><td>' + (tf.total[w] || 0) + '</td></tr>';
  /* 다섯 달 미니 막대 */
  const mini = rvEl('rv-a3-mini');
  if(mini){
    const vals = tf.keys.map(function(k){ return (tf.TF[k] && tf.TF[k][w]) || 0; });
    const mx = Math.max.apply(null, vals) || 1;
    mini.innerHTML = '<p class="rv-hint" style="margin-top:0.6rem;">‘' + rvEsc(w) + '’ 의 달별 횟수 — ' +
      vals.join(', ') + '</p><div class="rv-minibars"></div>';
    rvBars(mini.querySelector('.rv-minibars'), tf.keys.map(function(k,i){
      return {w: parseInt(k,10) + '월', v: vals[i], lab: vals[i] + '회'};
    }), mx, false);
  }
  const rows = rvRows.filter(function(r){ return r.toks.indexOf(w) >= 0; });
  rvListRender('rv-a3-list', rows, null, [w]);
}
function rvDiagSave(){
  const o = {m:(rvEl('rv-diag-m')||{}).value || '', w:(rvEl('rv-diag-w')||{}).value || '',
             a:(rvEl('rv-diag-a')||{}).value || ''};
  rvLSSet(RV_K_DIAG, JSON.stringify(o));
  const st = rvEl('rv-diag-st');
  if(st) st.textContent = '저장했습니다. [학습지 인쇄]를 누르면 1면 ⑤번 칸에 그대로 들어갑니다.';
}

/* ── 12. 활동 4 — 닮은 리뷰 ─────────────────────────────────────────────── */
function rvSimMode(m){
  rvSimMd = m;
  const a = rvEl('rv-a4-cos'), b = rvEl('rv-a4-dist');
  if(a) a.classList.toggle('on', m === 'cos');
  if(b) b.classList.toggle('on', m === 'dist');
  if(rvSimBase) rvSimList(rvSimBase);
}
function rvA4Init(){
  if(!rvVecs) rvBuildU();
  const bd = rvEl('rv-a4-badges');
  if(bd) bd.innerHTML = '<span class="rv-badge">전체집합 U의 원소 <b>n(U) = ' + (rvU ? rvU.length : 0) + '</b></span>' +
    '<span class="rv-badge">정렬 기준: <b>가나다순</b></span>' +
    '<span class="rv-badge">각 리뷰 = ' + (rvU ? rvU.length : 0) + '차원 빈도수 벡터</span>';
  rvListRender('rv-a4-list', rvRows, function(r){ rvSimList(r.i); });
}
function rvSimList(id){
  rvSimBase = id;
  rvSimSeen[id] = 1;
  if(!rvVecs) rvBuildU();
  const bi = rvRows.findIndex(function(r){ return r.i === id; });
  if(bi < 0) return;
  const base = rvVecs[bi], br = rvRows[bi];
  const rows = rvRows.map(function(r,i){
    if(i === bi) return null;
    const v = (rvSimMd === 'cos') ? smCos(base, rvVecs[i]) : smDist(base, rvVecs[i]);
    return {r:r, v:(v === null ? (rvSimMd === 'cos' ? 0 : 1e9) : v)};
  }).filter(Boolean);
  rows.sort(function(a,b){
    return (rvSimMd === 'cos') ? (b.v - a.v || a.r.i - b.r.i) : (a.v - b.v || a.r.i - b.r.i);
  });
  const top = rows.slice(0, 5);
  /* 순위 역전 배지 — 두 자의 1위가 다를 때만 */
  const other = rvRows.map(function(r,i){
    if(i === bi) return null;
    const v = (rvSimMd === 'cos') ? smDist(base, rvVecs[i]) : smCos(base, rvVecs[i]);
    return {r:r, v:(v === null ? 0 : v)};
  }).filter(Boolean);
  other.sort(function(a,b){
    return (rvSimMd === 'cos') ? (a.v - b.v || a.r.i - b.r.i) : (b.v - a.v || a.r.i - b.r.i);
  });
  const flip = top.length && other.length && (top[0].r.i !== other[0].r.i);

  const out = rvEl('rv-a4-out');
  if(!out) return;
  let h = '<p class="rv-hint">기준 <b>#' + br.i + ' (' + rvEsc(br.d) + ', ★' + br.s + ')</b><br>' + rvEsc(br.t) + '</p>' +
    '<div class="rv-barrow">' +
    '<span class="rv-badge mark">' + (rvSimMd === 'cos' ? '코사인 유사도 — 클수록 유사' : '유클리드 유사도 — 작을수록 유사') + '</span>' +
    (flip ? '<span class="rv-badge hot">순위 역전 — 다른 자로 재면 1위가 #' + other[0].r.i + '</span>' : '') + '</div>';
  top.forEach(function(t, i){
    const shared = stInter(stSet(t.r.toks), stSet(br.toks));
    const alpha = (rvSimMd === 'cos') ? Math.min(1, Math.max(0.06, t.v)) : Math.min(1, Math.max(0.06, 1 - t.v / 12));
    h += '<div class="rv-item" style="background:' + rvBlend(alpha * 0.6) + ';cursor:default;">' +
      '<span class="hd">' + (i + 1) + '위 · #' + t.r.i + ' · ' + rvEsc(t.r.d) + ' · ★' + t.r.s +
      ' · <span class="vd ' + rvVerdictCls(t.r.v) + '">' + t.r.v + '</span> · ' +
      (rvSimMd === 'cos' ? '코사인 ' : '거리 ') + '<b>' + t.v.toFixed(2) + '</b></span>' +
      rvBodyHTML(t.r, shared) +
      '<span class="hd">겹치는 단어: ' + (shared.length ? rvEsc(shared.join(', ')) : '없음') + '</span></div>';
  });
  out.innerHTML = h;
  const open = Object.keys(rvSimSeen).length >= 2;
  ['rv-a4-f1','rv-a4-f2','rv-a4-f3'].forEach(function(id2){ rvLock(id2, open); });
  const lm = rvEl('rv-a4-lock');
  if(lm) lm.style.display = open ? 'none' : '';
}
function rvA4Check(k, el){
  const fb = rvEl('rv-a4-fb');
  const box = rvEl('rv-a4-q');
  if(box) box.querySelectorAll('button').forEach(function(b){ b.disabled = true; });
  if(el) el.classList.add('pri');
  if(fb){
    fb.className = 'rv-fb ' + (k === 1 ? 'ok' : 'no');
    fb.innerHTML = (k === 1 ? '✓ 맞습니다. ' : '✗ 다시 생각해 봅시다. ') +
      '정답은 <b>② 0</b>입니다. 성분끼리 곱해 더한 값이 0이 되고, 빈도수 벡터의 성분은 모두 0 이상이므로 값은 정확히 0입니다. ' +
      '두 벡터가 이루는 각이 90°라는 뜻입니다.';
  }
}

/* ── 13. 활동 5 — 별점 행렬과 추천 ──────────────────────────────────────── */
function rvMatLoad(){
  try{
    const o = JSON.parse(rvLS(RV_K_MAT, ''));
    if(o && Array.isArray(o) && o.length === 4) { rvMat = o.map(function(r){ return r.slice(); }); return; }
  }catch(e){}
  rvMat = RV_WEBTOON.M0.map(function(r){ return r.slice(); });
}
function rvMatSave(){ rvLSSet(RV_K_MAT, JSON.stringify(rvMat)); }
function rvPredict5(k, el){
  const box = rvEl('rv-a5-guess');
  if(box) box.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  rvA5Guessed = true;
  const p = rvEl('rv-a5-panel');
  if(p) p.classList.remove('rv-veil');
  rvMatRender();
}
function rvCommon(){
  /* 지호가 본 작품(= 나의 별점이 비어 있지 않은 항목) */
  const me = RV_WEBTOON.me;
  const idx = [];
  for(let j = 0; j < RV_WEBTOON.items.length; j++){
    if(rvZero || rvMat[me][j] !== null) idx.push(j);
  }
  return idx;
}
function rvSubVec(u, idx){
  return idx.map(function(j){ const v = rvMat[u][j]; return v === null ? 0 : v; });
}
function rvCell(u, j, sel){
  const v = sel.value;
  rvMat[u][j] = (v === '') ? null : parseInt(v, 10);
  rvMatSave();
  rvMatRender();
}
function rvMatRender(){
  const t = rvEl('rv-mat');
  if(!t || !rvMat) return;
  const W = RV_WEBTOON;
  let h = '<tr><th>사람 ＼ 작품</th>';
  W.items.forEach(function(it, j){
    h += '<th>W' + (j + 1) + '<br>' + rvEsc(it) + '<br><span class="rv-hint">' + rvEsc(W.genre[j]) + '</span></th>';
  });
  h += '</tr>';
  W.users.forEach(function(u, i){
    h += '<tr><th class="' + (i === W.me ? 'me' : '') + '">' + rvEsc(u) + (i === W.me ? '(나)' : '') + '</th>';
    W.items.forEach(function(it, j){
      const v = rvMat[i][j];
      h += '<td' + (v === null ? ' class="gap"' : '') + '><select aria-label="' + rvEsc(u) + ' ' + rvEsc(it) +
        ' 별점" onchange="rvCell(' + i + ',' + j + ',this)">' +
        '<option value=""' + (v === null ? ' selected' : '') + '>?</option>';
      [1,2,3,4,5].forEach(function(s){
        h += '<option value="' + s + '"' + (v === s ? ' selected' : '') + '>' + s + '</option>';
      });
      h += '</select></td>';
    });
    h += '</tr>';
  });
  t.innerHTML = h;

  const idx = rvCommon();
  const bd = rvEl('rv-a5-badges');
  if(bd) bd.innerHTML = '<span class="rv-badge mark">공통으로 본 작품만 쓰기 — <b>' +
    idx.map(function(j){ return 'W' + (j + 1); }).join(' · ') + '</b> (' + idx.length + '차원)</span>' +
    (rvZero ? '<span class="rv-badge hot">빈칸을 0으로 채우는 중 — “안 봤다”와 “0점”은 다른 정보입니다</span>'
            : '<span class="rv-badge">빈칸은 계산에서 제외합니다</span>');
  rvHeat();
  if(rvRecDone) rvRecommend(true);
}
function rvHeat(){
  const t = rvEl('rv-heat');
  if(!t) return;
  const W = RV_WEBTOON, idx = rvCommon();
  const V = W.users.map(function(u, i){ return rvSubVec(i, idx); });
  let h = '<tr><th></th>';
  W.users.forEach(function(u){ h += '<th>' + rvEsc(u) + '</th>'; });
  h += '</tr>';
  for(let i = 0; i < 4; i++){
    h += '<tr><th>' + rvEsc(W.users[i]) + '</th>';
    for(let j = 0; j < 4; j++){
      let v, lab, alpha;
      if(i === j){
        v = (rvMatMd === 'cos') ? 1 : 0;
        lab = v.toFixed(2);
        alpha = (rvMatMd === 'cos') ? 1 : 1;
      }else{
        v = (rvMatMd === 'cos') ? smCos(V[i], V[j]) : smDist(V[i], V[j]);
        lab = (v === null) ? '—' : v.toFixed(2);
        alpha = (v === null) ? 0 : ((rvMatMd === 'cos') ? Math.max(0, Math.min(1, v)) : Math.max(0, 1 - v / 8));
      }
      const cls = (i === j) ? 'dg' : (j > i ? 'up' : 'lo');
      h += '<td class="' + cls + '" style="background:' + rvBlend(alpha * 0.72) + ';">' + lab + '</td>';
    }
    h += '</tr>';
  }
  t.innerHTML = h;
}
function rvMatMode(m){
  rvMatMd = m;
  const a = rvEl('rv-m-cos'), b = rvEl('rv-m-dist');
  if(a) a.classList.toggle('on', m === 'cos');
  if(b) b.classList.toggle('on', m === 'dist');
  rvHeat();
  if(rvRecDone) rvRecommend(true);
}
function rvSym(){
  const t = rvEl('rv-heat');
  if(!t) return;
  t.classList.toggle('fold');
  const on = t.classList.contains('fold');
  const st = rvEl('rv-rec-st');
  if(st) st.textContent = on
    ? '대각선 아래쪽을 흐리게 했습니다 — 위쪽 삼각형 6칸(▲)만 계산하면 표 16칸이 모두 채워집니다.'
    : '표 전체를 다시 보입니다.';
}
function rvZeroFill(on){
  rvZero = !!on;
  rvMatRender();
}
function rvExp(key){
  if(!rvMat) rvMatLoad();
  if(key === 'A'){ rvMat[3][4] = 1; }
  else if(key === 'B'){
    /* 하윤의 별점을 정확히 2배로 — 방향(취향의 모양)은 그대로이고 크기만 커집니다. */
    for(let j = 0; j < 5; j++){ if(rvMat[3][j] !== null) rvMat[3][j] = Math.min(5, rvMat[3][j] * 2); }
  }
  else { rvMat = RV_WEBTOON.M0.map(function(r){ return r.slice(); }); }
  rvMatSave();
  rvMatRender();
  const st = rvEl('rv-rec-st');
  if(st) st.textContent = (key === 'A')
    ? '실험 A — 하윤의 「연습생 도시락」을 1점으로 바꾸었습니다. [추천!]을 다시 눌러 보세요.'
    : (key === 'B')
      ? '실험 B — 하윤의 별점이 정확히 2배가 되어 ‘후한 채점자’가 되었습니다. 공통으로 본 세 작품이 (2,2,1) → (4,4,2)로 커졌지요. ' +
        '유클리드 유사도는 3.61 → 1.41로 크게 줄지만 코사인 유사도는 0.98 그대로입니다(9차시 L2 정규화의 재확인).'
      : '별점 행렬을 원래대로 되돌렸습니다.';
}
function rvRecommend(quiet){
  const W = RV_WEBTOON, me = W.me, idx = rvCommon();
  const V = W.users.map(function(u, i){ return rvSubVec(i, idx); });
  const rows = [];
  for(let i = 0; i < 4; i++){
    if(i === me) continue;
    rows.push({i:i, name:W.users[i],
               cos: smCos(V[me], V[i]),
               dist: smDist(V[me], V[i])});
  }
  const byCos = rows.slice().sort(function(a,b){ return (b.cos || 0) - (a.cos || 0); });
  const byDist = rows.slice().sort(function(a,b){ return a.dist - b.dist; });
  const flip = byCos[0].i !== byDist[0].i;

  function pick(nb){
    /* ② 그 이웃이 “높게” 준, 내가 아직 보지 않은 작품 —
       ‘높게’의 기준은 그 사람 자신의 최고점입니다(짠 채점자의 3점도 최고점이면 근거가 됩니다).
       최고점에 못 미치면 권하지 않습니다. */
    const mine = rvMat[me], his = rvMat[nb.i];
    const rated = his.filter(function(x){ return x !== null; });
    if(!rated.length) return null;
    const hisMax = Math.max.apply(null, rated);
    let best = -1, bv = -1;
    for(let j = 0; j < W.items.length; j++){
      if(mine[j] !== null) continue;
      if(his[j] === null) continue;
      if(his[j] > bv){ bv = his[j]; best = j; }
    }
    if(best < 0) return null;
    if(bv < hisMax) return {j:best, v:bv, max:hisMax, weak:true, ok:false};
    return {j:best, v:bv, max:hisMax, weak:false, ok:true};
  }
  const rc = pick(byCos[0]), rd = pick(byDist[0]);
  function path(p, nb){
    if(!p) return '권할 작품이 없습니다 — 그분이 본 작품을 나도 이미 다 봤습니다.';
    const head = 'W' + (p.j + 1) + ' 「' + rvEsc(W.items[p.j]) + '」 (' + rvEsc(nb.name) + '의 별점 ' + p.v + '점';
    return p.ok
      ? head + ' · 그분의 최고점)'
      : '권할 작품이 없습니다 — 안 본 작품 가운데 그분이 준 최고 점수가 ' + p.v +
        '점인데, 그분 자신의 최고점은 ' + p.max + '점이라 “높게 준 작품”이라 할 수 없습니다.';
  }
  const okC = rc && rc.ok, okD = rd && rd.ok;
  const winner = okC ? rc : (okD ? rd : null);
  const out = rvEl('rv-rec-out');
  if(out){
    out.innerHTML =
      '<div class="rv-rec"><b>① 가장 유사한 이웃 찾기</b>' +
      '<ol><li>코사인 유사도 1위 — <b>' + rvEsc(byCos[0].name) + '</b> (' + rvNum(byCos[0].cos) + ')' +
      '　　유클리드 유사도 1위 — <b>' + rvEsc(byDist[0].name) + '</b> (' + rvNum(byDist[0].dist) + ', 작을수록 유사)</li>' +
      '<li><b>② 그 이웃이 높게 준, 내가 안 본 작품 찾기</b><br>' +
      '코사인 경로 → ' + path(rc, byCos[0]) + '<br>' +
      '유클리드 경로 → ' + path(rd, byDist[0]) + '</li>' +
      '<li><b>③ 추천 카드</b><br>' +
      (winner
        ? '지호에게 <b>' + rvEsc(W.items[winner.j]) + '</b> 을(를) 추천합니다.' +
          (flip ? ' 다만 <b>두 자가 서로 다른 이웃을 1위로 뽑았습니다.</b> 근거의 강도가 다르므로, 어떤 자를 쓸지 먼저 정해야 합니다.'
                : ' 두 자가 같은 이웃을 1위로 뽑았습니다.') +
          ((okC !== okD) ? ' <b>한쪽 자로는 권할 작품이 사라졌습니다</b> — 자를 어떻게 고르느냐가 추천을 바꿉니다.' : '')
        : '지금 설정으로는 <b>권할 작품이 없습니다.</b> 자를 바꾸면 결과가 달라지는지 확인해 보세요.') +
      '</li></ol>' +
      (flip ? '<p><span class="rv-badge hot">순위 역전 — 거리로 재면 ' + rvEsc(byDist[0].name) +
              ', 방향으로 재면 ' + rvEsc(byCos[0].name) + '</span></p>' : '') +
      '</div>' +
      '<div class="rv-scroll"><table class="rv-tbl"><tr><th>비교</th><th>성분끼리 곱해 더한 값</th>' +
      '<th>벡터의 크기</th><th>유클리드 유사도 d</th><th>코사인 유사도 C</th></tr>' +
      rows.map(function(r){
        let dot = 0;
        for(let t = 0; t < V[me].length; t++) dot += V[me][t] * V[r.i][t];
        return '<tr><td>지호(' + V[me].join(', ') + ') ↔ ' + rvEsc(r.name) + '(' + V[r.i].join(', ') + ')</td>' +
          '<td>' + dot + '</td><td>' + smNorm2(V[r.i]).toFixed(2) + '</td>' +
          '<td' + (byDist[0].i === r.i ? ' class="hi"' : '') + '>' + rvNum(r.dist) + '</td>' +
          '<td' + (byCos[0].i === r.i ? ' class="hi"' : '') + '>' + rvNum(r.cos) + '</td></tr>';
      }).join('') + '</table></div>';
  }
  rvRecDone = true;
  const open = rvA5Guessed && rvRecDone;
  ['rv-a5-f1','rv-a5-f2','rv-a5-f3','rv-a5-f4'].forEach(function(id){ rvLock(id, open); });
  const lm = rvEl('rv-a5-lock');
  if(lm) lm.style.display = open ? 'none' : '';
  if(!quiet){
    const st = rvEl('rv-rec-st');
    if(st) st.textContent = '추천 근거가 만들어졌습니다. 아래 추천서 문장을 채워 보세요.';
  }
}
function rvRecSave(){
  const o = {w:(rvEl('rv-rec-w')||{}).value || '', k:(rvEl('rv-rec-k')||{}).value || '',
             p:(rvEl('rv-rec-p')||{}).value || '', v:(rvEl('rv-rec-v')||{}).value || '',
             s:(rvEl('rv-rec-s')||{}).value || ''};
  rvLSSet(RV_K_REC, JSON.stringify(o));
  const st = rvEl('rv-rec-st');
  if(st) st.textContent = '저장했습니다. [학습지 인쇄]를 누르면 2면 ⑧번 칸에 그대로 들어갑니다.';
}

/* ── 14. 활동 6 — 필터 버블 시뮬레이터 ──────────────────────────────────── */
/* 12칸 추천 목록의 장르 배분 — 매 회차 “내가 5점을 준 장르”의 가중치가 2배가 됩니다.
   최대잔여법으로 12칸을 나누되, 카탈로그에 있는 장르는 0칸이 되지 않게 1칸을 보장합니다. */
function rvBubbleDist(n, mix){
  const G = ['로맨스','액션','추리'];
  const w = [5 * Math.pow(2, n - 1), 4, 3];
  let slots = 12, reserve = [0,0,0];
  if(mix){
    /* 다양성 섞기 30% — 12칸 중 4칸을 가중치와 무관하게 배정(가중치가 작은 장르부터) */
    const order = [2,1,0];
    for(let t = 0; t < 4; t++) reserve[order[t % 3]]++;
    slots = 8;
  }
  const sum = w[0] + w[1] + w[2];
  const raw = w.map(function(x){ return slots * x / sum; });
  const out = raw.map(function(x){ return Math.floor(x); });
  let rest = slots - out[0] - out[1] - out[2];
  const rem = raw.map(function(x,i){ return {i:i, r:x - Math.floor(x)}; })
                 .sort(function(a,b){ return b.r - a.r || a.i - b.i; });
  for(let t = 0; t < rest; t++) out[rem[t % 3].i]++;
  for(let i = 0; i < 3; i++) out[i] += reserve[i];
  /* 최소 1칸 보장 — 가장 많은 칸에서 한 칸 빌려 옵니다 */
  for(let i = 0; i < 3; i++){
    if(out[i] === 0){
      let mx = 0;
      for(let j = 1; j < 3; j++) if(out[j] > out[mx]) mx = j;
      out[mx]--; out[i]++;
    }
  }
  return {G:G, v:out};
}
function rvBubbleKinds(v){ return v.filter(function(x){ return x >= 2; }).length; }
function rvDrawBubble(){
  const cv = rvEl('rv-bubble');
  const pr = rvPrep(cv);
  if(!pr) return;
  const ctx = pr.ctx, W = pr.w, H = pr.h;
  const L = 34, R = W - 14, T = 20, B = H - 34;
  const cols = [rvCss('--red','#b44133'), rvCss('--blue','#4a6b8a'), rvCss('--accent','#c8b9a6')];
  const pats = ['solid','diag','dot'];
  const gw = (R - L) / 5;
  ctx.strokeStyle = rvCss('--border','#d8d0c4'); ctx.lineWidth = 1;
  for(let g = 0; g <= 12; g += 4){
    const y = B - (B - T) * g / 12;
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
    ctx.fillStyle = rvCss('--muted','#78726a'); ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText(String(g), L - 5, y + 3);
  }
  for(let n = 1; n <= 5; n++){
    const d = rvBubbleDist(n, rvBubbleMixOn);
    const x0 = L + gw * (n - 1) + 6;
    const bw = (gw - 16) / 3;
    d.v.forEach(function(c, gi){
      const h = (B - T) * c / 12;
      ctx.fillStyle = (n <= rvBubbleN) ? rvPat(ctx, pats[gi], cols[gi]) : rvCss('--card-h','#e2dbd1');
      ctx.fillRect(x0 + bw * gi, B - h, bw - 2, h);
      ctx.strokeStyle = (n <= rvBubbleN) ? cols[gi] : rvCss('--border','#d8d0c4');
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + bw * gi, B - h, bw - 2, h);
      if(n <= rvBubbleN && c > 0){
        ctx.fillStyle = rvCss('--fg','#1a1714'); ctx.font = '700 10px monospace'; ctx.textAlign = 'center';
        ctx.fillText(String(c), x0 + bw * gi + bw / 2 - 1, B - h - 3);
      }
    });
    ctx.fillStyle = (n <= rvBubbleN) ? rvCss('--fg','#1a1714') : rvCss('--muted','#78726a');
    ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(n + '회차', x0 + (gw - 16) / 2, B + 14);
  }
  ctx.strokeStyle = rvCss('--fg','#1a1714'); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(R, B); ctx.stroke();
  ctx.fillStyle = rvCss('--muted','#78726a'); ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('로맨스(무지) · 액션(사선) · 추리(점) — 추천 목록 12칸의 장르 구성', L, T - 8);
}
function rvBubbleInfo(){
  const d1 = rvBubbleDist(1, rvBubbleMixOn), dn = rvBubbleDist(rvBubbleN, rvBubbleMixOn);
  const bd = rvEl('rv-bubble-badges');
  if(bd) bd.innerHTML =
    '<span class="rv-badge mark">' + rvBubbleN + '회차 — 로맨스 <b>' + dn.v[0] + '</b> · 액션 <b>' + dn.v[1] +
    '</b> · 추리 <b>' + dn.v[2] + '</b></span>' +
    '<span class="rv-badge ' + (rvBubbleKinds(dn.v) < rvBubbleKinds(d1.v) ? 'hot' : '') + '">' +
    '지호가 실질적으로 접하는 장르(목록에서 2칸 이상)의 종류: <b>' + rvBubbleKinds(d1.v) + ' → ' + rvBubbleKinds(dn.v) + '</b></span>' +
    (rvBubbleMixOn ? '<span class="rv-badge good">다양성 섞기 30% 켜짐</span>' : '');
  const t = rvEl('rv-bubble-tbl');
  if(t){
    let h = '<tr><th>회차</th><th>로맨스</th><th>액션</th><th>추리</th><th>2칸 이상인 장르 수</th></tr>';
    for(let n = 1; n <= 5; n++){
      const d = rvBubbleDist(n, rvBubbleMixOn);
      h += '<tr' + (n === rvBubbleN ? ' class="hi"' : '') + '><th>' + n + '회차</th><td>' + d.v[0] + '</td><td>' +
        d.v[1] + '</td><td>' + d.v[2] + '</td><td>' + rvBubbleKinds(d.v) + '</td></tr>';
    }
    t.innerHTML = h;
  }
}
function rvBubbleRun(){
  rvBubbleRan = true;
  const step = function(n){
    rvBubbleN = n;
    rvDrawBubble();
    rvBubbleInfo();
    if(n < 5 && !rvReduce()) setTimeout(function(){ step(n + 1); }, 520);
  };
  if(rvReduce()){ rvBubbleN = 5; rvDrawBubble(); rvBubbleInfo(); }
  else step(1);
  ['rv-a6-f1','rv-a6-f2'].forEach(function(id){ rvLock(id, true); });
  const lm = rvEl('rv-a6-lock');
  if(lm) lm.style.display = 'none';
}
function rvBubbleReset(){
  rvBubbleN = 1;
  rvDrawBubble();
  rvBubbleInfo();
}
function rvBubbleMix(on){
  rvBubbleMixOn = !!on;
  rvDrawBubble();
  rvBubbleInfo();
}
function rvDebateSave(){
  const o = {d1:(rvEl('rv-deb1')||{}).value || '', d2:(rvEl('rv-deb2')||{}).value || '',
             d3:(rvEl('rv-deb3')||{}).value || ''};
  rvLSSet(RV_K_DEB, JSON.stringify(o));
  const st = rvEl('rv-deb-st');
  if(st) st.textContent = '저장했습니다. 이 기기에만 보관되며, [학습지 인쇄] 2면 ⑩번 칸에 들어갑니다.';
}
function rvDebateExport(){
  const o = {
    lesson:'11차시 · 리뷰 분석과 추천 — 모둠 토의',
    debate:{
      q1:(rvEl('rv-deb1')||{}).value || '',
      q2:(rvEl('rv-deb2')||{}).value || '',
      q3:(rvEl('rv-deb3')||{}).value || ''
    },
    diag: rvLS(RV_K_DIAG,''), rec: rvLS(RV_K_REC,''), k: rvKv,
    dict:{P:rvDict.P.length, N:rvDict.N.length}
  };
  try{
    const blob = new Blob([JSON.stringify(o, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '11차시_모둠의견.json';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    const st = rvEl('rv-deb-st');
    if(st) st.textContent = '11차시_모둠의견.json 파일로 내려받았습니다. 학급 자료함에 올려 주세요.';
  }catch(e){
    const st = rvEl('rv-deb-st');
    if(st) st.textContent = '내보내기에 실패했습니다. 화면의 내용을 직접 복사해 주세요.';
  }
}

/* ── 15. 데이터 바꾸기 · 분석 · 갱신 ────────────────────────────────────── */
function rvPasteToggle(){
  const b = rvEl('rv-paste');
  if(!b) return;
  b.classList.toggle('on');
  if(b.classList.contains('on')){
    const ta = rvEl('rv-paste-ta');
    if(ta && !ta.value) ta.value = rvLS(RV_K_DATA, '');
  }
}
function rvPasteApply(){
  const ta = rvEl('rv-paste-ta');
  const st = rvEl('rv-paste-st');
  const raw = ta ? ta.value : '';
  if(!raw.trim()){
    rvLSSet(RV_K_DATA, '');
    rvData = RV_REVIEWS.slice();
    if(st) st.textContent = '내장 리뷰 100건으로 되돌렸습니다.';
  }else{
    const rows = rvParseCSV(raw);
    if(!rows.length){
      if(st) st.textContent = '한 건도 읽지 못했습니다. 「날짜,별점,본문」 형식인지 확인해 주세요(예: 03-15,2,국물이 짜요).';
      return;
    }
    rvLSSet(RV_K_DATA, raw);
    rvData = rows;
    if(st) st.textContent = rows.length + '건을 읽었습니다. 이 자료에서는 검산표의 수치가 재현되지 않는 것이 정상입니다 — ' +
      '경고 배너가 올바른 안내를 하는지 확인해 보세요.';
  }
  rvU = null; rvVecs = null;
  rvA3Word = '';
  rvAnalyzeRun();
}
function rvReset(){
  rvLoadDict();
  rvKv = 0.25;
  rvKSet(0.25);
  const st = rvEl('rv-fix-st');
  if(st) st.textContent = '10차시 값(P ' + rvDict.P.length + ' / N ' + rvDict.N.length + ' · k = 0.25)으로 되돌렸습니다.';
}
function rvAnalyzeRun(){
  rvDone = true;
  rvAnalyze();
  rvU = null; rvVecs = null;
  const bar = rvEl('rv-badges');
  if(bar && !rvReduce()){
    bar.innerHTML = '<span class="rv-badge mark">한 건씩 단어집합 → J(P,A) → J(N,A) → 점수 → 판정을 계산하는 중…</span>';
    setTimeout(rvRefresh, 380);
  }else{
    rvRefresh();
  }
  ['rv-a1-f1','rv-a1-f2','rv-a1-f3'].forEach(function(id){ rvLock(id, true); });
  const lm = rvEl('rv-a1-lock');
  if(lm) lm.style.display = 'none';
  const p = rvEl('rv-a1-panel');
  if(p) p.classList.remove('rv-veil');
}
function rvRefresh(){
  if(!rvRows.length || rvDone) rvAnalyze();
  rvBadges();
  rvGuardBanner();
  rvDictRender();
  rvDrawLine();
  rvDrawDonut();
  rvDrawHist();
  rvA2List();
  rvA2Month();
  if(rvDone) rvComboMark();
  rvA3Render();
  rvA4Init();
  rvA3Gate();
  rvMonthChips();
}
function rvResizeAll(){
  const root = rvEl('v-review');
  if(!root || !root.offsetParent) return;
  try{ rvDrawLine(); }catch(e){}
  try{ rvDrawDonut(); }catch(e){}
  try{ rvDrawHist(); }catch(e){}
  try{ rvDrawBubble(); }catch(e){}
}

/* ── 16. 핵심 질문 답 · 학급 자료함 · 인쇄 ──────────────────────────────── */
function rvAnsSave(){
  const o = {a1:(rvEl('rv-ans1')||{}).value || '', a2:(rvEl('rv-ans2')||{}).value || ''};
  rvLSSet(RV_K_ANS, JSON.stringify(o));
  const st = rvEl('rv-ans-st');
  if(st) st.textContent = '저장했습니다. 이 기기에만 보관되며, 학습지 2면 ⑪번 칸에 들어갑니다.';
}
function rvLoadInputs(){
  function set(id, v){ const e = rvEl(id); if(e && v) e.value = v; }
  try{
    const a = JSON.parse(rvLS(RV_K_ANS, '{}'));
    set('rv-ans1', a.a1); set('rv-ans2', a.a2);
  }catch(e){}
  try{
    const d = JSON.parse(rvLS(RV_K_DIAG, '{}'));
    set('rv-diag-m', d.m); set('rv-diag-w', d.w); set('rv-diag-a', d.a);
  }catch(e){}
  try{
    const r = JSON.parse(rvLS(RV_K_REC, '{}'));
    set('rv-rec-w', r.w); set('rv-rec-k', r.k); set('rv-rec-p', r.p); set('rv-rec-v', r.v); set('rv-rec-s', r.s);
  }catch(e){}
  try{
    const b = JSON.parse(rvLS(RV_K_DEB, '{}'));
    set('rv-deb1', b.d1); set('rv-deb2', b.d2); set('rv-deb3', b.d3);
  }catch(e){}
  const g = rvLS(RV_K_GUESS, '');
  if(g){
    set('rv-a3-guess', g);
    rvA3Guessed = true;
    const p = rvEl('rv-a3-panel'); if(p) p.classList.remove('rv-veil');
    const mine = rvEl('rv-a3-mine'); if(mine) mine.textContent = g;
  }
  try{
    const s = JSON.parse(rvLS(RV_K_STOP, ''));
    if(s && typeof s.mode === 'number'){
      rvStopMode = s.mode;
      rvStopList = Array.isArray(s.list) ? s.list : RV_STOP_DOMAIN.slice();
      const box = rvEl('rv-a3-stop');
      if(box){
        const chips = box.querySelectorAll('.chip');
        chips.forEach(function(c,i){ c.classList.toggle('on', i === rvStopMode); });
      }
      const ed = rvEl('rv-a3-stopedit');
      if(ed) ed.style.display = (rvStopMode === 2) ? '' : 'none';
      const inp = rvEl('rv-a3-stopin');
      if(inp) inp.value = rvStopList.join(', ');
    }
  }catch(e){}
  /* k 는 복원하지 않습니다 — §0-2 #19: 페이지를 처음 열면 반드시 10차시 값 k = 0.25 로 시작해야
     활동 2의 「100건 중 95건이 중립」 장면이 성립합니다. 지난 시간에 정한 k는 aimath.review.k 에
     그대로 남아 있고, [학습지 인쇄]가 그 값을 지면에 채우며, 배지로도 알려 줍니다(rvBadges). */
}
function rvRoomForm(on){
  const f = rvEl('rv-room-form');
  if(!f) return;
  f.style.display = on ? 'flex' : 'none';
  if(on){ const i = rvEl('rv-room-u'); if(i){ i.value = rvLS(RV_K_ROOM, '') || rvLS(RV_K_ROOM_CORE, ''); i.focus(); } }
}
function rvRoomRender(){
  const box = rvEl('rv-room');
  if(!box) return;
  let url = rvLS(RV_K_ROOM, '');
  if(!url){
    const legacy = rvLS(RV_K_ROOM_CORE, '');
    if(legacy){ url = legacy; rvLSSet(RV_K_ROOM, legacy); }
  }
  box.innerHTML = url
    ? '<a class="rv-vdlink" href="' + rvEsc(url) + '" target="_blank" rel="noopener">' +
      '<span class="th">🗂</span><span class="meta"><b>학급 공유 자료함</b>' +
      '<span>학급 · 우리 반의 리뷰 분석 보고서와 추천 규칙 한 문장을 모으는 곳입니다. 프로젝트 과제 제출물도 여기에 올립니다.</span></span></a>' +
      '<button class="btn" type="button" style="margin-top:0.4rem;" onclick="rvRoomForm(1)">주소 변경</button>'
    : '<button class="rv-vdlink" type="button" style="cursor:pointer;text-align:left;" onclick="rvRoomForm(1)">' +
      '<span class="th">🗂</span><span class="meta"><b>학급 공유 자료함 설정</b>' +
      '<span>학급 · 선생님이 패들렛·구글 드라이브 주소를 한 번만 넣으면 6~11차시 모든 차시에 함께 나타납니다.</span></span></button>';
}
function rvRoomSave(){
  const i = rvEl('rv-room-u');
  const st = rvEl('rv-room-st');
  if(!i) return;
  const u = (i.value || '').trim();
  if(u && !/^https?:\/\//i.test(u)){
    if(st) st.textContent = 'http 또는 https 로 시작하는 주소를 입력해 주세요.';
    return;
  }
  rvLSSet(RV_K_ROOM, u);
  rvLSSet(RV_K_ROOM_CORE, u);   /* core.js 공유 폴더 UI와 값이 어긋나지 않도록 미러링 */
  rvRoomForm(0);
  if(st) st.textContent = u ? '학급 자료함 주소를 저장했습니다. 이 기기에만 저장됩니다.' : '주소를 지웠습니다.';
  rvRoomRender();
  if(typeof aimRefExtrasAll === 'function'){ try{ aimRefExtrasAll(); }catch(e){} }
}
/* 점선 ‘＋ 자료 추가’ 카드 — core.js aimRefExtras 가 붙인 입력 폼을 엽니다. */
function rvRefAdd(){
  const root = rvEl('v-review');
  if(!root) return;
  const btn = root.querySelector('.rx .rx-open');
  if(btn){
    btn.click();
    const f = root.querySelector('.rx .rx-add-form');
    if(f && f.scrollIntoView){ try{ f.scrollIntoView({behavior: rvReduce() ? 'auto' : 'smooth', block:'center'}); }catch(e){} }
    return;
  }
  const st = rvEl('rv-ref-st');
  if(st) st.textContent = '자료 추가 슬롯을 찾지 못했습니다. 매니페스트(AIM_LESSONS)에 review 가 등록되어 있는지 확인해 주세요.';
}
/* 인쇄 — fill=1 이면 웹에서 입력한 값을 지면에 채웁니다. */
function rvPrint(fill){
  function put(id, html){ const e = rvEl(id); if(e) e.innerHTML = html; }
  if(fill){
    put('rv-pr-np', String(rvDict.P.length));
    put('rv-pr-nn', String(rvDict.N.length));
    /* [대시보드 고정]으로 저장한 k 가 있으면 그 값을 씁니다. 화면은 §0-2 #19 에 따라
       늘 0.25 에서 시작하므로, 지면에는 학생이 스스로 정한 값이 남아야 합니다. */
    const kSaved = parseFloat(rvLS(RV_K_K, ''));
    put('rv-pr-k', (isNaN(kSaved) ? rvKv : kSaved).toFixed(2));
    let d = {};
    try{ d = JSON.parse(rvLS(RV_K_DIAG, '{}')) || {}; }catch(e){}
    put('rv-pr-diag', '“리뷰 ' + rvData.length + ' 건을 분석한 결과, ' + rvEsc(d.m || '______') +
      ' 월부터 평균 감성 점수가 음수로 바뀌었고, 그 시기 리뷰에서 TF-IDF가 가장 큰 단어는 ' +
      rvEsc(d.w || '____________') + ' 였습니다. 따라서 가장 먼저 점검할 곳은 ' + rvEsc(d.a || '____________') + ' 입니다.”');
    let r = {};
    try{ r = JSON.parse(rvLS(RV_K_REC, '{}')) || {}; }catch(e){}
    put('rv-pr-rec', '“지호 에게 ' + rvEsc(r.w || '__________') + ' 을(를) 추천합니다. 왜냐하면 ' +
      rvEsc(r.k || '__________') + ' 유사도로 잰 값이 ' + rvEsc(r.v || '__________') +
      ' 로 가장 가까웠고, 그분이 이 작품에 ' + rvEsc(r.s || '______') + ' 점을 주었기 때문입니다.”');
    let b = {};
    try{ b = JSON.parse(rvLS(RV_K_DEB, '{}')) || {}; }catch(e){}
    put('rv-pr-d1', rvEsc(b.d1 || ''));
    put('rv-pr-d2', rvEsc(b.d2 || ''));
    put('rv-pr-d3', rvEsc(b.d3 || ''));
    let a = {};
    try{ a = JSON.parse(rvLS(RV_K_ANS, '{}')) || {}; }catch(e){}
    put('rv-pr-a1', rvEsc(a.a1 || ''));
    put('rv-pr-a2', rvEsc(a.a2 || ''));
  }else{
    put('rv-pr-np', '______'); put('rv-pr-nn', '______'); put('rv-pr-k', '______');
    put('rv-pr-diag', '“리뷰 ______ 건을 분석한 결과, ______ 월부터 평균 감성 점수가 ____________로 바뀌었고, ' +
      '그 시기 리뷰에서 TF-IDF가 가장 큰 단어는 ____________였습니다. 따라서 가장 먼저 점검할 곳은 ____________입니다.”');
    put('rv-pr-rec', '“__________ 에게 __________ 을(를) 추천합니다. 왜냐하면 __________ 유사도로 잰 값이 ' +
      '__________ 로 가장 __________ 했고, 그분이 이 작품에 ______ 점을 주었기 때문입니다.”');
    ['rv-pr-d1','rv-pr-d2','rv-pr-d3','rv-pr-a1','rv-pr-a2'].forEach(function(id){ put(id, ''); });
  }
  if(typeof wsPrint === 'function') wsPrint('rv-sheet');
}

/* ── 17. 초기화 (IIFE + null 가드) ──────────────────────────────────────── */
(function reviewInit(){
  const boot = function(){
    const root = rvEl('v-review');
    if(!root) return;                       /* 뷰가 없어도 core.js 가 죽지 않도록 */

    /* 공통 컴포넌트 — 재사용만 합니다(수정 금지). */
    if(typeof videoDeck   === 'function'){ try{ videoDeck('rv-videos','review', RV_VIDEOS); }catch(e){ console.error('rv videoDeck', e); } }
    if(typeof warmStepper === 'function'){ try{ warmStepper('rv-warm','rv', RV_WARM); }catch(e){ console.error('rv warmStepper', e); } }
    if(typeof quizStepper === 'function'){ try{ quizStepper('rv-quiz','rv', RV_QUIZ); }catch(e){ console.error('rv quizStepper', e); } }
    if(typeof chipDefs    === 'function'){ try{ chipDefs('#v-review .rv-keys', RV_DEFS); }catch(e){ console.error('rv chipDefs', e); } }
    if(typeof wsLinks     === 'function'){ try{ wsLinks('rv-wslinks','review'); }catch(e){ console.error('rv wsLinks', e); } }

    /* 상태 복원 — 초기 상태는 반드시 10차시 값(P10/N10, k = 0.25)입니다(§0-2 #19). */
    rvLoadDict();
    rvLoadData();
    rvMatLoad();
    rvLoadInputs();
    rvKSet(rvKv);
    rvRoomRender();
    rvMatRender();
    rvDrawBubble();
    rvBubbleInfo();

    /* 단계 토글은 조작 전에는 잠급니다. */
    ['rv-a1-f1','rv-a1-f2','rv-a1-f3','rv-a2-f1','rv-a2-f2','rv-a2-f3','rv-a2-f4',
     'rv-a3-f1','rv-a3-f2','rv-a3-f3','rv-a3-f4','rv-a4-f1','rv-a4-f2','rv-a4-f3',
     'rv-a5-f1','rv-a5-f2','rv-a5-f3','rv-a5-f4','rv-a6-f1','rv-a6-f2']
      .forEach(function(id){ rvLock(id, false); });

    /* 뷰가 화면에 나타나면 캔버스를 다시 그립니다(go() 수정 없이 지연 init). */
    try{
      const mo = new MutationObserver(function(){
        if(root.classList.contains('active')) setTimeout(rvResizeAll, 30);
      });
      mo.observe(root, {attributes:true, attributeFilter:['class']});
    }catch(e){}
    let rt = null;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(rvResizeAll, 160);
    });
    if(root.classList.contains('active')) setTimeout(rvResizeAll, 60);
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ●●● ANCHOR-REVIEW ●●● (11차시 보강 코드는 이 줄 바로 위에 붙입니다) */
