'use strict';

const Ode = (() => {
  const maxIterations = 1000;
  const functions = {sin:Math.sin, cos:Math.cos, tan:Math.tan, exp:Math.exp,
    log:Math.log, ln:Math.log, sqrt:Math.sqrt, abs:Math.abs};

  function compile(source, {allowY = true} = {}) {
    if (typeof source !== 'string' || source.length > 160) throw new Error('La expresión admite hasta 160 caracteres.');
    const formula = source.toLowerCase().replaceAll('−','-').replaceAll('×','*').replaceAll('÷','/').replaceAll('π','pi');
    const tokens = formula.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[^\s]/g) || [];
    let index = 0;

    function requireToken(expected) {
      if (tokens[index++] !== expected) throw new Error(`Se esperaba «${expected}» en la expresión.`);
    }

    function atom() {
      const token = tokens[index++];
      if (token === '(') {
        const inner = expression(0);
        requireToken(')');
        return inner;
      }
      if (token === '+' || token === '-') {
        const inner = expression(3);
        return token === '-' ? (x,y) => -inner(x,y) : inner;
      }
      if (token === 'x') return x => x;
      if (token === 'y') {
        if (!allowY) throw new Error('La solución de referencia debe depender solo de x.');
        return (_x,y) => y;
      }
      if (token === 'pi') return () => Math.PI;
      if (token === 'e') return () => Math.E;
      if (Object.hasOwn(functions,token)) {
        requireToken('(');
        const inner = expression(0);
        requireToken(')');
        return (x,y) => functions[token](inner(x,y));
      }
      if (token && /^\d|^\.\d/.test(token) && Number.isFinite(Number(token))) return () => Number(token);
      throw new Error(token ? `Símbolo o número no válido «${token}».` : 'Completa la expresión de f(x, y).');
    }

    const operations = new Map([
      ['+', [1, (a,b) => a + b]], ['-', [1, (a,b) => a - b]],
      ['*', [2, (a,b) => a * b]], ['/', [2, (a,b) => a / b]],
      ['^', [3, (a,b) => a ** b]],
    ]);

    function expression(minimum) {
      let left = atom();
      while (operations.has(tokens[index])) {
        const symbol = tokens[index];
        const [priority, apply] = operations.get(symbol);
        if (priority < minimum) break;
        index++;
        const right = expression(priority + (symbol === '^' ? 0 : 1));
        const previous = left;
        left = (x,y) => apply(previous(x,y),right(x,y));
      }
      return left;
    }

    const evaluate = expression(0);
    if (index !== tokens.length) throw new Error(`Revisa «${tokens[index]}». Escribe la multiplicación con *. `);
    return evaluate;
  }

  function solve({ equation, x0, y0, end, step, iterations, method }) {
    if (![x0,y0,end].every(Number.isFinite)) throw new Error('Introduce números finitos en el planteamiento.');
    const interval = end-x0;
    if (interval === 0) throw new Error('Los extremos del intervalo deben ser diferentes.');
    if (!Number.isFinite(interval)) throw new Error('El intervalo excede el rango numérico.');
    const methods = method === 'both' ? ['euler','rk4'] : [method];
    if (!methods.every(key => ['euler','rk4'].includes(key))) throw new Error('Selecciona un método disponible.');
    const exactCount = iterations !== undefined;
    if (exactCount && (!Number.isInteger(iterations) || iterations < 1 || iterations > maxIterations)) {
      throw new Error(`El número de iteraciones debe ser un entero entre 1 y ${maxIterations}.`);
    }
    const nominalStep = exactCount ? Math.abs(interval)/iterations : step;
    if (!Number.isFinite(nominalStep) || nominalStep <= 0) throw new Error('El tamaño del paso h debe ser positivo y finito.');
    const ratio = Math.abs(interval)/nominalStep;
    const count = exactCount ? iterations : Math.max(1, Math.ceil(ratio - 8*Number.EPSILON*ratio));
    if (!Number.isFinite(count) || count > maxIterations) throw new Error(`El intervalo requiere más de ${maxIterations} iteraciones. Aumenta el paso h.`);
    const evaluate = compile(equation);
    const direction = Math.sign(interval);
    const initial = Object.fromEntries(methods.map(key => [key, { next:y0 }]));
    const rows = [{x:x0, ...initial}];

    for (let i = 1; i <= count; i++) {
      const previous = rows[i-1];
      const x = previous.x;
      const offset = exactCount ? interval*(i/count) : direction*(i*nominalStep);
      const target = i === count ? end : x0+offset;
      const h = target-x;
      if (!Number.isFinite(h) || Math.sign(h) !== direction) throw new Error('El paso es demasiado pequeño para la precisión del intervalo.');
      const row = {x:target,h};

      for (const key of methods) {
        const y = previous[key].next;
        const stages = [];
        function slope(sx,sy) {
          const value = evaluate(sx,sy);
          if (![sx,sy,value].every(Number.isFinite)) {
            throw new Error(`Valor fuera del dominio en la iteración ${i}, ${key === 'euler' ? 'Euler' : 'Runge–Kutta'}, k${stages.length+1}.`);
          }
          stages.push({x:sx,y:sy,value});
          return value;
        }

        const k1 = slope(x,y);
        let increment = h*k1;
        if (key === 'rk4') {
          const k2 = slope(x+h/2,y+(h/2)*k1);
          const k3 = slope(x+h/2,y+(h/2)*k2);
          const k4 = slope(target,y+h*k3);
          increment = h*(k1/6+k2/3+k3/3+k4/6);
        }
        const next = y+increment;
        if (!Number.isFinite(next)) throw new Error(`El resultado excede el rango numérico en la iteración ${i}.`);
        row[key] = {y,stages,next};
      }
      rows.push(row);
    }
    return {methods,rows,nominalStep};
  }

  function compareReference({methods,rows}, expression, initialY) {
    const evaluate = compile(expression, {allowY:false});
    return rows.map((row,index) => {
      const reference = evaluate(row.x);
      if (!Number.isFinite(reference)) throw new Error(`La referencia no es finita en la fila ${index}.`);
      if (index === 0 && Math.abs(reference - initialY) > 1e-9*Math.max(1,Math.abs(reference),Math.abs(initialY))) {
        throw new Error('La referencia debe cumplir g(x inicial) = y inicial.');
      }
      const errors = Object.fromEntries(methods.map(key => [key,Math.abs(reference - row[key].next)]));
      if (!Object.values(errors).every(Number.isFinite)) throw new Error(`El error absoluto excede el rango numérico en la fila ${index}.`);
      return {reference,errors};
    });
  }

  return {compile,solve,compareReference};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Ode;
