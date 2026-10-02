// Carga y cachea los archivos JSON de datos por año.
const DataLoader = (() => {
  const cache = {};

  async function cargarAnio(anio) {
    if (cache[anio]) return cache[anio];
    const resp = await fetch(`data/${anio}.json`);
    if (!resp.ok) throw new Error(`No se pudo cargar data/${anio}.json`);
    const json = await resp.json();
    cache[anio] = json;
    return json;
  }

  async function cargarTodosLosAnios() {
    const resultados = await Promise.all(
      CONFIG.aniosDisponibles.map((a) => cargarAnio(a).catch(() => null))
    );
    const porAnio = {};
    CONFIG.aniosDisponibles.forEach((a, i) => (porAnio[a] = resultados[i]));
    return porAnio;
  }

  /**
   * Devuelve el historial completo de un estudiante (por identificador anónimo) a través
   * de todos los años disponibles, incluyendo años sin registro.
   */
  function construirHistorial(id, datosPorAnio) {
    const historial = {};
    CONFIG.aniosDisponibles.forEach((anio) => {
      const datosAnio = datosPorAnio[anio];
      let encontrado = null;
      if (datosAnio) {
        for (const curso of Object.keys(datosAnio.cursos)) {
          const est = datosAnio.cursos[curso].estudiantes.find(
            (e) => e.id === id
          );
          if (est) {
            encontrado = est;
            break;
          }
        }
      }
      historial[anio] = encontrado; // null => "Sin registro este año"
    });
    return historial;
  }

  return { cargarAnio, cargarTodosLosAnios, construirHistorial };
})();
