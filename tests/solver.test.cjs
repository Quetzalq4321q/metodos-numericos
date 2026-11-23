'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const {compile, solve, compareReference} = require('../solver.js');

const linear = {equation:'x + y',x0:0,y0:1,end:1,step:.2,method:'both'};
function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual-expected) <= tolerance, `Se esperaba ${expected}, se obtuvo ${actual}`);
}

test('el ejemplo lineal reproduce las pendientes y la tabla', () => {
  const {rows} = solve(linear);
  assert.equal(rows.length,6);
  for (const [index,expected] of [1,1.2,1.22,1.444].entries()) {
    close(rows[1].rk4.stages[index].value,expected);
  }
  close(rows[1].euler.next,1.2);
  close(rows[1].rk4.next,1.2428);
  close(rows.at(-1).euler.next,2.97664);
  const rk4Factor = 1 + .2 + .2**2/2 + .2**3/6 + .2**4/24;
  close(rows.at(-1).rk4.next,2*rk4Factor**5-2);
});

for (const [method,series] of [['euler',['euler']],['rk4',['rk4']],['both',['euler','rk4']]]) {
  test(`${method} con 1000 pasos mantiene las series elegidas y llega al extremo`, () => {
    const result = solve({...linear,method,iterations:1000});
    assert.deepEqual(result.methods,series);
    assert.equal(result.rows.length,1001);
    assert.equal(result.rows.at(-1).x,1);
    close(result.nominalStep,.001);
    assert.deepEqual(Object.keys(result.rows.at(-1)).slice(2),series);
  });
}

for (const [description,end,parameters,count,lastStep] of [
  ['paso ajustado',1,{step:.3},4,.1],
  ['paso mayor que el intervalo',1,{step:2},1,1],
  ['paso decimal divisible',.3,{step:.1},3,.1],
  ['intervalo inverso',-1,{step:.3},4,-.1],
  ['cuatro pasos exactos',1,{iterations:4},4,.25],
  ['un paso exacto',-1,{iterations:1},1,-1],
]) {
  test(`${description} alcanza el extremo con el paso efectivo correcto`, () => {
    const {rows} = solve({...linear,equation:'2',end,...parameters});
    const last = rows.at(-1);
    assert.equal(rows.length,count+1);
    assert.equal(last.x,end);
    close(last.h,lastStep);
    close(last.euler.next,1+2*end);
    close(last.rk4.next,1+2*end);
  });
}

test('una pendiente nula conserva el valor inicial', () => {
  const {rows} = solve({...linear,equation:'0',x0:-2,end:3,y0:-7,iterations:15});
  for (const {euler,rk4} of rows) {
    assert.equal(euler.next,-7);
    assert.equal(rk4.next,-7);
  }
});

test('el error absoluto del ejemplo lineal usa la solución exacta en cada fila', () => {
  const solution = solve(linear);
  const comparison = compareReference(solution,'2*exp(x) - x - 1',1);
  assert.deepEqual(comparison[0],{reference:1,errors:{euler:0,rk4:0}});
  close(comparison[1].reference,2*Math.exp(.2)-1.2);
  close(comparison.at(-1).errors.euler,2*Math.E-2-2.97664);
  close(comparison.at(-1).errors.rk4,2*Math.E-2-solution.rows.at(-1).rk4.next);
});

test('la comparación sirve con una sola serie y recorrido inverso', () => {
  const result = solve({...linear,equation:'2',end:-1,method:'euler'});
  const comparison = compareReference(result,'1 + 2*x',1);
  assert.deepEqual(comparison.at(-1),{reference:-1,errors:{euler:0}});
});

test('la referencia rechaza y, una condición inicial incorrecta y valores fuera del dominio', () => {
  const result = solve(linear);
  assert.throws(()=>compareReference(result,'x+y',1),/solo de x/);
  assert.throws(()=>compareReference(result,'exp(x) + 1',1),/x inicial/);
  assert.throws(()=>compareReference(result,'1/(1-x)',1),/fila 5/);
});

test('crecimiento exponencial: al dividir h por dos se observa la convergencia esperada', () => {
  const errors = [.1,.05].map(step => {
    const last = solve({...linear,equation:'y',step}).rows.at(-1);
    return ['euler','rk4'].map(key => Math.abs(Math.E-last[key].next));
  });
  const [eulerRatio,rk4Ratio] = errors[0].map((error,index)=>error/errors[1][index]);
  assert.ok(eulerRatio>1.8 && eulerRatio<2.2);
  assert.ok(rk4Ratio>14 && rk4Ratio<17);
});

test('un forzamiento oscilatorio y′ = cos(x) se aproxima a sin(x)', () => {
  const last = solve({...linear,equation:'cos(x)',y0:0,end:Math.PI/2,iterations:32}).rows.at(-1);
  close(last.rk4.next,1,1e-8);
});

test('el analizador respeta precedencia, constantes, signos y notación científica', () => {
  close(compile('-2^2 + 2^3^2 + 2^-2 + sin(π/2) + 1e-3')(0,0),509.251);
  close(compile('3×x − y÷2')(2,4),4);
  close(compile('sqrt(abs(y)) + exp(0)')(0,-4),3);
});

for (const [description,parameters,message] of [
  ['paso cero',{step:0},/paso/],
  ['paso negativo',{step:-.1},/paso/],
  ['paso no finito',{step:Infinity},/paso/],
  ['intervalo vacío',{end:0},/diferentes/],
  ['intervalo fuera de rango',{x0:-Number.MAX_VALUE,end:Number.MAX_VALUE},/rango/],
  ['paso indistinguible',{x0:1e16,end:1e16+4,step:.125},/precisión/],
  ['límite por paso',{step:.0009},/1000/],
  ['límite por cantidad',{iterations:1001},/entero/],
  ['cantidad fraccionaria',{iterations:2.5},/entero/],
  ['cantidad cero',{iterations:0},/entero/],
  ['método desconocido',{method:'otro'},/método/],
  ['valor inicial no finito',{y0:NaN},/finitos/],
  ['división por cero',{equation:'1/x'},/iteración 1.*k1/],
  ['dominio negativo',{equation:'sqrt(-1)'},/dominio/],
  ['símbolo ajeno al analizador',{equation:'window.alert(1)'},/símbolo/i],
]) {
  test(`rechaza ${description}`, () => assert.throws(()=>solve({...linear,...parameters}),message));
}
