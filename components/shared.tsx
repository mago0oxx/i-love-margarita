"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/lib/model";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    "/api/business/" + path,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error || "No se pudo completar la operación.");
  return value;
}
export function Shell({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M90 145C60 123 19 98 22 58C24 27 60 22 90 54C120 22 156 27 158 58C161 98 120 123 90 145Z"
        fill="currentColor"
      />
      <g stroke="#d9bb7d" strokeWidth="2" opacity=".9">
        <path d="M90 133L35 58M90 133L54 41M90 133L74 48M90 133V58M90 133L106 48M90 133L126 41M90 133L145 58" />
      </g>
      <circle cx="90" cy="113" r="22" fill="#e8d8b9" />
      <circle cx="86" cy="107" r="18" fill="#fff7e7" />
      <circle cx="81" cy="101" r="6" fill="white" />
    </svg>
  );
}
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="I love Margarita, inicio">
      <Shell />
      <span>
        I <span className="heart">♥</span> MARGARITA
        <small>LA PERLA DEL CARIBE</small>
      </span>
    </Link>
  );
}
export function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    box: (
      <>
        <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10v10M3 7l9 5 9-5M7 4l10 6v5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-3a7 7 0 0 1 14 0v3m0-18a4 4 0 0 1 0 8m3 3a6 6 0 0 1 3 5v2" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18M7 17v-5m5 5V7m5 10V3" />
      </>
    ),
    mail: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m3 5 9 8 9-8" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v3m0 16v3M1 12h3m16 0h3" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    check: <path d="m4 12 5 5L20 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    leaf: (
      <>
        <path d="M20 3C7 2 2 9 5 16c8 6 15-1 15-13Z" />
        <path d="M3 22 16 8" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.box}
    </svg>
  );
}
export function Art({
  product,
  large = false,
}: {
  product?: Product;
  large?: boolean;
}) {
  if (product?.image)
    return (
      <div className={`product-art photo ${large ? "large" : ""}`}>
        <Image
          unoptimized
          width={700}
          height={700}
          src={product.image}
          alt={product.name}
        />
      </div>
    );
  const textile = product?.category === "Textiles";
  return (
    <div
      className={`product-art ${large ? "large" : ""} tone-${product?.collection === "Caribbean Vibes" ? "sand" : product?.collection === "Margarita Memories" ? "rose" : "aqua"}`}
    >
      <div className="art-circle" />
      {textile ? (
        <div className="tote">
          <div className="tote-handle" />
          <Shell />
          <b>I ♥ MARGARITA</b>
          <small>UN PEDACITO DEL CARIBE</small>
        </div>
      ) : (
        <div className="keychain">
          <div className="key-ring" />
          <div className="key-link" />
          <Shell />
        </div>
      )}
      <span className="concept">ILUSTRACIÓN CONCEPTUAL</span>
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`badge ${["Disponible", "Pagado", "Entregado", "Aprobado", "Resuelto"].includes(String(children)) ? "positive" : ""}`}
    >
      {children}
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="sun" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <div
      role={error ? "alert" : "status"}
      className={`notice ${error ? "error" : ""}`}
    >
      {message}
    </div>
  ) : null;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        ) || [],
      );
    focusable()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = focusable();
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function ContactForm({ message = "" }: { message?: string }) {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="form contact-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setError("");
        try {
          await api("contact", Object.fromEntries(data));
          setResult(
            "Recibimos tu mensaje. El equipo lo revisará y podrá contactarte por correo.",
          );
          form.reset();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Tu nombre
        <input name="name" autoComplete="name" required maxLength={120} />
      </label>
      <label>
        Correo electrónico
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={200}
        />
      </label>
      <label>
        ¿Qué tienes en mente?
        <textarea
          name="message"
          rows={4}
          defaultValue={message}
          required
          maxLength={2000}
        />
      </label>
      <Notice message={result} />
      <Notice message={error} error />
      <button className="button" disabled={busy}>
        {busy ? "Enviando…" : "Enviar mensaje"} <Icon name="arrow" />
      </button>
      <small>Usaremos estos datos para atender tu consulta.</small>
    </form>
  );
}

export function ProductGallery({ product }: { product: Product }) {
  const [selected, setSelected] = useState("");
  const images = Array.from(
    new Set([product.image, ...(product.gallery || [])].filter(Boolean)),
  );
  return (
    <div>
      <Art product={{ ...product, image: selected || product.image }} large />
      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setSelected(src)}
              aria-label={"Ver foto " + (i + 1)}
              aria-pressed={(selected || product.image) === src}
            >
              <Image
                unoptimized
                src={src}
                width={80}
                height={80}
                alt={product.name + " · foto " + (i + 1)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
