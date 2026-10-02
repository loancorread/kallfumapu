// Toggle de modo claro/oscuro, persistente durante la sesión (sessionStorage).
// Usa la estrategia "class" de Tailwind: agrega/quita la clase "dark" en <html>.
(function () {
  const STORAGE_KEY = "kallfu-theme";

  function iconoSol() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>';
  }
  function iconoLuna() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
  }

  function aplicarTema(tema) {
    document.documentElement.classList.toggle("dark", tema === "oscuro");
    document.documentElement.setAttribute("data-theme", tema);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", tema === "oscuro");
      btn.innerHTML =
        tema === "oscuro"
          ? `${iconoSol()}<span>Modo claro</span>`
          : `${iconoLuna()}<span>Modo oscuro</span>`;
    }
    document.dispatchEvent(new CustomEvent("kallfu-theme-changed", { detail: { tema } }));
  }

  function temaGuardado() {
    const guardado = sessionStorage.getItem(STORAGE_KEY);
    const prefiereOscuro =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return guardado || (prefiereOscuro ? "oscuro" : "claro");
  }

  function initTheme() {
    aplicarTema(temaGuardado());
  }

  function toggleTema() {
    const actual = document.documentElement.getAttribute("data-theme");
    const nuevo = actual === "oscuro" ? "claro" : "oscuro";
    sessionStorage.setItem(STORAGE_KEY, nuevo);
    aplicarTema(nuevo);
  }

  // Aplicar el tema lo antes posible (antes de pintar) para evitar parpadeo.
  aplicarTema(temaGuardado());

  // El botón del toggle vive dentro del sidebar, que se inyecta después
  // (ver js/sidebar.js). Se expone esta función para que, apenas exista el
  // botón en el DOM, se sincronice con el tema ya aplicado.
  window.KallfuTheme = {
    sincronizarBoton: () => aplicarTema(document.documentElement.getAttribute("data-theme") || temaGuardado()),
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest("#theme-toggle");
      if (btn) toggleTema();
    });
  });
})();
