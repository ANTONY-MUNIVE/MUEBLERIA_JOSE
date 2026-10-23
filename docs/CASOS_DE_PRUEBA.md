# Casos de prueba de la aplicación (versión 2.1.1)

Esta guía sirve para llenar el registro técnico **RT1** y la hoja **H6** de la tesis
(indicadores AF1 y AF2). Cada caso corresponde a un requisito funcional (RF) de la
Tabla 23 del Anexo 08. Anote en H6: entrada, resultado obtenido, ejecutado (1/0) y cumple (1/0).

Antes de empezar:
1. Inicie sesión con una cuenta de rol `admin`.
2. En **Productos**, registre al menos dos muebles de prueba (por ejemplo, `PRB-001` con stock 5 y `PRB-002` con stock 10).
3. En **Reportes**, active el **modo medición** si va a medir tiempos de respuesta (ED1).

| Caso | RF | Pasos | Resultado esperado |
|---|---|---|---|
| CP01 | RF01 | Iniciar sesión con correo y contraseña válidos; luego con una contraseña errónea. | Con datos válidos entra al panel; con datos erróneos aparece «Credenciales incorrectas». |
| CP02 | RF02 | Pulsar «Cerrar sesión». | Vuelve a la pantalla de inicio de sesión. |
| CP03 | RF03 | Sin sesión, abrir `/admin/ventas` en el navegador. | Redirige a `/login`. Un usuario con rol `cliente` ve la pantalla 404. |
| CP04 | RF04 | Un trabajador crea su cuenta en «Registrarse»; en **Roles y Permisos** se busca su correo y se le asigna un rol. | El trabajador aparece en «Personal con acceso al panel». |
| CP05 | RF05 | Crear el rol `encargado` con los módulos Ventas, Disponibilidad e Inventario. | El rol aparece con 3 módulos permitidos. |
| CP06 | RF06 | Asignar el rol `encargado` a un usuario e iniciar sesión con él. | El menú solo muestra los módulos permitidos. |
| CP07 | RF07 | Crear un mueble con código, color, medidas, unidad, precio y stock inicial; intentar crear otro con el mismo código. | El primero se guarda y genera un ingreso «Stock inicial» en el kárdex; el segundo muestra «El código ya está asignado». |
| CP08 | RF08 | Editar el nombre de un mueble y eliminar un mueble de prueba. | Los cambios se guardan; el campo stock aparece bloqueado al editar. |
| CP09 | RF09 | Crear una categoría con una subcategoría y usarla en un mueble. | La categoría y la subcategoría aparecen en el formulario del mueble. |
| CP10 | RF10 | Exportar la lista de muebles a Excel e importar el archivo. | Se descarga el Excel; la importación crea los muebles con su ingreso de stock. |
| CP11 | RF11 | En la tienda, buscar «ropero» y filtrar por categoría. | El catálogo muestra solo los muebles que coinciden. |
| CP12 | RF12 | En **Disponibilidad**, buscar `PRB-001` y luego un nombre parcial. | Muestra el stock actual y el estado (disponible, stock bajo o agotado) y el tiempo de respuesta. |
| CP13 | RF13 | Pulsar «Nueva venta» y completar los 3 pasos: Cliente → Muebles → Pago. | Se guarda con código `V-00001`, se genera la nota de venta y el aviso muestra la duración del formulario. |
| CP14 | RF14 | Pulsar «Continuar» sin apellidos; en un pedido, sin celular; en Muebles, con cantidad 0 o precio vacío. | No avanza de paso; cada campo con error se marca en rojo con su mensaje y los datos escritos se conservan. Si se guarda con un error de un paso anterior, la app vuelve a ese paso. |
| CP15 | RF15 | Registrar una venta con dos muebles distintos. | La venta muestra ambos muebles y el total correcto. |
| CP16 | RF16 | Registrar una venta pagada con Yape (monto, boleta, número de operación y captura) y otra en efectivo con vuelto. | Se guardan el método, el monto, la boleta y el vuelto calculado; la captura se comprime y se ve con «Ver captura de Yape». |
| CP17 | RF17 | Vender 2 unidades de `PRB-001` (stock 5); luego intentar vender 4. | El stock queda en 3 y el kárdex muestra «Venta −2»; la segunda venta se rechaza por stock insuficiente. |
| CP18 | RF18 | Corregir la venta (cambiar la cantidad) y luego anular otra venta. | La corrección ajusta el stock por la diferencia y guarda el historial; la anulación devuelve el stock. Una venta entregada ya no se puede corregir ni anular. |
| CP19 | RF19 | Pulsar el ícono PDF de una venta. | Se abre la nota de venta con el detalle, el total y la boleta. |
| CP20 | RF20 | Registrar un pedido personalizado con medidas, color, adelanto y celular. | El pedido se guarda con el saldo calculado. |
| CP21 | RF21 | Cambiar el estado del pedido a «En fabricación», «Terminado» y «Entregado». | Cada cambio queda en el historial del pedido. |
| CP22 | RF22 | En **Inventario**, registrar un ingreso de 2 unidades y un ajuste por conteo físico. | El stock cambia y cada operación aparece en el kárdex con su motivo. |
| CP23 | RF23 | Abrir el kárdex de `PRB-001`. | Lista todos los movimientos con stock antes y después; la suma de movimientos coincide con el stock actual. |
| CP24 | RF24 | Dejar un mueble con stock igual o menor a su stock mínimo. | Aparece como «Stock bajo» o «Agotado» en Inventario, Disponibilidad y el Dashboard. |
| CP25 | RF25 | En **Reportes**, elegir «Esta semana», generar el PDF y exportar los datos a Excel. | El PDF muestra ventas, métodos de pago, muebles vendidos y stock; el Excel tiene las hojas Ventas, Detalle, Movimientos, Stock actual y Métricas. |

## Datos que la aplicación entrega para la tesis

| Indicador | Dónde se obtiene |
|---|---|
| T1 (apoyo) | Hoja «Ventas» del Excel: columnas «Formulario abierto», «Guardado» y «Duración formulario (s)». El valor oficial sigue siendo el cronometraje del observador (F1/H1). |
| I1, I2 | Inventario → «Exportar corte (hoja H3)»: cantidad registrada (R) al momento del corte; se completa la cantidad física (F) en el conteo. |
| I3 | Hoja «Movimientos» del Excel (cada venta, ingreso, ajuste, corrección y anulación con su documento). |
| Q1–Q3 | Hoja «Ventas»: la aplicación exige los campos obligatorios y el formato; la revisión contra la boleta se hace con F3/H5. |
| ED1, ED3 | Hoja «Métricas» (con el modo medición activo): tiempo de respuesta en milisegundos por operación. |
| ED2 | Se mide con las herramientas del navegador (pestaña Red), como indica RT3-B. |
| F4 | La versión de la aplicación aparece en el menú lateral y en cada venta y métrica. La 2.1.0 trae el rediseño y la venta en 3 pasos: registre en F4 qué versión se usó en cada medición. |
