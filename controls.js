'use strict';

const TrayectoriaControls = (() => {
  const {byId} = TrayectoriaUI;

  function connect(onThemeChange) {
    const preferredTheme = matchMedia('(prefers-color-scheme: dark)');
    const themeButton = byId('theme');
    let selectedTheme;
    try { selectedTheme = localStorage.getItem('trayectoria-tema'); } catch { /* Storage is optional. */ }

    function applyTheme(dark) {
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      themeButton.setAttribute('aria-pressed', String(dark));
      byId('theme-sun').toggleAttribute('hidden', !dark);
      byId('theme-moon').toggleAttribute('hidden', dark);
      byId('theme-label').textContent = dark ? 'Claro' : 'Oscuro';
      onThemeChange();
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
  }

  return {connect};
})();
