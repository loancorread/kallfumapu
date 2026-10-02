"""
Script de extracción de datos: convierte las planillas oficiales de
"Registro de Rendimiento Académico" (una por año) a los archivos JSON
que consume el dashboard (carpeta /data).

USO
---
1. Coloque este script en cualquier carpeta junto con los archivos Excel
   de origen (uno por año, ej. "Registro de Rendimiento Académico - Año 2027.xlsx").
2. Ajuste las variables SRC_DIR, OUT_DIR y FILES más abajo.
3. Ejecute:  python3 extraer_datos.py
4. Copie los .json generados a la carpeta /data del sitio.

El script NO inventa ni completa datos: si una celda está vacía en la
planilla de origen, el campo correspondiente queda como null en el JSON.
Las filas de resumen/estadísticas de cada hoja (Promedio, Desviación
estándar, etc.) se excluyen automáticamente porque no tienen un RUN
de estudiante válido.
"""

import openpyxl
import json
import os

# --- Configuración: ajustar según corresponda -----------------------------
SRC_DIR = "."  # carpeta donde están los .xlsx de origen
OUT_DIR = "../data"  # carpeta de salida (data/ del sitio)

FILES = {
    2024: "Registro de Rendimiento Académico - Año 2024.xlsx",
    2025: "Registro de Rendimiento Académico - Año 2025.xlsx",
    2026: "Registro de Rendimiento Académico - Año 2026.xlsx",
    # Agregar aquí el año siguiente cuando esté disponible, por ejemplo:
    # 2027: "Registro de Rendimiento Académico - Año 2027.xlsx",
}

# Años considerados "cerrados" (con Situación Final definitiva). El año
# lectivo en curso se marca como "en_curso" para que el dashboard muestre
# la advertencia de datos parciales.
ANIO_EN_CURSO = max(FILES.keys())

COURSES = ['1° A', '2° A', '3° A', '4° A', '5° A', '6° A', '7° A', '8° A']
# ---------------------------------------------------------------------------


def clean(v):
    if isinstance(v, str):
        v = v.strip()
        if v == "":
            return None
    return v


def build_subjects(header_row, start_col=20):
    """Detecta dinámicamente las asignaturas y sus columnas P1/P2/PF
    a partir de la fila de encabezado (fila 4 de cada hoja de curso)."""
    subjects = []
    col = start_col
    ncols = len(header_row)
    while col < ncols:
        name = header_row[col]
        if name:
            subjects.append((name.strip(), col, col + 1, col + 2))
            col += 3
        else:
            col += 1
    return subjects


def map_columns(header_row):
    """Ubica cada columna fija por el texto de su encabezado, de modo que
    el script tolere columnas nuevas (ej. "Pendientes" desde 2026).
    Devuelve (dict nombre->índice, índice de la primera asignatura)."""
    nombres = {
        "n_lista": "N° de Lista", "run": "RUN", "dv": "Dígito verificador",
        "ap_p": "Apellido paterno", "ap_m": "Apellido materno",
        "nom": "Nombres", "periodo1": "Periodo 1", "periodo2": "Periodo 2",
        "promedio_general": "Promedio General", "pendientes": "Pendientes",
        "promedio_exacto": "Promedio General sin redondear",
        "asistencia": "Asistencia anual", "asistidos": "Días asistidos",
        "ausentes": "Días ausentes", "justificados": "Días justificados",
        "situacion": "Situación Final", "observaciones": "Observaciones",
    }
    cols = {}
    for clave, titulo in nombres.items():
        for i, v in enumerate(header_row):
            if isinstance(v, str) and v.strip() == titulo:
                cols[clave] = i
                break
    faltan = [k for k in nombres if k not in cols and k != "pendientes"]
    if faltan:
        raise ValueError(f"Faltan columnas en la planilla: {faltan}")
    return cols, cols["observaciones"] + 1


def is_valid_run(v):
    return isinstance(v, (int, float)) and v > 1_000_000


def extract_year(year, filename):
    path = os.path.join(SRC_DIR, filename)
    wb = openpyxl.load_workbook(path, data_only=True)
    year_data = {
        "anio": year,
        "estado": "en_curso" if year == ANIO_EN_CURSO else "cerrado",
        "cursos": {},
    }

    for course in COURSES:
        ws = wb[course]
        rows = list(ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True))
        header_row = rows[3]
        cols, inicio_asig = map_columns(header_row)
        subjects_def = build_subjects(header_row, start_col=inicio_asig)
        g = lambda row, k: clean(row[cols[k]]) if k in cols else None

        students = []
        for row in rows[5:]:
            run = row[cols["run"]]
            if not is_valid_run(run):
                continue
            dv = str(g(row, "dv")) if g(row, "dv") is not None else None
            ap_p = g(row, "ap_p") or ""
            ap_m = g(row, "ap_m") or ""
            nom = g(row, "nom") or ""
            nombre_completo = f"{nom} {ap_p} {ap_m}".strip()
            rut = f"{int(run)}-{dv}" if dv else str(int(run))

            asignaturas = {}
            for (name, cp1, cp2, cpf) in subjects_def:
                p1 = clean(row[cp1]) if cp1 < len(row) else None
                p2 = clean(row[cp2]) if cp2 < len(row) else None
                pf = clean(row[cpf]) if cpf < len(row) else None
                if p1 is None and p2 is None and pf is None:
                    continue
                asignaturas[name] = {"p1": p1, "p2": p2, "pf": pf}

            student = {
                "rut": rut,
                "run": int(run),
                "dv": dv,
                "n_lista": g(row, "n_lista"),
                "apellido_paterno": ap_p,
                "apellido_materno": ap_m,
                "nombres": nom,
                "nombre_completo": nombre_completo,
                "curso": course,
                "periodo1": g(row, "periodo1"),
                "periodo2": g(row, "periodo2"),
                "promedio_general": g(row, "promedio_general"),
                "promedio_general_exacto": g(row, "promedio_exacto"),
                "asistencia_anual": g(row, "asistencia"),
                "dias_asistidos": g(row, "asistidos"),
                "dias_ausentes": g(row, "ausentes"),
                "dias_justificados": g(row, "justificados"),
                "situacion_final": g(row, "situacion"),
                "observaciones": g(row, "observaciones"),
                "pendientes": g(row, "pendientes"),
                "asignaturas": asignaturas,
            }
            students.append(student)

        year_data["cursos"][course] = {"estudiantes": students}

    return year_data


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for year, filename in FILES.items():
        data = extract_year(year, filename)
        out_path = os.path.join(OUT_DIR, f"{year}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        total = sum(len(c["estudiantes"]) for c in data["cursos"].values())
        print(f"{year}: {total} estudiantes -> {out_path}")
    print("Listo.")
