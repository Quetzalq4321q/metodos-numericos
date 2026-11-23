# Métodos Numéricos · Trayectoria

Calculadora web en español para problemas de valor inicial de primer orden, de la forma `y′ = f(x, y)`. Permite comparar Euler explícito y Runge–Kutta de cuarto orden (RK4), o ejecutar cada método por separado.

[Abrir la aplicación](https://nexlabsgroup.com/metodos-numericos/) · [Informe en PDF](output/pdf/Informe-Trayectoria.pdf) · [Fuente LaTeX](output/pdf/Informe-Trayectoria.tex) · [Diapositivas](output/Trayectoria-Demostracion.pptx)

## Uso

1. Escribe `f(x, y)` con el teclado del dispositivo o con el teclado matemático de la página.
2. Completa `x inicial`, `y inicial` y `x final`. Define un paso `h` positivo o elige entre 1 y 1.000 iteraciones para que la aplicación calcule `h`.
3. Selecciona **Euler explícito**, **Runge–Kutta de cuarto orden** o **Comparar ambos** y pulsa **Calcular solución**.
4. Usa la tabla y la gráfica para comparar resultados. En **Desarrollo paso a paso**, elige una iteración para ver cada evaluación de la pendiente y el cálculo de `yₙ₊₁`. Con una solución exacta `g(x)`, también verás `|g(xₙ₊₁) − yₙ₊₁|`, sus sustituciones y el error por fila. Los ejemplos incluyen la referencia automáticamente.

La sección **Fórmulas** explica el número de iteraciones, el paso efectivo y cómo se obtiene cada aproximación. La guía y el desarrollo muestran fracciones y subíndices con MathML nativo. El selector de tema conserva tu elección en el navegador.

## Ejecución local

La calculadora no requiere instalación ni dependencias de JavaScript. Abre `index.html` en un navegador moderno para calcular y consultar los ejemplos. El historial local usa IndexedDB y se conserva en el mismo navegador y origen mientras el navegador mantenga esos datos. Si el navegador restringe el almacenamiento de archivos abiertos directamente, sirve la carpeta por HTTP.

### Historial con PHP y MySQL

1. Instala PHP 7.4 o posterior con PDO MySQL. Crea una base MySQL y un usuario con permisos `CREATE`, `SELECT` e `INSERT` sobre ella.
2. Copia `config.example.php` como `trayectoria-db.php` **fuera del directorio público**. Completa los datos de tu base y restringe la lectura del archivo al usuario de PHP. La API busca el archivo un nivel por encima de la raíz web. También puedes indicar su ruta absoluta con `TRAYECTORIA_CONFIG`.
3. Sirve el proyecto con `php -S localhost:8000` desde esta carpeta o publica `index.html`, `icon.svg`, `styles.css`, los archivos `.js` de la raíz y `history.php` en tu alojamiento PHP.
4. Abre la página y usa **Guardar cálculo**. La API crea `trayectoria_calculos` al conectarse. Si MySQL no está disponible, la web guarda en IndexedDB y marca el ejercicio como **Este navegador**. Cada origen de almacenamiento muestra hasta 20 ejercicios recientes.

## Archivos principales

| Archivo | Función |
| --- | --- |
| `index.html` | Formulario, teclado matemático, resultados y guía de fórmulas |
| `icon.svg`, `styles.css` | Identidad visual, disposición y temas |
| `solver.js` | Analizador de expresiones y métodos numéricos |
| `math-view.js` | Fórmulas y sustituciones con MathML |
| `app.js` | Coordinación del formulario, ejemplos y resultado activo |
| `ui.js`, `controls.js` | Formato, selector de tema y teclado matemático |
| `plot.js`, `results.js` | Gráfica, tabla y navegación entre iteraciones |
| `history-view.js`, `history-local.js` | Interfaz de historial y respaldo en IndexedDB |
| `history.php` | API de historial con MySQL |
| `config.example.php` | Plantilla de configuración sin credenciales |

## Validación y compilación del informe

`node --test tests/solver.test.cjs` comprueba las tres selecciones de método, la convergencia, los límites y los casos de intervalo inverso, paso ajustado y entradas inválidas.

Desde la raíz del repositorio, `latexmk -pdf -outdir=output/pdf output/pdf/Informe-Trayectoria.tex` regenera el informe. TeX Live debe incluir los paquetes de la fuente, entre ellos `qrcode` y `hyperref`.
