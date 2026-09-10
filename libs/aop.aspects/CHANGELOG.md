# @nestjslatam/aop.aspects

## 1.4.0

### Minor Changes

- 868b5b3: Cuatro cosas que solo se ven usando la librería contra una aplicación real. Las
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

## 1.3.0

### Minor Changes

- 8d2db9a: `@LogMethod` acepta un `name` de negocio, como ya hacía `@Trace`.

  Sin él, un sink solo puede decir `TargetType.metodo`, que es **dónde vive el
  código**, no qué estaba haciendo el sistema. Eso basta para depurar y no basta
  para narrar: quien lee un log de soporte busca `tomar-bloqueo`, no
  `BloquearServicioCasoUso.tomar`.

  La asimetría se notaba al usar los dos aspectos juntos: `@Trace({ name })` ya
  ponía el nombre de negocio en el span, y la línea de log que le correspondía
  seguía hablando de clases. Ahora los dos hablan el mismo vocabulario.

  ```ts
  @Trace({ name: 'tomar-bloqueo' })
  @LogMethod({ name: 'tomar-bloqueo' })
  async tomar(): Promise<void> {}
  ```

  Llega al sink como `context.name`, y queda `undefined` cuando no se declara, así
  que nada cambia para quien no lo use.

## 1.2.0

### Minor Changes

- a65559d: `@Retry` acepta un predicado `shouldRetry` para decidir por error, no por clase.

  `errorTypes` solo sabe de `instanceof`, y eso no alcanza cuando el origen del
  fallo reporta todo con una sola clase. El caso que lo destapó es un driver de
  base de datos: en SQL Server, un interbloqueo (1205) y una clave duplicada (2627)
  llegan como el mismo `RequestError` de tedious y se distinguen por un número. Con
  `errorTypes` no hay forma de reintentar el primero y no el segundo — y reintentar
  una clave duplicada escribe dos veces.

  ```ts
  @Retry({ maxAttempts: 3, shouldRetry: (error) => error?.number === 1205 })
  async guardar(): Promise<void> {}
  ```

  Cuando se declaran los dos, **ambos tienen que pasar**: añadir un filtro nunca
  ensancha el otro en silencio. `attempt` empieza en cero.

## 1.1.0

### Minor Changes

- dce1491: Soporte declarado para NestJS 11 y reflect-metadata 0.2.

  Los rangos de peer dependencies solo admitían `@nestjs/common`/`@nestjs/core`
  `^10.0.0` y `reflect-metadata` `^0.1.13`, así que una aplicación con NestJS 11
  —donde `reflect-metadata` 0.2 es lo habitual— no podía instalar los paquetes:
  `npm install` fallaba con `ERESOLVE`.

  El código ya era compatible; lo estrecho eran los rangos. Ahora admiten
  `^10.0.0 || ^11.0.0` y `^0.1.13 || ^0.2.0`, verificado arrancando un contenedor
  real de NestJS 11.2.3 con reflect-metadata 0.2.2.

### Patch Changes

- Updated dependencies [dce1491]
  - @nestjslatam/aop@1.1.0

## 1.0.1

### Patch Changes

- f8bf8ff: La descripción y el README de cada paquete pasan a estar en español, que es el
  idioma de la comunidad que mantiene la librería. La documentación en inglés
  sigue disponible en `docs/en`.
- Updated dependencies [f8bf8ff]
  - @nestjslatam/aop@1.0.1
