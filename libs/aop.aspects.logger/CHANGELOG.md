# @nestjslatam/aop.aspects.logger

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
  - @nestjslatam/aop.aspects@1.1.0

## 1.0.1

### Patch Changes

- f8bf8ff: La descripción y el README de cada paquete pasan a estar en español, que es el
  idioma de la comunidad que mantiene la librería. La documentación en inglés
  sigue disponible en `docs/en`.
- Updated dependencies [f8bf8ff]
  - @nestjslatam/aop@1.0.1
  - @nestjslatam/aop.aspects@1.0.1
