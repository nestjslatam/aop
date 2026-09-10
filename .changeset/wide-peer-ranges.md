---
"@nestjslatam/aop": minor
"@nestjslatam/aop.aspects": minor
"@nestjslatam/aop.aspects.logger": minor
"@nestjslatam/aop.aspects.logger.pino": minor
"@nestjslatam/aop.aspects.telemetry": minor
"@nestjslatam/aop.nestjs": minor
"@nestjslatam/logreflector-lib": minor
---

Soporte declarado para NestJS 11 y reflect-metadata 0.2.

Los rangos de peer dependencies solo admitían `@nestjs/common`/`@nestjs/core`
`^10.0.0` y `reflect-metadata` `^0.1.13`, así que una aplicación con NestJS 11
—donde `reflect-metadata` 0.2 es lo habitual— no podía instalar los paquetes:
`npm install` fallaba con `ERESOLVE`.

El código ya era compatible; lo estrecho eran los rangos. Ahora admiten
`^10.0.0 || ^11.0.0` y `^0.1.13 || ^0.2.0`, verificado arrancando un contenedor
real de NestJS 11.2.3 con reflect-metadata 0.2.2.
