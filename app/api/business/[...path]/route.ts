import { randomUUID } from "node:crypto";
import { db, read, transaction, limit } from "@/lib/db";
import { authenticated, login, sessionCookie, digest } from "@/lib/auth";
import {
  collections,
  statuses,
  type Business,
  type Product,
  type Order,
} from "@/lib/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
class Failure extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const fail = (s: string): never => {
  throw new Failure(s);
};
const text = (v: unknown, max = 200, required = false) => {
  if (typeof v !== "string")
    return required ? fail("Falta un campo obligatorio.") : "";
  const s = v.trim();
  if (s.length > max || (required && !s))
    return fail("Revisa la longitud de los campos obligatorios.");
  return s;
};
const num = (v: unknown, max = 1000000) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max)
    fail("Importe o cantidad inválida.");
  return v as number;
};
const integer = (v: unknown, max = 1000000) => {
  const n = num(v, max);
  if (!Number.isInteger(n)) fail("La cantidad debe ser entera.");
  return n;
};
const email = (v: unknown) => {
  const s = text(v, 200, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    fail("Introduce un correo válido.");
  return s;
};
const date = (v: unknown) => {
  const s = text(v, 10, true);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    fail("Fecha inválida.");
  return s;
};
const cents = (n: number) => Math.round(n * 100) / 100;
const json = (v: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(v, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
const publicProduct = (p: Product) => ({ ...p, cost: 0, notes: "", files: [] });
function orderCreate(b: Record<string, unknown>, s: Business) {
  const requestId = text(b.requestId, 80, true);
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(requestId))
    fail("Identificador de pedido inválido.");
  const existing = s.orders.find((o) => o.requestId === requestId);
  if (existing) return { id: existing.id, token: existing.token };
  const name = text(b.name, 120, true),
    mail = email(b.email),
    phone = text(b.phone, 40, true),
    delivery = text(b.delivery, 30, true),
    address = text(b.address, 600),
    notes = text(b.notes, 1000);
  if (
    !["Retiro", "Envío"].includes(delivery) ||
    (delivery === "Retiro" && !s.settings.pickupEnabled) ||
    (delivery === "Envío" && !s.settings.shippingEnabled)
  )
    fail("Modalidad de entrega no disponible.");
  if (delivery === "Envío" && !address) fail("Indica la dirección de entrega.");
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50)
    fail("El carrito está vacío o supera el límite.");
  const demand = new Map<string, number>();
  const items = (b.items as Record<string, unknown>[]).map((i) => {
    if (!i || typeof i !== "object" || Array.isArray(i))
      fail("Artículo inválido.");
    const productId = text(i.productId, 100, true);
    const p = s.products.find((p) => p.id === productId);
    if (!p || !p.published || p.status !== "Disponible" || p.price <= 0)
      fail("Uno de los productos ya no está a la venta.");
    const quantity = integer(i.quantity, 100);
    if (!quantity) fail("Cantidad inválida.");
    demand.set(productId, (demand.get(productId) || 0) + quantity);
    return {
      productId,
      name: p!.name,
      code: p!.code,
      quantity,
      price: p!.price,
      customization: text(i.customization, 200),
    };
  });
  for (const [id, qty] of demand) {
    const p = s.products.find((p) => p.id === id)!;
    if (p.stock < qty) fail(`Stock insuficiente para ${p.name}.`);
  }
  const id = `ILM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const orderId = id;
  for (const [id, qty] of demand) {
    s.products.find((p) => p.id === id)!.stock -= qty;
    s.movements.unshift({
      id: randomUUID(),
      productId: id,
      quantity: -qty,
      reason: "Reserva de pedido " + orderId,
      date: now,
    });
  }
  const subtotal = cents(
      items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    ),
    shipping = delivery === "Envío" ? s.settings.shipping : 0;
  const order: Order = {
    id,
    token: randomUUID() + randomUUID(),
    requestId,
    name,
    email: mail,
    phone,
    address,
    delivery,
    notes,
    items,
    subtotal,
    shipping,
    total: cents(subtotal + shipping),
    status: "Pendiente",
    payment: "Pendiente",
    createdAt: now,
  };
  s.orders.unshift(order);
  return { id, token: order.token };
}
async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const route = path.join("/"),
      method = request.method;
    const isAdmin = authenticated(request);
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      if (
        origin &&
        origin !== (process.env.APP_ORIGIN || new URL(request.url).origin)
      )
        throw new Failure("Origen no permitido.", 403);
    }
    if (method === "GET") {
      if (route === "catalog") {
        const s = read();
        return json({
          products: s.products
            .filter(
              (p) =>
                p.published && !["Pausado", "Descartado"].includes(p.status),
            )
            .map(publicProduct),
          settings: s.settings,
        });
      }
      if (route === "session")
        return json({
          authenticated: isAdmin,
          configured: !!process.env.ADMIN_PASSWORD_HASH,
        });
      if (route.startsWith("media/")) {
        const id = path[1];
        const s = read();
        const publicImage = s.products.some(
          (p) =>
            p.published &&
            !["Pausado", "Descartado"].includes(p.status) &&
            (p.image === `/api/business/media/${id}` ||
              p.gallery?.includes(`/api/business/media/${id}`)),
        );
        if (!isAdmin && !publicImage) throw new Failure("No autorizado.", 401);
        const media = db().prepare("SELECT * FROM media WHERE id=?").get(id) as
          { mime: string; name: string; body: Uint8Array } | undefined;
        if (!media) throw new Failure("Archivo no encontrado.", 404);
        return new Response(new Uint8Array(media.body), {
          headers: {
            "Content-Type": media.mime,
            "Content-Disposition": `${media.mime === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(media.name)}`,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
          },
        });
      }
      if (route.startsWith("orders/")) {
        const token = new URL(request.url).searchParams.get("token");
        const o = read().orders.find(
          (o) => o.id === path[1] && o.token === token,
        );
        if (!o) throw new Failure("Pedido no encontrado.", 404);
        return json({ ...o, requestId: undefined, token: undefined });
      }
      if (!isAdmin) throw new Failure("Inicia sesión para continuar.", 401);
      if (route === "data") return json(read());
      if (route === "backup")
        return json(read(), 200, {
          "Content-Disposition": `attachment; filename="margarita-${new Date().toISOString().slice(0, 10)}.json"`,
        });
      throw new Failure("Ruta no encontrada.", 404);
    }
    if (route === "upload") {
      if (!isAdmin) throw new Failure("No autorizado.", 401);
      if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
        fail("El archivo supera 5 MB.");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
        fail("Selecciona un archivo de hasta 5 MB.");
      const f = file as File;
      const bytes = Buffer.from(await f.arrayBuffer());
      let mime = "";
      if (
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        mime = "image/png";
      else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        mime = "image/jpeg";
      else if (
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP"
      )
        mime = "image/webp";
      else if (bytes.toString("ascii", 0, 5) === "%PDF-")
        mime = "application/pdf";
      if (!mime) fail("Solo se admiten PNG, JPG, WebP y PDF.");
      const id = randomUUID();
      db()
        .prepare("INSERT INTO media VALUES (?,?,?,?)")
        .run(id, f.name.slice(0, 180), mime, bytes);
      return json({ url: `/api/business/media/${id}`, name: f.name, mime });
    }
    const raw = await request.text();
    if (raw.length > 100000) fail("Solicitud demasiado grande.");
    let b: Record<string, unknown> = {};
    try {
      b = JSON.parse(raw || "{}");
    } catch {
      fail("Datos inválidos.");
    }
    if (!b! || Array.isArray(b) || typeof b !== "object")
      fail("Datos inválidos.");
    if (route === "login") {
      if (!limit("login", 50))
        throw new Failure(
          "Demasiados intentos. Intenta dentro de 15 minutos.",
          429,
        );
      const token = login(
        text(b.email, 200, true),
        text(b.password, 300, true),
      );
      if (!token) throw new Failure("Correo o contraseña incorrectos.", 401);
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(token, request),
      });
    }
    if (route === "logout") {
      const token = request.headers
        .get("cookie")
        ?.split(";")
        .map((x) => x.trim())
        .find((x) => x.startsWith("ilm_session="))
        ?.slice(12);
      if (token)
        db().prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie("", request, 0),
      });
    }
    if (route === "contact") {
      if (!limit("contact", 100)) throw new Failure("Intenta más tarde.", 429);
      const contact = {
        id: randomUUID(),
        name: text(b.name, 120, true),
        email: email(b.email),
        message: text(b.message, 2000, true),
        status: "Nuevo",
        createdAt: new Date().toISOString(),
      };
      transaction((s) => s.contacts.unshift(contact));
      return json({ ok: true });
    }
    if (route === "orders") {
      if (!limit("orders", 200)) throw new Failure("Intenta más tarde.", 429);
      return json(
        transaction((s) => orderCreate(b, s)),
        201,
      );
    }
    if (!isAdmin) throw new Failure("Inicia sesión para continuar.", 401);
    return json(
      transaction((s) => {
        const id = text(b.id, 100) || randomUUID();
        if (route === "products") {
          const old = s.products.find((p) => p.id === id);
          const status = text(b.status, 60, true);
          if (!statuses.includes(status)) fail("Estado inválido.");
          const collection = text(b.collection, 100, true);
          if (!collections.includes(collection)) fail("Colección inválida.");
          const code = text(b.code, 40, true);
          if (
            s.products.some(
              (p) => p.code.toLowerCase() === code.toLowerCase() && p.id !== id,
            )
          )
            fail("Ese código ya existe.");
          if (
            ["Producción autorizada", "En producción", "Disponible"].includes(
              status,
            ) &&
            old?.status !== status &&
            !s.prototypes.some(
              (p) => p.productId === id && p.status === "Aprobado",
            )
          )
            fail(
              "Registra un prototipo aprobado antes de autorizar la producción o venta.",
            );
          const image = text(b.image, 200);
          if (image && !/^\/api\/business\/media\/[a-f0-9-]+$/.test(image))
            fail("Sube una imagen válida.");
          if (image) {
            const media = db()
              .prepare("SELECT mime FROM media WHERE id=?")
              .get(image.split("/").pop()!) as { mime: string } | undefined;
            if (!media?.mime.startsWith("image/"))
              fail("La portada debe ser una imagen.");
          }
          const gallery = Array.isArray(b.gallery)
            ? b.gallery.map((f) => text(f, 200))
            : [];
          if (gallery.length > 12) fail("Máximo 12 imágenes de galería.");
          for (const url of gallery) {
            if (!/^\/api\/business\/media\/[a-f0-9-]+$/.test(url))
              fail("Imagen de galería inválida.");
            const media = db()
              .prepare("SELECT mime FROM media WHERE id=?")
              .get(url.split("/").pop()!) as { mime: string } | undefined;
            if (!media?.mime.startsWith("image/"))
              fail("La galería solo admite imágenes.");
          }
          const files = Array.isArray(b.files)
            ? b.files.map((f) => text(f, 200))
            : [];
          if (
            files.length > 20 ||
            files.some((f) => !/^\/api\/business\/media\/[a-f0-9-]+$/.test(f))
          )
            fail("Archivos inválidos.");
          const p: Product = {
            id,
            code,
            name: text(b.name, 150, true),
            collection,
            category: text(b.category, 100, true),
            description: text(b.description, 3000, true),
            status,
            priority: text(b.priority, 20),
            published: b.published === true,
            stock: old?.stock || 0,
            price: cents(num(b.price)),
            cost: cents(num(b.cost)),
            material: text(b.material, 500),
            dimensions: text(b.dimensions, 200),
            finish: text(b.finish, 500),
            packaging: text(b.packaging, 500),
            notes: text(b.notes, 3000),
            image,
            gallery,
            files,
            updatedAt: new Date().toISOString(),
          };
          if (status === "Disponible" && p.price <= 0)
            fail("Define un precio de venta mayor a cero.");
          if (old) s.products[s.products.indexOf(old)] = p;
          else s.products.unshift(p);
          return { ok: true, id };
        }
        if (route === "stock") {
          const p = s.products.find((p) => p.id === b.productId);
          if (!p) fail("Producto no encontrado.");
          const quantity = Number(b.quantity);
          if (
            !Number.isInteger(quantity) ||
            Math.abs(quantity) > 1000000 ||
            !quantity ||
            p!.stock + quantity < 0
          )
            fail("Ajuste de stock inválido.");
          const reason = text(b.reason, 300, true);
          p!.stock += quantity;
          s.movements.unshift({
            id: randomUUID(),
            productId: p!.id,
            quantity,
            reason,
            date: new Date().toISOString(),
          });
          return { ok: true };
        }
        if (route === "suppliers") {
          const item = {
            id,
            name: text(b.name, 150, true),
            email: text(b.email, 200),
            phone: text(b.phone, 50),
            country: text(b.country, 100),
            notes: text(b.notes, 2000),
          };
          const i = s.suppliers.findIndex((x) => x.id === id);
          if (i < 0) s.suppliers.unshift(item);
          else s.suppliers[i] = item;
          return { ok: true };
        }
        if (route === "quotes" || route === "prototypes") {
          const productId = text(b.productId, 100, true),
            supplierId = text(b.supplierId, 100, true);
          if (
            !s.products.some((p) => p.id === productId) ||
            !s.suppliers.some((p) => p.id === supplierId)
          )
            fail("Selecciona producto y proveedor válidos.");
          if (route === "quotes") {
            const item = {
              id,
              productId,
              supplierId,
              quantity: integer(b.quantity),
              unitCost: num(b.unitCost),
              mold: num(b.mold),
              packaging: num(b.packaging),
              shipping: num(b.shipping),
              days: integer(b.days, 2000),
              notes: text(b.notes, 2000),
            };
            if (!item.quantity) fail("Cantidad mínima: 1.");
            const i = s.quotes.findIndex((x) => x.id === id);
            if (i < 0) s.quotes.unshift(item);
            else s.quotes[i] = item;
          } else {
            const status = text(b.status, 50, true);
            if (
              ![
                "Solicitado",
                "Recibido",
                "Requiere cambios",
                "Aprobado",
              ].includes(status)
            )
              fail("Estado inválido.");
            const item = {
              id,
              productId,
              supplierId,
              status,
              notes: text(b.notes, 2000),
              date: date(b.date),
            };
            const i = s.prototypes.findIndex((x) => x.id === id);
            if (i < 0) s.prototypes.unshift(item);
            else s.prototypes[i] = item;
          }
          return { ok: true };
        }
        if (route === "expenses") {
          const item = {
            id,
            description: text(b.description, 200, true),
            category: text(b.category, 100, true),
            amount: num(b.amount),
            date: date(b.date),
          };
          const i = s.expenses.findIndex((x) => x.id === id);
          if (i < 0) s.expenses.unshift(item);
          else s.expenses[i] = item;
          return { ok: true };
        }
        if (route === "order-update") {
          const o = s.orders.find((o) => o.id === id);
          if (!o) fail("Pedido no encontrado.");
          const status = text(b.status, 50, true),
            payment = text(b.payment, 50, true);
          const allowed: Record<string, string[]> = {
            Pendiente: ["Pendiente", "Confirmado", "Cancelado"],
            Confirmado: ["Confirmado", "Preparando", "Cancelado"],
            Preparando: ["Preparando", "Entregado", "Cancelado"],
            Entregado: ["Entregado"],
            Cancelado: ["Cancelado"],
          };
          if (!allowed[o!.status]?.includes(status))
            fail("Transición de pedido no permitida.");
          if (!["Pendiente", "Pagado", "Reembolsado"].includes(payment))
            fail("Estado de pago inválido.");
          if (
            ["Confirmado", "Preparando", "Entregado"].includes(status) &&
            payment !== "Pagado"
          )
            fail("Confirma el pago antes de avanzar el pedido.");
          if (
            payment === "Reembolsado" &&
            (status !== "Cancelado" ||
              !["Pagado", "Reembolsado"].includes(o!.payment))
          )
            fail("Solo puedes reembolsar un pedido pagado y cancelado.");
          if (
            (o!.payment === "Pagado" && payment === "Pendiente") ||
            (o!.payment === "Reembolsado" && payment !== "Reembolsado")
          )
            fail("No puedes revertir el registro de pago.");
          if (
            o!.status === "Cancelado" &&
            o!.payment === "Pendiente" &&
            payment === "Pagado"
          )
            fail("Un pedido cancelado no puede cobrarse.");
          if (status === "Cancelado" && o!.status !== "Cancelado") {
            for (const item of o!.items) {
              const p = s.products.find((p) => p.id === item.productId);
              if (p) p.stock += item.quantity;
              s.movements.unshift({
                id: randomUUID(),
                productId: item.productId,
                quantity: item.quantity,
                reason: "Cancelación " + id,
                date: new Date().toISOString(),
              });
            }
          }
          o!.status = status;
          o!.payment = payment;
          return { ok: true };
        }
        if (route === "contact-update") {
          const c = s.contacts.find((c) => c.id === id);
          if (!c) fail("Consulta no encontrada.");
          const status = text(b.status, 30);
          if (!["Nuevo", "En seguimiento", "Resuelto"].includes(status))
            fail("Estado inválido.");
          c!.status = status;
          return { ok: true };
        }
        if (route === "settings") {
          const instagram = text(b.instagram, 200);
          if (
            instagram &&
            !/^https:\/\/(www\.)?instagram\.com\/[\w.\/-]+$/.test(instagram)
          )
            fail("Introduce una URL válida de Instagram.");
          s.settings = {
            email: b.email ? email(b.email) : "",
            phone: text(b.phone, 50),
            instagram,
            address: text(b.address, 500, true),
            shipping: cents(num(b.shipping)),
            paymentInstructions: text(b.paymentInstructions, 2000, true),
            pickupEnabled: b.pickupEnabled === true,
            shippingEnabled: b.shippingEnabled === true,
          };
          if (!s.settings.pickupEnabled && !s.settings.shippingEnabled)
            fail("Activa al menos un método de entrega.");
          return { ok: true };
        }
        throw new Failure("Ruta no encontrada.", 404);
      }),
    );
  } catch (e) {
    if (e instanceof Failure) return json({ error: e.message }, e.status);
    console.error(e);
    return json(
      { error: "No pudimos completar la operación. Intenta de nuevo." },
      500,
    );
  }
}
export { handler as GET, handler as POST };
