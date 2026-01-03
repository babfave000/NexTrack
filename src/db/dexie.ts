// src/db/dexie.ts
import Dexie, { type Table } from 'dexie';

// --- Enum Types ---
export type OrderStatus = 'draft' | 'approved' | 'fulfilled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type UserRole = 'admin' | 'manager' | 'user';
export type ChangeLeftStatus = 'uncollected' | 'collected';

// --- Models ---
export interface User {
  id?: number;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id?: number;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Organization {
  id?: number;
  name: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserOrganization {
  id?: number;
  userId: number;
  organizationId: number;
  role: UserRole;
  joinedAt: Date;
}

export interface Product {
  category: string;
  id?: number;
  name: string;
  description?: string;
  sku?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  brand?: string;
  supplier?: string;
  lowStockThreshold: number;
  userId: number;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesOrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  price: number;
  total: number;
}

export interface SalesOrder {
  id?: number;
  customer: string;
  date: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  items: SalesOrderItem[];
  total: number;
  createdAt?: string;
  updatedAt?: string;
  userId: number;
  organizationId?: number;
}

export interface PurchaseOrderItem {
  productId: number;
  quantity: number;
  price: number;
  total: number;
}

export interface PurchaseOrder {
  id?: number;
  supplier: string;
  date: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: PurchaseOrderItem[];
  total: number;
  createdAt?: string;
  updatedAt?: string;
  userId: number;
  organizationId?: number;
}

export interface Invoice {
  id?: number;
  relatedOrderId: number;
  type: 'sale' | 'purchase';
  date: string;
  amount: number;
  printed?: boolean;
  emailed?: boolean;
  userId: number;
  organizationId?: number;
}

export interface InventoryHistory {
  id?: number;
  productId: number;
  change: number;
  reason: 'sale' | 'purchase' | 'manual_adjustment';
  date: string;
  note?: string;
  name: string;
  price?: number;
  userId: number;
  organizationId?: number;
}

export interface Category {
  id?: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  userId: number;
  organizationId?: number;
}

export interface Brand {
  id?: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  userId: number;
  organizationId?: number;
}

export interface Supplier {
  id?: number;
  name: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  organizationId?: number;
}

export interface UserProfile {
  id: string;
  businessName: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  socialLinks?: string;
  logoUrl?: string;
  lowStockThreshold: number;
  showLowStockWarnings: boolean;
  autoBackupFrequency: number;
  createdAt?: string;
  updatedAt?: string;
  userId: number;
  organizationId?: number;
}

export interface Setting {
  key: string;
  value: string;
  userId: number;
  organizationId?: number;
}

export interface ChangeLeft {
  id?: number;
  orderId: number;
  customerName: string;
  amount: number;
  status: ChangeLeftStatus;
  createdAt: string;
  collectedAt?: string;
  userId: number;
  organizationId?: number;
}

// --- Dexie DB Class ---
class NexTrackDB extends Dexie {
  users!: Table<User, number>;
  sessions!: Table<Session, number>;
  organizations!: Table<Organization, number>;
  userOrganizations!: Table<UserOrganization, number>;
  products!: Table<Product, number>;
  salesOrders!: Table<SalesOrder, number>;
  purchaseOrders!: Table<PurchaseOrder, number>;
  invoices!: Table<Invoice, number>;
  inventoryHistory!: Table<InventoryHistory, number>;
  categories!: Table<Category, number>;
  brands!: Table<Brand, number>;
  suppliers!: Table<Supplier, number>;
  userProfile!: Table<UserProfile, string>;
  settings!: Table<Setting, string>;
  changeLeft!: Table<ChangeLeft, number>;

  constructor() {
    super('NexTrackDB', {
      autoOpen: true
    });

    // Version 1 - Initial schema with proper indexes
    this.version(1).stores({
      users: '++id, &email, createdAt',
      sessions: '++id, userId, token, expiresAt',
      products: '++id, name, category, brand, supplier',
      salesOrders: '++id, customer, date, status, paymentStatus',
      purchaseOrders: '++id, supplier, date, status, paymentStatus',
      invoices: '++id, relatedOrderId, type, date',
      inventoryHistory: '++id, productId, date, reason',
      categories: '++id, name',
      brands: '++id, name',
      suppliers: '++id, name',
      userProfile: 'id',
      settings: '&key, value',
    });

    // Version 2 - Add multi-tenant fields
    this.version(2).stores({
      users: '++id, &email, createdAt',
      sessions: '++id, userId, token, expiresAt',
      organizations: '++id, name, ownerId, createdAt',
      userOrganizations: '++id, userId, organizationId, role',
      products: '++id, name, category, brand, supplier, userId, organizationId',
      salesOrders: '++id, customer, date, status, paymentStatus, userId, organizationId',
      purchaseOrders: '++id, supplier, date, status, paymentStatus, userId, organizationId',
      invoices: '++id, relatedOrderId, type, date, userId, organizationId',
      inventoryHistory: '++id, productId, date, reason, userId, organizationId',
      categories: '++id, name, userId, organizationId',
      brands: '++id, name, userId, organizationId',
      suppliers: '++id, name, userId, organizationId',
      userProfile: 'id, userId, organizationId',
      settings: '&key, value, userId, organizationId',
    }).upgrade(trans => {
      // Add default userId (1) to existing records
      return Promise.all([
        trans.table('products').toCollection().modify(product => {
          product.userId = 1;
        }),
        trans.table('salesOrders').toCollection().modify(order => {
          order.userId = 1;
        }),
        trans.table('purchaseOrders').toCollection().modify(order => {
          order.userId = 1;
        }),
        trans.table('invoices').toCollection().modify(invoice => {
          invoice.userId = 1;
        }),
        trans.table('inventoryHistory').toCollection().modify(history => {
          history.userId = 1;
        }),
        trans.table('categories').toCollection().modify(category => {
          category.userId = 1;
        }),
        trans.table('brands').toCollection().modify(brand => {
          brand.userId = 1;
        }),
        trans.table('suppliers').toCollection().modify(supplier => {
          supplier.userId = 1;
          supplier.createdAt = supplier.createdAt || new Date().toISOString();
          supplier.updatedAt = supplier.updatedAt || new Date().toISOString();
        }),
        trans.table('userProfile').toCollection().modify(profile => {
          profile.userId = 1;
        }),
        trans.table('settings').toCollection().modify(setting => {
          setting.userId = 1;
        })
      ]);
    });

    // Version 3 - Update Product schema to remove category and add new fields
    this.version(3).stores({
      users: '++id, &email, createdAt',
      sessions: '++id, userId, token, expiresAt',
      organizations: '++id, name, ownerId, createdAt',
      userOrganizations: '++id, userId, organizationId, role',
      products: '++id, name, sku, brand, supplier, userId, organizationId',
      salesOrders: '++id, customer, date, status, paymentStatus, userId, organizationId',
      purchaseOrders: '++id, supplier, date, status, paymentStatus, userId, organizationId',
      invoices: '++id, relatedOrderId, type, date, userId, organizationId',
      inventoryHistory: '++id, productId, date, reason, userId, organizationId',
      categories: '++id, name, userId, organizationId',
      brands: '++id, name, userId, organizationId',
      suppliers: '++id, name, userId, organizationId',
      userProfile: 'id, userId, organizationId',
      settings: '&key, value, userId, organizationId',
    }).upgrade(trans => {
      // Migrate existing products to new schema
      return trans.table('products').toCollection().modify(product => {
        // Add new fields with default values
        product.description = product.description || '';
        product.sku = product.sku || '';
        product.lowStockThreshold = product.lowStockThreshold || 5;
        // Remove category field (it will be ignored in the new schema)
        delete product.category;
      });
    });

    // Version 4 - Add Change Left table
    this.version(4).stores({
      users: '++id, &email, createdAt',
      sessions: '++id, userId, token, expiresAt',
      organizations: '++id, name, ownerId, createdAt',
      userOrganizations: '++id, userId, organizationId, role',
      products: '++id, name, sku, brand, supplier, userId, organizationId',
      salesOrders: '++id, customer, date, status, paymentStatus, userId, organizationId',
      purchaseOrders: '++id, supplier, date, status, paymentStatus, userId, organizationId',
      invoices: '++id, relatedOrderId, type, date, userId, organizationId',
      inventoryHistory: '++id, productId, date, reason, userId, organizationId',
      categories: '++id, name, userId, organizationId',
      brands: '++id, name, userId, organizationId',
      suppliers: '++id, name, userId, organizationId',
      userProfile: 'id, userId, organizationId',
      settings: '&key, value, userId, organizationId',
      changeLeft: '++id, orderId, customerName, status, createdAt, userId, organizationId',
    });

    // Version 5 - Add missing fields to UserProfile
    this.version(5).stores({
      users: '++id, &email, createdAt',
      sessions: '++id, userId, token, expiresAt',
      organizations: '++id, name, ownerId, createdAt',
      userOrganizations: '++id, userId, organizationId, role',
      products: '++id, name, sku, brand, supplier, userId, organizationId',
      salesOrders: '++id, customer, date, status, paymentStatus, userId, organizationId',
      purchaseOrders: '++id, supplier, date, status, paymentStatus, userId, organizationId',
      invoices: '++id, relatedOrderId, type, date, userId, organizationId',
      inventoryHistory: '++id, productId, date, reason, userId, organizationId',
      categories: '++id, name, userId, organizationId',
      brands: '++id, name, userId, organizationId',
      suppliers: '++id, name, userId, organizationId',
      userProfile: 'id, userId, organizationId',
      settings: '&key, value, userId, organizationId',
      changeLeft: '++id, orderId, customerName, status, createdAt, userId, organizationId',
    }).upgrade(trans => {
      // Add default values for new UserProfile fields
      return trans.table('userProfile').toCollection().modify(profile => {
        profile.showLowStockWarnings = profile.showLowStockWarnings !== undefined ? profile.showLowStockWarnings : true;
        profile.autoBackupFrequency = profile.autoBackupFrequency || 7;
        profile.lowStockThreshold = profile.lowStockThreshold || 5;
      });
    });

    // Version 6 - Add address field to suppliers and ensure required timestamp fields
    this.version(6).stores({
      users: '++id, &email, createdAt',
      sessions: '++id, userId, token, expiresAt',
      organizations: '++id, name, ownerId, createdAt',
      userOrganizations: '++id, userId, organizationId, role',
      products: '++id, name, sku, brand, supplier, userId, organizationId',
      salesOrders: '++id, customer, date, status, paymentStatus, userId, organizationId',
      purchaseOrders: '++id, supplier, date, status, paymentStatus, userId, organizationId',
      invoices: '++id, relatedOrderId, type, date, userId, organizationId',
      inventoryHistory: '++id, productId, date, reason, userId, organizationId',
      categories: '++id, name, userId, organizationId',
      brands: '++id, name, userId, organizationId',
      suppliers: '++id, name, userId, organizationId',
      userProfile: 'id, userId, organizationId',
      settings: '&key, value, userId, organizationId',
      changeLeft: '++id, orderId, customerName, status, createdAt, userId, organizationId',
    }).upgrade(trans => {
      // Add address field to existing suppliers and ensure timestamps
      return trans.table('suppliers').toCollection().modify(supplier => {
        supplier.address = supplier.address || '';
        supplier.createdAt = supplier.createdAt || new Date().toISOString();
        supplier.updatedAt = supplier.updatedAt || new Date().toISOString();
      });
    });
  }

  async ensureOpen() {
    if (!this.isOpen()) {
      await this.open();
    }
    return this;
  }
}

export const db = new NexTrackDB();