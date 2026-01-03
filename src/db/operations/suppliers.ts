// src/db/operations/suppliers.ts
import { db } from '../dexie';
import type { Supplier as DexieSupplier } from '../dexie';

// Re-export the main Supplier type to avoid conflicts
export type { Supplier } from '../dexie';

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

    const updatedFields = {
      updatedAt: new Date().toISOString(),
    } as Partial<DexieSupplier>;

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

    await db.suppliers.delete(id);
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error instanceof Error ? error : new Error('Failed to delete supplier');
  }
};

/**
 * Get all suppliers for a user
 */
export const getSuppliersByUser = async (userId: number): Promise<DexieSupplier[]> => {
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
export const getSupplierById = async (id: number, userId: number): Promise<DexieSupplier | undefined> => {
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
export const searchSuppliers = async (query: string, userId: number): Promise<DexieSupplier[]> => {
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

// Export supplier operations as a named object to avoid conflicts
export const supplierOperations = {
  addSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliersByUser,
  getSupplierById,
  searchSuppliers,
  isSupplierNameUnique
};