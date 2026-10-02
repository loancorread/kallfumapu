/**
 * Aviso de protección de datos personales: se muestra al inicio de todas las
 * páginas del sitio (se inserta antes del contenido principal).
 */
(function () {
  function montar() {
    const main = document.querySelector("main");
    if (!main || document.getElementById("aviso-privacidad")) return;
    const aviso = document.createElement("div");
    aviso.id = "aviso-privacidad";
    aviso.setAttribute("role", "note");
    aviso.className =
      "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full";
    aviso.innerHTML = `
      <div class="flex items-start gap-3 rounded-lg border border-blue-100 dark:border-slate-700 bg-kallfu-blue-light dark:bg-slate-800 px-4 py-3 text-sm text-kallfu-blue dark:text-blue-300">
        <i data-lucide="shield-check" class="w-5 h-5 flex-shrink-0 mt-0.5"></i>
        <p><strong>Protección de datos personales:</strong> en concordancia con la nueva ley de protección de datos, los RUT de los y las estudiantes no son visibles en este consolidado.</p>
      </div>`;
    main.insertBefore(aviso, main.firstChild);
    if (window.lucide) window.lucide.createIcons();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
  } else {
    montar();
  }
})();
