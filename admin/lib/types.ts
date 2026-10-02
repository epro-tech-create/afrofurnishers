export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

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

export interface Order {
  id: string;
  items: OrderItem[];
  customer: { name: string; phone: string; address: string; area: string; notes?: string };
  payment: 'mpesa' | 'cod';
  mpesaPhone?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'pending-mpesa' | 'paid';
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorsStats {
  total: number;
  today: number;
  unique7d: number;
  byDay: { date: string; views: number; unique: number }[];
  topPages: { path: string; views: number }[];
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

export interface CustomerRow {
  name: string;
  phone: string;
  area: string;
  orders: number;
  spent: number;
  lastOrder: string;
}
