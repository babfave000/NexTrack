// src/db/operations/sales.ts
import { db } from '../dexie';
import type { SalesOrder, OrderStatus } from '../dexie';

/**
 * Add a new sales order with user authentication.
 * If status is "approved", automatically deduct stock from inventory.
 */
export async function addSalesOrder(
  order: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  userId: number
): Promise<number> {
  const now = new Date().toISOString();
  const id = await db.salesOrders.add({
    ...order,
    userId,
    createdAt: now,
    updatedAt: now,
  });

  if (order.status === 'approved') {
    await deductStock(order.items, userId);
  }

  return id;
}

/**
 * Update an existing sales order with user validation.
 * If transitioning from unapproved to approved, deduct stock.
 */
export async function updateSalesOrder(
  id: number,
  updates: Partial<Omit<SalesOrder, 'id'>>,
  userId: number
): Promise<void> {
  const existing = await db.salesOrders.get(id);
  if (!existing) throw new Error('Sales order not found');
  
  // Verify user owns this order
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this order');
  }

  const prevStatus: OrderStatus = existing.status;
  const newStatus: OrderStatus = (updates.status ?? prevStatus) as OrderStatus;

  await db.salesOrders.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  // Deduct stock if status transitions to "approved"
  if (prevStatus !== 'approved' && newStatus === 'approved') {
    await deductStock(updates.items ?? existing.items, userId);
  }

  // Optional: Restore stock if going from approved to unapproved
  // if (prevStatus === 'approved' && newStatus !== 'approved') {
  //   await restoreStock(existing.items, userId);
  // }
}

/**
 * Delete a sales order with user validation.
 * Optionally restore stock if the order was approved.
 */
export async function deleteSalesOrder(id: number, userId: number): Promise<void> {
  const existing = await db.salesOrders.get(id);
  if (!existing) return;
  
  // Verify user owns this order
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this order');
  }

  await db.salesOrders.delete(id);

  // Optional: Restore stock if needed
  // if (existing.status === 'approved') {
  //   await restoreStock(existing.items, userId);
  // }
}

/**
 * Deduct inventory stock for each item in the order.
 */
async function deductStock(items: SalesOrder['items'], userId: number): Promise<void> {
  if (!Array.isArray(items)) return;

  for (const item of items) {
    const product = await db.products.get(item.productId);
    if (!product || product.userId !== userId) continue;

    const updatedQty = Math.max(product.stock - item.quantity, 0);
    await db.products.update(item.productId, { 
      stock: updatedQty,
      updatedAt: new Date().toISOString(),
    });
    
    // Add to inventory history
    await db.inventoryHistory.add({
      productId: item.productId,
      change: -item.quantity,
      reason: 'sale',
      date: new Date().toISOString(),
      note: `Sales order deduction`,
      name: product.name,
      price: item.unitPrice,
      userId,
    });
  }
}


/**
 * Fetch a single sales order by ID with user validation.
 */
export async function getSalesOrder(id: number, userId: number): Promise<SalesOrder | null> {
  const order = await db.salesOrders.get(id);
  if (!order || order.userId !== userId) return null;
  return order;
}

/**
 * Fetch all sales orders for a user, sorted by date (latest first).
 */
export function getUserSalesOrders(userId: number): Promise<SalesOrder[]> {
  return db.salesOrders
    .where('userId')
    .equals(userId)
    .reverse()
    .sortBy('date');
}

/**
 * Get sales statistics for dashboard with proper date filtering
 */
export async function getSalesStats(userId: number, period?: 'today' | 'week' | 'month' | 'all') {
  const orders = await getUserSalesOrders(userId);
  const now = new Date();
  
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.date);
    
    switch (period) {
      case 'today': {
        // Check if order is from today
        return orderDate.toDateString() === now.toDateString();
      }
      case 'week': {
        // Check if order is within the last 7 days
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo;
      }
      case 'month': {
        // Check if order is within the last 30 days
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= monthAgo;
      }
      case 'all':
      default: {
        return true; // Include all orders
      }
    }
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    orders: filteredOrders,
  };
}

/**
 * Get sales orders by status for a user
 */
export async function getSalesOrdersByStatus(userId: number, status: OrderStatus): Promise<SalesOrder[]> {
  const orders = await getUserSalesOrders(userId);
  return orders.filter(order => order.status === status);
}

/**
 * Get recent sales orders for a user
 */
export async function getRecentSalesOrders(userId: number, limit: number = 10): Promise<SalesOrder[]> {
  const orders = await getUserSalesOrders(userId);
  return orders.slice(0, limit);
}

/**
 * Fulfill a sales order (mark as fulfilled)
 */
export async function fulfillSalesOrder(id: number, userId: number): Promise<void> {
  const existing = await db.salesOrders.get(id);
  if (!existing) throw new Error('Sales order not found');
  
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this order');
  }

  await db.salesOrders.update(id, {
    status: 'fulfilled',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Approve a sales order (mark as approved and deduct stock)
 */
export async function approveSalesOrder(id: number, userId: number): Promise<void> {
  const existing = await db.salesOrders.get(id);
  if (!existing) throw new Error('Sales order not found');
  
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this order');
  }

  await db.salesOrders.update(id, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
  });

  // Deduct stock since we're approving the order
  await deductStock(existing.items, userId);
}

// Export sales operations as a named object to avoid conflicts
export const salesOperations = {
  addSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  getSalesOrder,
  getUserSalesOrders,
  getSalesStats,
  getSalesOrdersByStatus,
  getRecentSalesOrders,
  fulfillSalesOrder,
  approveSalesOrder
};