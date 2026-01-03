// src/db/operations/inventory.ts
import { db } from '../dexie';
import type { InventoryHistory } from '../dexie'
import { getLowStockProducts } from './products';

interface StockMovementRecord {
  productId: number;
  productName: string;
  totalIn: number;
  totalOut: number;
  netChange: number;
}

/**
 * Get inventory history for a user
 */
export async function getInventoryHistory(userId: number, limit?: number): Promise<InventoryHistory[]> {
  const history = await db.inventoryHistory
    .where('userId')
    .equals(userId)
    .reverse()
    .sortBy('date');

  if (limit) {
    return history.slice(0, limit);
  }

  return history;
}

/**
 * Add inventory history record
 */
export async function addInventoryHistory(history: Omit<InventoryHistory, 'id'>): Promise<number> {
  return await db.inventoryHistory.add(history as InventoryHistory);
}

/**
 * Update stock level for a product
 */
export async function updateStockLevel(productId: number, newStock: number, userId: number): Promise<void> {
  const product = await db.products.get(productId);
  if (!product || product.userId !== userId) {
    throw new Error('Product not found or access denied');
  }

  await db.products.update(productId, {
    stock: newStock,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get current stock level for a product
 */
export async function getStockLevel(productId: number, userId: number): Promise<number> {
  const product = await db.products.get(productId);
  if (!product || product.userId !== userId) {
    throw new Error('Product not found or access denied');
  }
  return product.stock;
}

/**
 * Adjust product stock manually
 */
export async function adjustStock(
  productId: number, 
  adjustment: number, 
  reason: string, 
  userId: number
): Promise<number> {
  const product = await db.products.get(productId);
  if (!product || product.userId !== userId) {
    throw new Error('Product not found or access denied');
  }

  const newStock = Math.max(0, product.stock + adjustment);
  await db.products.update(productId, { 
    stock: newStock,
    updatedAt: new Date().toISOString(),
  });

  // Record in inventory history
  await db.inventoryHistory.add({
    productId,
    change: adjustment,
    reason: 'manual_adjustment',
    date: new Date().toISOString(),
    note: reason,
    name: product.name,
    price: product.costPrice,
    userId,
  } as InventoryHistory);

  return newStock;
}

/**
 * Get inventory valuation
 */
export async function getInventoryValuation(userId: number) {
  const products = await db.products
    .where('userId')
    .equals(userId)
    .toArray();

  const totalCost = products.reduce((sum, product) => 
    sum + (product.stock * product.costPrice), 0
  );

  const totalRetailValue = products.reduce((sum, product) => 
    sum + (product.stock * product.salePrice), 0
  );

  return {
    totalCost,
    totalRetailValue,
    potentialProfit: totalRetailValue - totalCost,
    productCount: products.length,
    totalItems: products.reduce((sum, product) => sum + product.stock, 0),
    products,
  };
}

/**
 * Get stock movement report
 */
export async function getStockMovementReport(
  userId: number, 
  startDate?: string, 
  endDate?: string
): Promise<StockMovementRecord[]> {
  let history = await getInventoryHistory(userId);
  
  if (startDate) {
    history = history.filter(record => record.date >= startDate);
  }
  
  if (endDate) {
    history = history.filter(record => record.date <= endDate);
  }

  const movementByProduct = history.reduce((acc, record) => {
    if (!acc[record.productId]) {
      acc[record.productId] = {
        productId: record.productId,
        productName: record.name,
        totalIn: 0,
        totalOut: 0,
        netChange: 0,
      };
    }
    
    if (record.change > 0) {
      acc[record.productId].totalIn += record.change;
    } else {
      acc[record.productId].totalOut += Math.abs(record.change);
    }
    
    acc[record.productId].netChange += record.change;
    
    return acc;
  }, {} as Record<number, StockMovementRecord>);

  return Object.values(movementByProduct);
}

/**
 * Get inventory alerts for a user
 */
export async function getInventoryAlerts(userId: number) {
  const lowStockProducts = await getLowStockProducts(userId, 5);
  const outOfStockProducts = await getLowStockProducts(userId, 0);
  
  return {
    lowStock: lowStockProducts,
    outOfStock: outOfStockProducts,
    totalAlerts: lowStockProducts.length + outOfStockProducts.length,
  };
}