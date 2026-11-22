# Informe técnico de Trayectoria

## Objetivo

Resolver y visualizar problemas de valor inicial de primer orden de la forma `y′ = f(x, y)`, con `y(x₀) = y₀`. La aplicación muestra cómo se obtiene cada aproximación y permite ejecutar Euler explícito, RK4 o ambos en paralelo.

## Iteraciones y tamaño del paso

Para un tamaño de paso positivo `h` y extremos distintos, el número de iteraciones es `N = ⌈|x final − x₀|/h⌉`. El motor recorre el intervalo en la dirección del extremo final y ajusta el último paso para llegar a ese extremo. Cada fórmula usa `hₙ = xₙ₊₁ − xₙ`. Por ejemplo, de `0` a `1` con `h = 0,3` se obtienen los puntos `0`, `0,3`, `0,6`, `0,9` y `1`.

### Euler explícito

```text
k₁ = f(xₙ, yₙ)
yₙ₊₁ = yₙ + hₙ · k₁
```

La pendiente inicial se utiliza como estimación para todo el paso.

### Runge–Kutta de cuarto orden

```text
k₁ = f(xₙ, yₙ)
k₂ = f(xₙ + hₙ/2, yₙ + hₙ k₁/2)
k₃ = f(xₙ + hₙ/2, yₙ + hₙ k₂/2)
k₄ = f(xₙ + hₙ, yₙ + hₙ k₃)
yₙ₊₁ = yₙ + hₙ (k₁ + 2k₂ + 2k₃ + k₄)/6
```

El avance combina cuatro pendientes y da peso doble a cada evaluación intermedia.

## Ejemplo reproducible

Selecciona **Lineal** para cargar `y′ = x + y`, `y(0) = 1`, `x final = 1` y `h = 0,2`. En la primera iteración, Euler usa `k₁ = 1` y obtiene `y₁ = 1,2`. RK4 usa `k₁ = 1`, `k₂ = 1,2`, `k₃ = 1,22` y `k₄ = 1,444`, y obtiene `y₁ = 1,2428`.

La solución exacta para este ejemplo es `y(x) = 2eˣ − x − 1`. Tras cinco iteraciones, los resultados en `x = 1` son:

| Método | y(1) aproximado | Error absoluto aproximado |
| --- | ---: | ---: |
| Euler | 2,97664000 | 0,45992366 |
| RK4 | 3,43650227 | 0,00006139 |
| Solución exacta | 3,43656366 | — |

## Implementación y alcance

El navegador analiza expresiones aritméticas con las variables `x` e `y`, constantes y funciones matemáticas admitidas, y construye la tabla y la gráfica. La interfaz valida los parámetros, reporta evaluaciones fuera del dominio y limita cada cálculo a 500 iteraciones. Los valores se calculan con aritmética de punto flotante y se redondean al mostrarlos.

PHP guarda en MySQL los parámetros necesarios para reproducir cada cálculo. Una cookie del navegador identifica el historial y el servidor consulta MySQL con sentencias preparadas. Si el servidor no puede guardar, la web conserva el ejercicio en IndexedDB de ese navegador. El historial identifica el origen de cada registro. Los cálculos y los temas funcionan en el navegador incluso si el almacenamiento está desactivado.
