"""
Construye los JSON publicables del dashboard SIN RUT de estudiantes.

Flujo (todo en una sola ejecución):
  1. extraer_datos.py   -> lee las planillas Excel de rendimiento académico
  2. agregar_matricula  -> agrega sexo y PIE (coincidencia por RUT)
  3. agregar_edad       -> agrega edad (coincidencia por RUT)
  4. anonimizar         -> reemplaza rut/run/dv por un identificador anónimo
                           ("id") y escribe el resultado en ../data

Los pasos 1-3 necesitan el RUT para cruzar fuentes, por lo que se ejecutan
en una carpeta de trabajo temporal FUERA del sitio. Solo el resultado
anonimizado se escribe en data/.

El "id" es HMAC-SHA256(sal secreta, RUT normalizado) truncado. Es estable
entre años y entre archivos (permite armar el historial de un estudiante y
la trazabilidad de riesgo) pero no permite recuperar el RUT. La sal se
guarda en scripts/.sal_anonimizacion (excluida de Git por .gitignore): se
crea sola la primera vez y debe conservarse para que los id no cambien.

USO:  python3 construir_datos.py   (desde la carpeta scripts/, con los
Excel/PDF de origen en la carpeta superior al sitio; ver SRC_DIR)
"""

import hashlib
import hmac
import json
import os
import secrets
import shutil
import tempfile

import extraer_datos
import agregar_matricula
import agregar_edad

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(AQUI, "..", ".."))  # carpeta con los Excel/PDF
OUT_DIR = os.path.abspath(os.path.join(AQUI, "..", "data"))
SAL_PATH = os.path.join(AQUI, ".sal_anonimizacion")

CAMPOS_PRIVADOS = ("rut", "run", "dv")


def cargar_sal():
    if not os.path.exists(SAL_PATH):
        with open(SAL_PATH, "w") as f:
            f.write(secrets.token_hex(32))
        os.chmod(SAL_PATH, 0o600)
    with open(SAL_PATH) as f:
        return f.read().strip().encode()


def normalizar_rut(rut):
    return str(rut).replace(".", "").replace(" ", "").upper()


def hacer_id(sal, rut):
    h = hmac.new(sal, normalizar_rut(rut).encode(), hashlib.sha256).hexdigest()
    return h[:12]


def anonimizar_anio(sal, data):
    for info in data["cursos"].values():
        for e in info["estudiantes"]:
            e["id"] = hacer_id(sal, e["rut"])
            for c in CAMPOS_PRIVADOS:
                e.pop(c, None)
    return data


def anonimizar_riesgo(sal, ruta_in, ruta_out):
    with open(ruta_in, encoding="utf-8") as f:
        data = json.load(f)
    for e in data["estudiantes"]:
        if "run" in e:
            e["id"] = hacer_id(sal, e.pop("run"))
    with open(ruta_out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    sal = cargar_sal()
    os.makedirs(OUT_DIR, exist_ok=True)
    trabajo = tempfile.mkdtemp(prefix="kallfu_")
    try:
        # Paso 1-3: carpeta temporal con RUT (nunca dentro del sitio)
        extraer_datos.SRC_DIR = SRC_DIR
        extraer_datos.OUT_DIR = trabajo
        for anio, nombre in extraer_datos.FILES.items():
            d = extraer_datos.extract_year(anio, nombre)
            with open(os.path.join(trabajo, f"{anio}.json"), "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=1)

        agregar_matricula.DATA_DIR = trabajo
        agregar_matricula.SRC_DIR = SRC_DIR
        sexo, pie = agregar_matricula.cargar_matricula(
            os.path.join(SRC_DIR, agregar_matricula.MATRICULA_FILE))
        agregar_edad.DATA_DIR = trabajo
        edades = agregar_edad.cargar_edades(
            os.path.join(SRC_DIR, agregar_edad.PDF_FILE))
        for anio in extraer_datos.FILES:
            agregar_matricula.enriquecer_anio(anio, sexo, pie)
            agregar_edad.enriquecer_anio(anio, edades)

        # Paso 4: anonimizar y publicar
        for anio in extraer_datos.FILES:
            with open(os.path.join(trabajo, f"{anio}.json"), encoding="utf-8") as f:
                d = anonimizar_anio(sal, json.load(f))
            with open(os.path.join(OUT_DIR, f"{anio}.json"), "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=1)
            print(f"{anio}: publicado sin RUT")
    finally:
        shutil.rmtree(trabajo, ignore_errors=True)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "riesgo":
        sal = cargar_sal()
        for n in ("riesgo_2026.json", "riesgo_2026_anterior.json"):
            p = os.path.join(OUT_DIR, n)
            anonimizar_riesgo(sal, p, p)
            print(n, "anonimizado")
    else:
        main()
