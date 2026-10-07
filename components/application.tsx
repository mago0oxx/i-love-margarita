"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collections,
  money,
  type Catalog,
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
  ContactForm,
  ProductGallery,
} from "./shared";
import Admin from "./admin";
type CartItem = { productId: string; quantity: number; customization: string };
export default function Application({ path }: { path: string[] }) {
  return path[0] === "admin" ? (
    <Admin key={path.join("/")} section={path[1] || "resumen"} />
  ) : (
    <Store key={path.join("/")} path={path} />
  );
}
function Store({ path }: { path: string[] }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [cart, setCart] = useState<CartItem[]>([]),
    [ready, setReady] = useState(false),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
    api<Catalog>("catalog")
      .then((value) => {
        setCatalog(value);
        try {
          const stored = JSON.parse(localStorage.getItem("ilm-cart") || "[]");
          if (Array.isArray(stored))
            setCart(
              stored
                .filter(
                  (i) =>
                    typeof i.productId === "string" &&
                    Number.isInteger(i.quantity) &&
                    i.quantity > 0,
                )
                .slice(0, 50),
            );
        } catch {}
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("ilm-cart", JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const add = (product: Product, customization: string) => {
    if (
      cart
        .filter((i) => i.productId === product.id)
        .reduce((n, i) => n + i.quantity, 0) >= product.stock
    ) {
      setToast("Ya agregaste todas las unidades disponibles.");
      return;
    }
    setCart((previous) => {
      const existing = previous.find(
        (i) => i.productId === product.id && i.customization === customization,
      );
      return existing
        ? previous.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...previous, { productId: product.id, quantity: 1, customization }];
    });
    setToast("Añadido a tu bolsa.");
  };
  const page = path[0] || "inicio";
  return (
    <>
      <div className="announcement">
        HECHO DE ISLA, MAR Y RECUERDOS <span>✦</span> DESCUBRE NUESTRA PRIMERA
        COLECCIÓN
      </div>
      <header className="store-header">
        <Logo />
        <button
          className="mobile-toggle"
          aria-label="Abrir navegación"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          ☰
        </button>
        <nav className={menu ? "open" : ""}>
          {[
            ["/", "Inicio"],
            ["/catalogo", "Catálogo"],
            ["/colecciones", "Colecciones"],
            ["/nosotros", "Nuestra historia"],
          ].map(([href, label]) => (
            <Link
              className={
                (href === "/" ? page === "inicio" : href === "/" + page)
                  ? "active"
                  : ""
              }
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/carrito"
          className="bag-link"
          aria-label={`Bolsa, ${cart.reduce((n, i) => n + i.quantity, 0)} productos`}
        >
          <Icon name="bag" />
          <span>Bolsa</span>
          <b>{cart.reduce((n, i) => n + i.quantity, 0)}</b>
        </Link>
      </header>
      <main>
        <Notice message={error} error />
        {!catalog ? (
          <div className="loading">
            {error ? (
              <button
                className="button"
                onClick={() => window.location.reload()}
              >
                Volver a intentar
              </button>
            ) : (
              <>
                <Shell />
                Un momento, estamos preparando tu visita…
              </>
            )}
          </div>
        ) : page === "inicio" ? (
          <Home catalog={catalog} />
        ) : page === "catalogo" || page === "desarrollo" ? (
          <CatalogPage catalog={catalog} development={page === "desarrollo"} />
        ) : page === "colecciones" ? (
          <Collections />
        ) : page === "producto" ? (
          <ProductPage
            product={catalog.products.find((p) => p.id === path[1])}
            add={add}
          />
        ) : page === "carrito" ? (
          <Checkout catalog={catalog} cart={cart} setCart={setCart} />
        ) : page === "pedido" ? (
          <OrderPage id={path[1]} />
        ) : page === "contacto" ? (
          <section className="page-width contact-grid section">
            <div>
              <span className="eyebrow">HABLEMOS DE LA ISLA</span>
              <h1>
                Todo empieza
                <br />
                con un <em>hola.</em>
              </h1>
              <p>
                Un regalo especial, una idea para tu tienda o una pregunta sobre
                nuestras colecciones. Nos encantará leerte.
              </p>
              <div className="contact-details">
                <p>⌁ {catalog.settings.address}</p>
                {catalog.settings.email && (
                  <a href={"mailto:" + catalog.settings.email}>
                    {catalog.settings.email}
                  </a>
                )}
                {catalog.settings.phone && (
                  <a
                    href={
                      "https://wa.me/" +
                      catalog.settings.phone.replace(/\D/g, "")
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Escríbenos por WhatsApp ↗
                  </a>
                )}
              </div>
            </div>
            <ContactForm />
          </section>
        ) : (
          <About />
        )}
      </main>
      <section className="closing">
        <Shell />
        <span>
          Hay lugares que visitas.
          <br />
          <em>Y lugares que se quedan contigo.</em>
        </span>
        <Link href="/catalogo" className="button light">
          Llévate un pedacito <Icon name="arrow" />
        </Link>
      </section>
      <footer className="footer page-width">
        <div>
          <Logo />
          <p>
            Recuerdos con alma de isla.
            <br />
            Margarita, Venezuela.
          </p>
        </div>
        <div>
          <b>Explora</b>
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/colecciones">Colecciones</Link>
          <Link href="/desarrollo">Diseños en desarrollo</Link>
        </div>
        <div>
          <b>Conversemos</b>
          <Link href="/contacto">Contacto y pedidos especiales</Link>
          {catalog?.settings.instagram && (
            <a
              href={catalog.settings.instagram}
              target="_blank"
              rel="noreferrer"
            >
              Instagram ↗
            </a>
          )}
          <Link href="/nosotros">Nuestra historia</Link>
        </div>
        <div>
          <b>La marca, por dentro</b>
          <Link href="/admin">Acceso al equipo ↗</Link>
          <small>Diseñado con cariño por Margarita.</small>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} I love Margarita{" "}
          <span>La Perla del Caribe · Precios en USD</span>
        </div>
      </footer>
      {toast && (
        <div role="status" className="toast">
          <Icon name="check" />
          {toast}
          <Link href="/carrito">Ver bolsa →</Link>
        </div>
      )}
    </>
  );
}
function Home({ catalog }: { catalog: Catalog }) {
  return (
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-line" /> DESDE LA PERLA DEL CARIBE
          </span>
          <h1>
            Un pedacito
            <br />
            de isla.
            <br />
            <em>Siempre contigo.</em>
          </h1>
          <p>
            La brisa, la sal, ese azul que no se olvida.
            <br />
            Transformamos el amor por Margarita en recuerdos que puedes llevar a
            todas partes.
          </p>
          <div className="hero-actions">
            <Link href="/catalogo" className="button">
              Explorar la colección <Icon name="arrow" />
            </Link>
            <Link href="/nosotros" className="text-link">
              Nuestra historia ↗
            </Link>
          </div>
          <div className="hero-note">
            <span>✧</span> Diseños propios. Recuerdos que importan.
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-sky">
            <div className="sun-disc" />
            <div className="island island-one" />
            <div className="island island-two" />
            <div className="sea-line" />
            <span className="coordinates">10°59′ N &nbsp; 63°56′ O</span>
          </div>
          <div className="hero-object">
            <div className="key-ring" />
            <div className="key-link" />
            <Shell />
          </div>
          <div className="hero-tag">
            <span>01 / NUESTRA ESENCIA</span>
            <b>
              Un corazón de mar.
              <br />
              Una perla de recuerdo.
            </b>
            <small>Concepto de diseño · Colección La Perla</small>
          </div>
          <div className="round-stamp">
            MARGARITA
            <br />
            <span>✦</span>
            <br />
            VENEZUELA
          </div>
        </div>
      </section>
      <div className="brand-strip">
        <span>
          <Icon name="sun" /> Inspirado en Margarita
        </span>
        <span>
          <Icon name="leaf" /> Diseño con identidad
        </span>
        <span>
          <Shell /> Un regalo con significado
        </span>
        <span>
          <Icon name="box" /> Pequeños tesoros, grandes recuerdos
        </span>
      </div>
      <section className="page-width section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">RECUERDOS QUE NOS CONECTAN</span>
            <h2>
              Encuentra tu <em>pedacito.</em>
            </h2>
          </div>
          <Link href="/colecciones" className="text-link">
            Todas las colecciones <Icon name="arrow" />
          </Link>
        </div>
        <div className="collection-grid">
          {collections.slice(0, 3).map((c, i) => (
            <Link
              href={"/catalogo?coleccion=" + encodeURIComponent(c)}
              className={`collection-card collection-${i}`}
              key={c}
            >
              <span>0{i + 1} / COLECCIÓN</span>
              <div className="collection-symbol">
                {i === 0 ? (
                  <Shell />
                ) : i === 1 ? (
                  <span>☀</span>
                ) : (
                  <span>⌁</span>
                )}
              </div>
              <div>
                <h3>{c}</h3>
                <p>
                  {
                    [
                      "La belleza está en los detalles.",
                      "Lleva el Caribe a donde vayas.",
                      "Tu historia, hecha recuerdo.",
                    ][i]
                  }
                </p>
              </div>
              <span className="circle-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="page-width section featured">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NUESTRA PRIMERA COLECCIÓN</span>
            <h2>
              Diseñados para <em>quedarse.</em>
            </h2>
          </div>
          <Link href="/catalogo" className="text-link">
            Ver catálogo <Icon name="arrow" />
          </Link>
        </div>
        <div className="product-grid">
          {catalog.products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="story-section">
        <div className="story-art">
          <div className="story-sun" />
          <span>
            isla
            <br />
            <em>adentro.</em>
          </span>
          <div className="story-waves">⌁</div>
          <small>MAR CARIBE · VENEZUELA</small>
        </div>
        <div className="story-copy">
          <span className="eyebrow">MÁS QUE UN SOUVENIR</span>
          <h2>
            Hay recuerdos
            <br />
            que tienen <em>alma.</em>
          </h2>
          <p>
            Nacimos del amor por una isla que tiene mucho más que playas. Su
            gente, sus colores y su historia viven en cada diseño.
          </p>
          <p>
            La concha, el corazón y la perla son nuestra manera de decir:
            Margarita siempre va contigo.
          </p>
          <Link href="/nosotros" className="text-link">
            Conoce nuestra historia <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
function ProductCard({ product: p }: { product: Product }) {
  return (
    <Link href={"/producto/" + p.id} className="product-card">
      <Art product={p} />
      <div className="product-meta">
        <small>{p.collection}</small>
        <Badge>
          {p.status === "Disponible"
            ? p.stock
              ? "Disponible"
              : "Agotado"
            : "En desarrollo"}
        </Badge>
      </div>
      <h3>{p.name}</h3>
      <span className="product-price">
        {p.price > 0 ? money(p.price) : "Próximamente"} <span>↗</span>
      </span>
    </Link>
  );
}
function CatalogPage({
  catalog,
  development,
}: {
  catalog: Catalog;
  development: boolean;
}) {
  const [search, setSearch] = useState(""),
    [selectedCollection, setCollection] = useState<string | null>(null),
    [availability, setAvailability] = useState("Todos"),
    [sort, setSort] = useState("name");
  const params = useSearchParams();
  const fromUrl = params.get("coleccion");
  const collection =
    selectedCollection ||
    (fromUrl && collections.includes(fromUrl) ? fromUrl : "Todas");
  const products = catalog.products
    .filter(
      (p) =>
        (!development || p.status !== "Disponible") &&
        (collection === "Todas" || p.collection === collection) &&
        (availability === "Todos" ||
          (p.status === "Disponible" && p.stock > 0)) &&
        `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "price" ? a.price - b.price : a.name.localeCompare(b.name),
    );
  return (
    <section className="page-width section">
      <span className="eyebrow">DE MARGARITA PARA TI</span>
      <h1>
        {development ? "Ideas con" : "Pequeños tesoros,"}
        <br />
        <em>{development ? "alma de isla." : "grandes recuerdos."}</em>
      </h1>
      <p className="intro">
        {development
          ? "Conoce lo que estamos creando. Cada diseño empieza con una historia."
          : "Explora nuestras colecciones. Los diseños en desarrollo estarán a la venta después de validar sus prototipos."}
      </p>
      <div className="filters">
        <label className="search">
          <Icon name="search" />
          <input
            placeholder="Buscar un recuerdo…"
            aria-label="Buscar productos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Colección"
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
        >
          {["Todas", ...collections].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Disponibilidad"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option>Todos</option>
          <option>Disponibles</option>
        </select>
        <select
          aria-label="Ordenar"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Nombre A–Z</option>
          <option value="price">Menor precio</option>
        </select>
      </div>
      <p className="result-count">{products.length} recuerdos por descubrir</p>
      {products.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Todavía no hay productos aquí"
          description="Prueba otra colección o descubre nuestros diseños en desarrollo."
          action={
            <button
              className="button"
              onClick={() => {
                setCollection("Todas");
                setSearch("");
                setAvailability("Todos");
              }}
            >
              Ver todos
            </button>
          }
        />
      )}
    </section>
  );
}
function Collections() {
  return (
    <section className="page-width section">
      <span className="eyebrow">CINCO FORMAS DE SENTIR LA ISLA</span>
      <h1>
        Una isla.
        <br />
        <em>Muchas historias.</em>
      </h1>
      <div className="collection-grid all-collections">
        {collections.map((c, i) => (
          <Link
            key={c}
            href={"/catalogo?coleccion=" + encodeURIComponent(c)}
            className={`collection-card collection-${i % 3}`}
          >
            <span>0{i + 1} / COLECCIÓN</span>
            <div className="collection-symbol">
              {i % 2 ? <span>☀</span> : <Shell />}
            </div>
            <div>
              <h3>{c}</h3>
              <p>
                {
                  [
                    "Conchas, perlas y detalles que enamoran.",
                    "Color, playa y libertad.",
                    "Recuerdos con tu propia historia.",
                    "Nuestra tierra, siempre cerca.",
                    "La magia de descubrir la isla.",
                  ][i]
                }
              </p>
            </div>
            <span className="circle-arrow">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
function ProductPage({
  product: p,
  add,
}: {
  product?: Product;
  add: (p: Product, c: string) => void;
}) {
  const [custom, setCustom] = useState(""),
    [interest, setInterest] = useState(false);
  if (!p)
    return (
      <Empty
        title="No encontramos este recuerdo"
        description="Puede que todavía no esté publicado."
        action={
          <Link href="/catalogo" className="button">
            Volver al catálogo
          </Link>
        }
      />
    );
  const available = p.status === "Disponible" && p.stock > 0 && p.price > 0;
  return (
    <section className="page-width section">
      <Link href="/catalogo" className="text-link">
        ← Volver al catálogo
      </Link>
      <div className="product-detail">
        <ProductGallery product={p} />
        <div>
          <span className="eyebrow">
            {p.collection} / {p.code}
          </span>
          <h1>{p.name}</h1>
          <Badge>{p.status}</Badge>
          <p className="detail-price">
            {p.price ? money(p.price) : "Próximamente"}
          </p>
          <p>{p.description}</p>
          {available ? (
            <>
              <label className="form">
                Personalización o talla (si corresponde)
                <input
                  value={custom}
                  maxLength={200}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Nombre, fecha, talla o detalle especial"
                />
              </label>
              <button className="button wide" onClick={() => add(p, custom)}>
                Añadir a mi bolsa <Icon name="bag" />
              </button>
              <small>
                {p.stock} unidades disponibles · Pago manual por confirmar
              </small>
            </>
          ) : (
            <>
              <p className="notice">
                {p.status === "Disponible"
                  ? "Este producto está agotado."
                  : "Estamos dando vida a este diseño. Aún no está a la venta."}
              </p>
              <button
                className="button wide"
                onClick={() => setInterest(!interest)}
              >
                Me interesa este diseño <Icon name="arrow" />
              </button>
              {interest && (
                <ContactForm
                  message={
                    "Me interesa " +
                    p.name +
                    " (" +
                    p.code +
                    "). Me gustaría recibir más información."
                  }
                />
              )}
            </>
          )}
          <dl className="specs">
            {[
              ["Material", p.material],
              ["Medidas", p.dimensions],
              ["Acabado", p.finish],
              ["Packaging", p.packaging],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          <p className="muted">
            Las ilustraciones conceptuales muestran la dirección de diseño. Las
            fotografías finales se incorporarán al terminar los prototipos.
          </p>
        </div>
      </div>
    </section>
  );
}
function Checkout({
  catalog,
  cart,
  setCart,
}: {
  catalog: Catalog;
  cart: CartItem[];
  setCart: (c: CartItem[]) => void;
}) {
  const router = useRouter();
  const [delivery, setDelivery] = useState(
      catalog.settings.pickupEnabled ? "Retiro" : "Envío",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const rows = cart.map((i) => ({
    ...i,
    product: catalog.products.find((p) => p.id === i.productId),
  }));
  const subtotal = rows.reduce(
      (n, i) => n + (i.product?.price || 0) * i.quantity,
      0,
    ),
    shipping = delivery === "Envío" ? catalog.settings.shipping : 0;
  const invalid = rows.some(
    (i) =>
      !i.product ||
      i.product.status !== "Disponible" ||
      !i.product.price ||
      i.product.stock < i.quantity,
  );
  if (!cart.length)
    return (
      <Empty
        title="Tu bolsa espera un recuerdo"
        description="Encuentra ese pedacito de Margarita que quieres llevar contigo."
        action={
          <Link href="/catalogo" className="button">
            Explorar catálogo <Icon name="arrow" />
          </Link>
        }
      />
    );
  return (
    <section className="page-width section">
      <span className="eyebrow">UN RECUERDO ESTÁ POR VIAJAR CONTIGO</span>
      <h1>
        Tu <em>bolsa.</em>
      </h1>
      <div className="checkout-grid">
        <div>
          {rows.map((i, index) => (
            <div className="cart-row" key={index}>
              <Art product={i.product} />
              <div>
                <Link href={"/producto/" + i.productId}>
                  <h3>{i.product?.name || "Producto no disponible"}</h3>
                </Link>
                <small>{i.customization}</small>
                <p>{money(i.product?.price || 0)}</p>
                <div className="quantity">
                  <button
                    aria-label="Reducir cantidad"
                    onClick={() =>
                      setCart(
                        cart.flatMap((c, j) =>
                          j === index
                            ? c.quantity > 1
                              ? [{ ...c, quantity: c.quantity - 1 }]
                              : []
                            : [c],
                        ),
                      )
                    }
                  >
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label="Aumentar cantidad"
                    disabled={i.quantity >= (i.product?.stock || 0)}
                    onClick={() =>
                      setCart(
                        cart.map((c, j) =>
                          j === index ? { ...c, quantity: c.quantity + 1 } : c,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                  <button
                    className="remove"
                    onClick={() => setCart(cart.filter((_, j) => j !== index))}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Notice
            error
            message={
              invalid
                ? "Hay productos sin disponibilidad. Ajusta tu bolsa para continuar."
                : ""
            }
          />
        </div>
        <form
          className="checkout-panel form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (invalid) return;
            setBusy(true);
            setError("");
            const body = Object.fromEntries(new FormData(e.currentTarget));
            let requestId = sessionStorage.getItem("ilm-checkout-id");
            if (!requestId) {
              requestId = crypto.randomUUID();
              sessionStorage.setItem("ilm-checkout-id", requestId);
            }
            try {
              const result = await api<{ id: string; token: string }>(
                "orders",
                { ...body, delivery, items: cart, requestId },
              );
              setCart([]);
              localStorage.setItem("ilm-cart", "[]");
              sessionStorage.removeItem("ilm-checkout-id");
              localStorage.setItem("ilm-order-" + result.id, result.token);
              router.push("/pedido/" + result.id + "?token=" + result.token);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Completa tu pedido</h2>
          <label>
            Nombre completo
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <div className="form-grid">
            <label>
              Correo
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Teléfono / WhatsApp
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={40}
              />
            </label>
          </div>
          <label>
            Entrega
            <select
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
            >
              {catalog.settings.pickupEnabled && <option>Retiro</option>}
              {catalog.settings.shippingEnabled && <option>Envío</option>}
            </select>
          </label>
          {delivery === "Envío" ? (
            <label>
              Dirección de entrega
              <textarea
                name="address"
                autoComplete="street-address"
                required
                maxLength={600}
              />
            </label>
          ) : (
            <p className="muted">
              Retiro a coordinar: {catalog.settings.address}
            </p>
          )}
          <label>
            Notas del pedido
            <textarea name="notes" maxLength={1000} />
          </label>
          <div className="totals">
            <p>
              Productos <b>{money(subtotal)}</b>
            </p>
            <p>
              Entrega <b>{money(shipping)}</b>
            </p>
            <p className="total">
              Total <b>{money(subtotal + shipping)}</b>
            </p>
          </div>
          <p className="notice">{catalog.settings.paymentInstructions}</p>
          <label className="checkbox">
            <input type="checkbox" required />
            Acepto que me contacten para gestionar el pedido y confirmar el
            pago.
          </label>
          <Notice message={error} error />
          <button className="button wide" disabled={busy || invalid}>
            {busy ? "Guardando pedido…" : "Confirmar pedido"}{" "}
            <Icon name="arrow" />
          </button>
          <small>
            No se realiza ningún cobro online. Conserva el enlace de seguimiento
            de tu pedido.
          </small>
        </form>
      </div>
    </section>
  );
}
function OrderPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const token =
      new URLSearchParams(window.location.search).get("token") ||
      localStorage.getItem("ilm-order-" + id);
    if (!token) return;
    api<Order>("orders/" + id + "?token=" + encodeURIComponent(token))
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <section className="page-width section order-confirmation">
      <span className="eyebrow">TU PEDACITO DE ISLA</span>
      <h1>{order ? "Pedido recibido." : "Tu pedido."}</h1>
      <Notice message={error} error />
      {!order && !error && (
        <p>
          Abriendo el pedido. Necesitas su enlace privado de seguimiento para
          consultarlo.
        </p>
      )}
      {order && (
        <div className="panel">
          <span className="success-icon">
            <Icon name="check" />
          </span>
          <h2>{order.id}</h2>
          <p>
            Gracias, {order.name}. Conserva esta página para consultar tu
            pedido.
          </p>
          <div className="inline">
            <Badge>{order.status}</Badge>
            <Badge>{"Pago: " + order.payment}</Badge>
          </div>
          {order.items.map((i, n) => (
            <div className="order-line" key={n}>
              <span>
                {i.quantity} × {i.name}
                {i.customization && <small>{i.customization}</small>}
              </span>
              <b>{money(i.price * i.quantity)}</b>
            </div>
          ))}
          <div className="order-line">
            <span>Entrega · {order.delivery}</span>
            <b>{money(order.shipping)}</b>
          </div>
          <div className="order-line total">
            <span>Total</span>
            <b>{money(order.total)}</b>
          </div>
          <p className="notice">
            {order.status === "Cancelado"
              ? "El pedido fue cancelado. Si pagaste, contacta al equipo para coordinar el reembolso."
              : order.payment === "Pagado"
                ? "Tu pago está confirmado."
                : "El pago está pendiente de confirmación por el equipo."}
          </p>
          <Link href="/contacto" className="button">
            Contactar al equipo
          </Link>
          <button className="button secondary" onClick={() => window.print()}>
            Imprimir comprobante
          </button>
        </div>
      )}
    </section>
  );
}
function About() {
  return (
    <section className="page-width section about">
      <span className="eyebrow">NUESTRA HISTORIA</span>
      <h1>
        Amor por la isla.
        <br />
        <em>Diseño para llevar.</em>
      </h1>
      <div className="about-emblem">
        <Shell />
        <span>LA PERLA DEL CARIBE</span>
      </div>
      <p className="lead">
        Margarita no es solo un destino. Es una luz, un ritmo y una forma de
        sentir el mar.
      </p>
      <p>
        I love Margarita nace para convertir esa conexión en objetos que
        acompañan. Creamos souvenirs, regalos y productos inspirados en la
        cultura caribeña, con diseño propio y una identidad que habla de nuestra
        isla.
      </p>
      <div className="values">
        <article>
          <span>01</span>
          <h3>Una concha.</h3>
          <p>
            La identidad marina, el azul del Caribe y el abrazo de nuestra
            costa.
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>Un corazón.</h3>
          <p>El amor por Margarita y la emoción de un recuerdo compartido.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Una perla.</h3>
          <p>La historia de la isla y la belleza de los pequeños detalles.</p>
        </article>
      </div>
      <h2>
        Diseñar. Probar. <em>Crear con sentido.</em>
      </h2>
      <p>
        Cada producto recorre un camino: idea, diseño, ficha técnica, prototipo
        y producción. Validamos antes de fabricar y empezamos con pequeñas
        cantidades. Queremos que cada pieza merezca su lugar en tu historia.
      </p>
      <Link href="/desarrollo" className="button">
        Descubre lo que estamos creando <Icon name="arrow" />
      </Link>
    </section>
  );
}
