'use strict';

const {byId} = TrayectoriaUI;
const form = byId('problem');
const resolution = byId('resolution');
const plot = byId('plot');
const examples = {
  linear:{equation:'x + y',x0:0,y0:1,end:1,step:.2},
  growth:{equation:'y',x0:0,y0:1,end:2,step:.25},
  oscillation:{equation:'sin(x) - y',x0:0,y0:0,end:6,step:.25},
};
let current;

function draw() {
  if (current && !byId('result').hidden) TrajectoryPlot.draw(plot, current);
}

function calculate() {
  const input = Object.fromEntries(new FormData(form));
  input.equation = input.equation.trim();
  for (const field of ['x0','y0','end',resolution.value]) input[field] = input[field] === '' ? NaN : Number(input[field]);
  try {
    current = {input,...Ode.solve(input)};
    byId('error').hidden = true;
    TrayectoriaResults.render(current);
    draw();
  } catch (error) {
    current = undefined;
    byId('error').textContent = error.message;
    byId('error').hidden = false;
    byId('result').hidden = true;
    byId('walkthrough').hidden = true;
  }
}

function syncResolution() {
  for (const kind of ['step','iterations']) {
    const inactive = kind !== resolution.value;
    byId(`${kind}-field`).hidden = inactive;
    form.elements.namedItem(kind).disabled = inactive;
  }
}

function load(input) {
  resolution.value = input.iterations === undefined ? 'step' : 'iterations';
  syncResolution();
  for (const name of ['equation','x0','y0','end',resolution.value,'method']) {
    if (input[name] !== undefined) form.elements.namedItem(name).value = input[name];
  }
  calculate();
}

form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
resolution.addEventListener('change', syncResolution);
for (const button of document.querySelectorAll('[data-example]')) {
  button.addEventListener('click', () => load(examples[button.dataset.example]));
}
byId('jump').addEventListener('change', () => TrayectoriaResults.renderStep(current));
for (const [button, direction] of [['previous-step', -1], ['next-step', 1]]) {
  byId(button).addEventListener('click', () => {
    byId('jump').selectedIndex += direction;
    TrayectoriaResults.renderStep(current);
  });
}
new ResizeObserver(draw).observe(plot);
TrayectoriaControls.connect(draw);
TrayectoriaResults.renderGuide();
TrayectoriaHistory.connect(() => current?.input, load);
syncResolution();
calculate();
