---
'@nestjslatam/aop.aspects': minor
'@nestjslatam/aop.nestjs': minor
---

Cuatro cosas que solo se ven usando la librería contra una aplicación real. Las
cuatro fallaban **en silencio**, que es lo que las hacía caras.

**`logReturn: false` ya no silencia la llamada completada.** Saltaba `onCall`
entero, no solo el valor. La asimetría lo delata: `logArguments: false` sí llama
a `onEntry`, solo que sin parámetros. Ahora las dos opciones suprimen el dato y
no la fase. **Cambia el comportamiento** de quien use `logReturn: false`: el sink
empieza a recibir `onCall` con `result.value` en `undefined`.

**`@LogMethod` acepta `isFailure` para el fallo que se devuelve en vez de
lanzarse.** `onException` solo ve excepciones, y hay mucho código que devuelve
el fallo —`Result`, `Either`, una tupla—. Sin esto al sink se le decía que la
llamada fue bien, y un paso fallido se contaba como completado.

```ts
@LogMethod({ isFailure: (valor) => valor.isErr() })
async guardar(): Promise<Result<Void, Error>> {}
```

Llega al sink como `context.failed`.

**`addLogger` hace lo que su nombre promete.** Registraba el sink sin volverlo el
predeterminado, así que `addLogger(MiSink)` dejaba a todo `@LogMethod()` sin
`logger` escribiendo por `NestLoggerSink`. No fallaba nada: las entradas salían
con otra forma, que es peor. Gana la última llamada.

**Un decorador sin ejecutor avisa una vez.** Sin ejecutor el envoltorio llamaba
al método original y volvía: el reintento no reintenta, el span no se abre y el
log no sale, y nada lo señala. Ahora escribe una línea por proceso diciendo qué
importar. Es aviso y no excepción a propósito: decorar una clase suelta y
correrla sin el contenedor es legítimo, y la librería documenta ese respaldo.
