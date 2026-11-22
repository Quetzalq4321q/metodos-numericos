# Métodos Numéricos · Trayectoria

Calculadora web en español para problemas de valor inicial de primer orden, de la forma `y′ = f(x, y)`. Permite comparar Euler explícito y Runge–Kutta de cuarto orden (RK4), o ejecutar cada método por separado.

[Abrir la aplicación](https://nexlabsgroup.com/metodos-numericos/) · [Informe técnico](INFORME.md) · [Diapositivas](Trayectoria%20-%20Euler%20y%20Runge-Kutta.pptx)

## Uso

1. Escribe `f(x, y)` con el teclado del dispositivo o con el teclado matemático de la página.
2. Completa `x inicial`, `y inicial`, `x final` y un tamaño de paso `h` positivo.
3. Selecciona **Euler explícito**, **Runge–Kutta de cuarto orden** o **Comparar ambos** y pulsa **Calcular solución**.
4. Usa la tabla y la gráfica para comparar resultados. En **Desarrollo paso a paso**, elige una iteración para ver cada evaluación de la pendiente y el cálculo de `yₙ₊₁`.

La sección **Fórmulas** explica el número de iteraciones, el paso efectivo y cómo se obtiene cada aproximación. El selector de tema conserva tu elección en el navegador.

## Ejecución local

La calculadora no requiere instalación ni dependencias de JavaScript. Abre `index.html` en un navegador moderno para calcular y consultar los ejemplos. El historial local usa IndexedDB y se conserva en el mismo navegador y origen mientras el navegador mantenga esos datos. Si el navegador restringe el almacenamiento de archivos abiertos directamente, sirve la carpeta por HTTP.

### Historial con PHP y MySQL

1. Instala PHP 7.4 o posterior con PDO MySQL. Crea una base MySQL y un usuario con permisos `CREATE`, `SELECT` e `INSERT` sobre ella.
2. Copia `config.example.php` como `trayectoria-db.php` **fuera del directorio público**. Completa los datos de tu base y restringe la lectura del archivo al usuario de PHP. La API busca el archivo un nivel por encima de la raíz web. También puedes indicar su ruta absoluta con `TRAYECTORIA_CONFIG`.
3. Sirve el proyecto con `php -S localhost:8000` desde esta carpeta o publica `index.html`, `icon.svg`, `styles.css`, `solver.js`, `history-local.js`, `app.js` e `history.php` en tu alojamiento PHP.
4. Abre la página y usa **Guardar cálculo**. La API crea `trayectoria_calculos` al conectarse. Si MySQL no está disponible, la web guarda en IndexedDB y marca el ejercicio como **Este navegador**. Cada origen de almacenamiento muestra hasta 20 ejercicios recientes.

## Archivos principales

| Archivo | Función |
| --- | --- |
| `index.html` | Formulario, teclado matemático, resultados y guía de fórmulas |
| `icon.svg`, `styles.css` | Identidad visual, disposición y temas |
| `solver.js` | Analizador de expresiones y métodos numéricos |
| `app.js` | Interacción, tabla, gráfica y desarrollo de los pasos |
| `history-local.js` | Historial de respaldo en IndexedDB |
| `history.php` | API de historial con MySQL |
| `config.example.php` | Plantilla de configuración sin credenciales |
