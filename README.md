# Los Pirchas — Pedí en línea

Sitio web para que los clientes de **Los Pirchas, Restaurante y Chicharronera** vean el menú,
arme su pedido y lo confirmen con pago por SINPE Móvil.

## Qué incluye

- **Catálogo**: lee en tiempo real la colección `Menu` de Firestore (la misma que ya tenés cargada), agrupado por `categoria`.
- **Carrito**: persiste en el navegador (localStorage), con cantidades editables.
- **Checkout**: formulario de entrega (nombre, teléfono, dirección, notas) + instrucciones de pago por SINPE Móvil.
- **Confirmación y seguimiento**: al enviar el pedido, se crea un documento en `orders` (la misma colección que ya lee el panel Admin), y la pantalla de seguimiento se actualiza en vivo según el estado que cambie el Admin (Pendiente → Preparando → En camino → Entregado).
- Botón para mandar el comprobante de SINPE por WhatsApp una vez hecho el pedido.

## Antes de publicar

- **Cambiá el número de SINPE**: en `src/components/Checkout.jsx`, la constante `SINPE_NUMBER` tiene un número de ejemplo (`0000-0000`) — reemplazalo por el número real de Los Pirchas.

## Estructura de datos

Este proyecto **escribe** en `orders` con esta forma (coincide con lo que ya lee el panel Admin):
```
{
  clientName, clientPhone, clientAddress, notes,
  restaurantName: "Los Pirchas",
  items: [{ nombre, precio, qty }],
  total,
  paymentMethod: "sinpe",
  status: "pending",
  createdAt: Timestamp
}
```

Y **lee** de `Menu` con esta forma (la que ya existe):
```
{ nombre, descripcion, categoria, precio, disponible }
```

## Cómo subir esto a GitHub desde el iPhone

1. Creá un repo nuevo (ej. `los-pirchas-cliente`).
2. Subí los archivos manteniendo la estructura de carpetas (`src/`, `src/components/`, `public/`).
3. **Importante**: si vas a escribir/pegar archivos directo en el editor de GitHub, a veces se comen caracteres al inicio o al final del archivo (nos pasó varias veces con el panel Admin). Si un archivo da error raro al hacer deploy, mejor borralo y subilo de nuevo como archivo con "Add file → Upload files" en vez de escribirlo.
4. Conectá el repo a Vercel (detecta Vite automáticamente).

## Notas de seguridad

Al igual que el panel Admin, las reglas de Firestore están abiertas (`allow read, write: if true`) mientras se sigue desarrollando. Antes de manejar pedidos y datos reales de clientes, hay que agregar reglas de verdad — por ejemplo, limitar quién puede leer pedidos ajenos.
