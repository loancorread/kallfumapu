// Lógica de la vista "Peligro de Repitencia": monitoreo de criterios de
// riesgo MINEDUC y trazabilidad entre el registro anterior y el vigente.
// Portado desde el prototipo RR2.html, con dos cambios de fondo:
//   1. Los datos ya no van embebidos en el HTML: se cargan desde
//      data/riesgo_2026.json y data/riesgo_2026_anterior.json, siguiendo la
//      misma separación datos/presentación que el resto del sitio.
//   2. Todo el marcado generado incorpora variantes "dark:" para el modo
//      oscuro del sitio.
(function () {
  let CURRENT_DATA = [];
  let PREVIOUS_DATA = [];

  const CRIT_LABELS = {
    1: 'Criterio 1',
    2: 'Criterio 2',
    3: 'Criterio 3',
    4: 'Criterio 4',
  };
  const CRIT_COLORS = {
    1: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
    2: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
    3: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30',
    4: 'bg-blue-100 text-kallfu-blue border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  };
  // Severidad: mayor = mas grave
  const CRIT_WEIGHT = { 1: 4, 2: 3, 3: 2, 4: 1 };

  function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\bDe\b/g, 'de').replace(/\bDel\b/g, 'del').replace(/\bLa\b/g, 'la').replace(/\bLas\b/g, 'las');
  }
  function fullName(s) {
    return `${toTitleCase(s.apellidos)}, ${toTitleCase(s.nombres)}`;
  }
  function critBadges(criterios) {
    return criterios.map(c => `<span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${CRIT_COLORS[c]} mr-1 mb-1">C${c}</span>`).join('');
  }
  function maxSeverity(criterios) {
    return Math.max(...criterios.map(c => CRIT_WEIGHT[c] || 0));
  }
  function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-kallfu-green' : (type === 'error' ? 'bg-red-500' : 'bg-gray-800');
    const icon = type === 'success' ? 'check-circle' : 'info';
    toast.className = `toast-enter ${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ---------------------------------------------------------------
  // TABS
  // ---------------------------------------------------------------
  function switchTab(tab) {
    document.getElementById('panel-actual').classList.toggle('active', tab === 'actual');
    document.getElementById('panel-traza').classList.toggle('active', tab === 'traza');
    document.getElementById('tab-btn-actual').classList.toggle('active', tab === 'actual');
    document.getElementById('tab-btn-traza').classList.toggle('active', tab === 'traza');
  }

  // ---------------------------------------------------------------
  // TAB 1: DIAGNOSTICO ACTUAL
  // ---------------------------------------------------------------
  const state = {
    search: '',
    curso: 'ALL',
    pie: 'ALL',
    criterios: new Set(),
    stats: new Set(),
  };

  function populateCursoOptions() {
    const select = document.getElementById('filter-curso');
    const cursos = [...new Set(CURRENT_DATA.map(s => s.curso))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    cursos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      select.appendChild(opt);
    });
    const trazaSelect = document.getElementById('traza-curso');
    cursos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      trazaSelect.appendChild(opt);
    });
  }

  function updateKPIs(data) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let pieCount = 0, asistSum = 0, promSum = 0, promCount = 0;
    data.forEach(s => {
      s.criterios.forEach(c => { if (counts[c] !== undefined) counts[c]++; });
      if (s.pie !== 'No PIE') pieCount++;
      asistSum += s.asistencia;
      if (s.promedio !== null) { promSum += s.promedio; promCount++; }
    });
    document.getElementById('count-crit-1').textContent = counts[1];
    document.getElementById('count-crit-2').textContent = counts[2];
    document.getElementById('count-crit-3').textContent = counts[3];
    document.getElementById('count-crit-4').textContent = counts[4];
    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-pie').textContent = pieCount;
    document.getElementById('stat-asistencia').textContent = data.length ? Math.round(asistSum / data.length) + '%' : '0%';
    document.getElementById('stat-promedio').textContent = promCount ? (promSum / promCount).toFixed(1) : 'N/A';
  }

  function updateCourseDistribution(data) {
    const total = data.length;
    const breakdown = {};
    data.forEach(s => { breakdown[s.curso] = (breakdown[s.curso] || 0) + 1; });
    const sorted = Object.keys(breakdown).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const container = document.getElementById('course-distribution-container');
    container.innerHTML = '';
    const totalCard = document.createElement('div');
    totalCard.className = 'bg-kallfu-blue-light rounded-lg p-3 border border-blue-100 dark:bg-slate-800 dark:border-slate-700';
    totalCard.innerHTML = `<p class="text-[11px] font-bold text-kallfu-blue dark:text-blue-300 uppercase">Total</p><p class="text-xl font-bold text-kallfu-blue dark:text-blue-300">${total}</p>`;
    container.appendChild(totalCard);
    sorted.forEach(curso => {
      const num = breakdown[curso];
      const pct = total ? Math.round((num / total) * 100) : 0;
      const card = document.createElement('div');
      card.className = 'bg-gray-50 rounded-lg p-3 border border-gray-100 dark:bg-slate-900/40 dark:border-slate-700';
      card.innerHTML = `<p class="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">${curso}</p><p class="text-xl font-bold text-gray-800 dark:text-slate-100">${num}</p><p class="text-[10px] text-gray-400 dark:text-slate-500">${pct}% del total</p>`;
      container.appendChild(card);
    });
  }

  function updateCriticalCases(data) {
    const scored = data.map(s => {
      const score = (100 - s.asistencia) + (s.asigBajo4 * 40) + (maxSeverity(s.criterios) * 15);
      return { s, score };
    });
    const top = scored.sort((a, b) => b.score - a.score).slice(0, 4);
    const container = document.getElementById('critical-students-container');
    container.innerHTML = '';
    if (top.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400 dark:text-slate-500 italic">Sin casos para mostrar.</p>';
      return;
    }
    top.forEach(({ s }) => {
      const card = document.createElement('div');
      card.className = 'bg-red-50/50 border border-red-100 rounded-lg p-3 dark:bg-red-500/10 dark:border-red-500/20';
      card.innerHTML = `
        <div class="flex justify-between items-start gap-2">
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-slate-100">${fullName(s)}</p>
            <p class="text-xs text-gray-500 dark:text-slate-400">${s.curso} &middot; Asist. ${s.asistencia}% &middot; ${s.asigBajo4} asig. &lt;4</p>
          </div>
          <div class="flex-shrink-0">${critBadges(s.criterios)}</div>
        </div>`;
      container.appendChild(card);
    });
  }

  function renderTable(data) {
    const tbody = document.getElementById('table-body');
    const emptyState = document.getElementById('empty-state');
    tbody.innerHTML = '';
    document.getElementById('showing-count').textContent = data.length;
    if (data.length === 0) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      return;
    }
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    data.forEach(s => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-kallfu-blue-light/40 dark:hover:bg-slate-700/40 transition-colors';
      const attClass = s.asistencia < 85 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-slate-300';
      const pieClass = s.pie === 'No PIE'
        ? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
        : (s.pie === 'PIE permanente'
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
          : 'bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-300');
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100 whitespace-nowrap">${fullName(s)}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-slate-300 whitespace-nowrap">${s.curso}</td>
        <td class="px-4 py-3 text-center whitespace-nowrap"><span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${pieClass}">${s.pie}</span></td>
        <td class="px-4 py-3 text-center text-sm ${attClass}">${s.asistencia}%</td>
        <td class="px-4 py-3 text-center whitespace-nowrap">${critBadges(s.criterios)}</td>
        <td class="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-300">${s.promedio !== null ? s.promedio.toFixed(1) : '&mdash;'}</td>
        <td class="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-300">${s.asigBajo4}</td>
        <td class="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-300">${s.atrasos}</td>
        <td class="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-300">${s.retiros}</td>
      `;
      tbody.appendChild(row);
    });
  }

  function applyFilters() {
    const term = state.search.toLowerCase().trim();
    const filtered = CURRENT_DATA.filter(s => {
      const name = `${s.apellidos} ${s.nombres}`.toLowerCase();
      const matchesSearch = !term || name.includes(term);
      const matchesCurso = state.curso === 'ALL' || s.curso === state.curso;
      const matchesPie = state.pie === 'ALL' || s.pie === state.pie;
      const matchesCriterio = state.criterios.size === 0 || s.criterios.some(c => state.criterios.has(c));
      let matchesStats = true;
      if (state.stats.has('asist85')) matchesStats = matchesStats && s.asistencia < 85;
      if (state.stats.has('prom45')) matchesStats = matchesStats && s.promedio !== null && s.promedio < 4.5;
      if (state.stats.has('prom50')) matchesStats = matchesStats && s.promedio !== null && s.promedio < 5.0;
      if (state.stats.has('asig')) matchesStats = matchesStats && s.asigBajo4 >= 1;
      if (state.stats.has('atrasos')) matchesStats = matchesStats && s.atrasos > 0;
      if (state.stats.has('retiros')) matchesStats = matchesStats && s.retiros > 0;
      return matchesSearch && matchesCurso && matchesPie && matchesCriterio && matchesStats;
    });
    renderTable(filtered);
    updateKPIs(filtered);
    updateCourseDistribution(filtered);
    updateCriticalCases(filtered);
    lucide.createIcons();
  }

  // ---------------------------------------------------------------
  // TAB 2: TRAZABILIDAD
  // ---------------------------------------------------------------
  let comparisons = [];
  let soloActual = [];
  let soloPrevio = [];
  const trazaState = { search: '', curso: 'ALL', estado: 'ALL' };

  function estadoBadge(estado) {
    if (estado === 'Mejora') return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-kallfu-green-light text-kallfu-green border border-green-200 dark:bg-emerald-500/10 dark:border-emerald-500/30"><i data-lucide="trending-up" class="w-3 h-3"></i> Mejora</span>`;
    if (estado === 'Retroceso') return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30"><i data-lucide="trending-down" class="w-3 h-3"></i> Retroceso</span>`;
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600"><i data-lucide="minus" class="w-3 h-3"></i> Estable</span>`;
  }

  function renderTrazaTable() {
    const term = trazaState.search.toLowerCase().trim();
    const filtered = comparisons.filter(({ cur, estado }) => {
      const name = `${cur.apellidos} ${cur.nombres}`.toLowerCase();
      const matchesSearch = !term || name.includes(term);
      const matchesCurso = trazaState.curso === 'ALL' || cur.curso === trazaState.curso;
      const matchesEstado = trazaState.estado === 'ALL' || estado === trazaState.estado;
      return matchesSearch && matchesCurso && matchesEstado;
    });
    const tbody = document.getElementById('traza-table-body');
    const emptyState = document.getElementById('traza-empty-state');
    tbody.innerHTML = '';
    document.getElementById('traza-showing-count').textContent = filtered.length;
    if (filtered.length === 0) {
      emptyState.classList.remove('hidden'); emptyState.classList.add('flex');
    } else {
      emptyState.classList.add('hidden'); emptyState.classList.remove('flex');
    }
    const estadoOrder = { 'Retroceso': 0, 'Mejora': 1, 'Estable': 2 };
    filtered
      .slice()
      .sort((a, b) => estadoOrder[a.estado] - estadoOrder[b.estado] || a.cur.apellidos.localeCompare(b.cur.apellidos))
      .forEach(({ cur, prev, asistDelta, estado }) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-kallfu-blue-light/40 dark:hover:bg-slate-700/40 transition-colors';
        const deltaClass = asistDelta > 0 ? 'text-kallfu-green font-bold' : (asistDelta < 0 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-gray-400 dark:text-slate-500');
        const deltaSign = asistDelta > 0 ? '+' : '';
        row.innerHTML = `
          <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100 whitespace-nowrap">${fullName(cur)}</td>
          <td class="px-4 py-3 text-sm text-gray-600 dark:text-slate-300 whitespace-nowrap">${cur.curso}</td>
          <td class="px-4 py-3 text-center text-sm whitespace-nowrap">
            <span class="text-gray-400 dark:text-slate-500">${prev.asistencia}%</span> &rarr; <span class="text-gray-800 dark:text-slate-100 font-semibold">${cur.asistencia}%</span>
            <span class="ml-1 text-xs ${deltaClass}">(${deltaSign}${asistDelta})</span>
          </td>
          <td class="px-4 py-3 text-center text-sm whitespace-nowrap">${critBadges(prev.criterios)} &rarr; ${critBadges(cur.criterios)}</td>
          <td class="px-4 py-3 text-center whitespace-nowrap">${estadoBadge(estado)}</td>
        `;
        tbody.appendChild(row);
      });
    lucide.createIcons();
  }

  // ---------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------
  async function cargarDatos() {
    const [actualResp, anteriorResp] = await Promise.all([
      fetch('data/riesgo_2026.json'),
      fetch('data/riesgo_2026_anterior.json'),
    ]);
    if (!actualResp.ok || !anteriorResp.ok) throw new Error('No se pudo cargar la información de riesgo.');
    const actual = await actualResp.json();
    const anterior = await anteriorResp.json();
    CURRENT_DATA = actual.estudiantes;
    PREVIOUS_DATA = anterior.estudiantes;

    const fechaEl = document.getElementById('fecha-registro-traza');
    if (fechaEl && actual.fecha_registro) {
      const [anio, mes, dia] = actual.fecha_registro.split('-');
      fechaEl.textContent = `${dia}-${mes}-${anio}`;
    }

    const prevByRun = new Map(PREVIOUS_DATA.map(p => [p.id, p]));
    const curByRun = new Map(CURRENT_DATA.map(c => [c.id, c]));

    comparisons = [];
    CURRENT_DATA.forEach(cur => {
      const prev = prevByRun.get(cur.id);
      if (!prev) return;
      const sevPrev = maxSeverity(prev.criterios);
      const sevCur = maxSeverity(cur.criterios);
      const asistDelta = cur.asistencia - prev.asistencia;
      let estado = 'Estable';
      if (sevCur < sevPrev) estado = 'Mejora';
      else if (sevCur > sevPrev) estado = 'Retroceso';
      else if (asistDelta >= 3) estado = 'Mejora';
      else if (asistDelta <= -3) estado = 'Retroceso';
      comparisons.push({ cur, prev, sevPrev, sevCur, asistDelta, estado });
    });

    soloActual = CURRENT_DATA.filter(c => !prevByRun.has(c.id));
    soloPrevio = PREVIOUS_DATA.filter(p => !curByRun.has(p.id));

    document.getElementById('traza-total').textContent = comparisons.length;
    document.getElementById('traza-mejora').textContent = comparisons.filter(c => c.estado === 'Mejora').length;
    document.getElementById('traza-retroceso').textContent = comparisons.filter(c => c.estado === 'Retroceso').length;
    document.getElementById('traza-estable').textContent = comparisons.filter(c => c.estado === 'Estable').length;
    document.getElementById('traza-nuevos').textContent = soloActual.length;
    document.getElementById('solo-actual-count').textContent = soloActual.length;
    document.getElementById('solo-previo-count').textContent = soloPrevio.length;
  }

  function wireEvents() {
    document.getElementById('tab-btn-actual').addEventListener('click', () => switchTab('actual'));
    document.getElementById('tab-btn-traza').addEventListener('click', () => switchTab('traza'));

    document.getElementById('search').addEventListener('input', e => { state.search = e.target.value; applyFilters(); });
    document.getElementById('filter-curso').addEventListener('change', e => { state.curso = e.target.value; applyFilters(); });
    document.getElementById('filter-pie').addEventListener('change', e => { state.pie = e.target.value; applyFilters(); });

    document.querySelectorAll('#criterio-chips .chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const crit = parseInt(btn.dataset.crit);
        if (state.criterios.has(crit)) { state.criterios.delete(crit); btn.classList.remove('active'); }
        else { state.criterios.add(crit); btn.classList.add('active'); }
        applyFilters();
      });
    });
    document.querySelectorAll('#stat-chips .chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const stat = btn.dataset.stat;
        if (state.stats.has(stat)) { state.stats.delete(stat); btn.classList.remove('active'); }
        else { state.stats.add(stat); btn.classList.add('active'); }
        applyFilters();
      });
    });
    document.querySelectorAll('.kpi-crit').forEach(card => {
      card.addEventListener('click', () => {
        const crit = parseInt(card.dataset.crit);
        const chip = document.querySelector(`#criterio-chips .chip[data-crit="${crit}"]`);
        if (state.criterios.has(crit)) { state.criterios.delete(crit); chip.classList.remove('active'); }
        else { state.criterios.add(crit); chip.classList.add('active'); }
        applyFilters();
      });
    });
    document.getElementById('reset-filters').addEventListener('click', () => {
      state.search = ''; state.curso = 'ALL'; state.pie = 'ALL'; state.criterios.clear(); state.stats.clear();
      document.getElementById('search').value = '';
      document.getElementById('filter-curso').value = 'ALL';
      document.getElementById('filter-pie').value = 'ALL';
      document.querySelectorAll('#criterio-chips .chip, #stat-chips .chip').forEach(c => c.classList.remove('active'));
      applyFilters();
      showToast('Filtros limpiados', 'info');
    });

    document.getElementById('traza-search').addEventListener('input', e => { trazaState.search = e.target.value; renderTrazaTable(); });
    document.getElementById('traza-curso').addEventListener('change', e => { trazaState.curso = e.target.value; renderTrazaTable(); });
    document.getElementById('traza-estado').addEventListener('change', e => { trazaState.estado = e.target.value; renderTrazaTable(); });
    document.getElementById('traza-reset').addEventListener('click', () => {
      trazaState.search = ''; trazaState.curso = 'ALL'; trazaState.estado = 'ALL';
      document.getElementById('traza-search').value = '';
      document.getElementById('traza-curso').value = 'ALL';
      document.getElementById('traza-estado').value = 'ALL';
      renderTrazaTable();
      showToast('Filtros limpiados', 'info');
    });
  }

  async function init() {
    try {
      await cargarDatos();
    } catch (e) {
      document.getElementById('table-body').innerHTML = '';
      document.getElementById('empty-state').classList.remove('hidden');
      document.getElementById('empty-state').classList.add('flex');
      console.error(e);
      return;
    }
    populateCursoOptions();
    wireEvents();
    applyFilters();
    renderTrazaTable();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
