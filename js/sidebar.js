// Navegación compartida; no interviene en la información académica.
(function () {
  const items = [
    { id: 'trayectoria', href: 'index.html', label: 'Trayectoria Educativa', description: 'Cursos e historial académico', icon: 'route' },
    { id: 'riesgo', href: 'riesgo-repitencia.html', label: 'Peligro de Repitencia', description: 'Monitoreo y evolución', icon: 'shield-alert' },
  ];
  document.addEventListener('DOMContentLoaded', () => {
    const mount = document.getElementById('sidebar-mount');
    if (!mount) return;
    const actual = items.find(item => item.id === window.PAGINA_ACTUAL);
    mount.innerHTML = `
      <aside class="sidebar" id="sidebar" aria-label="Navegación principal">
        <div class="brand">
          <a href="index.html" class="brand-home" aria-label="Kallfü Mapu, inicio">
            <span class="brand-mark"><img src="assets/insignia.png" alt="Insignia de la Escuela Intercultural Kallfü Mapu" width="56" height="64"></span>
            <span class="brand-text"><small>ESCUELA INTERCULTURAL</small><strong>Kallfü Mapu</strong><span>Unidad Técnico Pedagógica</span></span>
          </a>
          <button class="sidebar-mobile-toggle" id="sidebar-mobile-toggle" aria-label="Abrir menú" aria-controls="sidebar-panel" aria-expanded="false"><i data-lucide="menu"></i></button>
        </div>
        <div class="sidebar-panel" id="sidebar-panel">
          <nav id="sidebar-nav" aria-label="Paneles académicos">
            <div class="nav-section-label">ESPACIO ACADÉMICO</div>
            ${items.map(item => `<a href="${item.href}" class="nav-link${item === actual ? ' active' : ''}"${item === actual ? ' aria-current="page"' : ''}><i data-lucide="${item.icon}" class="nav-icon"></i><span>${item.label}<small>${item.description}</small></span><i data-lucide="chevron-right" class="nav-chevron"></i></a>`).join('')}
          </nav>
          <div class="sidebar-community"><i data-lucide="sprout"></i><p>Aprendemos juntos.<br><strong>Crecemos en comunidad.</strong></p><a href="https://www.kallfumapu.cl" target="_blank" rel="noopener">Conoce nuestra escuela <i data-lucide="arrow-up-right"></i></a></div>
          <div class="sidebar-footer"><div class="anio-badge"><span class="status-dot"></span>Año escolar ${CONFIG.anioActual}</div><button id="theme-toggle" type="button" aria-pressed="false" aria-label="Activar modo oscuro"></button></div>
        </div>
      </aside>`;
    const main = document.querySelector('main');
    const topbar = document.createElement('div');
    topbar.className = 'workspace-bar';
    topbar.innerHTML = `<span><i data-lucide="layout-dashboard"></i> Gestión académica <span class="breadcrumb-divider">/</span><strong>${actual ? actual.label : 'Panel académico'}</strong></span><span class="workspace-school"><span class="status-dot"></span> Kallfü Mapu</span>`;
    main.prepend(topbar);
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-mobile-toggle');
    function closeMenu() {
      sidebar.classList.remove('abierto');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
    }
    toggle.addEventListener('click', () => {
      const opened = sidebar.classList.toggle('abierto');
      toggle.setAttribute('aria-expanded', String(opened));
      toggle.setAttribute('aria-label', opened ? 'Cerrar menú' : 'Abrir menú');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && sidebar.classList.contains('abierto')) { closeMenu(); toggle.focus(); }
    });
    document.addEventListener('click', event => { if (!sidebar.contains(event.target)) closeMenu(); });
    matchMedia('(max-width: 900px)').addEventListener('change', closeMenu);
    if (window.lucide) lucide.createIcons();
    if (window.KallfuTheme) KallfuTheme.sincronizarBoton();
  });
})();
