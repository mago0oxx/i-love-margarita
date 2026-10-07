"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  collections,
  statuses,
  money,
  type Business,
  type Product,
  type Order,
} from "@/lib/model";
import {
  api,
  Logo,
  Icon,
  Shell,
  Art,
  Badge,
  Empty,
  Notice,
  Modal,
} from "./shared";
type Values = Record<string, string | number | boolean | string[]>;
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
};
type Editor = { title: string; route: string; values: Values; fields: Field[] };
const nav = [
  ["resumen", "Resumen", "grid"],
  ["productos", "Productos", "box"],
  ["desarrollo", "Diseño y producción", "sun"],
  ["pedidos", "Pedidos", "bag"],
  ["inventario", "Inventario", "box"],
  ["clientes", "Clientes", "users"],
  ["proveedores", "Proveedores", "users"],
  ["cotizaciones", "Cotizaciones", "chart"],
  ["prototipos", "Prototipos", "sun"],
  ["finanzas", "Finanzas", "chart"],
  ["mensajes", "Mensajes", "mail"],
  ["ajustes", "Ajustes", "settings"],
];
const options = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
const field = (
  key: string,
  label: string,
  type = "text",
  required = true,
  opts?: { value: string; label: string }[],
): Field => ({ key, label, type, required, options: opts });
const today = () => new Date().toISOString().slice(0, 10);
const dateText = (value: string) =>
  new Date(value).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export default function Admin({ section }: { section: string }) {
  const [session, setSession] = useState<{
      authenticated: boolean;
      configured: boolean;
    } | null>(null),
    [data, setData] = useState<Business | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [query, setQuery] = useState(""),
    [order, setOrder] = useState<Order | null>(null),
    [filter, setFilter] = useState("Todos");
  const close = useCallback(() => setEditor(null), []),
    closeOrder = useCallback(() => setOrder(null), []);
  const reload = useCallback(async () => {
    try {
      setData(await api<Business>("data"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    api<{ authenticated: boolean; configured: boolean }>("session")
      .then((s) => {
        setSession(s);
        if (s.authenticated) reload();
      })
      .catch((e) => setError(e.message));
  }, [reload]);
  const save = async (route: string, values: Values) => {
    await api(route, values);
    await reload();
    setEditor(null);
    setOrder(null);
    setMessage("Cambios guardados.");
  };
  const productOptions =
    data?.products.map((p) => ({
      value: p.id,
      label: p.code + " · " + p.name,
    })) || [];
  const supplierOptions =
    data?.suppliers.map((s) => ({ value: s.id, label: s.name })) || [];
  function editProduct(p?: Product) {
    setEditor({
      title: p ? "Editar producto" : "Nuevo producto",
      route: "products",
      values: p
        ? { ...p }
        : {
            code: "",
            name: "",
            collection: collections[0],
            category: "Accesorios",
            description: "",
            status: "Idea",
            priority: "Media",
            published: false,
            price: 0,
            cost: 0,
            material: "",
            dimensions: "",
            finish: "",
            packaging: "",
            notes: "",
            image: "",
            gallery: [],
            files: [],
          },
      fields: [
        field("code", "Código / SKU"),
        field("name", "Nombre"),
        field("collection", "Colección", "select", true, options(collections)),
        field("category", "Categoría"),
        field("description", "Descripción", "textarea"),
        field(
          "status",
          "Estado de desarrollo",
          "select",
          true,
          options(statuses),
        ),
        field(
          "priority",
          "Prioridad",
          "select",
          true,
          options(["Alta", "Media", "Baja"]),
        ),
        field("price", "Precio de venta · USD", "number"),
        field("cost", "Costo unitario final · USD", "number"),
        field("material", "Material", "text", false),
        field("dimensions", "Medidas", "text", false),
        field("finish", "Acabado", "text", false),
        field("packaging", "Packaging", "text", false),
        field("image", "Imagen principal", "image", false),
        field("gallery", "Galería pública del producto", "gallery", false),
        field("files", "Diseños y ficha técnica privados", "files", false),
        field("notes", "Notas internas", "textarea", false),
        field("published", "Mostrar en la web", "checkbox", false),
      ],
    });
  }
  function createRecord(kind: string, item?: object) {
    const templates: Record<string, Editor> = {
      proveedores: {
        title: item ? "Editar proveedor" : "Nuevo proveedor",
        route: "suppliers",
        values: { name: "", email: "", phone: "", country: "", notes: "" },
        fields: [
          field("name", "Nombre / Empresa"),
          field("email", "Correo", "email", false),
          field("phone", "Teléfono", "text", false),
          field("country", "País", "text", false),
          field("notes", "Notas y condiciones", "textarea", false),
        ],
      },
      cotizaciones: {
        title: item ? "Editar cotización" : "Nueva cotización",
        route: "quotes",
        values: {
          productId: productOptions[0]?.value || "",
          supplierId: supplierOptions[0]?.value || "",
          quantity: 100,
          unitCost: 0,
          mold: 0,
          packaging: 0,
          shipping: 0,
          days: 30,
          notes: "",
        },
        fields: [
          field("productId", "Producto", "select", true, productOptions),
          field("supplierId", "Proveedor", "select", true, supplierOptions),
          field("quantity", "Unidades", "number"),
          field("unitCost", "Costo por unidad · USD", "number"),
          field("mold", "Molde, total · USD", "number"),
          field("packaging", "Packaging, total · USD", "number"),
          field("shipping", "Transporte, total · USD", "number"),
          field("days", "Plazo de fabricación · días", "number"),
          field("notes", "Notas y vigencia", "textarea", false),
        ],
      },
      prototipos: {
        title: item ? "Revisar prototipo" : "Registrar prototipo",
        route: "prototypes",
        values: {
          productId: productOptions[0]?.value || "",
          supplierId: supplierOptions[0]?.value || "",
          status: "Solicitado",
          date: today(),
          notes: "",
        },
        fields: [
          field("productId", "Producto", "select", true, productOptions),
          field("supplierId", "Proveedor", "select", true, supplierOptions),
          field(
            "status",
            "Evaluación",
            "select",
            true,
            options(["Solicitado", "Recibido", "Requiere cambios", "Aprobado"]),
          ),
          field("date", "Fecha", "date"),
          field(
            "notes",
            "Calidad, tamaño, color, resistencia y cambios",
            "textarea",
            false,
          ),
        ],
      },
      finanzas: {
        title: item ? "Editar gasto" : "Registrar gasto",
        route: "expenses",
        values: {
          description: "",
          category: "Producción",
          amount: 0,
          date: today(),
        },
        fields: [
          field("description", "Concepto"),
          field(
            "category",
            "Categoría",
            "select",
            true,
            options([
              "Producción",
              "Prototipos",
              "Diseño",
              "Logística",
              "Marketing",
              "Operación",
              "Otros",
            ]),
          ),
          field("amount", "Importe · USD", "number"),
          field("date", "Fecha", "date"),
        ],
      },
    };
    const template = templates[kind];
    if (template)
      setEditor({ ...template, values: { ...template.values, ...item } });
  }
  const adjust = (p: Product) =>
    setEditor({
      title: "Ajustar inventario · " + p.name,
      route: "stock",
      values: { productId: p.id, quantity: 1, reason: "" },
      fields: [
        {
          ...field("quantity", "Unidades a sumar o restar", "signed"),
          hint: `Disponible actualmente: ${p.stock}. Usa un número negativo para retirar unidades.`,
        },
        field("reason", "Motivo del movimiento"),
      ],
    });
  if (!session)
    return (
      <div className="loading">
        <Shell />
        <p>Abriendo tu espacio de trabajo…</p>
        <Notice message={error} error />
      </div>
    );
  if (!session.authenticated)
    return (
      <Login
        configured={session.configured}
        onLogin={async () => {
          setSession({ authenticated: true, configured: true });
          await reload();
        }}
      />
    );
  if (!data)
    return (
      <div className="loading">
        <Shell />
        <p>Cargando el negocio…</p>
        <Notice message={error} error />
        <button onClick={reload} className="button secondary">
          Reintentar
        </button>
      </div>
    );
  const matches = (v: unknown) =>
    JSON.stringify(v).toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const products = data.products.filter(
    (p) => matches(p) && (filter === "Todos" || p.status === filter),
  );
  const paid = data.orders.filter((o) => o.payment === "Pagado"),
    revenue = paid.reduce((n, o) => n + o.total, 0),
    expenses = data.expenses.reduce((n, e) => n + e.amount, 0);
  const filteredOrders = data.orders.filter(
    (o) => matches(o) && (filter === "Todos" || o.status === filter),
  );
  const title = nav.find((n) => n[0] === section)?.[1] || "Resumen";
  const newActions: Record<string, string> = {
    productos: "Nuevo producto",
    proveedores: "Nuevo proveedor",
    cotizaciones: "Nueva cotización",
    prototipos: "Registrar prototipo",
    finanzas: "Registrar gasto",
  };
  const customers = Array.from(new Set(data.orders.map((o) => o.email))).map(
    (email) => {
      const orders = data.orders.filter((o) => o.email === email),
        latest = orders[0];
      return {
        email,
        name: latest.name,
        phone: latest.phone,
        count: orders.length,
        total: orders
          .filter((o) => o.payment === "Pagado")
          .reduce((n, o) => n + o.total, 0),
        date: latest.createdAt,
      };
    },
  );
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Logo />
        <div className="workspace">
          <span className="workspace-icon">
            <Shell />
          </span>
          <span>
            Estudio Margarita<small>Gestión del negocio</small>
          </span>
          <span className="workspace-dot" />
        </div>
        <span className="nav-label">TU ESPACIO DE TRABAJO</span>
        <nav>
          {nav.map(([url, label, icon]) => (
            <Link
              href={"/admin/" + url}
              key={url}
              className={section === url ? "active" : ""}
            >
              <Icon name={icon} />
              {label}
              {url === "mensajes" &&
                data.contacts.some((c) => c.status === "Nuevo") && (
                  <b>
                    {data.contacts.filter((c) => c.status === "Nuevo").length}
                  </b>
                )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            <Icon name="arrow" />
            Ver la tienda ↗
          </Link>
          <button
            onClick={async () => {
              await api("logout", {});
              setSession({ authenticated: false, configured: true });
              setData(null);
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>
            Mi negocio <span>/</span> {title}
          </span>
          <div>
            <span className="live-dot" /> Guardado en tu servidor{" "}
            <Link className="topbar-action" href="/" target="_blank">
              Tienda ↗
            </Link>
            <button
              className="topbar-action"
              onClick={async () => {
                await api("logout", {});
                setSession({ authenticated: false, configured: true });
                setData(null);
              }}
            >
              Salir
            </button>
            <span className="avatar">M</span>
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">I LOVE MARGARITA / ESTUDIO</span>
              <h1>
                {section === "resumen" ? "Un gran día para crear." : title}
              </h1>
              <p>
                {
                  (
                    {
                      resumen:
                        "Tu isla, tus ideas y todo lo que está creciendo.",
                      productos:
                        "Del primer boceto al recuerdo que alguien se lleva.",
                      desarrollo:
                        "Cada producto tiene un camino. Acompaña el suyo.",
                      pedidos:
                        "Gestiona pagos, preparación y entregas desde aquí.",
                      inventario:
                        "Existencias disponibles después de reservar los pedidos.",
                      clientes:
                        "Las personas que llevan un pedacito de Margarita.",
                      proveedores:
                        "Tus aliados para convertir diseños en productos.",
                      cotizaciones:
                        "Compara el costo completo de cada propuesta.",
                      prototipos:
                        "Valida la calidad antes de autorizar la producción.",
                      finanzas:
                        "Cobros registrados y gastos del negocio, en USD.",
                      mensajes:
                        "Consultas e interés recibidos desde tu tienda.",
                      ajustes:
                        "La información que conecta tu tienda con tus clientes.",
                    } as Record<string, string>
                  )[section]
                }
              </p>
            </div>
            <div className="inline">
              {section === "resumen" && (
                <button className="button" onClick={() => editProduct()}>
                  <Icon name="plus" />
                  Nuevo producto
                </button>
              )}
              {newActions[section] && (
                <button
                  className="button"
                  onClick={() =>
                    section === "productos"
                      ? editProduct()
                      : createRecord(section)
                  }
                >
                  <Icon name="plus" />
                  {newActions[section]}
                </button>
              )}
            </div>
          </div>
          <Notice message={error} error />
          {message && (
            <div className="notice dismissible" role="status">
              {message}
              <button aria-label="Cerrar aviso" onClick={() => setMessage("")}>
                ×
              </button>
            </div>
          )}
          {section === "resumen" && (
            <>
              <div className="stats">
                <Stat
                  label="Productos en catálogo"
                  value={data.products.length}
                  detail={`${data.products.filter((p) => p.published).length} visibles en la tienda`}
                  icon="box"
                />
                <Stat
                  label="Diseños en desarrollo"
                  value={
                    data.products.filter(
                      (p) =>
                        !["Disponible", "Descartado", "Pausado"].includes(
                          p.status,
                        ),
                    ).length
                  }
                  detail="Ideas que están tomando forma"
                  icon="sun"
                />
                <Stat
                  label="Pedidos por atender"
                  value={
                    data.orders.filter(
                      (o) => !["Entregado", "Cancelado"].includes(o.status),
                    ).length
                  }
                  detail="Del pedido a la entrega"
                  icon="bag"
                />
                <Stat
                  label="Cobros registrados"
                  value={money(revenue)}
                  detail="Pagos marcados como recibidos"
                  icon="chart"
                />
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Del boceto al Caribe</h2>
                      <p>Así avanza tu primera colección.</p>
                    </div>
                    <Link href="/admin/desarrollo">Ver proceso ↗</Link>
                  </div>
                  <div className="pipeline-summary">
                    {[
                      ["Ideas", statuses.slice(0, 2)],
                      ["Diseño", statuses.slice(2, 5)],
                      ["Prototipos", statuses.slice(5, 8)],
                      ["Producción", statuses.slice(8, 10)],
                      ["Disponibles", ["Disponible"]],
                    ].map(([label, states]) => {
                      const count = data.products.filter((p) =>
                        (states as string[]).includes(p.status),
                      ).length;
                      return (
                        <div key={label as string}>
                          <span>{label as string}</span>
                          <b>{count}</b>
                          <div className="bar">
                            <i
                              style={{
                                height:
                                  Math.max(
                                    5,
                                    (count /
                                      Math.max(data.products.length, 1)) *
                                      100,
                                  ) + "%",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="launch-panel">
                  <span className="eyebrow">PASO A PASO</span>
                  <h2>
                    Una marca
                    <br />
                    con <em>alma de isla.</em>
                  </h2>
                  <ul>
                    {[
                      [
                        data.products.length >= 10,
                        "Registrar los primeros 10 productos",
                      ],
                      [
                        data.prototypes.some((p) => p.status === "Aprobado"),
                        "Aprobar el primer prototipo",
                      ],
                      [
                        data.products.some(
                          (p) => p.status === "Disponible" && p.stock > 0,
                        ),
                        "Preparar el primer producto a la venta",
                      ],
                      [
                        !!data.settings.email,
                        "Configurar el contacto de la tienda",
                      ],
                    ].map(([done, label]) => (
                      <li key={String(label)}>
                        <span className={done ? "done" : ""}>
                          {done ? "✓" : "○"}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                  <Link href="/admin/ajustes" className="text-link">
                    Preparar mi tienda <Icon name="arrow" />
                  </Link>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Tus productos, en movimiento</h2>
                    <p>Los próximos recuerdos de Margarita.</p>
                  </div>
                  <Link href="/admin/productos">Ver todos ↗</Link>
                </div>
                <Table
                  headings={[
                    "Producto",
                    "Colección",
                    "Estado",
                    "Prioridad",
                    "",
                  ]}
                  rows={data.products.slice(0, 5).map((p) => [
                    <ProductCell p={p} key="p" />,
                    p.collection,
                    <Badge key="s">{p.status}</Badge>,
                    p.priority,
                    <button
                      key="b"
                      className="text-button"
                      onClick={() => editProduct(p)}
                    >
                      Editar ↗
                    </button>,
                  ])}
                />
              </section>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Últimos pedidos</h2>
                    <Link href="/admin/pedidos">Ver pedidos ↗</Link>
                  </div>
                  {data.orders.length ? (
                    <Table
                      headings={["Pedido", "Cliente", "Total", "Estado"]}
                      rows={data.orders.slice(0, 4).map((o) => [
                        <button
                          className="text-button"
                          onClick={() => setOrder(o)}
                          key="id"
                        >
                          {o.id}
                        </button>,
                        o.name,
                        money(o.total),
                        <Badge key="s">{o.status}</Badge>,
                      ])}
                    />
                  ) : (
                    <Empty
                      title="El próximo recuerdo empieza aquí"
                      description="Los pedidos de la tienda aparecerán en este espacio."
                    />
                  )}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Necesitan tu atención</h2>
                  </div>
                  <div className="attention">
                    <Link href="/admin/inventario">
                      <span>Productos disponibles con stock bajo</span>
                      <b>
                        {
                          data.products.filter(
                            (p) => p.status === "Disponible" && p.stock < 5,
                          ).length
                        }{" "}
                        →
                      </b>
                    </Link>
                    <Link href="/admin/mensajes">
                      <span>Consultas sin atender</span>
                      <b>
                        {
                          data.contacts.filter((c) => c.status === "Nuevo")
                            .length
                        }{" "}
                        →
                      </b>
                    </Link>
                    <Link href="/admin/pedidos">
                      <span>Pedidos cancelados por reembolsar</span>
                      <b>
                        {
                          data.orders.filter(
                            (o) =>
                              o.status === "Cancelado" &&
                              o.payment === "Pagado",
                          ).length
                        }{" "}
                        →
                      </b>
                    </Link>
                  </div>
                </section>
              </div>
            </>
          )}
          {[
            "productos",
            "pedidos",
            "inventario",
            "clientes",
            "proveedores",
            "cotizaciones",
            "prototipos",
            "finanzas",
            "mensajes",
          ].includes(section) && (
            <div className="admin-toolbar">
              <label className="search">
                <Icon name="search" />
                <input
                  aria-label={"Buscar en " + title}
                  placeholder={"Buscar en " + title.toLowerCase() + "…"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {["productos", "pedidos"].includes(section) && (
                <select
                  aria-label="Filtrar por estado"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {[
                    "Todos",
                    ...(section === "productos"
                      ? statuses
                      : [
                          "Pendiente",
                          "Confirmado",
                          "Preparando",
                          "Entregado",
                          "Cancelado",
                        ]),
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
              <span className="muted">Datos del negocio · USD</span>
            </div>
          )}
          {section === "productos" && (
            <section className="panel table-panel">
              <Table
                headings={[
                  "Producto",
                  "Colección",
                  "Estado",
                  "Precio",
                  "Stock",
                  "Web",
                  "",
                ]}
                rows={products.map((p) => [
                  <ProductCell p={p} key="p" />,
                  p.collection,
                  <Badge key="s">{p.status}</Badge>,
                  p.price ? money(p.price) : "Por definir",
                  p.stock,
                  p.published ? "Visible" : "Oculto",
                  <button
                    className="text-button"
                    key="edit"
                    onClick={() => editProduct(p)}
                  >
                    Editar ↗
                  </button>,
                ])}
              />
            </section>
          )}
          {section === "desarrollo" && (
            <>
              <p className="notice">
                La producción y la venta requieren un prototipo aprobado. Abre
                una tarjeta para completar su ficha y avanzar el estado.
              </p>
              <div className="kanban">
                {statuses
                  .filter(
                    (status) =>
                      data.products.some((p) => p.status === status) ||
                      [
                        "Idea",
                        "Diseñando",
                        "Diseño aprobado",
                        "Prototipo solicitado",
                        "Disponible",
                      ].includes(status),
                  )
                  .map((status) => (
                    <section className="kanban-column" key={status}>
                      <header>
                        <span>{status}</span>
                        <b>
                          {
                            data.products.filter((p) => p.status === status)
                              .length
                          }
                        </b>
                      </header>
                      {data.products
                        .filter((p) => p.status === status)
                        .map((p) => (
                          <button
                            className="kanban-card"
                            onClick={() => editProduct(p)}
                            key={p.id}
                          >
                            <Art product={p} />
                            <small>{p.code}</small>
                            <h3>{p.name}</h3>
                            <p>{p.collection}</p>
                            <Badge>{p.priority}</Badge>
                          </button>
                        ))}
                      {!data.products.some((p) => p.status === status) && (
                        <p className="kanban-empty">
                          El próximo paso empieza aquí.
                        </p>
                      )}
                    </section>
                  ))}
              </div>
            </>
          )}
          {section === "pedidos" && (
            <section className="panel table-panel">
              <Table
                headings={[
                  "Pedido",
                  "Cliente",
                  "Fecha",
                  "Total",
                  "Pago",
                  "Estado",
                  "",
                ]}
                rows={filteredOrders.map((o) => [
                  o.id,
                  <span key="n">
                    {o.name}
                    <small>{o.email}</small>
                  </span>,
                  dateText(o.createdAt),
                  money(o.total),
                  <Badge key="p">{o.payment}</Badge>,
                  <Badge key="s">{o.status}</Badge>,
                  <button
                    key="b"
                    className="text-button"
                    onClick={() => setOrder(o)}
                  >
                    Gestionar ↗
                  </button>,
                ])}
              />
            </section>
          )}
          {section === "inventario" && (
            <>
              <div className="stats three">
                <Stat
                  label="Unidades disponibles"
                  value={data.products.reduce((n, p) => n + p.stock, 0)}
                  detail="Descontadas las reservas"
                  icon="box"
                />
                <Stat
                  label="Valor del stock al costo"
                  value={money(
                    data.products.reduce((n, p) => n + p.stock * p.cost, 0),
                  )}
                  detail="Basado en costos unitarios registrados"
                  icon="chart"
                />
                <Stat
                  label="Productos con stock bajo"
                  value={
                    data.products.filter(
                      (p) => p.status === "Disponible" && p.stock < 5,
                    ).length
                  }
                  detail="Disponibles con menos de 5 unidades"
                  icon="sun"
                />
              </div>
              <section className="panel table-panel">
                <Table
                  headings={[
                    "Producto",
                    "Disponible",
                    "Precio de venta",
                    "Estado",
                    "",
                  ]}
                  rows={products.map((p) => [
                    <ProductCell p={p} key="p" />,
                    <b key="q" className={p.stock < 5 ? "low-stock" : ""}>
                      {p.stock} uds.
                    </b>,
                    money(p.price),
                    <Badge key="s">{p.status}</Badge>,
                    <button
                      key="b"
                      className="text-button"
                      onClick={() => adjust(p)}
                    >
                      Ajustar stock ↗
                    </button>,
                  ])}
                />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Historial de movimientos</h2>
                </div>
                <Table
                  headings={["Fecha", "Producto", "Unidades", "Motivo"]}
                  rows={data.movements
                    .filter(matches)
                    .map((m) => [
                      dateText(m.date),
                      data.products.find((p) => p.id === m.productId)?.name ||
                        m.productId,
                      (m.quantity > 0 ? "+" : "") + m.quantity,
                      m.reason,
                    ])}
                />
              </section>
            </>
          )}
          {section === "clientes" && (
            <section className="panel table-panel">
              <Table
                headings={[
                  "Cliente",
                  "Correo",
                  "Teléfono",
                  "Pedidos",
                  "Cobros recibidos",
                  "Último pedido",
                ]}
                rows={customers
                  .filter(matches)
                  .map((c) => [
                    c.name,
                    c.email,
                    c.phone,
                    c.count,
                    money(c.total),
                    dateText(c.date),
                  ])}
              />
            </section>
          )}
          {section === "proveedores" && (
            <section className="panel table-panel">
              <Table
                headings={["Proveedor", "País", "Contacto", "Notas", ""]}
                rows={data.suppliers.filter(matches).map((s) => [
                  <b key="n">{s.name}</b>,
                  s.country,
                  <span key="c">
                    {s.email}
                    <small>{s.phone}</small>
                  </span>,
                  s.notes,
                  <button
                    key="b"
                    className="text-button"
                    onClick={() => createRecord("proveedores", s)}
                  >
                    Editar ↗
                  </button>,
                ])}
              />
            </section>
          )}
          {section === "cotizaciones" && (
            <>
              <p className="notice">
                Costo total = unidades × costo unitario + molde + packaging +
                transporte. Todos los importes se registran en USD. Compara
                propuestas del mismo producto y cantidad.
              </p>
              <section className="panel table-panel">
                <Table
                  headings={[
                    "Producto / Proveedor",
                    "Unidades",
                    "Unitario",
                    "Molde",
                    "Packaging",
                    "Transporte",
                    "Total",
                    "Costo puesto / ud.",
                    "Plazo",
                    "",
                  ]}
                  rows={data.quotes
                    .filter(matches)
                    .sort(
                      (a, b) =>
                        a.productId.localeCompare(b.productId) ||
                        a.quantity - b.quantity ||
                        (a.unitCost * a.quantity +
                          a.mold +
                          a.packaging +
                          a.shipping) /
                          a.quantity -
                          (b.unitCost * b.quantity +
                            b.mold +
                            b.packaging +
                            b.shipping) /
                            b.quantity,
                    )
                    .map((q) => {
                      const total =
                        q.unitCost * q.quantity +
                        q.mold +
                        q.packaging +
                        q.shipping;
                      return [
                        <span key="p">
                          {
                            data.products.find((p) => p.id === q.productId)
                              ?.name
                          }
                          <small>
                            {
                              data.suppliers.find((s) => s.id === q.supplierId)
                                ?.name
                            }
                          </small>
                        </span>,
                        q.quantity,
                        money(q.unitCost),
                        money(q.mold),
                        money(q.packaging),
                        money(q.shipping),
                        money(total),
                        <b key="c">{money(total / q.quantity)}</b>,
                        q.days + " días",
                        <button
                          key="b"
                          className="text-button"
                          onClick={() => createRecord("cotizaciones", q)}
                        >
                          Editar
                        </button>,
                      ];
                    })}
                />
              </section>
            </>
          )}
          {section === "prototipos" && (
            <section className="panel table-panel">
              <Table
                headings={[
                  "Producto",
                  "Proveedor",
                  "Evaluación",
                  "Fecha",
                  "Notas",
                  "",
                ]}
                rows={data.prototypes.filter(matches).map((p) => [
                  data.products.find((x) => x.id === p.productId)?.name,
                  data.suppliers.find((s) => s.id === p.supplierId)?.name,
                  <Badge key="s">{p.status}</Badge>,
                  dateText(p.date),
                  p.notes,
                  <button
                    key="b"
                    className="text-button"
                    onClick={() => createRecord("prototipos", p)}
                  >
                    Revisar ↗
                  </button>,
                ])}
              />
            </section>
          )}
          {section === "finanzas" && (
            <>
              <div className="stats three">
                <Stat
                  label="Cobros registrados"
                  value={money(revenue)}
                  detail="Pedidos con pago recibido, sin reembolsados"
                  icon="chart"
                />
                <Stat
                  label="Gastos registrados"
                  value={money(expenses)}
                  detail="Todos los gastos cargados"
                  icon="box"
                />
                <Stat
                  label="Cobros menos gastos"
                  value={money(revenue - expenses)}
                  detail="Resumen de caja, no beneficio contable"
                  icon="chart"
                />
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Gastos del negocio</h2>
                </div>
                <Table
                  headings={["Fecha", "Concepto", "Categoría", "Importe", ""]}
                  rows={data.expenses.filter(matches).map((e) => [
                    dateText(e.date),
                    e.description,
                    e.category,
                    money(e.amount),
                    <button
                      key="b"
                      className="text-button"
                      onClick={() => createRecord("finanzas", e)}
                    >
                      Editar
                    </button>,
                  ])}
                />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Margen unitario de catálogo</h2>
                  <p>Antes de gastos generales y entrega.</p>
                </div>
                <Table
                  headings={[
                    "Producto",
                    "Costo registrado",
                    "Precio",
                    "Margen bruto",
                  ]}
                  rows={products
                    .filter((p) => p.price > 0)
                    .map((p) => [
                      p.name,
                      money(p.cost),
                      money(p.price),
                      p.cost > 0
                        ? `${money(p.price - p.cost)} · ${Math.round(((p.price - p.cost) / p.price) * 100)}%`
                        : "Falta registrar el costo",
                    ])}
                />
              </section>
            </>
          )}
          {section === "mensajes" && (
            <section className="message-list">
              {data.contacts.filter(matches).length ? (
                data.contacts.filter(matches).map((c) => (
                  <article className="panel message-card" key={c.id}>
                    <div className="panel-heading">
                      <div>
                        <h3>{c.name}</h3>
                        <a href={"mailto:" + c.email}>{c.email}</a>
                      </div>
                      <Badge>{c.status}</Badge>
                    </div>
                    <p>{c.message}</p>
                    <div className="message-actions">
                      <small>{dateText(c.createdAt)}</small>
                      <select
                        aria-label={"Estado de consulta de " + c.name}
                        value={c.status}
                        onChange={async (e) => {
                          try {
                            await save("contact-update", {
                              id: c.id,
                              status: e.target.value,
                            });
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        {["Nuevo", "En seguimiento", "Resuelto"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))
              ) : (
                <Empty
                  title="Una conversación por empezar"
                  description="Las consultas enviadas desde la tienda aparecerán aquí."
                />
              )}
            </section>
          )}
          {section === "ajustes" && (
            <div className="settings-layout">
              <section className="panel settings-panel">
                <h2>Información y operación de la tienda</h2>
                <RecordForm
                  values={{ ...data.settings }}
                  fields={[
                    field("email", "Correo de contacto", "email", false),
                    field(
                      "phone",
                      "WhatsApp con código de país",
                      "text",
                      false,
                    ),
                    field("instagram", "Enlace de Instagram", "url", false),
                    field("address", "Ubicación y punto de retiro"),
                    field("shipping", "Tarifa de envío · USD", "number"),
                    field(
                      "paymentInstructions",
                      "Instrucciones de pago manual",
                      "textarea",
                    ),
                    field(
                      "pickupEnabled",
                      "Habilitar retiro a coordinar",
                      "checkbox",
                      false,
                    ),
                    field(
                      "shippingEnabled",
                      "Habilitar envío con tarifa fija",
                      "checkbox",
                      false,
                    ),
                  ]}
                  onSave={(v) => save("settings", v)}
                />
              </section>
              <section className="panel settings-panel">
                <h2>Datos del negocio</h2>
                <p>
                  Descarga un archivo JSON con productos, clientes, pedidos y
                  registros operativos.
                </p>
                <a
                  href="/api/business/backup"
                  className="button secondary"
                  download
                >
                  Exportar registros ↗
                </a>
                <p className="muted">
                  Los archivos adjuntos se guardan en la base SQLite. Para un
                  respaldo completo, usa el comando de respaldo indicado en el
                  README.
                </p>
                <h3>Antes de abrir ventas</h3>
                <ul className="checklist">
                  <li>Completa tus datos de contacto y pago.</li>
                  <li>Aprueba los prototipos.</li>
                  <li>Carga fotos finales, precios y costos.</li>
                  <li>Registra existencias disponibles.</li>
                  <li>Define cómo coordinarás entregas.</li>
                </ul>
              </section>
            </div>
          )}
          <footer className="admin-footer">
            I love Margarita <span>Ideas con alma. Negocio con orden.</span>
          </footer>
        </div>
      </div>
      {editor && (
        <Modal title={editor.title} onClose={close}>
          <RecordForm
            fields={editor.fields}
            values={editor.values}
            onSave={(v) => save(editor.route, v)}
            onCancel={close}
          />
        </Modal>
      )}
      {order && (
        <Modal title={"Pedido " + order.id} onClose={closeOrder}>
          <div className="order-admin">
            <div className="order-customer">
              <h3>{order.name}</h3>
              <p>
                {order.email} · {order.phone}
              </p>
              <p>
                {order.delivery}
                {order.address ? " · " + order.address : ""}
              </p>
              {order.notes && <p className="notice">{order.notes}</p>}
            </div>
            {order.items.map((i, n) => (
              <div className="order-line" key={n}>
                <span>
                  {i.quantity} × {i.name}
                  <small>{i.customization}</small>
                </span>
                <b>{money(i.quantity * i.price)}</b>
              </div>
            ))}
            <div className="order-line">
              <span>Entrega</span>
              <b>{money(order.shipping)}</b>
            </div>
            <div className="order-line total">
              <span>Total</span>
              <b>{money(order.total)}</b>
            </div>
            <RecordForm
              fields={[
                field(
                  "payment",
                  "Pago",
                  "select",
                  true,
                  options(["Pendiente", "Pagado", "Reembolsado"]),
                ),
                field(
                  "status",
                  "Estado del pedido",
                  "select",
                  true,
                  options([
                    "Pendiente",
                    "Confirmado",
                    "Preparando",
                    "Entregado",
                    "Cancelado",
                  ]),
                ),
              ]}
              values={{
                id: order.id,
                payment: order.payment,
                status: order.status,
              }}
              onSave={(v) => save("order-update", v)}
            />
            <p className="muted">
              Marca «Pagado» solo después de verificar el ingreso. Cancelar
              devuelve las unidades al stock; registra «Reembolsado» cuando
              hayas devuelto el dinero.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Login({
  configured,
  onLogin,
}: {
  configured: boolean;
  onLogin: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="login-page">
      <div className="login-story">
        <Logo />
        <div>
          <span className="eyebrow">EL ESTUDIO DE LA MARCA</span>
          <h1>
            Grandes ideas.
            <br />
            <em>Alma de isla.</em>
          </h1>
          <p>
            Todo lo que necesitas para convertir el amor por Margarita en un
            negocio con identidad.
          </p>
          <Shell />
        </div>
        <small>LA PERLA DEL CARIBE · VENEZUELA</small>
      </div>
      <div className="login-form">
        <Link href="/" className="text-link">
          ← Volver a la tienda
        </Link>
        <span className="eyebrow">BIENVENIDO AL EQUIPO</span>
        <h2>
          Tu negocio
          <br />
          empieza aquí.
        </h2>
        <p>Inicia sesión para entrar al estudio.</p>
        {configured ? (
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(
                  "login",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                await onLogin();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Correo del administrador
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <Notice message={error} error />
            <button className="button wide" disabled={busy}>
              {busy ? "Entrando…" : "Entrar al estudio"} <Icon name="arrow" />
            </button>
          </form>
        ) : (
          <Notice
            error
            message="El administrador todavía no está configurado. Ejecuta npm run setup en el servidor y reinicia la aplicación."
          />
        )}
        <small className="muted">
          Acceso privado para la gestión de I love Margarita.
        </small>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
}) {
  return (
    <article className="stat">
      <div>
        <span>{label}</span>
        <Icon name={icon} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function ProductCell({ p }: { p: Product }) {
  return (
    <div className="product-cell">
      <Art product={p} />
      <span>
        <b>{p.name}</b>
        <small>{p.code}</small>
      </span>
    </div>
  );
}
function Table({
  headings,
  rows,
}: {
  headings: string[];
  rows: ReactNode[][];
}) {
  return rows.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headings.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="Todavía no hay registros"
      description="Los nuevos registros aparecerán aquí. Si estás buscando, prueba otro término."
    />
  );
}
function RecordForm({
  fields,
  values,
  onSave,
  onCancel,
}: {
  fields: Field[];
  values: Values;
  onSave: (v: Values) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<Values>(values),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const update = (key: string, value: Values[string]) =>
    setForm((s) => ({ ...s, [key]: value }));
  async function upload(key: string, file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/business/upload", {
        method: "POST",
        body,
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      if (key === "gallery" && !value.mime.startsWith("image/"))
        throw new Error("La galería solo admite imágenes.");
      if (key === "image") {
        if (!value.mime.startsWith("image/"))
          throw new Error("La portada debe ser una imagen.");
        update(key, value.url);
      } else
        setForm((s) => ({
          ...s,
          [key]: [...((s[key] as string[]) || []), value.url],
        }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      className="form record-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          await onSave(form);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {fields.map((f) => (
          <label
            key={f.key}
            className={
              ["textarea", "checkbox", "files", "image", "gallery"].includes(
                f.type || "",
              )
                ? "span-two " + (f.type === "checkbox" ? "checkbox" : "")
                : ""
            }
          >
            {f.type !== "checkbox" && f.label}
            {f.type === "select" ? (
              <select
                value={String(form[f.key] ?? "")}
                required={f.required}
                onChange={(e) => update(f.key, e.target.value)}
              >
                {!f.options?.length && (
                  <option value="">
                    Primero registra un producto y proveedor
                  </option>
                )}
                {f.options?.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                rows={3}
                value={String(form[f.key] ?? "")}
                required={f.required}
                maxLength={3000}
                onChange={(e) => update(f.key, e.target.value)}
              />
            ) : f.type === "checkbox" ? (
              <>
                <input
                  type="checkbox"
                  checked={form[f.key] === true}
                  onChange={(e) => update(f.key, e.target.checked)}
                />
                {f.label}
              </>
            ) : ["image", "files", "gallery"].includes(f.type || "") ? (
              <div className="upload-area">
                <input
                  aria-label={f.label}
                  type="file"
                  accept={
                    f.type !== "files"
                      ? "image/png,image/jpeg,image/webp"
                      : "image/png,image/jpeg,image/webp,application/pdf"
                  }
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(f.key, file);
                    e.target.value = "";
                  }}
                />
                {f.type === "image" && form[f.key] && (
                  <div className="upload-preview">
                    <Image
                      unoptimized
                      width={80}
                      height={80}
                      src={String(form[f.key])}
                      alt="Portada"
                    />
                    <button type="button" onClick={() => update(f.key, "")}>
                      Quitar imagen
                    </button>
                  </div>
                )}
                {["files", "gallery"].includes(f.type || "") &&
                  ((form[f.key] as string[]) || []).map((url, i) => (
                    <div className="attached-file" key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        Archivo {i + 1} ↗
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            f.key,
                            (form[f.key] as string[]).filter((u) => u !== url),
                          )
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                <small>
                  {uploading
                    ? "Subiendo archivo…"
                    : "PNG, JPG, WebP o PDF · Hasta 5 MB"}
                </small>
              </div>
            ) : (
              <input
                value={String(form[f.key] ?? "")}
                type={f.type === "signed" ? "number" : f.type || "text"}
                step={
                  f.type === "number"
                    ? "0.01"
                    : f.type === "signed"
                      ? "1"
                      : undefined
                }
                min={f.type === "number" ? 0 : undefined}
                required={f.required}
                maxLength={500}
                onChange={(e) =>
                  update(
                    f.key,
                    ["number", "signed"].includes(f.type || "")
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
              />
            )}{" "}
            {f.hint && <small>{f.hint}</small>}
          </label>
        ))}
      </div>
      <Notice message={error} error />
      <div className="form-actions">
        {onCancel && (
          <button className="button secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="button" disabled={busy || uploading}>
          {busy ? "Guardando…" : "Guardar cambios"} <Icon name="check" />
        </button>
      </div>
    </form>
  );
}
