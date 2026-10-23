# Reglas de Firestore y Storage para la versión 2.x

La versión 2 usa colecciones nuevas. Si las reglas no las permiten, Firestore responde
`permission-denied` y la app lo muestra en un aviso rojo, por ejemplo:
«Firestore no da permiso para leer «ventas»».

Las reglas **no están en este repositorio**: se editan en la consola de Firebase.

## Firestore

Firebase Console → Firestore Database → **Reglas**.
**No borre sus reglas actuales.** Agregue la función y los bloques `match` de abajo dentro de su
`match /databases/{database}/documents { ... }`. Después pulse **Publicar**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Personal = usuario con sesión cuyo rol en /users no es «cliente»
    function esPersonal() {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role != 'cliente';
    }

    // ---- Colecciones nuevas de la versión 2 ----
    match /ventas/{id}                { allow read, write: if esPersonal(); }
    match /contadores/{id}            { allow read, write: if esPersonal(); }
    match /pedidosPersonalizados/{id} { allow read, write: if esPersonal(); }

    // El kárdex y las métricas solo se agregan; no se editan ni se borran
    match /movimientos/{id} { allow read, create: if esPersonal(); allow update, delete: if false; }
    match /metricas/{id}    { allow read, create: if esPersonal(); allow update, delete: if false; }

    // Muebles: el catálogo es público; solo el personal cambia datos y stock
    // (si ya tiene una regla para «muebles», revise que el personal pueda escribir)
    match /muebles/{id} { allow read: if true; allow write: if esPersonal(); }

    // ... aquí siguen sus reglas actuales (users, roles, categories, content, publications, orders, messages) ...
  }
}
```

## Storage (captura de Yape)

Firebase Console → Storage → **Reglas**. Agregue:

```
match /yape/{archivo} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.resource.size < 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

Si Storage no está habilitado, la venta se guarda igual: la app pregunta si se guarda sin la captura.

## Cómo comprobarlo

1. Inicie sesión con una cuenta de rol `admin`.
2. Abra **Ventas**. Si no aparece ningún aviso rojo, las lecturas funcionan.
3. Registre una venta de prueba y revise en **Inventario → Kárdex** que se registró el movimiento.
4. Si algo falla, abra la consola del navegador (F12). El error dice qué colección y qué permiso faltan.
