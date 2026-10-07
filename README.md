# I love Margarita

Tienda y sistema de gestión para la marca de souvenirs de Isla de Margarita. Next.js 16, React 19, TypeScript y SQLite persistente. Requiere Node.js 24.

## Iniciar

```powershell
npm install
npm run setup
npm run dev
```

- Tienda: http://localhost:3000
- Panel privado: http://localhost:3000/admin
- Credenciales iniciales: `data/ACCESO-ADMIN.txt`, generado por `npm run setup`. No se reemplazan credenciales existentes. Puedes pasar un correo con `npm run setup -- tu-correo@ejemplo.com` en una instalación nueva.
- Los datos y adjuntos se guardan en `data/business.sqlite`, fuera de Git. `ILM_DATA_DIR` permite definir otra carpeta persistente.

## Operación

1. Completa contacto, lugar de retiro, envíos e instrucciones de pago en Ajustes.
2. Edita los diez productos iniciales o agrega otros. Puedes ocultar los diseños desactivando «Mostrar en la web».
3. Registra proveedores y cotizaciones. Los costos de molde, packaging y transporte son totales por lote; el costo del producto es por unidad, todo en USD.
4. Registra y aprueba un prototipo antes de autorizar producción o disponibilidad. Adjunta diseños, fotos y fichas PDF en cada producto.
5. Define precio, costo, fotografías e ingresa stock desde Inventario; cambia el estado a Disponible.
6. El cliente crea un pedido. El servidor calcula el precio y reserva stock en una transacción; repetir la misma solicitud no duplica la reserva.
7. Verifica el ingreso real antes de marcar Pagado. Avanza por Confirmado → Preparando → Entregado.
8. Cancelar repone el stock una sola vez. Si ya se recibió el pago, realiza el reembolso por fuera de la app y luego regístralo como Reembolsado.

Los pedidos tienen un enlace privado de seguimiento. Los mensajes de contacto se guardan en el panel; no se envían emails ni WhatsApp automáticamente. Clientes se construye a partir de pedidos. Finanzas muestra cobros y gastos registrados: no reemplaza contabilidad ni emite facturas fiscales.

## Datos iniciales

Los diez diseños del documento maestro son visibles como productos en desarrollo, sin precios ni stock ficticios. El llavero insignia está en Diseño aprobado. Los demás comienzan como Idea. Las imágenes iniciales son ilustraciones conceptuales; reemplázalas por fotos finales antes de vender.

## Verificar

```powershell
npm run lint
npx tsc --noEmit
npm run build
npm test
```

Las pruebas usan un servidor local y una base temporal independiente. Cubren acceso privado, aprobación de prototipos, reservas, precios calculados por servidor, concurrencia, cancelación, reembolsos, carga de archivos y pantallas en escritorio y móvil. Requieren Google Chrome instalado para las comprobaciones visuales.

## Producción y respaldos

```powershell
npm run build
npm start
npm run backup
```

Desplegar en un servidor Node.js 24 con disco persistente y HTTPS. Esta versión usa SQLite y debe ejecutarse como una sola instancia con almacenamiento local persistente; no usar un despliegue serverless con disco efímero. Configurar ADMIN_EMAIL, ADMIN_PASSWORD_SALT y ADMIN_PASSWORD_HASH a partir del archivo privado `.env.local`. Nunca publicar ese archivo ni las credenciales.

`npm run backup` crea una copia SQLite consistente con registros y archivos adjuntos en `data/backups`. El exportador del panel entrega JSON de registros, sin adjuntos ni sesiones. Para restaurar: detén el servidor, conserva una copia de la base actual y reemplaza `data/business.sqlite` por el respaldo; asegúrate de que no haya WAL/SHM de otra base antes de reiniciar. Mantén la configuración de acceso separada y respaldada.

## Alcance actual

Tienda adaptable, catálogo con filtros, colecciones, desarrollo, fichas, consultas, carrito, pedidos manuales, seguimiento privado, panel autenticado, productos, adjuntos, inventario y movimientos, clientes, proveedores, comparación de cotizaciones, aprobación de prototipos, gastos, cobros, ajustes y exportación.

Pendiente de configuración comercial: dominio y servidor de producción, contacto y punto de retiro definitivos, fotos, precios, stock y proceso de atención al cliente. No incluye pasarela de pago automático, integración fiscal, tarifas de transportistas ni múltiples cuentas de personal.

Define APP_ORIGIN con la URL exacta de la aplicación (protocolo, dominio y puerto, sin barra final). En local se usa http://localhost:3000; en producción usa tu dominio HTTPS. Esta URL mantiene la validación exacta del origen de formularios y el atributo Secure de la sesión.
