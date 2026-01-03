// src/db/operations/purchases.ts
import { db } from '../dexie';
import type { PurchaseOrder, Supplier, Product } from '../dexie';

export interface CreatePurchaseOrderData {
  supplier: string;
  items: PurchaseOrderItem[];
  total: number;
  date: string;
  status: 'draft' | 'approved' | 'fulfilled';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
}

export interface PurchaseOrderItem {
  productId: number;
  quantity: number;
  price: number;
  total: number;
}

export interface CreateSupplierData {
  name: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
}

/**
 * Add a new supplier to the database
 */
export const addSupplier = async (supplierData: CreateSupplierData, userId: number): Promise<number> => {
  if (!userId) {
    throw new Error('User ID is required to add a supplier');
  }

  if (!supplierData.name || !supplierData.name.trim()) {
    throw new Error('Supplier name is required');
  }

  const now = new Date().toISOString();
  
  try {
    // Check if supplier already exists for this user
    const existingSupplier = await db.suppliers
      .where('userId')
      .equals(userId)
      .and(s => s.name.toLowerCase() === supplierData.name.toLowerCase().trim())
      .first();

    if (existingSupplier) {
      throw new Error('Supplier with this name already exists');
    }

    const supplierId = await db.suppliers.add({
      name: supplierData.name.trim(),
      contactEmail: supplierData.contactEmail?.trim() || '',
      phone: supplierData.phone?.trim() || '',
      address: supplierData.address?.trim() || '',
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return supplierId;
  } catch (error) {
    console.error('Error adding supplier:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to add supplier to database');
  }
};

/**
 * Update an existing supplier
 */
export const updateSupplier = async (
  id: number, 
  updates: Partial<CreateSupplierData>, 
  userId: number
): Promise<number> => {
  if (!userId) {
    throw new Error('User ID is required to update a supplier');
  }

  if (updates.name && !updates.name.trim()) {
    throw new Error('Supplier name cannot be empty');
  }

  try {
    // Verify the supplier belongs to the user
    const existingSupplier = await db.suppliers.get(id);
    if (!existingSupplier) {
      throw new Error('Supplier not found');
    }

    if (existingSupplier.userId !== userId) {
      throw new Error('Unauthorized to update this supplier');
    }

    // Check if new name conflicts with existing supplier
    if (updates.name) {
      const conflictingSupplier = await db.suppliers
        .where('userId')
        .equals(userId)
        .and(s => s.name.toLowerCase() === updates.name!.toLowerCase().trim() && s.id !== id)
        .first();

      if (conflictingSupplier) {
        throw new Error('Supplier with this name already exists');
      }
    }

    const updatedFields: Partial<Supplier> = {
      updatedAt: new Date().toISOString(),
    };

    // Only include fields that are provided
    if (updates.name !== undefined) {
      updatedFields.name = updates.name.trim();
    }
    if (updates.contactEmail !== undefined) {
      updatedFields.contactEmail = updates.contactEmail.trim();
    }
    if (updates.phone !== undefined) {
      updatedFields.phone = updates.phone.trim();
    }
    if (updates.address !== undefined) {
      updatedFields.address = updates.address.trim();
    }

    const updatedCount = await db.suppliers.update(id, updatedFields);
    
    if (updatedCount === 0) {
      throw new Error('Failed to update supplier');
    }

    return updatedCount;
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error instanceof Error ? error : new Error('Failed to update supplier');
  }
};

/**
 * Delete a supplier
 */
export const deleteSupplier = async (id: number, userId: number): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to delete a supplier');
  }

  try {
    // Verify the supplier belongs to the user
    const supplier = await db.suppliers.get(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    if (supplier.userId !== userId) {
      throw new Error('Unauthorized to delete this supplier');
    }

    // Check if supplier is used in any purchase orders
    const purchaseOrders = await db.purchaseOrders
      .where('userId')
      .equals(userId)
      .and(po => po.supplier === supplier.name)
      .toArray();

    if (purchaseOrders.length > 0) {
      throw new Error('Cannot delete supplier with existing purchase orders');
    }

    await db.suppliers.delete(id);
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error instanceof Error ? error : new Error('Failed to delete supplier');
  }
};

/**
 * Get all suppliers for a user
 */
export const getSuppliersByUser = async (userId: number): Promise<Supplier[]> => {
  if (!userId) {
    return [];
  }

  try {
    const suppliers = await db.suppliers
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('createdAt');
    
    return suppliers;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
};

/**
 * Get a single supplier by ID
 */
export const getSupplierById = async (id: number, userId: number): Promise<Supplier | undefined> => {
  if (!userId) {
    return undefined;
  }

  try {
    const supplier = await db.suppliers.get(id);
    
    // Verify the supplier belongs to the user
    if (supplier && supplier.userId === userId) {
      return supplier;
    }
    
    return undefined;
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return undefined;
  }
};

/**
 * Search suppliers by name, email, phone, or address
 */
export const searchSuppliers = async (query: string, userId: number): Promise<Supplier[]> => {
  if (!userId || !query.trim()) {
    return getSuppliersByUser(userId);
  }

  try {
    const searchTerm = query.toLowerCase().trim();
    const allSuppliers = await getSuppliersByUser(userId);
    
    return allSuppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm) ||
      supplier.contactEmail?.toLowerCase().includes(searchTerm) ||
      supplier.phone?.includes(searchTerm) ||
      supplier.address?.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching suppliers:', error);
    return [];
  }
};

/**
 * Check if a supplier name already exists for the user
 */
export const isSupplierNameUnique = async (name: string, userId: number, excludeId?: number): Promise<boolean> => {
  if (!userId || !name.trim()) {
    return true;
  }

  try {
    const suppliers = await db.suppliers
      .where('userId')
      .equals(userId)
      .filter(supplier => {
        const nameMatches = supplier.name.toLowerCase() === name.toLowerCase().trim();
        const isExcluded = excludeId ? supplier.id !== excludeId : true;
        return nameMatches && isExcluded;
      })
      .toArray();
    
    return suppliers.length === 0;
  } catch (error) {
    console.error('Error checking supplier name uniqueness:', error);
    return true;
  }
};

/**
 * Add a new purchase order with user authentication.
 * Automatically adds stock to inventory.
 */
export async function addPurchaseOrder(
  order: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  userId: number
): Promise<number> {
  const now = new Date().toISOString();
  
  // Ensure paymentStatus has a default value if not provided
  const orderWithDefaults: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
    ...order,
    paymentStatus: order.paymentStatus || 'unpaid', // Use provided or default
  };
  
  const id = await db.purchaseOrders.add({
    ...orderWithDefaults,
    userId,
    createdAt: now,
    updatedAt: now,
  });

  // Always add stock for purchase orders
  await addStock(order.items, userId);

  return id;
}

/**
 * Update an existing purchase order with user validation.
 */
export async function updatePurchaseOrder(
  id: number,
  updates: Partial<Omit<PurchaseOrder, 'id'>>,
  userId: number
): Promise<void> {
  const existing = await db.purchaseOrders.get(id);
  if (!existing) throw new Error('Purchase order not found');
  
  // Verify user owns this order
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this order');
  }

  await db.purchaseOrders.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update purchase order payment status only
 */
export async function updatePurchaseOrderPaymentStatus(
  poId: number, 
  paymentStatus: 'paid' | 'unpaid', 
  userId: number
): Promise<void> {
  const existing = await db.purchaseOrders.get(poId);
  if (!existing) throw new Error('Purchase order not found');
  
  // Verify user owns this order
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this order');
  }

  try {
    await db.purchaseOrders.update(poId, {
      paymentStatus,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Purchase order ${poId} payment status updated to: ${paymentStatus}`);
  } catch (error) {
    console.error('❌ Failed to update purchase order payment status:', error);
    throw new Error(`Failed to update payment status: ${error}`);
  }
}

/**
 * Delete a purchase order with user validation.
 * Optionally remove stock if the order was processed.
 */
export async function deletePurchaseOrder(id: number, userId: number): Promise<void> {
  const existing = await db.purchaseOrders.get(id);
  if (!existing) return;
  
  // Verify user owns this order
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this order');
  }

  await db.purchaseOrders.delete(id);

  // Optional: Remove stock if needed
  // await removeStock(existing.items, userId);
}

/**
 * Add inventory stock for each item in the purchase order.
 */
async function addStock(items: PurchaseOrder['items'], userId: number): Promise<void> {
  if (!Array.isArray(items)) return;

  for (const item of items) {
    const product = await db.products.get(item.productId);
    
    if (product && product.userId === userId) {
      // Update existing product
      const updatedQty = product.stock + item.quantity;
      await db.products.update(item.productId, { 
        stock: updatedQty,
        costPrice: item.price, // Update cost price to latest
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new product if it doesn't exist or doesn't belong to user
      await db.products.add({
        name: `Product ${item.productId}`,
        description: 'Auto-created from purchase order',
        sku: `AUTO-${item.productId}`,
        brand: '',
        supplier: '',
        stock: item.quantity,
        costPrice: item.price,
        salePrice: item.price * 1.5, // Default markup
        lowStockThreshold: 10,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Product);
    }
    
    // Add to inventory history
    await db.inventoryHistory.add({
      productId: item.productId,
      change: item.quantity,
      reason: 'purchase',
      date: new Date().toISOString(),
      note: `Purchase order restock`,
      name: product?.name || `Product ${item.productId}`,
      price: item.price,
      userId,
    });
  }
}

/**
 * Fetch a single purchase order by ID with user validation.
 */
export async function getPurchaseOrder(id: number, userId: number): Promise<PurchaseOrder | null> {
  const order = await db.purchaseOrders.get(id);
  if (!order || order.userId !== userId) return null;
  return order;
}

/**
 * Fetch all purchase orders for a user, sorted by date (latest first).
 */
export function getUserPurchaseOrders(userId: number): Promise<PurchaseOrder[]> {
  return db.purchaseOrders
    .where('userId')
    .equals(userId)
    .reverse()
    .sortBy('date');
}

/**
 * Get purchase statistics for dashboard with proper date filtering
 */
export async function getPurchaseStats(userId: number, period?: 'today' | 'week' | 'month' | 'all') {
  const orders = await getUserPurchaseOrders(userId);
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
      default:
        return true; // Include all orders
    }
  });

  const totalSpent = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return {
    totalSpent,
    totalOrders,
    averageOrderValue,
    orders: filteredOrders,
  };
}

/**
 * Get purchase orders by supplier for a user
 */
export async function getPurchaseOrdersBySupplier(userId: number, supplier: string): Promise<PurchaseOrder[]> {
  const orders = await getUserPurchaseOrders(userId);
  return orders.filter(order => order.supplier === supplier);
}

/**
 * Get recent purchase orders for a user
 */
export async function getRecentPurchaseOrders(userId: number, limit: number = 10): Promise<PurchaseOrder[]> {
  const orders = await getUserPurchaseOrders(userId);
  return orders.slice(0, limit);
}


/**
 * Get a single supplier by ID with user validation
 */
export async function getSupplier(id: number, userId: number): Promise<Supplier | null> {
  const supplier = await db.suppliers.get(id);
  if (!supplier || supplier.userId !== userId) return null;
  return supplier;
}

/**
 * Fix existing purchases by marking all as paid
 * Run this once to update existing data
 */
export async function fixExistingPurchases(userId: number): Promise<number> {
  const purchases = await getUserPurchaseOrders(userId);
  let updatedCount = 0;
  
  for (const purchase of purchases) {
    if (purchase.paymentStatus === 'unpaid' && purchase.id) {
      // Update to paid status
      await db.purchaseOrders.update(purchase.id, {
        paymentStatus: 'paid',
        updatedAt: new Date().toISOString(),
      });
      updatedCount++;
    }
  }
  
  return updatedCount;
}

/**
 * Get statistics about purchase payment status
 */
export async function getPurchasePaymentStats(userId: number) {
  const purchases = await getUserPurchaseOrders(userId);
  const totalPurchases = purchases.length;
  const unpaidPurchases = purchases.filter(p => p.paymentStatus === 'unpaid').length;
  const paidPurchases = totalPurchases - unpaidPurchases;
  
  return {
    totalPurchases,
    unpaidPurchases,
    paidPurchases,
  };
}

// Export purchase operations as a named object to avoid conflicts
export const purchaseOperations = {
  addPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrder,
  getUserPurchaseOrders,
  getPurchaseStats,
  getPurchaseOrdersBySupplier,
  getRecentPurchaseOrders,
  updatePurchaseOrderPaymentStatus,
  fixExistingPurchases,
  getPurchasePaymentStats,
  supplier: {
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSuppliersByUser,
    getSupplierById,
    searchSuppliers,
    isSupplierNameUnique,
    getSupplier
  }
};