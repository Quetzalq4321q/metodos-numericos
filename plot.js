'use strict';

const TrajectoryPlot = (() => {
  const {fmt} = TrayectoriaUI;

  function draw(canvas, {methods,rows}) {
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

  return {draw};
})();
