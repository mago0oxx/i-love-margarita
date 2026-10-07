import { Suspense } from "react";
import Application from "@/components/application";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  if (
    ![
      "catalogo",
      "colecciones",
      "producto",
      "desarrollo",
      "nosotros",
      "contacto",
      "carrito",
      "pedido",
      "admin",
    ].includes(slug[0])
  )
    notFound();
  return (
    <Suspense fallback={<div className="loading">Preparando tu visita…</div>}>
      <Application path={slug} />
    </Suspense>
  );
}
