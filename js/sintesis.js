// Generación de una síntesis técnico-pedagógica breve, basada exclusivamente
// en los datos numéricos disponibles (promedios por asignatura del año
// actual y tendencia histórica). No incluye diagnósticos clínicos ni
// juicios de valor. Debe presentarse siempre como borrador sujeto a
// revisión docente.

const Sintesis = (() => {
  function esNumero(v) {
    return typeof v === "number" && !isNaN(v);
  }

  function generar(estudiante, historial) {
    if (!estudiante) return null;
    const frases = [];

    const asignaturas = Object.entries(estudiante.asignaturas || {}).filter(
      ([, n]) => esNumero(n.pf)
    );

    if (asignaturas.length === 0) {
      return {
        texto:
          "No hay calificaciones numéricas suficientes en el año actual para generar una síntesis.",
        etiqueta: "síntesis generada automáticamente — sujeta a revisión docente",
      };
    }

    const ordenadas = [...asignaturas].sort((a, b) => b[1].pf - a[1].pf);
    const fortalezas = ordenadas.filter(([, n]) => n.pf >= 6.0).slice(0, 3);
    const debiles = ordenadas
      .filter(([, n]) => n.pf < 5.0)
      .slice(-3)
      .reverse();

    if (fortalezas.length > 0) {
      frases.push(
        `Presenta un desempeño destacado en ${fortalezas
          .map(([nombre, n]) => `${nombre} (${n.pf.toFixed(1)})`)
          .join(", ")}.`
      );
    }

    if (debiles.length > 0) {
      frases.push(
        `Se observan promedios más bajos en ${debiles
          .map(([nombre, n]) => `${nombre} (${n.pf.toFixed(1)})`)
          .join(", ")}, lo que sugiere reforzar estos ámbitos.`
      );
    } else if (fortalezas.length === 0) {
      frases.push(
        "Sus promedios por asignatura se encuentran en un rango homogéneo, sin diferencias marcadas entre áreas."
      );
    }

    // Tendencia histórica: comparar promedio general entre años disponibles
    const aniosConDatos = Object.entries(historial)
      .filter(([, est]) => est && esNumero(est.promedio_general_exacto))
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    if (aniosConDatos.length >= 2) {
      const [primerAnio, primerEst] = aniosConDatos[0];
      const [ultimoAnio, ultimoEst] = aniosConDatos[aniosConDatos.length - 1];
      const diferencia =
        ultimoEst.promedio_general_exacto - primerEst.promedio_general_exacto;
      if (Math.abs(diferencia) >= 0.3) {
        frases.push(
          diferencia > 0
            ? `Su promedio general muestra una tendencia al alza entre ${primerAnio} (${primerEst.promedio_general_exacto.toFixed(
                1
              )}) y ${ultimoAnio} (${ultimoEst.promedio_general_exacto.toFixed(
                1
              )}).`
            : `Su promedio general muestra una tendencia a la baja entre ${primerAnio} (${primerEst.promedio_general_exacto.toFixed(
                1
              )}) y ${ultimoAnio} (${ultimoEst.promedio_general_exacto.toFixed(
                1
              )}).`
        );
      } else {
        frases.push(
          `Su promedio general se ha mantenido estable entre ${primerAnio} y ${ultimoAnio}.`
        );
      }
    }

    // Asistencia
    const asistPct = Normativa
      ? Normativa.evaluarEstudiante(estudiante).asistenciaPct
      : null;
    if (esNumero(asistPct)) {
      if (asistPct < 85) {
        frases.push(
          `Su asistencia anual (${asistPct.toFixed(
            0
          )}%) se encuentra bajo el 85% establecido por la normativa vigente, lo que podría afectar la continuidad de los aprendizajes.`
        );
      }
    }

    return {
      texto: frases.join(" "),
      etiqueta: "síntesis generada automáticamente — sujeta a revisión docente",
    };
  }

  return { generar };
})();
