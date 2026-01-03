// src/hooks/useUserData.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from './useAuth';
import { db } from '../db/dexie';

/**
 * Custom hook for user-scoped database operations
 */
export function useUserData() {
  const { user, session } = useAuth();
  const isAuthenticated = !!user && !!session;

  // Products
  const products = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return [];
      return db.products.where('userId').equals(user.id!).toArray();
    },
    [isAuthenticated, user?.id]
  );

  // Sales Orders
  const salesOrders = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return [];
      return db.salesOrders.where('userId').equals(user.id!).toArray();
    },
    [isAuthenticated, user?.id]
  );

  // Purchase Orders
  const purchaseOrders = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return [];
      return db.purchaseOrders.where('userId').equals(user.id!).toArray();
    },
    [isAuthenticated, user?.id]
  );

  // Suppliers
  const suppliers = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return [];
      return db.suppliers.where('userId').equals(user.id!).toArray();
    },
    [isAuthenticated, user?.id]
  );

  // Categories
  const categories = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return [];
      return db.categories.where('userId').equals(user.id!).toArray();
    },
    [isAuthenticated, user?.id]
  );

  // Brands
  const brands = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return [];
      return db.brands.where('userId').equals(user.id!).toArray();
    },
    [isAuthenticated, user?.id]
  );

  // Inventory History
  const inventoryHistory = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return [];
      return db.inventoryHistory.where('userId').equals(user.id!).toArray();
    },
    [isAuthenticated, user?.id]
  );

  // User Profile
  const userProfile = useLiveQuery(
    () => {
      if (!isAuthenticated || !user) return undefined;
      return db.userProfile.where('userId').equals(user.id!).first();
    },
    [isAuthenticated, user?.id]
  );

  /**
   * Add a new product with automatic userId
   */
  const addProduct = async (productData: Omit<Parameters<typeof db.products.add>[0], 'userId'>) => {
    if (!user) throw new Error('User not authenticated');
    return db.products.add({
      ...productData,
      userId: user.id!,
    });
  };

  /**
   * Add a new sales order with automatic userId
   */
  const addSalesOrder = async (orderData: Omit<Parameters<typeof db.salesOrders.add>[0], 'userId'>) => {
    if (!user) throw new Error('User not authenticated');
    return db.salesOrders.add({
      ...orderData,
      userId: user.id!,
    });
  };

  /**
   * Add a new purchase order with automatic userId
   */
  const addPurchaseOrder = async (orderData: Omit<Parameters<typeof db.purchaseOrders.add>[0], 'userId'>) => {
    if (!user) throw new Error('User not authenticated');
    return db.purchaseOrders.add({
      ...orderData,
      userId: user.id!,
    });
  };

  /**
   * Add a new supplier with automatic userId
   */
  const addSupplier = async (supplierData: Omit<Parameters<typeof db.suppliers.add>[0], 'userId'>) => {
    if (!user) throw new Error('User not authenticated');
    return db.suppliers.add({
      ...supplierData,
      userId: user.id!,
    });
  };

  /**
   * Update product with user validation
   */
  const updateProduct = async (productId: number, changes: Parameters<typeof db.products.update>[1]) => {
    if (!user) throw new Error('User not authenticated');
    
    // Verify the product belongs to the current user
    const product = await db.products.get(productId);
    if (!product || product.userId !== user.id) {
      throw new Error('Product not found or access denied');
    }
    
    return db.products.update(productId, changes);
  };

  /**
   * Update sales order with user validation
   */
  const updateSalesOrder = async (orderId: number, changes: Parameters<typeof db.salesOrders.update>[1]) => {
    if (!user) throw new Error('User not authenticated');
    
    const order = await db.salesOrders.get(orderId);
    if (!order || order.userId !== user.id) {
      throw new Error('Order not found or access denied');
    }
    
    return db.salesOrders.update(orderId, changes);
  };

  /**
   * Delete product with user validation
   */
  const deleteProduct = async (productId: number) => {
    if (!user) throw new Error('User not authenticated');
    
    const product = await db.products.get(productId);
    if (!product || product.userId !== user.id) {
      throw new Error('Product not found or access denied');
    }
    
    return db.products.delete(productId);
  };

  /**
   * Get product by ID with user validation
   */
  const getProduct = async (productId: number) => {
    if (!user) throw new Error('User not authenticated');
    
    const product = await db.products.get(productId);
    if (!product || product.userId !== user.id) {
      return null;
    }
    
    return product;
  };

  /**
   * Get sales order by ID with user validation
   */
  const getSalesOrder = async (orderId: number) => {
    if (!user) throw new Error('User not authenticated');
    
    const order = await db.salesOrders.get(orderId);
    if (!order || order.userId !== user.id) {
      return null;
    }
    
    return order;
  };

  /**
   * Get purchase order by ID with user validation
   */
  const getPurchaseOrder = async (orderId: number) => {
    if (!user) throw new Error('User not authenticated');
    
    const order = await db.purchaseOrders.get(orderId);
    if (!order || order.userId !== user.id) {
      return null;
    }
    
    return order;
  };

  return {
    // Data
    products,
    salesOrders,
    purchaseOrders,
    suppliers,
    categories,
    brands,
    inventoryHistory,
    userProfile,
    
    // Operations
    addProduct,
    addSalesOrder,
    addPurchaseOrder,
    addSupplier,
    updateProduct,
    updateSalesOrder,
    deleteProduct,
    getProduct,
    getSalesOrder,
    getPurchaseOrder,
    
    // State
    isAuthenticated,
    user,
  };
}

/**
 * Hook for user-scoped queries with custom filters
 */
export function useUserQuery() {
  const { user, session } = useAuth();
  const isAuthenticated = !!user && !!session;

  const query = {
    products: (filters?: Record<string, unknown>) => {
      if (!isAuthenticated || !user) return db.products.where('userId').equals(-1);
      let query = db.products.where('userId').equals(user.id!);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.filter(product => ((product as unknown) as Record<string, unknown>)[key] === value);
          }
        });
      }
      return query;
    },
    
    salesOrders: (filters?: Record<string, unknown>) => {
      if (!isAuthenticated || !user) return db.salesOrders.where('userId').equals(-1);
      let query = db.salesOrders.where('userId').equals(user.id!);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.filter(order => ((order as unknown) as Record<string, unknown>)[key] === value);
          }
        });
      }
      return query;
    },
    
    purchaseOrders: (filters?: Record<string, unknown>) => {
      if (!isAuthenticated || !user) return db.purchaseOrders.where('userId').equals(-1);
      let query = db.purchaseOrders.where('userId').equals(user.id!);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.filter(order => ((order as unknown) as Record<string, unknown>)[key] === value);
          }
        });
      }
      return query;
    },
  };

  return {
    query,
    isAuthenticated,
    user,
  };
}

export default useUserData;