export const collections = [
  "La Perla",
  "Caribbean Vibes",
  "Margarita Memories",
  "Venezuela en el Corazón",
  "Kids of Margarita",
];
export const statuses = [
  "Idea",
  "Diseñando",
  "Diseño aprobado",
  "Ficha técnica",
  "Cotizando",
  "Prototipo solicitado",
  "Prototipo recibido",
  "Requiere cambios",
  "Producción autorizada",
  "En producción",
  "Disponible",
  "Pausado",
  "Descartado",
];
export type Product = {
  id: string;
  code: string;
  name: string;
  collection: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  published: boolean;
  stock: number;
  price: number;
  cost: number;
  material: string;
  dimensions: string;
  finish: string;
  packaging: string;
  notes: string;
  image: string;
  gallery: string[];
  files: string[];
  updatedAt: string;
};
export type Supplier = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  notes: string;
};
export type Quote = {
  id: string;
  supplierId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  mold: number;
  packaging: number;
  shipping: number;
  days: number;
  notes: string;
};
export type Prototype = {
  id: string;
  productId: string;
  supplierId: string;
  status: string;
  notes: string;
  date: string;
};
export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
};
export type Order = {
  id: string;
  token: string;
  requestId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  delivery: string;
  notes: string;
  items: {
    productId: string;
    name: string;
    code: string;
    quantity: number;
    price: number;
    customization: string;
  }[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  payment: string;
  createdAt: string;
};
export type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
};
export type Movement = {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  date: string;
};
export type Settings = {
  email: string;
  phone: string;
  instagram: string;
  address: string;
  shipping: number;
  paymentInstructions: string;
  pickupEnabled: boolean;
  shippingEnabled: boolean;
};
export type Business = {
  products: Product[];
  suppliers: Supplier[];
  quotes: Quote[];
  prototypes: Prototype[];
  expenses: Expense[];
  orders: Order[];
  contacts: Contact[];
  movements: Movement[];
  settings: Settings;
};
export type Catalog = { products: Product[]; settings: Settings };
export const money = (n: number) =>
  new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" }).format(
    n,
  );
export const initialProducts: Product[] = [
  ["ILM-KC-001", "Llavero Concha-Perla Premium", "La Perla", "Llaveros"],
  ["ILM-KC-002", "Llavero Classic", "La Perla", "Llaveros"],
  ["ILM-PN-001", "Pin Concha-Perla", "La Perla", "Accesorios"],
  ["ILM-MG-001", "Imán I love Margarita", "Margarita Memories", "Recuerdos"],
  ["ILM-BR-001", "Pulsera Concha-Perla", "La Perla", "Joyería"],
  ["ILM-NK-001", "Collar Perla del Caribe", "La Perla", "Joyería"],
  ["ILM-TS-001", "Franela Classic", "Caribbean Vibes", "Textiles"],
  ["ILM-CP-001", "Gorra Margarita", "Caribbean Vibes", "Textiles"],
  ["ILM-TB-001", "Tote Bag Margarita", "Caribbean Vibes", "Textiles"],
  [
    "ILM-MM-001",
    "Placa Margarita Memory",
    "Margarita Memories",
    "Personalizados",
  ],
].map(([code, name, collection, category], i) => ({
  id: code.toLowerCase(),
  code,
  name,
  collection,
  category,
  description:
    i === 0
      ? "Una concha en forma de corazón y una perla: el recuerdo de una isla que siempre vuelve contigo. Diseño en relieve con esmalte azul Caribe y acabado dorado."
      : "Un recuerdo de la isla, diseñado para acompañarte. Parte de nuestra primera colección, actualmente en desarrollo.",
  status: i === 0 ? "Diseño aprobado" : "Idea",
  priority: i < 4 ? "Alta" : "Media",
  published: true,
  stock: 0,
  price: 0,
  cost: 0,
  material: i === 0 ? "Aleación de zinc / Zamak" : "",
  dimensions: i === 0 ? "50 mm aprox." : "",
  finish: i === 0 ? "Dorado, esmalte azul Caribe y turquesa" : "",
  packaging: "",
  notes: "",
  image: "",
  gallery: [],
  files: [],
  updatedAt: new Date().toISOString(),
}));
export function seed(): Business {
  return {
    products: initialProducts,
    suppliers: [],
    quotes: [],
    prototypes: [],
    expenses: [],
    orders: [],
    contacts: [],
    movements: [],
    settings: {
      email: "",
      phone: "",
      instagram: "",
      address: "Isla de Margarita, Venezuela",
      shipping: 0,
      paymentInstructions:
        "Coordinaremos contigo los datos y la confirmación del pago. No realices transferencias hasta recibir las instrucciones del equipo.",
      pickupEnabled: true,
      shippingEnabled: false,
    },
  };
}
