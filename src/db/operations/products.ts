// src/db/operations/products.ts
import { db } from '../dexie';
import type { Product } from '../dexie';

/**
 * Capitalize first letter of each word
 */
function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Generate unique SKU
 */
export async function generateSKU(productName: string, userId: number): Promise<string> {
  if (!productName.trim()) return '';
  
  // Get first 3 letters of product name in uppercase
  const prefix = productName.substring(0, 3).toUpperCase();
  
  // Check if SKU already exists and find next available number
  const existingProducts = await db.products
    .where('userId')
    .equals(userId)
    .toArray();

  const filteredProducts = existingProducts.filter(product => 
    product.sku?.startsWith(prefix)
  );

  let counter = 1;
  let sku = '';
  
  while (true) {
    sku = `${prefix}-${counter.toString().padStart(3, '0')}`;
    const exists = filteredProducts.some(product => product.sku === sku);
    if (!exists) break;
    counter++;
    // Safety break to prevent infinite loop
    if (counter > 999) {
      sku = `${prefix}-${Date.now().toString().slice(-3)}`;
      break;
    }
  }
  
  return sku;
}

/**
 * Add a new product with user authentication and auto SKU generation
 */
export async function addProduct(
  product: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>,
  userId: number
): Promise<number> {
  try {
    const now = new Date().toISOString();

    // Basic validation
    if (!product || !product.name) {
      throw new Error('Product name is required');
    }
    
    // Generate SKU if not provided
    let sku = product.sku;
    if (!sku && product.name) {
      sku = await generateSKU(product.name, userId);
    }

    // Capitalize name, brand, and supplier
    const productData = {
      ...product,
      name: capitalizeWords(product.name),
      brand: product.brand ? capitalizeWords(product.brand) : undefined,
      supplier: product.supplier ? capitalizeWords(product.supplier) : undefined,
      sku,
      userId,
      createdAt: now,
      updatedAt: now,
    } as Product;

    const id = await db.products.add(productData);
    return id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

/**
 * Update a product with user validation
 */
export async function updateProduct(
  id: number,
  updates: Partial<Omit<Product, 'id'>>,
  userId: number
): Promise<void> {
  try {
    const existing = await db.products.get(id);
    if (!existing) throw new Error('Product not found');
    
    // Verify user owns this product
    if (existing.userId !== userId) {
      throw new Error('Access denied: You do not own this product');
    }

    // Capitalize name, brand, and supplier if they are being updated
    const processedUpdates = { ...updates };
    if (updates.name) processedUpdates.name = capitalizeWords(updates.name);
    if (updates.brand) processedUpdates.brand = capitalizeWords(updates.brand);
    if (updates.supplier) processedUpdates.supplier = capitalizeWords(updates.supplier);

    await db.products.update(id, {
      ...processedUpdates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product with user validation
 */
export async function deleteProduct(id: number, userId: number): Promise<void> {
  const existing = await db.products.get(id);
  if (!existing) return;
  
  // Verify user owns this product
  if (existing.userId !== userId) {
    throw new Error('Access denied: You do not own this product');
  }

  await db.products.delete(id);
}

/**
 * Get a product by ID with user validation
 */
export async function getProduct(id: number, userId: number): Promise<Product | null> {
  const product = await db.products.get(id);
  if (!product || product.userId !== userId) return null;
  return product;
}

/**
 * Get all products for a user
 */
export async function getUserProducts(userId: number): Promise<Product[]> {
  return db.products
    .where('userId')
    .equals(userId)
    .toArray();
}

/**
 * Search products by name, SKU, brand or supplier for a user
 */
export async function searchProducts(userId: number, query: string): Promise<Product[]> {
  const products = await getUserProducts(userId);
  
  return products.filter(product =>
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.sku?.toLowerCase().includes(query.toLowerCase()) ||
    product.brand?.toLowerCase().includes(query.toLowerCase()) ||
    product.supplier?.toLowerCase().includes(query.toLowerCase())
  );
}

/**
 * Get product brands for a user
 */
export async function getUserBrands(userId: number): Promise<string[]> {
  const products = await getUserProducts(userId);
  const brands = [...new Set(products.map(p => p.brand).filter((brand): brand is string => !!brand))];
  return brands.sort();
}

/**
 * Get product suppliers for a user
 */
export async function getUserSuppliers(userId: number): Promise<string[]> {
  const products = await getUserProducts(userId);
  const suppliers = [...new Set(products.map(p => p.supplier).filter((supplier): supplier is string => !!supplier))];
  return suppliers.sort();
}

/**
 * Add new brand
 */
export async function addNewBrand(brand: string): Promise<string> {
  return capitalizeWords(brand);
}

/**
 * Add new supplier
 */
export async function addNewSupplier(supplier: string): Promise<string> {
  return capitalizeWords(supplier);
}

/**
 * Bulk update products (for imports or batch operations)
 */
export async function bulkUpdateProducts(updates: Array<{id: number, changes: Partial<Product>}>, userId: number): Promise<void> {
  for (const update of updates) {
    const product = await db.products.get(update.id);
    if (product && product.userId === userId) {
      await db.products.update(update.id, {
        ...update.changes,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * Get product performance statistics
 */
export async function getProductPerformance(userId: number, period?: 'day' | 'week' | 'month') {
  const products = await getUserProducts(userId);
  const salesOrders = await db.salesOrders
    .where('userId')
    .equals(userId)
    .toArray();

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    default:
      startDate = new Date(0); // All time
  }

  const recentSales = salesOrders.filter(order => 
    new Date(order.date) >= startDate
  );

  const productPerformance = products.map(product => {
    const productSales = recentSales.flatMap(order => 
      order.items.filter(item => item.productId === product.id)
    );

    const unitsSold = productSales.reduce((sum, item) => sum + item.quantity, 0);
    const revenue = productSales.reduce((sum, item) => sum + item.total, 0);

    return {
      ...product,
      unitsSold,
      revenue,
      profit: revenue - (unitsSold * product.costPrice),
    };
  });

  return productPerformance.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Get low stock products for a user
 */
export async function getLowStockProducts(userId: number, threshold: number = 10): Promise<Product[]> {
  const products = await db.products
    .where('userId')
    .equals(userId)
    .toArray();

  return products.filter(product => product.stock <= threshold);
}

/**
 * Update product stock with validation
 */
export async function updateProductStock(productId: number, userId: number): Promise<void> {
  const product = await db.products.get(productId);
  if (!product || product.userId !== userId) {
    throw new Error('Product not found or access denied');
  }

  await db.products.update(productId, {
    // update logic here
  });
}

// Move the interface outside of any function
interface ProductInput {
  id?: number;
  name: string;
  sku?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  brand?: string;
  supplier?: string;
  category?: string;
  lowStockThreshold: number;
  [key: string]: unknown; // Allow other properties
}

/**
 * Add or update product with proper SKU handling
 */
export async function addOrUpdateProduct(
  productData: ProductInput, 
  userId: number, 
  isEditing: boolean = false
): Promise<{ id: number; isEditing: boolean }> {
  try {
    const sku = productData.sku;
    const product = {
      ...productData,
      sku,
      category: productData.category ?? '',
      userId,
      updatedAt: new Date().toISOString(),
    };

    if (isEditing && productData.id) {
      // Update existing product
      await updateProduct(productData.id, product, userId);
      return { id: productData.id, isEditing: true };
    } else {
      // Add new product
      const productWithTimestamps = {
        ...product,
        createdAt: new Date().toISOString(),
      };
      const id = await addProduct(productWithTimestamps, userId);
      return { id, isEditing: false };
    }
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
}