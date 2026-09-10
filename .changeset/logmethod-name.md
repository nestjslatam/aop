---
'@nestjslatam/aop.aspects': minor
---

`@LogMethod` acepta un `name` de negocio, como ya hacía `@Trace`.

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
