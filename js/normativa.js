// Cálculo del indicador de promoción/repitencia según el Decreto N° 67/2018
// (MINEDUC, Art. 6). Fuente oficial: ayudamineduc.cl (ver CONFIG.normativa).
//
// Criterio aplicado (idéntico al usado por el establecimiento en la hoja
// "Riesgo de promoción" de sus propias planillas):
//   - 0 asignaturas con calificación final < 4,0  -> cumple
//   - 1 asignatura reprobada y promedio general >= 4,5 -> cumple
//   - 2 asignaturas reprobadas y promedio general >= 5,0 -> cumple
//   - Asistencia anual >= 85% -> cumple
// Si no se cumple alguno de los puntos anteriores, el decreto establece que
// la situación debe ser analizada y resuelta de forma fundada por el equipo
// directivo (no es una repitencia automática).

const Normativa = (() => {
  function parsePorcentaje(valor) {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === "number") return valor <= 1 ? valor * 100 : valor;
    const n = parseFloat(String(valor).replace("%", "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function esNumero(v) {
    return typeof v === "number" && !isNaN(v);
  }

  function evaluarEstudiante(estudiante) {
    if (!estudiante) return null;

    const asignaturasNumericas = Object.entries(
      estudiante.asignaturas || {}
    ).filter(([, notas]) => esNumero(notas.pf));

    const reprobadas = asignaturasNumericas.filter(
      ([, notas]) => notas.pf < 4.0
    );
    const nReprobadas = reprobadas.length;

    const promedioGeneral = esNumero(estudiante.promedio_general_exacto)
      ? estudiante.promedio_general_exacto
      : esNumero(estudiante.promedio_general)
      ? estudiante.promedio_general
      : null;

    const asistenciaPct = parsePorcentaje(estudiante.asistencia_anual);

    let cumpleAprendizajes = null;
    if (promedioGeneral !== null) {
      if (nReprobadas === 0) cumpleAprendizajes = true;
      else if (nReprobadas === 1) cumpleAprendizajes = promedioGeneral >= 4.5;
      else if (nReprobadas === 2) cumpleAprendizajes = promedioGeneral >= 5.0;
      else cumpleAprendizajes = false; // 3 o más asignaturas reprobadas
    }

    const cumpleAsistencia = asistenciaPct !== null ? asistenciaPct >= 85 : null;

    const datosSuficientes = cumpleAprendizajes !== null || cumpleAsistencia !== null;
    const enRiesgo =
      cumpleAprendizajes === false || cumpleAsistencia === false;

    const motivos = [];
    if (nReprobadas >= 3)
      motivos.push(`Reprueba ${nReprobadas} asignaturas (con calificación final).`);
    else if (nReprobadas === 1 && cumpleAprendizajes === false)
      motivos.push(
        `Reprueba 1 asignatura y su promedio general (${promedioGeneral.toFixed(
          1
        )}) es menor a 4,5.`
      );
    else if (nReprobadas === 2 && cumpleAprendizajes === false)
      motivos.push(
        `Reprueba 2 asignaturas y su promedio general (${promedioGeneral.toFixed(
          1
        )}) es menor a 5,0.`
      );
    if (cumpleAsistencia === false)
      motivos.push(
        `Asistencia anual (${asistenciaPct.toFixed(0)}%) inferior al 85% exigido.`
      );

    return {
      nReprobadas,
      asignaturasReprobadas: reprobadas.map(([nombre]) => nombre),
      promedioGeneral,
      asistenciaPct,
      cumpleAprendizajes,
      cumpleAsistencia,
      datosSuficientes,
      enRiesgo,
      motivos,
    };
  }

  return { evaluarEstudiante };
})();
