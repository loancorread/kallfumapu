// Lógica de la vista de curso: listado, filtro, panel de ficha del estudiante.
// La lógica de datos es idéntica a la versión anterior; lo que cambia es el
// marcado generado (clases Tailwind) para adoptar el diseño de "Peligro de
// Repitencia" (RR2.html) en toda la vista, incluyendo modo oscuro.
(function () {
  const params = new URLSearchParams(window.location.search);
  let cursoActual = params.get("curso") || CONFIG.cursos[0];
  if (!CONFIG.cursos.includes(cursoActual)) cursoActual = CONFIG.cursos[0];

  let datosPorAnio = {};
  let estudiantesCurso = [];
  let idSeleccionado = params.get("estudiante") || null;
  let chartInstance = null;
  let chartHistorialInstance = null;

  const $lista = document.getElementById("lista-estudiantes");
  const $panel = document.getElementById("panel-contenedor");
  const $buscador = document.getElementById("buscador");
  const $contador = document.getElementById("contador-resultados");
  const $titulo = document.getElementById("titulo-curso");
  const $selectCurso = document.getElementById("select-curso");

  const ABREVIATURAS_ASIGNATURA = {
    "Artes Visuales": "ART",
    "Ciencias Naturales": "CN",
    "Educación Física Y Salud": "FIS",
    "Historia, Geografía Y Ciencias Sociales": "HIST",
    "Idioma Extranjero: Inglés": "ING",
    "Lengua Indígena: Mapuzugun": "MAP",
    "Lengua Y Literatura": "LEN",
    "Lenguaje Y Comunicación": "LEN",
    "Matemática": "MAT",
    "Música": "MUS",
    "Orientación": "OR",
    "Religión": "REL",
    "Tecnología": "TEC",
  };

  function abreviarAsignatura(nombre) {
    return ABREVIATURAS_ASIGNATURA[nombre] || nombre;
  }

  function formatearNombre(nombreCompleto) {
    return (nombreCompleto || "")
      .toLocaleLowerCase("es")
      .split(" ")
      .map((palabra) =>
        palabra ? palabra.charAt(0).toLocaleUpperCase("es") + palabra.slice(1) : palabra
      )
      .join(" ");
  }

  const ICONO_NINO =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 13c-4.4 0-8 2.9-8 7v1h16v-1c0-4.1-3.6-7-8-7z"/></svg>';
  const ICONO_NINA =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><circle cx="12" cy="7.5" r="3.5"/><circle cx="6.6" cy="7" r="1.25"/><circle cx="17.4" cy="7" r="1.25"/><path d="M12 12c-4.8 0-7.5 3.6-8.3 8.5-.1.6.4 1.1 1 1.1h14.6c.6 0 1.1-.5 1-1.1C19.5 15.6 16.8 12 12 12z"/></svg>';

  function avatarHTML(estudiante) {
    if (estudiante.sexo === "Masculino") {
      return `<div class="avatar-inicial avatar-nino" title="Estudiante">${ICONO_NINO}</div>`;
    }
    if (estudiante.sexo === "Femenino") {
      return `<div class="avatar-inicial avatar-nina" title="Estudiante">${ICONO_NINA}</div>`;
    }
    return `<div class="avatar-inicial">${iniciales(estudiante.nombre_completo)}</div>`;
  }

  function iniciales(nombreCompleto) {
    const partes = nombreCompleto.split(" ").filter(Boolean);
    return ((partes[0] || "")[0] || "") + ((partes[1] || "")[0] || "");
  }

  function normalizar(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[.\s]/g, "");
  }

  function poblarSelectCurso() {
    $selectCurso.innerHTML = "";
    CONFIG.cursos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c.replace("°", "° Básico");
      if (c === cursoActual) opt.selected = true;
      $selectCurso.appendChild(opt);
    });
    $selectCurso.addEventListener("change", () => {
      window.location.href = `curso.html?curso=${encodeURIComponent($selectCurso.value)}`;
    });
  }

  function renderLista(filtro) {
    const term = normalizar(filtro);
    const filtrados = estudiantesCurso.filter((e) => {
      if (!term) return true;
      return (
        normalizar(e.nombre_completo).includes(term)
      );
    });

    $contador.textContent = `${filtrados.length} de ${estudiantesCurso.length} estudiantes`;

    if (filtrados.length === 0) {
      $lista.innerHTML = `<div class="p-8 text-center text-sm text-gray-400 dark:text-slate-500">No se encontraron estudiantes con ese criterio de búsqueda.</div>`;
      return;
    }

    $lista.innerHTML = "";
    filtrados
      .slice()
      .sort((a, b) => (a.n_lista || 0) - (b.n_lista || 0))
      .forEach((e) => {
        const activa = e.id === idSeleccionado;
        const fila = document.createElement("div");
        fila.className =
          "flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0 cursor-pointer transition-colors border-l-4 " +
          (activa
            ? "bg-kallfu-blue-light dark:bg-slate-700/60 border-l-kallfu-blue"
            : "border-l-transparent hover:bg-gray-50 dark:hover:bg-slate-700/30");
        fila.setAttribute("role", "button");
        fila.tabIndex = 0;

        let badge = "";
        if (typeof Normativa !== "undefined") {
          const ev = Normativa.evaluarEstudiante(e);
          if (ev && ev.enRiesgo) {
            badge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold border bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30 whitespace-nowrap">En riesgo</span>`;
          }
        }
        const badgePie = e.pie
          ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold border bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30" title="Programa de Integración Escolar">PIE</span>`
          : "";
        const badges =
          badgePie || badge
            ? `<div class="ml-auto flex flex-col items-end gap-1 flex-shrink-0">${badgePie}${badge}</div>`
            : "";

        fila.innerHTML = `
          ${avatarHTML(e)}
          <div class="min-w-0">
            <div class="font-semibold text-sm text-gray-800 dark:text-slate-100 whitespace-nowrap">${formatearNombre(e.nombre_completo)}</div>
            <div class="text-xs text-gray-500 dark:text-slate-400">${e.curso.replace("°", "° Básico")}</div>
          </div>
          ${badges}
        `;
        fila.addEventListener("click", () => seleccionarEstudiante(e.id));
        fila.addEventListener("keypress", (ev) => {
          if (ev.key === "Enter") seleccionarEstudiante(e.id);
        });
        $lista.appendChild(fila);
      });
  }

  function actualizarURL(id) {
    const url = new URL(window.location);
    if (id) url.searchParams.set("estudiante", id);
    else url.searchParams.delete("estudiante");
    window.history.replaceState({}, "", url);
  }

  function seleccionarEstudiante(id) {
    idSeleccionado = id;
    actualizarURL(id);
    renderLista($buscador.value);
    renderPanel(id);
  }

  function cerrarPanel() {
    idSeleccionado = null;
    actualizarURL(null);
    renderLista($buscador.value);
    $panel.innerHTML = `
      <div class="panel-vacio flex flex-col items-center justify-center gap-3 text-center text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/40" style="height:74vh;">
        <i data-lucide="user-circle" class="w-10 h-10"></i>
        <p class="text-sm">Seleccione un estudiante del listado para ver su ficha.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
  }

  function fmtNota(v) {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number") return v.toFixed(1);
    return String(v);
  }

  function colorParaNota(pf) {
    const style = getComputedStyle(document.documentElement);
    if (typeof pf !== "number") return style.getPropertyValue("--chart-muted");
    if (pf < 4.0) return style.getPropertyValue("--chart-danger");
    if (pf < 5.0) return style.getPropertyValue("--chart-warn");
    return style.getPropertyValue("--chart-ok");
  }

  function aplicarTemaChart() {
    if (typeof Chart === "undefined") return;
    const style = getComputedStyle(document.documentElement);
    const textMuted = style.getPropertyValue("--chart-muted").trim();
    const border = style.getPropertyValue("--chart-border").trim();
    Chart.defaults.color = textMuted;
    Chart.defaults.borderColor = border;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  }

  function seccionTitulo(texto) {
    return `<div class="flex items-center justify-between mt-8 mb-3">
      <h3 class="text-sm font-bold text-kallfu-blue dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-gradient-to-b from-kallfu-green to-kallfu-blue"></span>
        ${texto}
      </h3>
    </div>`;
  }

  function renderPanel(id) {
    const estudiante = estudiantesCurso.find((e) => e.id === id);
    if (!estudiante) return;

    const historial = DataLoader.construirHistorial(id, datosPorAnio);
    const evaluacion = Normativa.evaluarEstudiante(estudiante);
    const esAnioEnCurso = datosPorAnio[CONFIG.anioActual] && datosPorAnio[CONFIG.anioActual].estado === "en_curso";

    let indicadorHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600 mt-2">Datos insuficientes para evaluar</span>`;
    if (evaluacion && evaluacion.datosSuficientes) {
      if (evaluacion.enRiesgo) {
        indicadorHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30 mt-2">⚠ En riesgo de repitencia${esAnioEnCurso ? " (provisional)" : ""}</span>`;
      } else {
        indicadorHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-kallfu-green-light text-kallfu-green border-green-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 mt-2">✓ Cumple requisitos de promoción${esAnioEnCurso ? " (provisional)" : ""}</span>`;
      }
    }

    const badgePieHTML = estudiante.pie
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30 ml-2 align-middle" title="Programa de Integración Escolar">PIE</span>`
      : "";

    const situacionRegistrada = estudiante.situacion_final
      ? `<div class="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg p-3">
          <div class="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Situación registrada ${CONFIG.anioActual}</div>
          <div class="font-bold text-gray-800 dark:text-slate-100">${estudiante.situacion_final}${esAnioEnCurso ? " <span class='text-[10px] font-bold text-kallfu-blue dark:text-blue-300 bg-kallfu-blue-light dark:bg-slate-700 border border-blue-100 dark:border-slate-600 rounded px-1.5 py-0.5 ml-1 align-middle'>preliminar</span>" : ""}</div>
        </div>`
      : "";

    $panel.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6" style="animation: aparecer 220ms ease;">
        <div class="flex justify-between items-start gap-4 border-b border-gray-100 dark:border-slate-700 pb-4 mb-5">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-slate-100">${formatearNombre(estudiante.nombre_completo)}</h2>
            <div class="text-sm text-gray-500 dark:text-slate-400 mt-0.5">${estudiante.curso.replace("°", "° Básico")}</div>
            ${indicadorHTML}${badgePieHTML}
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button class="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300" id="btn-minimizar" title="Minimizar ficha" aria-label="Minimizar ficha"><i data-lucide="minus" class="w-4 h-4"></i></button>
            <button class="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300" id="btn-cerrar" title="Cerrar ficha" aria-label="Cerrar ficha"><i data-lucide="x" class="w-4 h-4"></i></button>
          </div>
        </div>

        <div id="panel-cuerpo">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg p-3">
              <div class="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Sexo</div>
              ${
                estudiante.sexo
                  ? `<div class="font-bold text-gray-800 dark:text-slate-100">${estudiante.sexo}</div>`
                  : `<div class="text-xs text-gray-400 dark:text-slate-500">Dato no disponible en las planillas fuente</div>`
              }
            </div>
            <div class="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg p-3">
              <div class="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Edad (al 31 de marzo ${CONFIG.anioActual})</div>
              ${
                typeof estudiante.edad === "number"
                  ? `<div class="font-bold text-gray-800 dark:text-slate-100">${estudiante.edad} años</div>`
                  : `<div class="text-xs text-gray-400 dark:text-slate-500">Dato no disponible en las planillas fuente</div>`
              }
            </div>
            <div class="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg p-3">
              <div class="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Asistencia ${CONFIG.anioActual}${esAnioEnCurso ? " (parcial)" : ""}</div>
              <div class="font-bold text-gray-800 dark:text-slate-100">${estudiante.asistencia_anual || "—"}</div>
            </div>
            <div class="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg p-3">
              <div class="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Promedio general ${CONFIG.anioActual}${esAnioEnCurso ? " (parcial)" : ""}</div>
              <div class="font-bold text-gray-800 dark:text-slate-100">${fmtNota(estudiante.promedio_general_exacto ?? estudiante.promedio_general)}</div>
            </div>
            ${situacionRegistrada}
          </div>

          ${seccionTitulo(`Promedios por asignatura — ${CONFIG.anioActual}`)}
          <div class="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg p-4">
            <canvas id="chart-asignaturas" height="260"></canvas>
          </div>
          <div id="detalle-asignatura-wrap"></div>
          <div id="conceptuales-wrap"></div>

          ${seccionTitulo("Histórico académico (2024–2026)")}
          <div class="mb-3">
            <select id="select-tendencia" aria-label="Ver tendencia de asignatura" class="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg py-1.5 px-3 text-sm"></select>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg p-4">
            <canvas id="chart-historial" height="110"></canvas>
          </div>
          <div id="tabla-historial-wrap"></div>

          ${seccionTitulo("Síntesis técnico-pedagógica")}
          <div class="bg-kallfu-blue-light/60 dark:bg-slate-900/40 border border-blue-100 dark:border-slate-700 border-l-4 border-l-kallfu-green rounded-lg p-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300" id="sintesis-wrap"></div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    document.getElementById("btn-cerrar").addEventListener("click", cerrarPanel);
    document.getElementById("btn-minimizar").addEventListener("click", () => {
      const cuerpo = document.getElementById("panel-cuerpo");
      const visible = cuerpo.style.display !== "none";
      cuerpo.style.display = visible ? "none" : "";
      document.getElementById("btn-minimizar").innerHTML = visible
        ? '<i data-lucide="plus" class="w-4 h-4"></i>'
        : '<i data-lucide="minus" class="w-4 h-4"></i>';
      if (window.lucide) lucide.createIcons();
    });

    renderChartAsignaturas(estudiante);
    renderConceptuales(estudiante);
    renderHistorial(estudiante, historial);
    renderSintesis(estudiante, historial);
  }

  function renderChartAsignaturas(estudiante) {
    aplicarTemaChart();
    const entradas = Object.entries(estudiante.asignaturas || {}).filter(
      ([, n]) => typeof n.pf === "number"
    );
    const canvas = document.getElementById("chart-asignaturas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = entradas.map(([nombre]) => nombre);
    const valores = entradas.map(([, n]) => n.pf);
    const colores = valores.map((v) => colorParaNota(v));

    if (chartInstance) chartInstance.destroy();

    if (entradas.length === 0) {
      canvas.outerHTML =
        "<p class='text-sm text-gray-400 dark:text-slate-500'>No hay calificaciones numéricas registradas para este año.</p>";
      return;
    }

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Promedio final",
            data: valores,
            backgroundColor: colores,
            borderRadius: 6,
            maxBarThickness: 34,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 1,
            max: 7,
            ticks: { stepSize: 1, autoSkip: false, precision: 0 },
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              callback: (valor, idx) => abreviarAsignatura(labels[idx]),
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => labels[items[0].dataIndex],
            },
          },
        },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          const nombreAsig = labels[idx];
          mostrarDetalleAsignatura(estudiante, nombreAsig);
        },
      },
    });
    canvas.style.cursor = "pointer";
  }

  function mostrarDetalleAsignatura(estudiante, nombreAsig) {
    const notas = estudiante.asignaturas[nombreAsig];
    const wrap = document.getElementById("detalle-asignatura-wrap");
    wrap.innerHTML = `
      <div class="mt-3 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900/40" style="animation: aparecer 180ms ease;">
        <table class="w-full text-sm">
          <thead>
            <tr><th colspan="3" class="px-3 py-2 text-left text-xs font-bold text-kallfu-blue dark:text-blue-300 uppercase tracking-wider bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">${nombreAsig} — detalle de notas ${CONFIG.anioActual}</th></tr>
            <tr class="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide bg-gray-100 dark:bg-slate-800">
              <th class="px-3 py-2 text-left font-semibold">Periodo 1</th><th class="px-3 py-2 text-left font-semibold">Periodo 2</th><th class="px-3 py-2 text-left font-semibold">Promedio final</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="px-3 py-2 text-gray-700 dark:text-slate-200">${fmtNota(notas.p1)}</td>
              <td class="px-3 py-2 text-gray-700 dark:text-slate-200">${fmtNota(notas.p2)}</td>
              <td class="px-3 py-2 font-bold text-gray-900 dark:text-slate-100">${fmtNota(notas.pf)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function renderConceptuales(estudiante) {
    const conceptuales = Object.entries(estudiante.asignaturas || {}).filter(
      ([, n]) => typeof n.pf !== "number" && n.pf
    );
    const wrap = document.getElementById("conceptuales-wrap");
    if (conceptuales.length === 0) {
      wrap.innerHTML = "";
      return;
    }
    wrap.innerHTML = `<p class="text-gray-500 dark:text-slate-400 text-sm mt-3">
      Evaluación conceptual: ${conceptuales
        .map(([n, v]) => `${n}: <strong class="text-gray-700 dark:text-slate-200">${v.pf}</strong>`)
        .join(" · ")}
    </p>`;
  }

  function renderHistorial(estudiante, historial) {
    const todasAsignaturas = new Set();
    CONFIG.aniosDisponibles.forEach((a) => {
      const est = historial[a];
      if (est) Object.keys(est.asignaturas || {}).forEach((n) => todasAsignaturas.add(n));
    });
    const listaAsignaturas = Array.from(todasAsignaturas);

    const select = document.getElementById("select-tendencia");
    select.innerHTML = `<option value="__general__">Promedio general</option>` +
      listaAsignaturas.map((a) => `<option value="${a}">${a}</option>`).join("");
    select.addEventListener("change", () => renderChartHistorial(historial, select.value));
    renderChartHistorial(historial, "__general__");

    const wrap = document.getElementById("tabla-historial-wrap");
    const tdBase = "px-3 py-2.5 border-b border-gray-100 dark:border-slate-700 text-center text-gray-700 dark:text-slate-200";
    const tdSinRegistro = `${tdBase} text-gray-400 dark:text-slate-500 italic text-xs`;

    let filasAsignaturas = listaAsignaturas
      .map((asig) => {
        const celdas = CONFIG.aniosDisponibles
          .map((a) => {
            const est = historial[a];
            if (!est) return `<td class="${tdSinRegistro}">Sin registro</td>`;
            const n = est.asignaturas[asig];
            if (!n) return `<td class="${tdSinRegistro}">No cursada</td>`;
            return `<td class="${tdBase} font-semibold">${fmtNota(n.pf)}</td>`;
          })
          .join("");
        return `<tr><td class="px-3 py-2.5 border-b border-gray-100 dark:border-slate-700 text-left text-gray-700 dark:text-slate-200">${asig}</td>${celdas}</tr>`;
      })
      .join("");

    function filaGenerica(etiqueta, render) {
      return `<tr><td class="px-3 py-2.5 border-b border-gray-100 dark:border-slate-700 text-left font-bold text-gray-800 dark:text-slate-100">${etiqueta}</td>${CONFIG.aniosDisponibles
        .map((a) => {
          const est = historial[a];
          if (!est) return `<td class="${tdSinRegistro}">Sin registro</td>`;
          return render(est, a);
        })
        .join("")}</tr>`;
    }

    const filaPromedioGeneral = filaGenerica(
      "Promedio general",
      (est) => `<td class="${tdBase} font-bold">${fmtNota(est.promedio_general_exacto ?? est.promedio_general)}</td>`
    );
    const filaAsistencia = filaGenerica(
      "Asistencia anual",
      (est) => `<td class="${tdBase}">${est.asistencia_anual || "—"}</td>`
    );
    const filaCurso = filaGenerica("Curso", (est) => `<td class="${tdBase}">${est.curso}</td>`);
    const filaSituacion = filaGenerica("Situación final", (est, a) => {
      const enCurso = datosPorAnio[a] && datosPorAnio[a].estado === "en_curso";
      return `<td class="${tdBase}">${est.situacion_final || (enCurso ? "Año en curso" : "—")}</td>`;
    });

    wrap.innerHTML = `
      <div class="overflow-x-auto custom-scrollbar border border-gray-200 dark:border-slate-700 rounded-lg mt-2">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 dark:bg-slate-900/40">
              <th class="px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Asignatura</th>${CONFIG.aniosDisponibles.map((a) => `<th class="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">${a}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${filaCurso}
            ${filaSituacion}
            ${filaAsistencia}
            ${filaPromedioGeneral}
            ${filasAsignaturas}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderChartHistorial(historial, seleccion) {
    aplicarTemaChart();
    const canvas = document.getElementById("chart-historial");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = CONFIG.aniosDisponibles.map(String);
    const valores = CONFIG.aniosDisponibles.map((a) => {
      const est = historial[a];
      if (!est) return null;
      if (seleccion === "__general__") {
        return typeof est.promedio_general_exacto === "number"
          ? est.promedio_general_exacto
          : est.promedio_general;
      }
      const n = est.asignaturas[seleccion];
      return n && typeof n.pf === "number" ? n.pf : null;
    });

    if (chartHistorialInstance) chartHistorialInstance.destroy();
    chartHistorialInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: seleccion === "__general__" ? "Promedio general" : seleccion,
            data: valores,
            spanGaps: false,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue("--chart-accent"),
            backgroundColor: "transparent",
            tension: 0.25,
            pointRadius: 5,
            pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--chart-primary"),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 1, max: 7, ticks: { stepSize: 1 } } },
        plugins: { legend: { display: false } },
      },
    });
  }

  function renderSintesis(estudiante, historial) {
    const wrap = document.getElementById("sintesis-wrap");
    const resultado = Sintesis.generar(estudiante, historial);
    wrap.innerHTML = `
      <span class="block text-[11px] font-bold text-kallfu-blue dark:text-blue-300 uppercase tracking-wider mb-1.5">${resultado.etiqueta}</span>
      ${resultado.texto}
    `;
  }

  async function init() {
    poblarSelectCurso();
    $titulo.textContent = `${cursoActual.replace("°", "° Básico")} — ${CONFIG.anioActual}`;

    try {
      datosPorAnio = await DataLoader.cargarTodosLosAnios();
    } catch (e) {
      $lista.innerHTML = `<div class="p-8 text-center text-sm text-gray-400 dark:text-slate-500">No fue posible cargar los datos.</div>`;
      return;
    }

    const datosAnioActual = datosPorAnio[CONFIG.anioActual];
    const infoCurso = datosAnioActual ? datosAnioActual.cursos[cursoActual] : null;
    estudiantesCurso = infoCurso ? infoCurso.estudiantes : [];

    renderLista("");
    $buscador.addEventListener("input", () => renderLista($buscador.value));

    if (idSeleccionado && estudiantesCurso.some((e) => e.id === idSeleccionado)) {
      renderPanel(idSeleccionado);
    }

    document.addEventListener("kallfu-theme-changed", () => {
      setTimeout(() => {
        if (idSeleccionado) renderPanel(idSeleccionado);
      }, 0);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
