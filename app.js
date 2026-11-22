'use strict';

const byId = id => document.getElementById(id);
const form = byId('problem');
const labels = {euler:'Euler explícito',rk4:'Runge–Kutta (RK4)'};
const seriesColor = key => `var(--${key})`;
const examples = {
  linear:{equation:'x + y',x0:0,y0:1,end:1,step:.2},
  growth:{equation:'y',x0:0,y0:1,end:2,step:.25},
  oscillation:{equation:'sin(x) - y',x0:0,y0:0,end:6,step:.25},
};
const numberFormat = new Intl.NumberFormat('es-PE',{maximumSignificantDigits:9,useGrouping:false});
const fmt = value => value !== 0 && (Math.abs(value)<1e-5 || Math.abs(value)>=1e8) ? value.toExponential(6) : numberFormat.format(value);
let current;
let saveInProgress = false;

const preferredTheme = matchMedia('(prefers-color-scheme: dark)');
const themeButton = byId('theme');
let selectedTheme;
try { selectedTheme = localStorage.getItem('trayectoria-tema'); } catch { /* Storage is optional. */ }

function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeButton.setAttribute('aria-pressed', String(dark));
  byId('theme-icon').textContent = dark ? '☀' : '☾';
  byId('theme-label').textContent = dark ? 'Claro' : 'Oscuro';
  draw();
}

themeButton.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  selectedTheme = dark ? 'dark' : 'light';
  try { localStorage.setItem('trayectoria-tema', selectedTheme); } catch { /* Storage is optional. */ }
  applyTheme(dark);
});
preferredTheme.addEventListener('change', event => {
  if (!selectedTheme) applyTheme(event.matches);
});
applyTheme(selectedTheme ? selectedTheme === 'dark' : preferredTheme.matches);

const equationField = byId('equation');
const keypad = byId('keypad');
const keypadToggle = byId('keypad-toggle');

keypadToggle.addEventListener('click', () => {
  keypad.hidden = !keypad.hidden;
  keypadToggle.setAttribute('aria-expanded', String(!keypad.hidden));
});

function replaceEquation(start, end, text, caret = text.length) {
  if (equationField.value.length - (end - start) + text.length > equationField.maxLength) return;
  equationField.setRangeText(text, start, end, 'end');
  equationField.focus({preventScroll:true});
  equationField.setSelectionRange(start + caret, start + caret);
}

for (const key of keypad.querySelectorAll('[data-insert], [data-function]')) {
  key.addEventListener('click', () => {
    const {selectionStart:start, selectionEnd:end, value} = equationField;
    const name = key.dataset.function;
    if (!name) {
      replaceEquation(start, end, key.dataset.insert);
      return;
    }
    const argument = value.slice(start,end);
    replaceEquation(start, end, `${name}(${argument})`, name.length + 1 + argument.length);
  });
}
byId('keypad-clear').addEventListener('click', () => replaceEquation(0, equationField.value.length, ''));
byId('keypad-backspace').addEventListener('click', () => {
  const {selectionStart:start, selectionEnd:end} = equationField;
  replaceEquation(start === end ? Math.max(0,start - 1) : start, end, '');
});

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function draw() {
  if (!current || byId('result').hidden) return;
  const {methods,rows} = current;
  const canvas = byId('plot');
  const {width,height} = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = width*scale;
  canvas.height = height*scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale,scale);
  const xs = [rows[0].x, rows.at(-1).x];
  const ys = rows.flatMap(row => methods.map(key => row[key].next));
  const yScale = Math.max(...ys.map(Math.abs)) || 1;
  const [xmin,xmax] = [Math.min(...xs),Math.max(...xs)];
  let ymin = Math.min(...ys)/yScale;
  let ymax = Math.max(...ys)/yScale;
  if (ymin === ymax) { ymin -= .1; ymax += .1; }
  const padding = (ymax-ymin)*.08;
  ymin -= padding;
  ymax += padding;
  const left = Math.min(96,width*.32), right = width-20, top = 12, bottom = height-30;
  const px = x => left + (x-xmin)/(xmax-xmin)*(right-left);
  const py = y => bottom - (y/yScale-ymin)/(ymax-ymin)*(bottom-top);
  ctx.font = '12px system-ui';
  const palette = getComputedStyle(canvas);
  ctx.fillStyle = palette.getPropertyValue('--muted').trim();
  ctx.strokeStyle = palette.getPropertyValue('--line').trim();
  ctx.beginPath();
  for (let i=0;i<=4;i++) {
    const t=i/4;
    const x=left+(right-left)*t;
    const y=bottom-(bottom-top)*t;
    ctx.moveTo(left,y); ctx.lineTo(right,y);
    ctx.moveTo(x,top); ctx.lineTo(x,bottom);
    ctx.textAlign='right';
    const yLabel = (ymin+(ymax-ymin)*t)*yScale;
    if (Number.isFinite(yLabel)) ctx.fillText(fmt(yLabel),left-7,y+4);
    ctx.textAlign=i===0?'left':i===4?'right':'center';
    ctx.fillText(fmt(xmin+(xmax-xmin)*t),x,bottom+20);
  }
  ctx.stroke();
  for (const key of methods) {
    ctx.beginPath();
    ctx.lineWidth=2.5;
    ctx.strokeStyle=palette.getPropertyValue(`--${key}`).trim();
    if (key==='euler' && methods.length===2) ctx.setLineDash([5,4]);
    rows.forEach((row,i) => (i===0?ctx.moveTo:ctx.lineTo).call(ctx,px(row.x),py(row[key].next)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function renderStep() {
  const index = Number(byId('jump').value);
  const previous = current.rows[index-1];
  const row = current.rows[index];
  byId('previous-step').disabled = index === 1;
  byId('next-step').disabled = index === current.rows.length-1;
  const cards = element('div',undefined,'formula-grid');
  const h = fmt(row.h);
  for (const key of current.methods) {
    const {y,stages,next} = row[key];
    const card = element('article',undefined,'formula');
    card.style.setProperty('--series',seriesColor(key));
    card.append(element('h3',labels[key]),element('p',`yₙ = ${fmt(y)}`));
    const subscripts = ['₁','₂','₃','₄'];
    const formulas = ['f(xₙ, yₙ)','f(xₙ + h/2, yₙ + hk₁/2)','f(xₙ + h/2, yₙ + hk₂/2)','f(xₙ + h, yₙ + hk₃)'];
    stages.forEach(({x,y:stageY,value},i) => card.append(element('p',`k${subscripts[i]} = ${formulas[i]} = f(${fmt(x)}, ${fmt(stageY)}) = ${fmt(value)}`)));
    const k = stages.map(stage => `(${fmt(stage.value)})`);
    const update = key==='euler'
      ? `yₙ₊₁ = yₙ + hk₁ = ${fmt(y)} + (${h}) × ${k[0]}`
      : `yₙ₊₁ = yₙ + h(k₁ + 2k₂ + 2k₃ + k₄)/6 = ${fmt(y)} + (${h}) × (${k[0]} + 2 × ${k[1]} + 2 × ${k[2]} + ${k[3]})/6`;
    card.append(element('p',`${update} ≈ ${fmt(next)}`));
    cards.append(card);
  }
  byId('steps').replaceChildren(
    element('p',`xₙ₊₁ = xₙ + hₙ = ${fmt(previous.x)} + (${h}) ≈ ${fmt(row.x)}`, 'step-context'),
    element('p',`Para las pendientes se evalúa f(x, y) = ${current.input.equation} en los puntos indicados.`, 'step-context'),
    cards,
  );
}

function render() {
  const {methods,rows} = current;
  const count = rows.length-1;
  const last = rows.at(-1);
  byId('result').hidden = false;
  byId('walkthrough').hidden = false;
  byId('summary').textContent = `${count} ${count === 1 ? 'iteración' : 'iteraciones'} · y(${fmt(last.x)}) aproximado`;
  const metrics = methods.map(key => {
    const metric = element('div',undefined,'metric');
    metric.style.setProperty('--series',seriesColor(key));
    metric.append(element('small',labels[key]),element('strong',fmt(last[key].next)));
    return metric;
  });
  byId('values').replaceChildren(...metrics);
  byId('legend').replaceChildren(...methods.map(key => {
    const legend = element('span',labels[key]);
    legend.style.setProperty('--series',seriesColor(key));
    return legend;
  }));
  const header = element('tr');
  for (const title of ['n','x',...methods.map(key=>labels[key])]) {
    const cell = element('th',title);
    cell.scope='col';
    header.append(cell);
  }
  const thead = element('thead');
  thead.append(header);
  const tbody = element('tbody');
  rows.forEach((row,i) => {
    const tr = element('tr');
    for (const value of [i,row.x,...methods.map(key=>row[key].next)]) tr.append(element('td',fmt(value)));
    tbody.append(tr);
  });
  byId('iterations').replaceChildren(thead,tbody);
  byId('jump').replaceChildren(...rows.slice(1).map((_,i)=>new Option(String(i+1),String(i+1))));
  renderStep();
  draw();
}

function calculate() {
  const input = Object.fromEntries(new FormData(form));
  input.equation = input.equation.trim();
  for (const field of ['x0','y0','end','step']) input[field] = input[field] === '' ? NaN : Number(input[field]);
  try {
    current = {input,...Ode.solve(input)};
    byId('error').hidden = true;
    render();
  } catch (error) {
    current = undefined;
    byId('error').textContent = error.message;
    byId('error').hidden = false;
    byId('result').hidden = true;
    byId('walkthrough').hidden = true;
  }
}

function load(input) {
  for (const [name,value] of Object.entries(input)) form.elements.namedItem(name).value=value;
  calculate();
}

async function request(options) {
  if (location.protocol === 'file:') throw new Error('El servidor PHP no está disponible.');
  const response = await fetch('history.php', { ...options, signal: AbortSignal.timeout(4500) });
  const data = await response.json().catch(()=>null);
  if (!response.ok || !data) throw new Error(data?.error || 'El historial de MySQL no está disponible.');
  return data;
}

async function history(message = '') {
  const entries = byId('history-list');
  const button = byId('reload');
  button.disabled = true;
  try {
    const [remote, local] = await Promise.allSettled([request(), LocalHistory.list()]);
    const stored = [
      ...(local.value ?? []).map(item => ({item, source:'Este navegador'})),
      ...(remote.value?.items ?? []).map(item => ({item, source:'MySQL'})),
    ];
    entries.replaceChildren(...stored.map(({item,source}) => {
      const row = element('li');
      const button = element('button','Abrir','outline');
      button.type='button';
      button.addEventListener('click',()=>{ load(item); byId('result-title').scrollIntoView(); });
      const method = item.method === 'both' ? 'Euler y RK4' : labels[item.method];
      const description = element('span',`y′ = ${item.equation} · ${method} · x final ${fmt(item.end)}`);
      description.append(element('small',source,'history-source'));
      row.append(description,button);
      return row;
    }));
    let status = stored.length ? '' : 'Todavía no hay cálculos guardados.';
    if (remote.status === 'rejected') status = local.status === 'fulfilled'
      ? 'Historial local disponible en este navegador.'
      : 'El historial de MySQL y el almacenamiento del navegador no están disponibles.';
    byId('history-status').textContent = message || status;
  }
  finally { button.disabled = false; }
}

byId('save').addEventListener('click',async () => {
  if (!current || saveInProgress) return;
  saveInProgress = true;
  const button = byId('save');
  button.disabled = true;
  try {
    const input = current.input;
    let message;
    try {
      await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      message = 'Cálculo guardado en MySQL.';
    } catch {
      await LocalHistory.save(input);
      message = 'Cálculo guardado en este navegador.';
    }
    await history(message);
  } catch { byId('history-status').textContent = 'No se pudo guardar el cálculo. Verifica que el navegador permita el almacenamiento local.'; }
  finally { button.disabled = false; saveInProgress = false; }
  byId('historial').scrollIntoView();
});

form.addEventListener('submit',event=>{ event.preventDefault(); calculate(); });
for (const button of document.querySelectorAll('[data-example]')) button.addEventListener('click',()=>load(examples[button.dataset.example]));
byId('jump').addEventListener('change',renderStep);
byId('previous-step').addEventListener('click', () => { byId('jump').selectedIndex--; renderStep(); });
byId('next-step').addEventListener('click', () => { byId('jump').selectedIndex++; renderStep(); });
byId('reload').addEventListener('click',()=>history());
new ResizeObserver(draw).observe(byId('plot'));
calculate();
history();
