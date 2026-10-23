# Reglas de Firestore y Storage

Las reglas ya están en el repositorio:

- `firestore.rules`: todas las colecciones de la app (registrado en `firebase.json`).
- `storage.rules`: carpeta `yape/` de las capturas de pago. Se publica a mano desde la consola.

## Cómo funcionan los permisos (versión compatible)

Son las reglas originales del proyecto con el acceso del personal a la versión 2:

| Colección | Leer | Escribir |
|---|---|---|
| `muebles`, `categories`, `content`, `publications` | Todos | `muebles`: almacenero, admin o cualquier miembro del personal (las ventas cambian el stock). El resto: almacenero o admin |
| `ventas`, `contadores`, `pedidosPersonalizados` | Personal (rol distinto de «cliente») | Personal |
| `movimientos`, `metricas` | Personal | Solo crear; nadie edita ni borra |
| `orders` | Dueño, admin, carpintero, almacenero | Crear: cualquiera con sesión. Actualizar: admin, carpintero, almacenero |
| `users` | Uno mismo, admin | Uno mismo **sin tocar su rol**; admin |
| `roles` | Cualquiera con sesión | Admin |
| `messages` | Admin o roles con permiso de soporte | Crear: público |

La única restricción nueva es que **ningún usuario puede cambiarse su propio rol**. Antes un
cliente podía ponerse `role: "admin"` desde el navegador.

Los permisos por módulo (Ventas, Inventario...) se controlan en el menú del panel. En Firestore,
cualquier rol distinto de «cliente» puede usar las colecciones de la tienda.

## Cómo publicarlas

**Opción A, con la terminal** (desde la carpeta del proyecto):

```
firebase deploy --only firestore:rules
```

**Opción B, con la consola:** Firestore Database → Reglas → reemplace todo por el contenido de
`firestore.rules` → **Publicar**. La consola marca en rojo cualquier error antes de publicar.
En esa misma pantalla, el historial (a la izquierda) permite volver a una versión anterior.

Storage: consola → Storage → Reglas → pegue `storage.rules` → **Publicar**.

## Después de publicar

1. Con la cuenta **admin**, en **Roles y permisos**, asigne un rol (que no sea «cliente») a cada trabajador.
2. El trabajador cierra sesión y vuelve a entrar.
3. Si sale «Firestore no da permiso...», revise que su documento en `users` tenga el campo `role` correcto.

## Probar sin escribir datos reales

En la consola: Firestore → Reglas → **Área de prueba de reglas** (Rules Playground). Elija una
operación (get, create...), una ruta (por ejemplo `/ventas/prueba`) y «Autenticado» con el UID de un
usuario. Le dice si se permite y qué línea decide, sin tocar los datos.
