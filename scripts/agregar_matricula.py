"""
Script de enriquecimiento: agrega sexo y condición PIE a los archivos JSON
de datos (/data) a partir del "Registro de Matrícula" oficial (SIGE).

USO
---
1. Coloque este script en cualquier carpeta junto con el archivo Excel de
   matrícula ("Registro de Matrícula - Escuela Intercultural Kallfü Mapu.xlsx").
2. Ajuste las variables SRC_DIR, DATA_DIR y MATRICULA_FILE más abajo si es
   necesario.
3. Ejecute:  python3 agregar_matricula.py
4. El script sobrescribe los archivos .json en DATA_DIR agregando los
   campos "sexo" y "pie" a cada estudiante encontrado en el registro de
   matrícula (coincidencia por RUT).

El registro de matrícula es una fotografía del año lectivo vigente al
momento de exportarlo desde SIGE (columna "Año" del Excel). El sexo se
propaga a los registros de años anteriores del mismo estudiante (RUT) ya
que es un dato estable; la condición PIE solo se agrega al año que figura
en el propio registro de matrícula, porque puede variar de un año a otro y
no hay una fuente histórica de ese dato.

Si un estudiante no aparece en el registro de matrícula (por ejemplo,
alumnos que ya no están matriculados y no figuran en la exportación
vigente), sus campos "sexo" y "pie" quedan como null: dato no disponible.
"""

import openpyxl
import json
import os

# --- Configuración: ajustar según corresponda -----------------------------
SRC_DIR = "."
DATA_DIR = "../data"
MATRICULA_FILE = "Registro de Matrícula - Escuela Intercultural Kallfü Mapu.xlsx"
# ---------------------------------------------------------------------------


def cargar_matricula(path):
    """Lee el Excel de matrícula y devuelve dos diccionarios indexados por
    RUT ('RUN-DV'): uno con el sexo, y otro con {anio: pie_bool} porque la
    condición PIE es específica del año de la exportación."""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Estudiantes"]

    sexo_por_rut = {}
    pie_por_rut_anio = {}

    for row in ws.iter_rows(min_row=2, values_only=True):
        anio = row[0]
        if anio is None:
            continue
        run, dv = row[4], row[5]
        genero = row[10]
        pie = row[11]
        rut = f"{int(run)}-{dv}"

        if genero:
            sexo_por_rut[rut] = genero

        if pie is not None:
            pie_por_rut_anio.setdefault(rut, {})[int(anio)] = (
                str(pie).strip().upper() == "SI"
            )

    return sexo_por_rut, pie_por_rut_anio


def enriquecer_anio(anio, sexo_por_rut, pie_por_rut_anio):
    path = os.path.join(DATA_DIR, f"{anio}.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    n_sexo = 0
    n_pie = 0
    for curso, info in data["cursos"].items():
        for estudiante in info["estudiantes"]:
            rut = estudiante["rut"]
            sexo = sexo_por_rut.get(rut)
            estudiante["sexo"] = sexo
            if sexo:
                n_sexo += 1

            pie_anios = pie_por_rut_anio.get(rut, {})
            pie = pie_anios.get(anio)
            estudiante["pie"] = pie
            if pie is not None:
                n_pie += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    total = sum(len(c["estudiantes"]) for c in data["cursos"].values())
    print(f"{anio}: {total} estudiantes, sexo asignado a {n_sexo}, pie asignado a {n_pie}")


if __name__ == "__main__":
    matricula_path = os.path.join(SRC_DIR, MATRICULA_FILE)
    sexo_por_rut, pie_por_rut_anio = cargar_matricula(matricula_path)
    print(f"Registro de matrícula: {len(sexo_por_rut)} estudiantes con sexo, "
          f"{len(pie_por_rut_anio)} con condición PIE conocida.")

    for anio_json in (2024, 2025, 2026):
        enriquecer_anio(anio_json, sexo_por_rut, pie_por_rut_anio)

    print("Listo.")
