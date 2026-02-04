(function() {
  let isRunning = false, filledCount = 0, widget = null;
  let settings = { delay: 200 };

  const widgetCSS = `
    #formfiller-widget { position: fixed; top: 20px; right: 20px; width: 220px; background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid #374151; border-radius: 12px; padding: 12px; z-index: 999999; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#eaeaea; cursor: move; user-select: none; }
    #formfiller-widget .ff-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #374151; padding-bottom:6px; }
    #formfiller-widget .ff-title { font-weight:600; font-size:13px; }
    #formfiller-widget .ff-status { font-size:11px; padding:2px 8px; border-radius:10px; background:#6b7280; }
    #formfiller-widget .ff-status.running { background:#22c55e; }
    #formfiller-widget .ff-status.complete { background:#818cf8; }
    #formfiller-widget .ff-stats { text-align:center; font-size:14px; margin-bottom:10px; color:#9ca3af; }
    #formfiller-widget .ff-stats span { font-size:24px; font-weight:700; color:#818cf8; }
    #formfiller-widget .ff-controls { display:flex; gap:6px; }
    #formfiller-widget .ff-btn { flex:1; padding:8px; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s; }
    #formfiller-widget .ff-btn:disabled { opacity:0.5; cursor:not-allowed; }
    #formfiller-widget .ff-btn-start { background:#818cf8; color:white; }
    #formfiller-widget .ff-btn-start:hover:not(:disabled) { background:#6366f1; }
    #formfiller-widget .ff-btn-stop { background:#ef4444; color:white; }
    #formfiller-widget .ff-btn-stop:hover:not(:disabled) { background:#dc2626; }
  `;

  // ---------------- Generators ----------------
  const gen = {
    firstName: () => ['João','Maria','Pedro','Ana','Carlos','Sofia','Miguel','Beatriz'][Math.floor(Math.random()*8)],
    lastName: () => ['Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues'][Math.floor(Math.random()*7)],
    fullName: function() { return `${this.firstName()} ${this.lastName()}`; },
    email: function() { return `${this.firstName().toLowerCase()}.${this.lastName().toLowerCase()}@example.com`; },
    phone: () => ['91','92','93','96'][Math.floor(Math.random()*4)] + Math.floor(Math.random()*10000000).toString().padStart(7,'0'),
    address: () => `${['Rua','Avenida','Travessa','Largo','Praça'][Math.floor(Math.random()*5)]} ${['Liberdade','Combatentes','Principal','Nova','Comércio'][Math.floor(Math.random()*5)]}, ${Math.floor(Math.random()*200)+1}`,
    city: () => ['Lisboa','Porto','Braga','Coimbra','Faro','Aveiro','Viseu','Leiria','Setúbal','Évora'][Math.floor(Math.random()*10)],
    postalCode: () => `${Math.floor(Math.random()*9000)+1000}-${Math.floor(Math.random()*900)+100}`,
    company: () => ['Tech','Digital','Global','Smart','Pro'][Math.floor(Math.random()*5)] + ['Solutions','Systems','Corp','Labs','Services'][Math.floor(Math.random()*5)],
    number: (min=1,max=100) => Math.floor(Math.random()*(max-min+1))+min,
    age: () => gen.number(18,65),
    sentence: () => ['Texto de teste','Resposta gerada','Conteúdo de exemplo'][Math.floor(Math.random()*3)],
    paragraph: () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    date: (format='mm/dd/yyyy') => {
      const d = new Date(Date.now() - Math.floor(Math.random() * 1000*60*60*24*365*50));
      const pad = n => n.toString().padStart(2,'0');
      if(format==='mm/dd/yyyy') return `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}`;
      if(format==='dd/mm/yyyy') return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
      if(format==='yyyy-mm-dd') return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      return `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}`;
    }
  };

  // ---------------- UI Widget ----------------
  function createWidget() {
    if(widget) return;
    const style = document.createElement('style'); style.textContent = widgetCSS; document.head.appendChild(style);
    widget = document.createElement('div'); widget.id = 'formfiller-widget';
    widget.innerHTML = `
      <div class="ff-header"><span class="ff-title">🔧 FormFiller</span><span class="ff-status" id="ff-status">Parado</span></div>
      <div class="ff-stats"><span id="ff-count">0</span> campos</div>
      <div class="ff-controls">
        <button id="ff-start" class="ff-btn ff-btn-start">▶ Iniciar</button>
        <button id="ff-stop" class="ff-btn ff-btn-stop" disabled>⏹ Parar</button>
      </div>
    `;
    document.body.appendChild(widget);
    makeDraggable(widget);
    document.getElementById('ff-start').addEventListener('click', () => { startFilling(); });
    document.getElementById('ff-stop').addEventListener('click', stop);
  }

  function makeDraggable(el){
    let dragging=false,offsetX,offsetY;
    el.addEventListener('mousedown',e=>{
      if(e.target.tagName==='BUTTON') return;
      dragging=true;
      offsetX=e.clientX-el.offsetLeft; offsetY=e.clientY-el.offsetTop;
      el.style.cursor='grabbing';
    });
    document.addEventListener('mousemove',e=>{
      if(!dragging) return;
      e.preventDefault();
      let x=Math.max(0,Math.min(e.clientX-offsetX,window.innerWidth-el.offsetWidth));
      let y=Math.max(0,Math.min(e.clientY-offsetY,window.innerHeight-el.offsetHeight));
      el.style.left=x+'px'; el.style.top=y+'px'; el.style.right='auto';
    });
    document.addEventListener('mouseup',()=>{ if(dragging){ dragging=false; el.style.cursor='move'; }});
  }

  function updateWidgetUI(running){
    const s = document.getElementById('ff-status'), c = document.getElementById('ff-count');
    c.textContent = filledCount; 
    if(running){ s.classList.add('running'); s.classList.remove('complete'); s.textContent='A preencher...';
      document.getElementById('ff-start').disabled=true;
      document.getElementById('ff-stop').disabled=false;
    } else { s.classList.remove('running','complete'); s.textContent='Parado';
      document.getElementById('ff-start').disabled=false;
      document.getElementById('ff-stop').disabled=true;
    }
  }

  // ---------------- Filling Logic ----------------
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const isVisible = el => el && el.offsetParent!==null && getComputedStyle(el).visibility!=='hidden' && getComputedStyle(el).display!=='none';

  function detectDateFormat(f){
    const t = (f.type||'').toLowerCase();
    if(t!=='date' && t!=='text') return 'mm/dd/yyyy';
    const placeholder = f.placeholder || '';
    if(placeholder.includes('yyyy-mm-dd')) return 'yyyy-mm-dd';
    if(placeholder.includes('dd/mm/yyyy')) return 'dd/mm/yyyy';
    return 'mm/dd/yyyy';
  }

  function getValue(f){
    const t = (f.type||'').toLowerCase();
    const c = ((f.name||'') + ' ' + (f.id||'') + ' ' + (f.placeholder||'')).toLowerCase();
    if(t==='email' || c.includes('email')) return gen.email();
    if(t==='tel' || c.includes('phone')) return gen.phone();
    if(t==='date' || c.includes('birth') || c.includes('nascimento')) return gen.date(detectDateFormat(f));
    if(c.includes('firstname') || c.includes('primeiro')) return gen.firstName();
    if(c.includes('lastname') || c.includes('apelido')) return gen.lastName();
    if(c.includes('name') || c.includes('nome')) return gen.fullName();
    if(c.includes('address') || c.includes('morada')) return gen.address();
    if(c.includes('city') || c.includes('cidade')) return gen.city();
    if(c.includes('postal') || c.includes('zip')) return gen.postalCode();
    if(c.includes('company') || c.includes('empresa')) return gen.company();
    if(c.includes('age') || c.includes('idade')) return gen.age().toString();
    if(t==='number') return gen.number(parseInt(f.min)||1,parseInt(f.max)||100).toString();
    if(f.tagName.toLowerCase()==='textarea') return gen.paragraph();
    return gen.sentence();
  }

  async function fillField(f){
    const v=getValue(f);
    if(!v) return;
    f.focus(); f.value=''; 
    for(let i=0;i<v.length;i++){ f.value=v.substring(0,i+1); f.dispatchEvent(new Event('input',{bubbles:true})); await sleep(20); }
    f.dispatchEvent(new Event('change',{bubbles:true})); f.blur();
  }

  function fillSelect(s){
    const opts=[...s.options].filter(o=>o.value&&!o.disabled);
    if(opts.length){ s.value=opts[Math.floor(Math.random()*opts.length)].value; s.dispatchEvent(new Event('change',{bubbles:true})); }
  }

  function fillCheckbox(c){ if(!c.checked){ c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); } }

  function fillRadio(radios){ if(radios.length){ const r=radios[Math.floor(Math.random()*radios.length)]; r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); } }

  async function fillPage(){
    if(!isRunning) return false;
    const inputs=document.querySelectorAll('input,textarea');
    const selects=document.querySelectorAll('select');
    const checkboxes=document.querySelectorAll('input[type="checkbox"]');
    const radios={};
    document.querySelectorAll('input[type="radio"]').forEach(r=>{ if(!radios[r.name]) radios[r.name]=[]; radios[r.name].push(r); });
    let filled=false;

    for(const f of inputs){ if(!isRunning) return false; if(isVisible(f)&&!f.disabled&&!f.readOnly&&!f.value) { await fillField(f); filled=true; await sleep(settings.delay||200); } }
    for(const s of selects){ if(!isRunning) return false; if(isVisible(s)&&!s.disabled) { fillSelect(s); filled=true; await sleep(settings.delay||200); } }
    for(const c of checkboxes){ if(!isRunning) return false; if(isVisible(c)&&!c.checked) { fillCheckbox(c); filled=true; await sleep(100); } }
    for(const name in radios){ if(!isRunning) return false; const vis=radios[name].filter(r=>isVisible(r)&&!r.disabled); if(vis.length&&!vis.some(r=>r.checked)) { fillRadio(vis); filled=true; await sleep(100); } }

    if(filled) { filledCount++; updateWidgetUI(true); }

    // -------- Auto Next Button --------
    const nextBtn = [...document.querySelectorAll('button,input[type="submit"]')]
      .find(b=>isVisible(b)&&(b.textContent.toLowerCase().includes('continuar')||b.textContent.toLowerCase().includes('next')||b.value?.toLowerCase().includes('continuar')||b.value?.toLowerCase().includes('next')));
    if(nextBtn) { nextBtn.click(); await sleep(500); }

    return filled;
  }

  async function runFiller(){
    if(!isRunning) return;
    await fillPage();
    setTimeout(runFiller,500);
  }

  function startFilling(){
    isRunning=true; filledCount=0; updateWidgetUI(true);
    runFiller();
  }

  function stop(){
    isRunning=false;
    updateWidgetUI(false);
  }

  chrome.runtime.onMessage.addListener(msg=>{
    if(msg.action==='start') startFilling();
    if(msg.action==='stop') stop();
  });

  createWidget();
})();
