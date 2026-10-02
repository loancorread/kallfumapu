// Inyecta el sidebar de navegación compartido por todas las páginas del sitio.
// Cada página debe incluir <div id="sidebar-mount"></div> como primer hijo del
// <body class="con-sidebar"> y definir window.PAGINA_ACTUAL ("trayectoria" | "riesgo")
// antes de cargar este script.
(function () {
  const paginaActual = window.PAGINA_ACTUAL || "";

  const NAV_ITEMS = [
    {
      id: "trayectoria",
      href: "index.html",
      label: "Trayectoria Educativa",
      icon: "route",
    },
    {
      id: "riesgo",
      href: "riesgo-repitencia.html",
      label: "Peligro de Repitencia",
      icon: "alert-triangle",
    },
  ];

  function navLinkHTML(item) {
    const activa = item.id === paginaActual;
    return `
      <a href="${item.href}" class="nav-link${activa ? " active" : ""}">
        <i data-lucide="${item.icon}" class="nav-icon"></i>
        <span>${item.label}</span>
      </a>
    `;
  }

  function sidebarHTML() {
    const anio = (window.CONFIG && CONFIG.anioActual) || "";
    return `
      <aside class="sidebar" id="sidebar">
        <div class="brand" style="flex:1; min-width:0;">
          <button class="sidebar-mobile-toggle" id="sidebar-mobile-toggle" aria-label="Abrir menú">
            <i data-lucide="menu" class="w-5 h-5"></i>
          </button>
          <div class="brand-mark">
            <i data-lucide="graduation-cap" class="w-5 h-5" style="color:#5bcb96;"></i>
          </div>
          <div class="brand-text">
            Escuela Intercultural Kallfü Mapu
            <small>Unidad Técnico Pedagógica</small>
          </div>
        </div>
        <div class="sidebar-panel">
          <nav id="sidebar-nav">
            <div class="nav-section-label">Paneles</div>
            ${NAV_ITEMS.map(navLinkHTML).join("")}
          </nav>
          <div class="sidebar-footer">
            ${anio ? `<div class="anio-badge"><i data-lucide="calendar" class="w-4 h-4" style="color:#5bcb96;"></i><span>Año Escolar ${anio}</span></div>` : ""}
            <button id="theme-toggle" aria-pressed="false" aria-label="Cambiar tema"></button>
          </div>
        </div>
      </aside>
    `;
  }

  function init() {
    const mount = document.getElementById("sidebar-mount");
    if (!mount) return;
    mount.innerHTML = sidebarHTML();

    const toggle = document.getElementById("sidebar-mobile-toggle");
    const sidebar = document.getElementById("sidebar");
    if (toggle && sidebar) {
      toggle.addEventListener("click", () => sidebar.classList.toggle("abierto"));
    }

    if (window.lucide) lucide.createIcons();
    if (window.KallfuTheme) window.KallfuTheme.sincronizarBoton();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
