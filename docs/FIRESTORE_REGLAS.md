# Reglas de Firestore y Storage

Las reglas ya están en el repositorio:

- `firestore.rules`: todas las colecciones de la app (registrado en `firebase.json`).
- `storage.rules`: carpeta `yape/` de las capturas de pago. Se publica a mano desde la consola.

## Cómo funcionan los permisos

Las reglas usan **los mismos módulos que se marcan en Roles y permisos**. Si un rol tiene marcado
«Ventas», Firestore le deja registrar ventas; si no, lo rechaza aunque alguien abra la URL a mano.

| Colección | Leer | Escribir |
|---|---|---|
| `muebles`, `categories`, `content`, `publications` | Todos (catálogo público) | `productos` (muebles: también `inventario` y `ventas`, que cambian el stock); `web` para contenido |
| `ventas` | `ventas`, `reportes` | `ventas` (no se borran: se anulan) |
| `contadores` | `ventas` | `ventas` |
| `movimientos` (kárdex) | `inventario`, `reportes`, `ventas`, `productos` | Solo crear: `ventas`, `inventario`, `productos`. Nadie edita ni borra |
| `metricas` | `reportes` | Solo crear, cualquier miembro del personal. Nadie edita ni borra |
| `pedidosPersonalizados` | `pedidos_personalizados` | `pedidos_personalizados` (borrar: admin) |
| `orders` | El dueño del pedido, `pedidos`, `dashboard` | Crear: el cliente a su nombre. Actualizar: `pedidos` |
| `users` | Uno mismo, `roles` | Uno mismo **sin tocar su rol**; `roles` asigna roles; solo admin da «admin» |
| `roles` | Cualquiera con sesión | `roles` |
| `messages` | `clientes` | Crear: público (formulario de contacto) |

`admin` y `superadmin` pueden todo. Los roles antiguos `almacenero` y `carpintero` conservan lo que
ya podían hacer.

### Qué corrige respecto de las reglas anteriores

1. **Nadie puede subirse de rol.** Antes un cliente podía editar su propio documento y ponerse
   `role: "admin"`. Ahora el usuario no puede cambiar su campo `role`, y al registrarse solo puede
   crearse como cliente.
2. **Los permisos por rol ahora funcionan.** Las reglas buscan `roles/{nombre}`, pero la app creaba
   los roles con un ID automático, así que esa búsqueda nunca encontraba nada. Ahora la página de
   Roles guarda cada rol con su nombre como ID, y al abrirla copia los roles antiguos al formato nuevo.
3. Había **dos bloques para `muebles`** con condiciones distintas. Quedó uno solo.
4. **Kárdex, métricas y ventas no se pueden borrar.** Así los datos de la tesis no se pierden ni
   se alteran.
5. **El correlativo de pedidos solo avanza de uno en uno**, y cada pedido queda a nombre de quien lo crea.

## Cómo publicarlas

**Opción A, con la terminal** (desde la carpeta del proyecto):

```
firebase deploy --only firestore:rules
```

**Opción B, con la consola:** Firestore Database → Reglas → reemplace todo por el contenido de
`firestore.rules` → **Publicar**. La consola marca en rojo cualquier error antes de publicar.

Storage: consola → Storage → Reglas → pegue `storage.rules` → **Publicar**.

## Después de publicar (en este orden)

1. Despliegue la versión nueva de la app, para que la página de Roles guarde los roles por nombre.
2. Entre con una cuenta **admin** y abra **Roles y permisos** una vez. Los roles antiguos se migran solos.
3. Revise que cada rol tenga marcados sus módulos (por ejemplo, el vendedor con «Ventas» y «Disponibilidad»).
4. Pruebe con una cuenta de cada rol: el menú y Firestore deben dejar hacer lo mismo.

Si sale «Firestore no da permiso para leer...», a ese rol le falta marcar el módulo.

## Probar sin escribir datos reales

En la consola: Firestore → Reglas → **Área de prueba de reglas** (Rules Playground). Elija una
operación (get, create...), una ruta (por ejemplo `/ventas/prueba`) y «Autenticado» con el UID de un
usuario. Le dice si se permite y qué línea decide, sin tocar los datos.
