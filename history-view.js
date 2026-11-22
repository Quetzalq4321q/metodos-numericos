'use strict';

const TrayectoriaHistory = (() => {
  const {byId, labels, fmt, element} = TrayectoriaUI;

  function connect(getInput, reopen) {
    let saveInProgress = false;
    let latestRefresh = 0;

    async function request(options) {
      if (location.protocol === 'file:') throw new Error('El servidor PHP no está disponible.');
      const response = await fetch('history.php', { ...options, signal: AbortSignal.timeout(4500) });
      const data = await response.json().catch(()=>null);
      if (!response.ok || !data) throw new Error(data?.error || 'El historial de MySQL no está disponible.');
      return data;
    }

    async function history(message = '') {
      const entries = byId('history-list');
      const refresh = ++latestRefresh;
      const button = byId('reload');
      button.disabled = true;
      try {
        const [remote, local] = await Promise.allSettled([request(), LocalHistory.list()]);
        if (refresh !== latestRefresh) return;
        const stored = [
          ...(local.value ?? []).map(item => ({item, source:'Este navegador'})),
          ...(remote.value?.items ?? []).map(item => ({item, source:'MySQL'})),
        ];
        entries.replaceChildren(...stored.map(({item,source}) => {
          const row = element('li');
          const button = element('button','Abrir','outline');
          button.type='button';
          button.addEventListener('click',()=>{ reopen(item); byId('result-title').scrollIntoView(); });
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
      finally { if (refresh === latestRefresh) button.disabled = false; }
    }

    byId('save').addEventListener('click',async () => {
      const input = getInput();
      if (!input || saveInProgress) return;
      saveInProgress = true;
      const button = byId('save');
      button.disabled = true;
      try {
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
    byId('reload').addEventListener('click', () => history());
    history();
  }

  return {connect};
})();
