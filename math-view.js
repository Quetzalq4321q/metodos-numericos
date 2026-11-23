'use strict';

const MathView = (() => {
  const namespace = 'http://www.w3.org/1998/Math/MathML';

  function node(tag, ...children) {
    const result = document.createElementNS(namespace, tag);
    result.append(...children);
    return result;
  }

  const id = name => node('mi',name);
  const op = symbol => node('mo',symbol);
  const num = value => node('mn',String(value));
  const row = (...children) => node('mrow',...children);
  const frac = (top,bottom) => node('mfrac',top,bottom);
  const sub = (name,index) => node('msub',id(name),index);
  const fences = (open,inside,close) => row(op(open),inside,op(close));
  const parens = inside => fences('(',inside,')');
  const absolute = inside => fences('|',inside,'|');
  const ceil = inside => fences('⌈',inside,'⌉');
  const equal = () => op('=');
  const plus = () => op('+');
  const minus = () => op('−');
  const times = () => op('·');
  const x = () => sub('x',id('n'));
  const y = () => sub('y',id('n'));
  const h = () => sub('h',id('n'));
  const next = name => sub(name,row(id('n'),plus(),num(1)));
  const k = index => sub('k',num(index));
  const f = (atX,atY) => row(id('f'),parens(row(atX,op(','),atY)));
  const endpoint = suffix => sub('x',node('mtext',suffix));
  const distance = () => absolute(row(endpoint('final'),minus(),sub('x',num(0))));

  function value(formatted) {
    const [mantissa, exponent] = String(formatted).split('e');
    const number = num(mantissa.replace('-','−'));
    return exponent === undefined ? number : row(number,op('×'),node('msup',num(10),num(Number(exponent))));
  }

  const factor = input => String(input).startsWith('-') ? parens(value(input)) : value(input);

  function line(...children) {
    const block = document.createElement('div');
    block.className = 'math-line';
    const math = node('math',row(...children));
    math.setAttribute('display','block');
    block.append(math);
    return block;
  }

  function slopeFormula(index) {
    const xHalf = () => row(x(),plus(),frac(h(),num(2)));
    const yHalf = stage => row(y(),plus(),frac(row(h(),k(stage)),num(2)));
    const locations = [
      () => f(x(),y()),
      () => f(xHalf(),yHalf(1)),
      () => f(xHalf(),yHalf(2)),
      () => f(row(x(),plus(),h()),row(y(),plus(),h(),k(3))),
    ];
    return line(k(index),equal(),locations[index-1]());
  }

  function updateFormula(method) {
    const weighted = row(k(1),plus(),num(2),k(2),plus(),num(2),k(3),plus(),k(4));
    const delta = method === 'euler' ? row(h(),k(1)) : row(h(),frac(weighted,num(6)));
    return line(next('y'),equal(),y(),plus(),delta);
  }

  function substitution(method,yNow,step,stages,result) {
    const [a,b,c,d] = stages.map(factor);
    const delta = method === 'euler' ? a : frac(row(a,plus(),num(2),times(),b,plus(),num(2),times(),c,plus(),d),num(6));
    return [line(next('y'),op('≈'),value(yNow),plus(),factor(step),times(),delta),line(next('y'),op('≈'),value(result))];
  }

  const errorIndex = () => next('E');
  const referenceAt = argument => row(id('g'),parens(argument));

  return {
    slopeFormula,
    updateFormula,
    substitution,
    stageValue: (index,atX,atY,result) => line(k(index),op('≈'),f(value(atX),value(atY)),op('≈'),value(result)),
    initialY: current => line(y(),op('≈'),value(current)),
    advanceX: (current,step,result) => line(next('x'),equal(),x(),plus(),h(),op('≈'),value(current),plus(),factor(step),op('≈'),value(result)),
    countFormula: () => line(id('N'),equal(),ceil(frac(distance(),id('h')))),
    stepFormula: () => line(id('h'),equal(),frac(distance(),id('N'))),
    signedStep: () => line(h(),equal(),next('x'),minus(),x()),
    errorFormula: () => line(errorIndex(),equal(),absolute(row(referenceAt(next('x')),minus(),next('y')))),
    errorValue: (atX,reference,approximation,error) => [
      line(referenceAt(value(atX)),op('≈'),value(reference)),
      line(errorIndex(),op('≈'),absolute(row(value(reference),minus(),factor(approximation))),op('≈'),value(error)),
    ],
    actualCount: (from,to,step,count) => line(id('N'),equal(),ceil(frac(absolute(row(value(to),minus(),factor(from))),value(step))),equal(),num(count)),
    actualStep: (from,to,count,step) => line(id('h'),equal(),frac(absolute(row(value(to),minus(),factor(from))),num(count)),op('≈'),value(step)),
  };
})();
