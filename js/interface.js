// Mejoras de presentación y accesibilidad. No modifica datos ni cálculos.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('label').forEach(label => {
      const control = label.parentElement.querySelector('input, select');
      if (control && control.id && !label.htmlFor) label.htmlFor = control.id;
    });
    document.querySelectorAll('.kpi-clickable').forEach(card => {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
      });
    });
    document.querySelectorAll('.overflow-x-auto').forEach(region => {
      region.tabIndex = 0;
      region.setAttribute('role', 'region');
      region.setAttribute('aria-label', 'Tabla de datos; desplácese horizontalmente para ver todas las columnas');
    });
    document.querySelectorAll('#table-body, #traza-table-body').forEach(body => {
      const table = body.closest('table');
      table.classList.add('responsive-records');
      const labels = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
      function labelCells() {
        [...body.rows].forEach(row => [...row.cells].forEach((cell, index) => { cell.dataset.label = labels[index] || ''; }));
      }
      labelCells();
      new MutationObserver(labelCells).observe(body, { childList: true });
    });
    const panel = document.getElementById('panel-contenedor');
    if (panel) {
      panel.setAttribute('aria-label', 'Ficha del estudiante seleccionado');
      new MutationObserver(() => {
        if (matchMedia('(max-width: 900px)').matches && panel.querySelector('#panel-cuerpo')) {
          panel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        }
      }).observe(panel, { childList: true });
    }
  });
})();
