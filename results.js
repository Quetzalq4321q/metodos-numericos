'use strict';

const TrayectoriaResults = (() => {
  const {byId, labels, seriesColor, fmt, element} = TrayectoriaUI;
  const fmtOperand = number => String(Number(number.toPrecision(16)));

  function renderStep(current) {
    const index = Number(byId('jump').value);
    const previous = current.rows[index-1];
    const row = current.rows[index];
    const comparison = current.comparison?.[index];
    byId('previous-step').disabled = index === 1;
    byId('next-step').disabled = index === current.rows.length-1;
    const cards = element('div',undefined,'formula-grid');
    for (const key of current.methods) {
      const {y,stages,next} = row[key];
      const card = element('article',undefined,'formula');
      card.style.setProperty('--series',seriesColor(key));
      card.append(element('h3',labels[key]), MathView.initialY(fmt(y)));
      stages.forEach(({x,y:stageY,value},i) => {
        const group = element('div',undefined,'slope-stage');
        group.append(MathView.slopeFormula(i+1),MathView.stageValue(i+1,fmt(x),fmt(stageY),fmt(value)));
        card.append(group);
      });
      const update = element('div',undefined,'formula-update');
      update.append(
        element('h4','Nueva aproximación'),
        MathView.updateFormula(key),
        ...MathView.substitution(key,fmt(y),fmt(row.h),stages.map(stage=>fmt(stage.value)),fmt(next)),
      );
      card.append(update);
      if (comparison) {
        const error = element('div',undefined,'formula-update absolute-error');
        error.append(element('h4','Error absoluto'),MathView.errorFormula(),
          ...MathView.errorValue(fmt(row.x),fmtOperand(comparison.reference),fmtOperand(next),fmt(comparison.errors[key])));
        card.append(error);
      }
      cards.append(card);
    }
    byId('steps').replaceChildren(
      MathView.advanceX(fmt(previous.x),fmt(row.h),fmt(row.x)),
      element('p',`Para las pendientes se evalúa f(x, y) = ${current.input.equation} en los puntos indicados.`, 'step-context'),
      cards,
    );
  }

  function render(current) {
    const {methods,rows,nominalStep,input,comparison,reference,referenceIssue} = current;
    const count = rows.length-1;
    const last = rows.at(-1);
    const lastComparison = comparison?.at(-1);
    const stepWasAdjusted = Math.abs(Math.abs(last.h)-nominalStep) > Math.abs(nominalStep)*1e-12;
    byId('result').hidden = false;
    byId('walkthrough').hidden = false;
    byId('summary').textContent = `${count} ${count === 1 ? 'iteración' : 'iteraciones'} · y(${fmt(last.x)}) aproximado`;
    const stepping = input.iterations === undefined
      ? MathView.actualCount(String(input.x0),String(input.end),String(nominalStep),count)
      : MathView.actualStep(fmt(input.x0),fmt(input.end),count,fmt(nominalStep));
    byId('step-plan').replaceChildren(stepping);
    if (stepWasAdjusted && input.iterations === undefined) {
      byId('step-plan').append(element('p',`El último paso se ajusta a ${fmt(last.h)} para alcanzar el extremo del intervalo.`));
    }
    const metrics = methods.map(key => {
      const metric = element('div',undefined,'metric');
      metric.style.setProperty('--series',seriesColor(key));
      metric.append(element('small',labels[key]),element('strong',fmt(last[key].next)));
      if (lastComparison) metric.append(element('small',`Error absoluto ${fmt(lastComparison.errors[key])}`,'metric-error'));
      return metric;
    });
    byId('values').replaceChildren(...metrics);
    const context = byId('comparison');
    context.classList.toggle('comparison-error',Boolean(referenceIssue));
    if (lastComparison) {
      context.replaceChildren(element('strong','Solución exacta'),element('code',`g(x) = ${reference}`),
        element('span',`g(${fmt(last.x)}) ≈ ${fmt(lastComparison.reference)}`));
    } else {
      context.textContent = referenceIssue || 'Agrega una solución exacta para ver el error absoluto.';
    }
    byId('legend').replaceChildren(...methods.map(key => {
      const legend = element('span',labels[key]);
      legend.style.setProperty('--series',seriesColor(key));
      return legend;
    }));
    const header = element('tr');
    const columns = ['n','x',...methods.map(key=>labels[key])];
    if (comparison) columns.push('Valor exacto', ...methods.map(key => key==='euler' ? 'Error Euler' : 'Error RK4'));
    for (const title of columns) {
      const cell = element('th',title);
      cell.scope='col';
      header.append(cell);
    }
    const thead = element('thead');
    thead.append(header);
    const tbody = element('tbody');
    rows.forEach((row,i) => {
      const tr = element('tr');
      const values = [i,row.x,...methods.map(key=>row[key].next)];
      if (comparison) values.push(comparison[i].reference,...methods.map(key=>comparison[i].errors[key]));
      for (const value of values) tr.append(element('td',fmt(value)));
      tbody.append(tr);
    });
    byId('iterations').replaceChildren(thead,tbody);
    byId('jump').replaceChildren(...rows.slice(1).map((_,i)=>new Option(String(i+1),String(i+1))));
    renderStep(current);
  }

  function renderGuide() {
    for (const [method,stages] of [['euler',1],['rk4',4]]) {
      byId(`guide-${method}`).append(
        ...Array.from({length:stages},(_,index)=>MathView.slopeFormula(index+1)),
        MathView.updateFormula(method),
      );
    }
    byId('guide-count').append(MathView.countFormula(),MathView.stepFormula(),MathView.signedStep());
    byId('guide-error').append(MathView.errorFormula());
  }

  return {render, renderStep, renderGuide};
})();
