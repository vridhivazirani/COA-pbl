// ══════════════════════════════
// PAGE NAVIGATION
// ══════════════════════════════
const PAGES = [
  {id:'pg-0', title:'Home'},
  {id:'pg-1', title:'Problem Statement'},
  {id:'pg-2', title:'I/O Organization'},
  {id:'pg-3', title:'Techniques'},
  {id:'pg-4', title:'Comparison'},
  {id:'pg-5', title:'Visualizer'},
  {id:'pg-6', title:'Simulation'},
  {id:'pg-7', title:'Quiz'},
  {id:'pg-8', title:'Glossary'},
  {id:'pg-9', title:'Methodology'},
  {id:'pg-10', title:'Our Contribution'},
];

let curPage = 0;

// Build sidebar
const sbNav = document.getElementById('sbNav');
PAGES.forEach((p,i) => {
  const btn = document.createElement('button');
  btn.className = 'sn' + (i===0?' active':'');
  btn.innerHTML = `<span class="sn-dot"></span><span class="sn-lbl">${p.title}</span>`;
  btn.onclick = () => goPage(i);
  sbNav.appendChild(btn);
});

function goPage(idx) {
  if(idx === curPage) return;
  const curr = document.getElementById(PAGES[curPage].id);
  const next = document.getElementById(PAGES[idx].id);
  const dir = idx > curPage ? 1 : -1;

  curr.classList.remove('active');
  curr.classList.add('exit-left');
  curr.style.transform = dir > 0 ? 'translateX(-40px)' : 'translateX(40px)';

  next.style.transform = dir > 0 ? 'translateX(40px)' : 'translateX(-40px)';
  next.style.opacity = '0';
  next.style.transition = 'none';
  next.classList.add('active');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.style.transition = '';
      next.style.transform = 'translateX(0)';
      next.style.opacity = '1';
    });
  });

  setTimeout(() => {
    curr.classList.remove('exit-left');
    curr.style.transform = '';
    curr.style.opacity = '';
  }, 480);

  // scroll page to top
  next.scrollTop = 0;

  curPage = idx;
  updateUI();

  // redraw chart if sim page
  if(idx === 6) setTimeout(drawChart, 100);
}

function updateUI() {
  // sidebar
  document.querySelectorAll('.sn').forEach((b,i) => b.classList.toggle('active', i===curPage));
  // topbar
  document.getElementById('topbarTitle').textContent = PAGES[curPage].title;
  document.getElementById('pageCounter').textContent = `${curPage+1} / ${PAGES.length}`;
  // progress bar
  document.getElementById('progress').style.transform = `scaleX(${curPage/(PAGES.length-1)})`;
}

// Keyboard navigation
document.addEventListener('keydown', e => {
  if(e.key === 'ArrowRight' || e.key === 'ArrowDown') goPage(Math.min(curPage+1, PAGES.length-1));
  if(e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPage(Math.max(curPage-1, 0));
});

// ══════════════════════════════
// DARK MODE
// ══════════════════════════════
document.getElementById('themeBtn').onclick = () => {
  const d = document.documentElement;
  const dark = d.getAttribute('data-theme') === 'dark';
  d.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('themeBtn').textContent = dark ? '🌙' : '☀️';
  drawChart();
};

// ══════════════════════════════
// SIMULATION
// ══════════════════════════════
const TR=100,IO=0.002,CS=0.001,DI=0.0005,IB=10;
// PIO: polling overhead adds ~15% to transfer time; CPU actually busy ~68% (idle gaps during bus waits)
const PIO_POLL_OVERHEAD=0.15;
const PIO_CPU_FACTOR=0.68;
function pio(s){const t=s/TR;const poll=t*PIO_POLL_OVERHEAD;return{total:t+poll,cpu:(t+poll)*PIO_CPU_FACTOR};}
// Interrupt I/O unchanged
function iio(s){const t=s/TR,n=Math.max(1,Math.floor(s/IB)),ov=n*(IO+CS);return{total:t+ov,cpu:ov};}
// DMA: fastest total time (dedicated hardware, no CPU bottleneck); throughput slightly under peak due to bus arbitration
const DMA_EFF_TR=97;
function dma(s){return{total:s/DMA_EFF_TR,cpu:DI};}

let curChart='cpu', curSize=50;

function setPreset(v,btn){
  curSize=v;
  document.getElementById('sizeSlider').value=v;
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  updateSim(v);
}

function updateSim(sz){
  sz=parseFloat(sz); curSize=sz;
  document.getElementById('sizeVal').textContent=sz+' MB';
  const p=pio(sz),n=iio(sz),d=dma(sz);
  const pu=p.cpu/p.total*100, nu=n.cpu/n.total*100, du=d.cpu/d.total*100;

  set('pio-time',p.total.toFixed(4));set('pio-cpu',p.cpu.toFixed(4));set('pio-tp',(sz/p.total).toFixed(1));
  set('pio-util',pu.toFixed(1)+'%');bar('pio-bar',Math.min(100,pu));
  set('int-time',n.total.toFixed(4));set('int-cpu',n.cpu.toFixed(4));set('int-tp',(sz/n.total).toFixed(1));
  set('int-util',nu.toFixed(2)+'%');bar('int-bar',Math.min(100,nu));
  set('dma-time',d.total.toFixed(4));set('dma-cpu',d.cpu.toFixed(5));set('dma-tp',(sz/d.total).toFixed(1));
  set('dma-util',du.toFixed(3)+'%');bar('dma-bar',Math.max(0.3,du));

  ['pio','int','dma'].forEach(k=>{const c=document.getElementById('card-'+k);c.classList.remove('winner');const b=c.querySelector('.win-badge');if(b)b.remove();});
  let wk,wn,wr;
  if(sz<=5){wk='pio';wn='Programmed I/O';wr=`For tiny ${sz}MB, PIO avoids DMA/interrupt setup overhead.`;}
  else if(sz<=80){wk='int';wn='Interrupt-Driven';wr=`At ${sz}MB, Interrupt I/O balances low CPU overhead with manageable complexity.`;}
  else{wk='dma';wn='DMA';wr=`For ${sz}MB, DMA frees the CPU entirely and delivers optimal throughput.`;}
  const wc=document.getElementById('card-'+wk);wc.classList.add('winner');
  const wb=document.createElement('div');wb.className='win-badge';wb.textContent='BEST';wc.appendChild(wb);
  set('recWinner',wn);document.getElementById('recReason').textContent=wr;
  drawChart();
}
function set(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
function bar(id,pct){const el=document.getElementById(id);if(el)el.style.width=pct+'%';}

function setChart(type,btn){
  curChart=type;
  document.querySelectorAll('.ctab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const cfg={cpu:['CPU Busy Time vs. Data Size','Lower is better.'],total:['Total Transfer Time vs. Data Size','Overall wall-clock time.'],throughput:['Throughput vs. Data Size (MB/s)','Higher is better.'],util:['CPU Utilization % vs. Data Size','Lower is better.']};
  set('chartTitle',cfg[type][0]);set('chartSub',cfg[type][1]);
  drawChart();
}

function drawChart(){
  const canvas=document.getElementById('chartCanvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const rawW=canvas.parentElement.clientWidth-48;
  const W=rawW>10?rawW:600,H=220;
  canvas.width=W*dpr;canvas.height=H*dpr;
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.scale(dpr,dpr);
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  ctx.fillStyle=dark?'#241A36':'#fff';ctx.fillRect(0,0,W,H);

  const sizes=[1,10,50,100,250,500,1000];
  let pd,nd,dd,yl;
  if(curChart==='cpu'){pd=sizes.map(s=>pio(s).cpu);nd=sizes.map(s=>iio(s).cpu);dd=sizes.map(s=>dma(s).cpu);yl='s';}
  else if(curChart==='total'){pd=sizes.map(s=>pio(s).total);nd=sizes.map(s=>iio(s).total);dd=sizes.map(s=>dma(s).total);yl='s';}
  else if(curChart==='throughput'){pd=sizes.map(s=>s/pio(s).total);nd=sizes.map(s=>s/iio(s).total);dd=sizes.map(s=>s/dma(s).total);yl='MB/s';}
  else{pd=sizes.map(s=>{const r=pio(s);return r.cpu/r.total*100;});nd=sizes.map(s=>{const r=iio(s);return r.cpu/r.total*100;});dd=sizes.map(s=>{const r=dma(s);return r.cpu/r.total*100;});yl='%';}

  const gc=dark?'rgba(255,255,255,.06)':'#eee',lc=dark?'#888':'#999';
  const PAD={l:60,r:20,t:24,b:36};
  const pw=W-PAD.l-PAD.r,ph=H-PAD.t-PAD.b;
  const maxY=Math.max(...pd,...nd,...dd)*1.12||1;

  ctx.strokeStyle=gc;ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=PAD.t+ph-(i/4)*ph;
    ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();
    ctx.fillStyle=lc;ctx.font='9px Space Mono,monospace';ctx.textAlign='right';
    const v=maxY*i/4;ctx.fillText((v>=10?v.toFixed(1):v>=1?v.toFixed(2):v.toFixed(3))+yl,PAD.l-6,y+3);
  }
  ctx.fillStyle=lc;ctx.textAlign='center';ctx.font='9px Space Mono,monospace';
  sizes.forEach((s,i)=>{ctx.fillText(s>=1000?'1GB':s+'MB',PAD.l+(i/(sizes.length-1))*pw,H-6);});

  function line(data,color,dashed){
    ctx.setLineDash(dashed?[5,4]:[]);
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.lineJoin='round';
    data.forEach((v,i)=>{const x=PAD.l+(i/(sizes.length-1))*pw,y=PAD.t+ph-(v/maxY)*ph;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke();ctx.setLineDash([]);
    data.forEach((v,i)=>{const x=PAD.l+(i/(sizes.length-1))*pw,y=PAD.t+ph-(v/maxY)*ph;ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();});
  }
  line(pd,'#D4615A');line(nd,'#7B6EA8',true);line(dd,'#5ECFB4');

  [['PIO','#D4615A'],['Interrupt','#7B6EA8'],['DMA','#5ECFB4']].forEach(([l,c],i)=>{
    const lx=PAD.l+i*100,ly=PAD.t+10;
    ctx.fillStyle=c;ctx.fillRect(lx,ly,16,2.5);
    ctx.fillStyle=dark?'#ccc':'#555';ctx.font='10px Space Mono,monospace';ctx.textAlign='left';
    ctx.fillText(l,lx+22,ly+4);
  });
}

function exportCSV(){
  const sizes=[1,10,50,100,250,500,1000];
  let csv='Data Size (MB),PIO Total (s),PIO CPU (s),PIO Throughput (MB/s),INT Total (s),INT CPU (s),INT Throughput (MB/s),DMA Total (s),DMA CPU (s),DMA Throughput (MB/s)\n';
  sizes.forEach(s=>{const p=pio(s),n=iio(s),d=dma(s);csv+=`${s},${p.total.toFixed(5)},${p.cpu.toFixed(5)},${(s/p.total).toFixed(2)},${n.total.toFixed(5)},${n.cpu.toFixed(5)},${(s/n.total).toFixed(2)},${d.total.toFixed(5)},${d.cpu.toFixed(5)},${(s/d.total).toFixed(2)}\n`;});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='io_simulation_results.csv';a.click();
}

// ══════════════════════════════
// VISUALIZER
// ══════════════════════════════
let vizMode='pio',vizTimer=null;
const VIZ={
  pio:{nodes:[{l:'CPU',cls:'n-cpu'},{l:'System Bus',cls:'n-bus'},{l:'I/O Device',cls:'n-dev'}],steps:['Step 1: CPU sends I/O command to device via the system bus.','Step 2: CPU checks Status Register — waiting for BUSY flag to clear.','Step 3: CPU polls again... device still busy. CPU is stalled.','Step 4: Device ready! CPU reads Data Register and transfers bytes.','Step 5: Transfer complete. CPU resumes normal execution.'],cpu:100,mc:'#D4615A'},
  int:{nodes:[{l:'CPU',cls:'n-cpu'},{l:'System Bus',cls:'n-bus'},{l:'I/O Device',cls:'n-dev'}],steps:['Step 1: CPU sends I/O command to device.','Step 2: CPU continues executing OTHER tasks — not blocked!','Step 3: Device finishes — sends Interrupt Signal to CPU.','Step 4: CPU saves state (context switch) and executes ISR.','Step 5: ISR handles data, CPU restores state and resumes.'],cpu:12,mc:'#7B6EA8'},
  dma:{nodes:[{l:'CPU',cls:'n-cpu'},{l:'DMA Ctrl',cls:'n-dma'},{l:'Memory',cls:'n-mem'},{l:'I/O Device',cls:'n-dev'}],steps:['Step 1: CPU initializes DMA — sets address, count, and control registers.','Step 2: DMA requests and takes control of the system bus.','Step 3: DMA transfers data directly: Device → Memory. CPU is FREE.','Step 4: CPU executes unrelated instructions during the ENTIRE transfer.','Step 5: DMA sends interrupt when done. CPU briefly notified.'],cpu:0.1,mc:'#5ECFB4'}
};

function buildViz(){
  const def=VIZ[vizMode],row=document.getElementById('vizRow');
  row.innerHTML='';
  def.nodes.forEach((n,i)=>{
    const el=document.createElement('div');
    el.className='bus-node '+n.cls;el.id='vn'+i;
    el.innerHTML=`<div>${n.l}</div>`;
    row.appendChild(el);
    if(i<def.nodes.length-1){
      const lane=document.createElement('div');lane.className='bus-lane';
      const pkt=document.createElement('div');pkt.className='packet';pkt.id='pkt'+i;
      lane.appendChild(pkt);row.appendChild(lane);
    }
  });
}

function setViz(mode,btn){
  vizMode=mode;stopViz();
  document.querySelectorAll('.viz-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');buildViz();
  document.getElementById('vizStatus').innerHTML='Press <strong>Run</strong> to animate the data transfer step by step.';
  document.getElementById('vizPct').textContent='—';
  document.getElementById('vizMeter').style.width='0%';
}

function runViz(){
  stopViz();
  const def=VIZ[vizMode];let step=0;
  const statusEl=document.getElementById('vizStatus');
  const meter=document.getElementById('vizMeter');
  meter.style.background=def.mc;
  setTimeout(()=>{meter.style.width=Math.max(0.5,def.cpu)+'%';document.getElementById('vizPct').textContent=def.cpu+'%';},300);
  document.querySelectorAll('.packet').forEach(p=>p.classList.add('go'));
  function tick(){
    if(step>=def.steps.length){stopViz();return;}
    statusEl.innerHTML='<strong>'+def.steps[step]+'</strong>';
    document.querySelectorAll('.bus-node').forEach(n=>n.classList.remove('pulse'));
    document.querySelectorAll('.bus-node')[Math.min(step,document.querySelectorAll('.bus-node').length-1)]?.classList.add('pulse');
    step++;vizTimer=setTimeout(tick,2000);
  }
  tick();
}
function stopViz(){
  clearTimeout(vizTimer);
  document.querySelectorAll('.packet').forEach(p=>p.classList.remove('go'));
  document.querySelectorAll('.bus-node').forEach(n=>n.classList.remove('pulse'));
}

// ══════════════════════════════
// QUIZ
// ══════════════════════════════
const QS=[
  {q:'Which I/O technique causes the CPU to continuously poll the status register until the device is ready?',opts:['Interrupt-Driven I/O','Direct Memory Access','Programmed I/O','Channel I/O'],ans:2,exp:'Programmed I/O uses busy-waiting/polling — the CPU loops on the status register, wasting cycles.'},
  {q:'In Interrupt-Driven I/O, what executes when the I/O device signals it is ready?',opts:['DMA Controller','ISR (Interrupt Service Routine)','Status Register','Bus Arbiter'],ans:1,exp:'The CPU executes an ISR — a special handler that processes the I/O completion.'},
  {q:'Which DMA register holds the memory address for the data transfer?',opts:['Status Register','Count Register','Address Register','Control Register'],ans:2,exp:'The Address Register in the DMA controller stores the memory address to read from or write to.'},
  {q:'Which I/O method is MOST suitable for large data transfers (e.g., 500MB)?',opts:['Programmed I/O','Interrupt-Driven I/O','Direct Memory Access (DMA)','Manual Transfer'],ans:2,exp:'DMA is ideal for large transfers — it handles data movement independently, keeping the CPU free.'},
  {q:'Which technique has the LOWEST hardware complexity?',opts:['DMA','Interrupt-Driven I/O','Programmed I/O','Channel I/O'],ans:2,exp:'Programmed I/O needs only basic status/data/control registers — no interrupt controller or DMA hardware.'},
  {q:'What happens to the CPU during a DMA transfer?',opts:['Monitors the transfer continuously','Executes an ISR','Executes other instructions freely','Halts completely'],ans:2,exp:'During DMA, the CPU is freed from I/O duties and can run other instructions concurrently.'}
];
let qIdx=0,qScore=0,qAnswered=false;

function renderQ(){
  const q=QS[qIdx];
  const prog=document.getElementById('qprog');prog.innerHTML='';
  QS.forEach((_,i)=>{const d=document.createElement('div');d.className='qpd'+(i<qIdx?' done':i===qIdx?' cur':'');prog.appendChild(d);});
  document.getElementById('qcard').innerHTML=`
    <div class="quiz-q"><span>QUESTION ${qIdx+1} OF ${QS.length}</span>${q.q}</div>
    <div class="qopts">${q.opts.map((o,i)=>`<button class="qopt" onclick="answerQ(${i})">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}</div>
    <div class="qfeed" id="qfeed"></div>
    <div class="qnav"><span class="qsc">Score: ${qScore}/${qIdx}</span><button class="qnext" id="qnext" onclick="nextQ()">Next →</button></div>`;
  qAnswered=false;
}
function answerQ(i){
  if(qAnswered)return;qAnswered=true;
  const q=QS[qIdx];
  document.querySelectorAll('.qopt').forEach(o=>o.disabled=true);
  document.querySelectorAll('.qopt')[q.ans].classList.add('correct');
  if(i===q.ans){qScore++;document.querySelectorAll('.qopt')[i].classList.add('correct');}
  else{document.querySelectorAll('.qopt')[i].classList.add('wrong');}
  const f=document.getElementById('qfeed');
  f.className='qfeed '+(i===q.ans?'ok':'bad')+' show';
  f.textContent=(i===q.ans?'✅ Correct! ':'❌ Not quite. ')+q.exp;
  document.querySelector('.qsc').textContent=`Score: ${qScore}/${qIdx+1}`;
  document.getElementById('qnext').style.display='block';
}
function nextQ(){qIdx++;if(qIdx>=QS.length){showResult();}else{renderQ();}}
function showResult(){
  document.getElementById('qcard').style.display='none';
  document.getElementById('qprog').style.display='none';
  const r=document.getElementById('qresult');r.classList.add('show');
  document.getElementById('qrScore').textContent=`${qScore}/${QS.length}`;
  const msgs=['Keep studying — review the techniques pages!','Good effort! Re-read the pages you missed.','Great job! You understand I/O transfer well.','Perfect score! You\'ve mastered I/O Transfer Techniques.'];
  document.getElementById('qrMsg').textContent=msgs[qScore<=2?0:qScore<=4?1:qScore<=5?2:3];
}
function restartQuiz(){
  qIdx=0;qScore=0;qAnswered=false;
  document.getElementById('qcard').style.display='';
  document.getElementById('qprog').style.display='';
  document.getElementById('qresult').classList.remove('show');
  renderQ();
}

// ══════════════════════════════
// SPLASH
// ══════════════════════════════
function enterSite(){
  document.getElementById('enterBtn').classList.add('loading');
  document.getElementById('spBarWrap').classList.add('show');
  document.getElementById('spDots').classList.add('show');
  const fill=document.getElementById('spBarFill'),lbl=document.getElementById('spBarLabel');
  [{pct:30,label:'Loading pages',delay:0},{pct:58,label:'Building visualizer',delay:400},{pct:80,label:'Rendering charts',delay:850},{pct:95,label:'Almost ready',delay:1250},{pct:100,label:'Ready',delay:1600}]
    .forEach(({pct,label,delay})=>setTimeout(()=>{fill.style.width=pct+'%';lbl.textContent=label;},delay));
  setTimeout(()=>{const s=document.getElementById('splash');s.classList.add('hide');setTimeout(()=>s.remove(),750);},2100);
}

// ══════════════════════════════
// INIT
// ══════════════════════════════
window.addEventListener('load',()=>{
  requestAnimationFrame(()=>{
    buildViz();
    renderQ();
    updateSim(50);
    updateUI();
  });
});
window.addEventListener('resize', drawChart);