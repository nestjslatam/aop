---
'@nestjslatam/aop.aspects': minor
---

`@Retry` acepta un predicado `shouldRetry` para decidir por error, no por clase.

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
