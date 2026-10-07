import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, scryptSync } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
const port = Number(process.env.TEST_PORT || 3107),
  base = `http://127.0.0.1:${port}`;
const directory = mkdtempSync(path.join(tmpdir(), "ilm-tests-"));
const email = "test-admin@example.com",
  password = randomUUID(),
  salt = randomUUID();
let server,
  cookie = "",
  product,
  supplierId,
  order,
  output = "";
async function request(route, body, admin = false) {
  const r = await fetch(base + "/api/business/" + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(admin ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json(), headers: r.headers };
}
async function state() {
  const r = await request("data", undefined, true);
  assert.equal(r.status, 200);
  return r.body;
}
function orderBody(
  items = [{ productId: product.id, quantity: 1, customization: "" }],
) {
  return {
    requestId: randomUUID(),
    name: "Cliente de prueba",
    email: "cliente@example.com",
    phone: "+58000000000",
    delivery: "Retiro",
    address: "",
    notes: "Prueba automatizada",
    items,
  };
}
before(async () => {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        ILM_DATA_DIR: directory,
        APP_ORIGIN: base,
        ADMIN_EMAIL: email,
        ADMIN_PASSWORD_SALT: salt,
        ADMIN_PASSWORD_HASH: scryptSync(password, salt, 64).toString("hex"),
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (d) => (output += d));
  server.stderr.on("data", (d) => (output += d));
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(base + "/api/business/session")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, output);
});
after(async () => {
  server?.kill();
  await new Promise((r) => setTimeout(r, 1000));
  const parent = path.resolve(tmpdir()) + path.sep;
  if (
    path.resolve(directory).startsWith(parent) &&
    path.basename(directory).startsWith("ilm-tests-")
  )
    rmSync(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
});
test("El panel exige autenticación y las credenciales incorrectas fallan", async () => {
  assert.equal((await request("data")).status, 401);
  assert.equal((await request("products", {})).status, 401);
  assert.equal(
    (await request("login", { email, password: "incorrecta" })).status,
    401,
  );
  const r = await request("login", { email, password });
  assert.equal(r.status, 200);
  cookie = r.headers.get("set-cookie").split(";")[0];
  assert.ok(r.headers.get("set-cookie").includes("HttpOnly"));
  assert.equal(
    (await request("session", undefined, true)).body.authenticated,
    true,
  );
});
test("El catálogo inicial respeta los diez diseños y no ofrece stock ficticio", async () => {
  const r = await request("catalog");
  assert.equal(r.status, 200);
  assert.equal(r.body.products.length, 10);
  assert.ok(r.body.products.every((p) => p.stock === 0 && p.price === 0));
  product = (await state()).products[0];
  assert.equal((await request("orders", orderBody())).status, 400);
});
test("La producción requiere prototipo aprobado; cotizaciones y stock se guardan", async () => {
  assert.equal(
    (
      await request(
        "products",
        { ...product, status: "Disponible", price: 12 },
        true,
      )
    ).status,
    400,
  );
  await request(
    "suppliers",
    {
      name: "Fabricante prueba",
      email: "fabrica@example.com",
      phone: "",
      country: "Venezuela",
      notes: "",
    },
    true,
  );
  supplierId = (await state()).suppliers[0].id;
  const quote = await request(
    "quotes",
    {
      productId: product.id,
      supplierId,
      quantity: 100,
      unitCost: 3,
      mold: 100,
      packaging: 10,
      shipping: 20,
      days: 30,
      notes: "",
    },
    true,
  );
  assert.equal(quote.status, 200);
  assert.equal(
    (
      await request(
        "prototypes",
        {
          productId: product.id,
          supplierId,
          status: "Aprobado",
          date: "2026-09-19",
          notes: "Calidad aprobada",
        },
        true,
      )
    ).status,
    200,
  );
  product = {
    ...product,
    status: "Disponible",
    price: 12.5,
    cost: 3,
    published: true,
  };
  assert.equal((await request("products", product, true)).status, 200);
  assert.equal(
    (
      await request(
        "stock",
        {
          productId: product.id,
          quantity: 3,
          reason: "Ingreso de lote de prueba",
        },
        true,
      )
    ).status,
    200,
  );
  assert.equal((await state()).products[0].stock, 3);
  assert.equal(
    (
      await request(
        "stock",
        { productId: product.id, quantity: -4, reason: "Inválido" },
        true,
      )
    ).status,
    400,
  );
  assert.equal((await state()).products[0].stock, 3);
});
test("El servidor calcula importes, reserva stock y evita pedidos duplicados", async () => {
  const body = {
    ...orderBody(),
    total: 0.01,
    items: [
      {
        productId: product.id,
        quantity: 2,
        price: 0.01,
        customization: "Prueba",
      },
    ],
  };
  let r = await request("orders", body);
  assert.equal(r.status, 201);
  order = r.body;
  const tracked = await request(`orders/${order.id}?token=${order.token}`);
  assert.equal(tracked.body.total, 25);
  assert.equal((await state()).products[0].stock, 1);
  r = await request("orders", body);
  assert.equal(r.body.id, order.id);
  assert.equal((await state()).products[0].stock, 1);
  assert.equal((await state()).orders.length, 1);
  assert.equal(
    (await request(`orders/${order.id}?token=incorrecto`)).status,
    404,
  );
});
test("Dos compradores concurrentes no pueden reservar la misma última unidad", async () => {
  const results = await Promise.all([
    request("orders", orderBody()),
    request("orders", orderBody()),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
  assert.equal((await state()).products[0].stock, 0);
});
test("Cancelar repone stock una vez y el pago exige transiciones válidas", async () => {
  assert.equal(
    (
      await request(
        "order-update",
        { id: order.id, status: "Confirmado", payment: "Pendiente" },
        true,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "order-update",
        { id: order.id, status: "Confirmado", payment: "Pagado" },
        true,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "order-update",
        { id: order.id, status: "Cancelado", payment: "Pagado" },
        true,
      )
    ).status,
    200,
  );
  assert.equal((await state()).products[0].stock, 2);
  assert.equal(
    (
      await request(
        "order-update",
        { id: order.id, status: "Cancelado", payment: "Pagado" },
        true,
      )
    ).status,
    200,
  );
  assert.equal((await state()).products[0].stock, 2);
  assert.equal(
    (
      await request(
        "order-update",
        { id: order.id, status: "Preparando", payment: "Pagado" },
        true,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "order-update",
        { id: order.id, status: "Cancelado", payment: "Reembolsado" },
        true,
      )
    ).status,
    200,
  );
});
test("Cantidad acumulada por producto, fechas y consultas se validan", async () => {
  assert.equal(
    (
      await request(
        "orders",
        orderBody([
          { productId: product.id, quantity: 2, customization: "A" },
          { productId: product.id, quantity: 1, customization: "B" },
        ]),
      )
    ).status,
    400,
  );
  assert.equal((await state()).products[0].stock, 2);
  assert.equal(
    (
      await request("contact", {
        name: "Ana",
        email: "incorrecto",
        message: "Hola",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("contact", {
        name: "Ana",
        email: "ana@example.com",
        message: "Me interesa el llavero",
      })
    ).status,
    200,
  );
  assert.equal((await state()).contacts.length, 1);
  assert.equal(
    (
      await request(
        "expenses",
        {
          description: "Prototipo",
          category: "Producción",
          amount: 40,
          date: "2026-09-19",
        },
        true,
      )
    ).status,
    200,
  );
});
test("Los archivos privados requieren sesión y los tipos activos se rechazan", async () => {
  const form = new FormData();
  form.set(
    "file",
    new File(['<svg onload="alert(1)"></svg>'], "test.svg", {
      type: "image/svg+xml",
    }),
  );
  let r = await fetch(base + "/api/business/upload", {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  assert.equal(r.status, 400);
  const pdf = new FormData();
  pdf.set(
    "file",
    new File(["%PDF-1.4\n%%EOF"], "ficha.pdf", { type: "application/pdf" }),
  );
  r = await fetch(base + "/api/business/upload", {
    method: "POST",
    headers: { Cookie: cookie },
    body: pdf,
  });
  assert.equal(r.status, 200);
  const file = await r.json();
  assert.equal((await fetch(base + file.url)).status, 401);
  assert.equal(
    (await fetch(base + file.url, { headers: { Cookie: cookie } })).status,
    200,
  );
  const crossOrigin = await fetch(base + "/api/business/settings", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://otro.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(crossOrigin.status, 403);
});
test("Tienda y panel funcionan en escritorio y móvil, incluyendo compra real", async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    mkdirSync(".artifacts", { recursive: true });
    await page.goto(base);
    await page.getByRole("heading", { name: /Un pedacito/ }).waitFor();
    await page.screenshot({
      path: ".artifacts/tienda-desktop.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Explorar la colección" }).click();
    await page.getByRole("heading", { name: /Pequeños tesoros/ }).waitFor();
    await page
      .getByRole("combobox", { name: "Colección", exact: true })
      .selectOption("La Perla");
    await page
      .getByRole("textbox", { name: "Buscar productos" })
      .fill("Premium");
    await page
      .getByRole("link", { name: /Llavero Concha-Perla Premium/ })
      .click();
    await page.getByRole("button", { name: "Añadir a mi bolsa" }).click();
    await page.getByRole("link", { name: /Bolsa, 1 productos/ }).click();
    await page.getByLabel("Nombre completo").fill("Cliente Navegador");
    await page
      .getByLabel("Correo", { exact: true })
      .fill("browser@example.com");
    await page.getByLabel("Teléfono / WhatsApp").fill("5800000000");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Confirmar pedido", exact: true })
      .click();
    try {
      await page
        .getByRole("heading", { name: "Pedido recibido." })
        .waitFor({ timeout: 10000 });
    } catch (error) {
      console.log(
        "CHECKOUT DEBUG",
        await page.locator("main").innerText(),
        errors,
      );
      await page.screenshot({
        path: ".artifacts/checkout-failure.png",
        fullPage: true,
      });
      throw error;
    }
    assert.ok(page.url().includes("token="));
    await page.screenshot({ path: ".artifacts/pedido.png", fullPage: true });
    await page.goto(base + "/admin");
    await page.getByLabel("Correo del administrador").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar al estudio" }).click();
    await page
      .getByRole("heading", { name: "Un gran día para crear." })
      .waitFor();
    await page.screenshot({
      path: ".artifacts/panel-desktop.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Productos", exact: true }).click();
    await page
      .getByRole("button", { name: "Nuevo producto", exact: true })
      .click();
    await page.getByLabel("Código / SKU").fill("E2E-001");
    await page.getByLabel("Nombre", { exact: true }).fill("Producto E2E");
    await page
      .getByLabel("Descripción", { exact: true })
      .fill("Producto creado mediante el formulario del panel.");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      (await state()).products.some((p) => p.code === "E2E-001"),
      true,
    );
    for (const section of [
      "desarrollo",
      "pedidos",
      "inventario",
      "clientes",
      "proveedores",
      "cotizaciones",
      "prototipos",
      "finanzas",
      "mensajes",
      "ajustes",
    ]) {
      await page.goto(base + "/admin/" + section);
      await page.locator(".admin-page-heading h1").waitFor();
      assert.equal(await page.locator(".notice.error").count(), 0, section);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/admin");
    await page
      .getByRole("heading", { name: "Un gran día para crear." })
      .waitFor();
    await page.screenshot({
      path: ".artifacts/panel-mobile.png",
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Panel desborda en móvil",
    );
    await page.goto(base);
    await page.getByRole("heading", { name: /Un pedacito/ }).waitFor();
    await page.screenshot({
      path: ".artifacts/tienda-mobile.png",
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Tienda desborda en móvil",
    );
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await page
      .getByRole("link", { name: "Catálogo", exact: true })
      .first()
      .click();
    await page.getByRole("heading", { name: /Pequeños tesoros/ }).waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
test("La galería solo publica imágenes de productos visibles y nunca PDF", async () => {
  const form = new FormData();
  form.set(
    "file",
    new File(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1kAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      "foto.png",
      { type: "image/png" },
    ),
  );
  const response = await fetch(base + "/api/business/upload", {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  assert.equal(response.status, 200);
  const media = await response.json();
  assert.equal((await fetch(base + media.url)).status, 401);
  const current = (await state()).products.find((p) => p.id === product.id);
  assert.equal(
    (await request("products", { ...current, gallery: [media.url] }, true))
      .status,
    200,
  );
  assert.equal((await fetch(base + media.url)).status, 200);
  assert.equal(
    (
      await request(
        "products",
        { ...current, gallery: [media.url], published: false },
        true,
      )
    ).status,
    200,
  );
  assert.equal((await fetch(base + media.url)).status, 401);
  await request("products", current, true);
  const badDate = await request(
    "expenses",
    {
      description: "Fecha inválida",
      category: "Otros",
      amount: 1,
      date: "2026-02-31",
    },
    true,
  );
  assert.equal(badDate.status, 400);
  assert.equal((await request("orders", orderBody([null]))).status, 400);
});
test("Cerrar sesión invalida el token anterior", async () => {
  assert.equal((await request("logout", {}, true)).status, 200);
  assert.equal((await request("data", undefined, true)).status, 401);
});
