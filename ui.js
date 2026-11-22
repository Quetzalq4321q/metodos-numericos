'use strict';

const TrayectoriaUI = (() => {
  const byId = id => document.getElementById(id);
  const labels = {euler:'Euler explícito',rk4:'Runge–Kutta (RK4)'};
  const seriesColor = key => `var(--${key})`;
  const numberFormat = new Intl.NumberFormat('es-PE',{maximumSignificantDigits:9,useGrouping:false});
  const fmt = value => value !== 0 && (Math.abs(value)<1e-5 || Math.abs(value)>=1e8) ? value.toExponential(6) : numberFormat.format(value);

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  return {byId, labels, seriesColor, fmt, element};
})();
