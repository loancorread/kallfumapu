# Dashboard de Rendimiento Académico — Escuela Intercultural Kallfü Mapu

Sitio estático (HTML, CSS y JavaScript, sin backend) para consulta interna del
equipo directivo y docente. Tiene dos paneles, accesibles desde un menú lateral
compartido:

- **Trayectoria Educativa** (`index.html` → `curso.html`): navegación
  inicio → curso → ficha del estudiante, con histórico académico 2024–2026.
- **Peligro de Repitencia** (`riesgo-repitencia.html`): monitoreo de los
  criterios de riesgo de repitencia MINEDUC del registro vigente, y
  trazabilidad respecto del registro anterior.

Compatible con GitHub Pages. El diseño visual (Tailwind CSS vía CDN, paleta
azul/verde Kallfü, tarjetas blancas, tipografía Inter, íconos Lucide) es el
mismo en todas las páginas, con modo claro/oscuro.

## Estructura del proyecto

```
dashboard-kallfu-mapu/
├── index.html              Trayectoria Educativa: tarjetas de curso (año lectivo actual)
├── curso.html               Trayectoria Educativa: listado de estudiantes de un curso + ficha lateral
├── riesgo-repitencia.html   Peligro de Repitencia: diagnóstico actual + trazabilidad y evolución
├── css/
│   └── styles.css          Layout del sidebar, animaciones y componentes que Tailwind no cubre
├── js/
│   ├── config.js            Nombre del establecimiento, año actual, cursos, normativa
│   ├── sidebar.js           Inyecta el menú lateral compartido y resalta la tab activa
│   ├── theme.js              Toggle de modo claro/oscuro (persistente por sesión, clase "dark" de Tailwind)
│   ├── data-loader.js        Carga y cachea los JSON de datos por año (Trayectoria Educativa)
│   ├── normativa.js           Cálculo del indicador de promoción/repitencia
│   ├── sintesis.js             Generación de la síntesis técnico-pedagógica automática
│   ├── curso.js                 Lógica de la vista de curso (listado, filtros, ficha)
│   └── riesgo.js                Lógica de "Peligro de Repitencia" (filtros, tabla, trazabilidad)
├── data/
│   ├── 2024.json             Datos académicos y de asistencia del año 2024
│   ├── 2025.json             Datos académicos y de asistencia del año 2025
│   ├── 2026.json             Datos académicos y de asistencia del año 2026 (en curso)
│   ├── riesgo_2026.json               Registro vigente de criterios de riesgo MINEDUC (Peligro de Repitencia)
│   └── riesgo_2026_anterior.json      Registro anterior, usado para la trazabilidad/evolución
├── scripts/
│   └── extraer_datos.py     Script para regenerar los JSON de Trayectoria Educativa desde las planillas Excel
└── README.md
```

Los datos están completamente separados de la presentación: todo el contenido
académico vive en `data/*.json`, y el HTML/CSS/JS solo se encarga de
mostrarlo. Esto permite actualizar la información sin tocar el código.

## Origen de los datos

### Trayectoria Educativa

Toda la información proviene **exclusivamente** de las planillas oficiales
"Registro de Rendimiento Académico" del establecimiento (una por año). No se
ha inventado, estimado ni completado ningún dato. Cuando un estudiante no
tiene registro en un año determinado, el dashboard lo indica explícitamente
como "Sin registro este año" en vez de omitirlo.

El emparejamiento de un mismo estudiante entre distintos años se realiza
mediante un **identificador anónimo** (`id`) derivado de su RUT, no por
nombre, ya que la escritura de los nombres puede variar levemente entre
planillas.

#### Protección de datos personales (RUT no publicados)

En concordancia con la nueva ley de protección de datos personales, **el
RUT de los y las estudiantes no se publica**: ni en los JSON de `data/`, ni
en el código, ni en la interfaz (las páginas muestran un aviso al respecto
mediante `js/aviso-privacidad.js`). Los scripts usan el RUT solo en una
carpeta temporal para cruzar fuentes y luego lo reemplazan por
`id = HMAC-SHA256(sal secreta, RUT)` (12 caracteres), que es estable entre
años y registros pero no permite recuperar el RUT. La sal vive en
`scripts/.sal_anonimizacion`, excluida de Git (`.gitignore`): **consérvela
(respáldela fuera del repositorio)**, ya que si se pierde los `id` cambiarán
al regenerar los datos.

#### Casos de repitencia confirmados

Al cruzar los tres años se detectaron tres estudiantes que aparecen en el
mismo curso en años consecutivos. Estos casos fueron corroborados
directamente con el equipo directivo antes de construir el dashboard y
corresponden a repitencia real (no a error de RUT ni homonimia):

- Leandro Agustín Bobadilla Calfio: 1° Básico A en 2024 y
  2025, luego 2° Básico A en 2026.
- Paulo Alejandro Sauto Morillo: 1° Básico A en 2024 y
  2025, sin registro en 2026 (no continúa en el establecimiento).
- Juan Pablo Bustamante Manzano: 5° Básico A en 2024 y
  2025, luego 6° Básico A en 2026.

El dashboard no necesita una tabla de excepciones para estos casos: como el
cruce de años se hace por identificador anónimo, el historial de cada uno se arma
automáticamente a partir de sus propios registros.

#### Año lectivo en curso

El archivo `data/2026.json` corresponde al año lectivo en curso (campo
`"estado": "en_curso"`). Sus promedios, asistencia y situación de promoción
son datos parciales (Periodo 1 al momento de la construcción del dashboard) y
se actualizarán conforme avance el año escolar. El dashboard etiqueta esta
información como "provisional" o "año en curso" en todas las vistas donde
aparece.

#### Campos no disponibles en las planillas

Las planillas de origen no incluyen sexo, fecha de nacimiento ni edad de los
estudiantes. Siguiendo la instrucción de no inventar datos, estos campos se
muestran en la ficha del estudiante con la leyenda "Dato no disponible en las
planillas fuente". Si en el futuro se cuenta con esa información en una
planilla adicional, puede incorporarse agregando los campos `sexo` y
`fecha_nacimiento` (o `edad`) a cada estudiante en los JSON de `data/` y
ajustando `js/curso.js` para mostrarlos.

### Peligro de Repitencia

Los datos de `data/riesgo_2026.json` (registro vigente) y
`data/riesgo_2026_anterior.json` (registro anterior, usado para la
comparación de trazabilidad) provienen de la ficha de monitoreo KIMCHE del
establecimiento ("Monitoreo Estudiantes En Riesgo de Repitencia — Update
04.08.26"). Cada estudiante trae: `id` anónimo (en lugar del RUN), nombre, curso, condición PIE, los
criterios MINEDUC de riesgo que activa (1 a 4), asistencia, promedio,
asignaturas bajo 4.0, atrasos y retiros de sala. El registro anterior solo
trae `id`, nombre, curso, criterios y asistencia (los campos disponibles en la
ficha previa).

La comparación de trazabilidad cruza ambos registros por `id` anónimo: se considera
**Mejora** cuando baja la severidad del criterio MINEDUC activo o la
asistencia sube 3 puntos o más; **Retroceso** cuando sube la severidad del
criterio o la asistencia cae 3 puntos o más; y **Estable** cuando no hay
cambios relevantes (ver `js/riesgo.js`).

## Indicador de situación de promoción (Trayectoria Educativa)

El indicador se calcula según el **Decreto N° 67/2018 del Ministerio de
Educación de Chile** (normas mínimas nacionales sobre evaluación,
calificación y promoción escolar), vigente a la fecha de construcción de este
dashboard. Fuente: [ayudamineduc.cl — Normativa de Evaluación y Promoción
Educación Básica](https://www.ayudamineduc.cl/ficha/normativa-de-evaluacion-y-promocion-educacion-basica).

Criterio aplicado (ver `js/normativa.js`), equivalente al usado por el
establecimiento en la hoja "Riesgo de promoción" de sus propias planillas:

- Se considera que el estudiante **cumple los requisitos de promoción** si
  aprueba todas las asignaturas, o si reprueba una asignatura con promedio
  general anual ≥ 4,5, o si reprueba dos asignaturas con promedio general
  anual ≥ 5,0 — y además registra una asistencia anual ≥ 85%.
- Si no cumple lo anterior, el dashboard muestra "En riesgo de repitencia".
  El Decreto 67/2018 establece que esta situación debe ser **analizada y
  resuelta de forma fundada por el equipo directivo** (no es una repitencia
  automática), por lo que el indicador es solo informativo/orientador.
- Para los años cerrados (2024 y 2025) también se muestra la "Situación
  final" tal como quedó registrada en la planilla oficial (Promovido /
  Reprobado).

El panel "Peligro de Repitencia" usa, en cambio, los 4 criterios MINEDUC tal
como los define la ficha de monitoreo KIMCHE del establecimiento (ver el
recuadro informativo dentro de la propia página).

## Síntesis técnico-pedagógica

Cada ficha de estudiante (Trayectoria Educativa) incluye un párrafo breve
generado automáticamente a partir de las calificaciones y la tendencia
histórica reales del estudiante (fortalezas, áreas con promedios más bajos,
evolución del promedio general y asistencia). No contiene diagnósticos
clínicos ni juicios de valor, y siempre se presenta bajo la etiqueta
"síntesis generada automáticamente — sujeta a revisión docente".

## Diseño visual y modo oscuro

Todas las páginas cargan Tailwind CSS vía CDN (`cdn.tailwindcss.com`), la
tipografía Inter (Google Fonts) e íconos Lucide, con la misma paleta:

- `kallfu-blue` `#1c4587`, `kallfu-green` `#5bcb96`, y sus variantes claras
  `kallfu-blue-light` / `kallfu-green-light`.
- Tarjetas blancas (`bg-white`) con borde y acento de color a la izquierda.

El modo oscuro usa la estrategia `class` de Tailwind: `js/theme.js` agrega o
quita la clase `dark` en `<html>` y la persiste en `sessionStorage` durante la
sesión del navegador. Cada componente define su variante `dark:` junto a la
clase clara correspondiente. Los colores que usa Chart.js (gráficos de la
ficha de estudiante) se leen desde variables CSS (`--chart-*`) definidas en
`css/styles.css`, con valores distintos para `:root` y `html.dark`.

## Cómo actualizar o agregar años futuros (Trayectoria Educativa)

1. Obtenga la planilla oficial "Registro de Rendimiento Académico" del nuevo
   año (misma estructura: una hoja por curso, más "Todos los cursos",
   "Promedios" y "Riesgo de promoción").
2. Deje los Excel (y el PDF/Excel de matrícula) en la carpeta que contiene
   al sitio, y agregue el año y el nombre del archivo al diccionario `FILES`
   de `scripts/extraer_datos.py`.
3. Desde `scripts/` ejecute `python3 construir_datos.py` (requiere
   `openpyxl` y `pdfplumber`). Extrae, enriquece y **anonimiza**, y escribe
   `data/AAAA.json` sin RUT. No ejecute los scripts sueltos
   (`extraer_datos.py`, `agregar_*.py`) contra `data/`: dejarían RUT.
4. Las columnas se ubican por su encabezado, por lo que el script tolera
   columnas nuevas en la planilla (p. ej. "Pendientes" desde 2026).
5. Agregue el nuevo año a `aniosDisponibles` en `js/config.js` y, si
   corresponde, actualice `anioActual`.
6. Revise si aparecen nuevos casos de estudiantes repitiendo el mismo curso
   en años consecutivos (el script de extracción no los marca
   automáticamente); si los hay, corrobórelos con el equipo directivo antes
   de asumir que se trata de la misma persona.

## Cómo actualizar el registro de "Peligro de Repitencia"

Cuando se publique una nueva ficha de monitoreo KIMCHE:

1. Copie el contenido de `data/riesgo_2026.json` (el registro vigente) a
   `data/riesgo_2026_anterior.json`, para que la nueva comparación de
   trazabilidad se haga contra el registro que hasta ahora era el vigente.
2. Reemplace el array `estudiantes` de `data/riesgo_2026.json` con los datos
   de la nueva ficha (mismos campos: `id`, `apellidos`, `nombres`, `curso`,
   `pie`, `criterios`, `asistencia`, `diasAusentes`, `promedio`, `asigBajo4`,
   `atrasos`, `retiros`) y actualice `fecha_registro`.
3. No se requiere tocar el HTML/JS: la página lee estos dos archivos por
   `fetch()` al cargar.

## Ejecución local

Al ser un sitio estático, basta con servirlo con cualquier servidor HTTP
simple (los navegadores bloquean `fetch()` sobre `file://`):

```
cd dashboard-kallfu-mapu
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080` en el navegador.

## Publicación en GitHub Pages

1. Suba el contenido de esta carpeta a la raíz de un repositorio de GitHub
   (o configure GitHub Pages para servir desde esta carpeta).
2. En la configuración del repositorio, active **GitHub Pages** apuntando a
   la rama y carpeta correspondiente.
3. No se requiere build ni backend: el sitio funciona tal cual.

**Importante:** el repositorio es público y contiene nombres completos de
estudiantes menores de edad (en ambos paneles), pero **no sus RUT** (ver
"Protección de datos personales"). Antes de publicar, confirme que no se
suben `scripts/.sal_anonimizacion` ni archivos con RUT.
