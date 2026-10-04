export type PaymentMethod = 'cod' | 'shop';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';

export interface ProductFull {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  material: string;
  dimensions: string;
  color: string;
  stock: number;
  description: string;
  featured?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  area: string;
  notes?: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
}

/** A person the workshop keeps on the customer list. Orders are matched by phone. */
export interface ShopContact {
  id: string;
  name: string;
  phone: string;
  area: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  area: string;
  address: string;
  notes: string;
  orders: number;
  spent: number;
  lastOrder: string;
}

export interface AdminProfile {
  name: string;
  phone: string;
  role: string;
  email: string;
  photo: string;
}

/** Safe to send to the browser. Never includes the password hash. */
export interface PublicCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  items: OrderItem[];
  customer: OrderCustomer;
  payment: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source: 'website' | 'whatsapp' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  revenue: number;
  revenueToday: number;
  orders: number;
  ordersToday: number;
  pendingOrders: number;
  customers: number;
  lowStock: number;
  avgOrderValue: number;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: { id: string; name: string; qty: number; revenue: number }[];
  recentOrders: Order[];
  lowStockProducts: { id: string; name: string; stock: number }[];
  visitors: VisitorsStats;
}

export interface Visit {
  id: string;
  visitorId: string;
  path: string;
  referrer?: string;
  ip?: string;
  createdAt: string;
}

export interface VisitorsStats {
  total: number;
  today: number;
  unique7d: number;
  byDay: { date: string; views: number; unique: number }[];
  topPages: { path: string; views: number }[];
}

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'];

export const DELIVERY_FEES: Record<string, number> = {
  Kinondoni: 15000,
  Ilala: 15000,
  Temeke: 18000,
  Ubungo: 15000,
  Kigamboni: 25000,
  'Elsewhere in Tanzania': 35000,
};

export function deliveryFeeFor(area: string): number {
  return DELIVERY_FEES[area] ?? 20000;
}
