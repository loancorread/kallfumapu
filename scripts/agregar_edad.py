"""
Script de enriquecimiento: agrega la edad de cada estudiante a los archivos
JSON de datos (/data) a partir de la "Lista de Curso" oficial (SIGE, PDF).

USO
---
1. Coloque este script en cualquier carpeta junto con el PDF de matrícula
   ("Matrícula Escuela Intercultural Kallfü Mapu (SIGE).pdf").
2. Ajuste SRC_DIR, DATA_DIR, PDF_FILE y ANIO_PDF más abajo si corresponde.
3. Ejecute:  python3 agregar_edad.py
4. El script sobrescribe los .json en DATA_DIR agregando el campo "edad" a
   cada estudiante encontrado en el PDF (coincidencia por RUT).

El PDF trae la columna "Edad 31 Marzo": la edad del estudiante al 31 de
marzo del año de la exportación (ANIO_PDF). Como esa edad crece exactamente
en 1 cada año calendario (misma fecha de referencia, 31 de marzo), se
puede reconstruir con exactitud la edad al 31 de marzo de los años
anteriores restando la diferencia de años: edad(año) = edad(ANIO_PDF) -
(ANIO_PDF - año). Esto NO es una estimación: es la misma persona, un año
antes, en la misma fecha del calendario.

Si un estudiante no aparece en el PDF (puede pasar: la nómina SIGE no
siempre coincide 100% con las planillas académicas internas), su campo
"edad" queda como null para todos los años: dato no disponible.
"""

import pdfplumber
import json
import os
import re

# --- Configuración: ajustar según corresponda -----------------------------
SRC_DIR = "."
DATA_DIR = "../data"
PDF_FILE = "Matrícula Escuela Intercultural Kallfü Mapu (SIGE).pdf"
ANIO_PDF = 2026  # año al que corresponde la columna "Edad 31 Marzo" del PDF
ANIOS_JSON = (2024, 2025, 2026)
# ---------------------------------------------------------------------------

FILA_RE = re.compile(r"^\d+\s+([\dkK]+-[\dkK])\s+(.+?)\s+(\d{1,2})\s+(\d{2}/\d{2}/\d{4})\s+(.*)$")


def cargar_edades(path):
    """Lee el PDF de Lista de Curso y devuelve un diccionario
    {RUT en mayúsculas: edad_al_31_de_marzo_ANIO_PDF}."""
    edad_por_rut = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            texto = page.extract_text() or ""
            for linea in texto.split("\n"):
                m = FILA_RE.match(linea.strip())
                if not m:
                    continue
                rut, _nombre, edad, _fecha, _resto = m.groups()
                edad_por_rut[rut.upper()] = int(edad)
    return edad_por_rut


def enriquecer_anio(anio, edad_por_rut):
    path = os.path.join(DATA_DIR, f"{anio}.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    diferencia = ANIO_PDF - anio
    n_edad = 0
    for curso, info in data["cursos"].items():
        for estudiante in info["estudiantes"]:
            rut = estudiante["rut"].upper()
            edad_pdf = edad_por_rut.get(rut)
            estudiante["edad"] = edad_pdf - diferencia if edad_pdf is not None else None
            if estudiante["edad"] is not None:
                n_edad += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    total = sum(len(c["estudiantes"]) for c in data["cursos"].values())
    print(f"{anio}: {total} estudiantes, edad asignada a {n_edad}")


if __name__ == "__main__":
    pdf_path = os.path.join(SRC_DIR, PDF_FILE)
    edad_por_rut = cargar_edades(pdf_path)
    print(f"Lista de curso SIGE: {len(edad_por_rut)} estudiantes con edad registrada.")

    for anio_json in ANIOS_JSON:
        enriquecer_anio(anio_json, edad_por_rut)

    print("Listo.")
