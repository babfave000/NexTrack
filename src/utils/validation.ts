// src/utils/validation.ts

export interface ProductFormValues {
  name: string;
  costPrice: number | '';
  salePrice: number | '';
  stock: number | '';
  category?: string;
  brand?: string;
  supplier?: string;
  description?: string;
  sku?: string;
}

export interface UserFormValues {
  name: string;
  email: string;
  role: string;
  password?: string;
  confirmPassword?: string;
}

export interface SalesOrderFormValues {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
  status: string;
  notes?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export function validateProductForm(values: ProductFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!values.name || values.name.trim() === '') {
    errors.name = 'Product name is required';
  } else if (values.name.length < 2) {
    errors.name = 'Product name must be at least 2 characters long';
  }

  // Cost Price validation
  if (values.costPrice === '' || isNaN(Number(values.costPrice))) {
    errors.costPrice = 'Valid cost price is required';
  } else if (Number(values.costPrice) < 0) {
    errors.costPrice = 'Cost price cannot be negative';
  }

  // Sale Price validation
  if (values.salePrice === '' || isNaN(Number(values.salePrice))) {
    errors.salePrice = 'Valid sale price is required';
  } else if (Number(values.salePrice) < 0) {
    errors.salePrice = 'Sale price cannot be negative';
  }

  // Stock validation
  if (values.stock === '' || isNaN(Number(values.stock))) {
    errors.stock = 'Valid stock quantity is required';
  } else if (Number(values.stock) < 0) {
    errors.stock = 'Stock cannot be negative';
  } else if (!Number.isInteger(Number(values.stock))) {
    errors.stock = 'Stock must be a whole number';
  }

  // SKU validation (optional)
  if (values.sku && values.sku.length > 50) {
    errors.sku = 'SKU cannot exceed 50 characters';
  }

  return errors;
}

export function validateUserForm(values: UserFormValues, isEditing: boolean = false): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!values.name || values.name.trim() === '') {
    errors.name = 'Name is required';
  } else if (values.name.length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }

  // Email validation
  if (!values.email || values.email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Role validation
  if (!values.role || values.role.trim() === '') {
    errors.role = 'Role is required';
  }

  // Password validation (only for new users or when changing password)
  if (!isEditing || values.password) {
    if (!values.password || values.password.trim() === '') {
      errors.password = 'Password is required';
    } else if (values.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  return errors;
}

export function validateSalesOrderForm(values: SalesOrderFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  // Customer name validation
  if (!values.customerName || values.customerName.trim() === '') {
    errors.customerName = 'Customer name is required';
  }

  // Items validation
  if (!values.items || values.items.length === 0) {
    errors.items = 'At least one item is required';
  } else {
    values.items.forEach((item, index) => {
      if (!item.productId) {
        errors[`items[${index}].productId`] = 'Product is required';
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`items[${index}].quantity`] = 'Valid quantity is required';
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors[`items[${index}].unitPrice`] = 'Valid unit price is required';
      }
    });
  }

  // Status validation
  if (!values.status || values.status.trim() === '') {
    errors.status = 'Status is required';
  }

  // Email validation (optional)
  if (values.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.customerEmail)) {
    errors.customerEmail = 'Please enter a valid email address';
  }

  return errors;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  // Clean the phone number by removing common separators
  const cleanedPhone = phone.replace(/[\s\-().+]/g, '');
  
  // Basic international phone validation
  // Allows:
  // - Optional + at start
  // - Numbers only
  // - Minimum 8 digits, maximum 15 digits (typical international limits)
  return /^[+]?[0-9]{8,15}$/.test(cleanedPhone);
}

// Additional phone validation with country code support
export function validatePhoneWithCountryCode(phone: string): boolean {
  const cleanedPhone = phone.replace(/[\s\-().]/g, '');
  
  // More comprehensive phone validation:
  // - Optional + at start
  // - Country code: 1-3 digits after +
  // - Area code and number: 7-12 digits
  return /^[+]?[0-9]{1,3}[0-9]{7,12}$/.test(cleanedPhone);
}

// Phone validation for specific formats
export function validatePhoneFormat(phone: string, format: 'international' | 'local' = 'international'): boolean {
  const cleanedPhone = phone.replace(/[\s\-().]/g, '');
  
  if (format === 'international') {
    return /^[+]?[0-9]{8,15}$/.test(cleanedPhone);
  } else {
    // Local format (without country code)
    return /^[0-9]{7,12}$/.test(cleanedPhone);
  }
}

export function validateRequired(value: string): boolean {
  return !!value && value.trim() !== '';
}

export function validateNumber(value: string | number): boolean {
  return !isNaN(Number(value)) && Number(value) >= 0;
}

export function validatePositiveNumber(value: string | number): boolean {
  return !isNaN(Number(value)) && Number(value) > 0;
}

// Additional validation functions for other form types

export interface SupplierFormValues {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function validateSupplierForm(values: SupplierFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!values.name || values.name.trim() === '') {
    errors.name = 'Supplier name is required';
  } else if (values.name.length < 2) {
    errors.name = 'Supplier name must be at least 2 characters long';
  }

  // Email validation (optional)
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Phone validation (optional)
  if (values.phone && !validatePhone(values.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  return errors;
}

export interface CategoryFormValues {
  name: string;
  description?: string;
}

export function validateCategoryForm(values: CategoryFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!values.name || values.name.trim() === '') {
    errors.name = 'Category name is required';
  } else if (values.name.length < 2) {
    errors.name = 'Category name must be at least 2 characters long';
  }

  return errors;
}

export interface BrandFormValues {
  name: string;
  description?: string;
}

export function validateBrandForm(values: BrandFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!values.name || values.name.trim() === '') {
    errors.name = 'Brand name is required';
  } else if (values.name.length < 2) {
    errors.name = 'Brand name must be at least 2 characters long';
  }

  return errors;
}

export interface PurchaseOrderFormValues {
  supplier: string;
  items: Array<{
    productId: number;
    quantity: number;
    unitCost: number;
  }>;
  status: string;
  notes?: string;
}

export function validatePurchaseOrderForm(values: PurchaseOrderFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  // Supplier validation
  if (!values.supplier || values.supplier.trim() === '') {
    errors.supplier = 'Supplier is required';
  }

  // Items validation
  if (!values.items || values.items.length === 0) {
    errors.items = 'At least one item is required';
  } else {
    values.items.forEach((item, index) => {
      if (!item.productId) {
        errors[`items[${index}].productId`] = 'Product is required';
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`items[${index}].quantity`] = 'Valid quantity is required';
      }
      if (!item.unitCost || item.unitCost <= 0) {
        errors[`items[${index}].unitCost`] = 'Valid unit cost is required';
      }
    });
  }

  // Status validation
  if (!values.status || values.status.trim() === '') {
    errors.status = 'Status is required';
  }

  return errors;
}

// Password strength validation
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// URL validation
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Date validation
export function validateDate(date: string): boolean {
  return !isNaN(Date.parse(date));
}

// Future date validation
export function validateFutureDate(date: string): boolean {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
}

// Past date validation
export function validatePastDate(date: string): boolean {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate <= today;
}

// File validation
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSize = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSize;
}

// Credit card validation (basic)
export function validateCreditCard(number: string): boolean {
  // Remove spaces and dashes
  const cleaned = number.replace(/[\s-]/g, '');
  // Basic check for 13-19 digits
  return /^[0-9]{13,19}$/.test(cleaned);
}

// ZIP code validation (US format)
export function validateZipCode(zipCode: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zipCode);
}

// Price validation with decimal places
export function validatePrice(price: string | number, decimalPlaces: number = 2): boolean {
  const num = Number(price);
  if (isNaN(num) || num < 0) return false;
  
  // Check decimal places
  const decimalPart = num.toString().split('.')[1];
  if (decimalPart && decimalPart.length > decimalPlaces) return false;
  
  return true;
}

// Quantity validation (positive integer)
export function validateQuantity(quantity: string | number): boolean {
  const num = Number(quantity);
  return !isNaN(num) && num >= 0 && Number.isInteger(num);
}

// Percentage validation (0-100)
export function validatePercentage(percentage: string | number): boolean {
  const num = Number(percentage);
  return !isNaN(num) && num >= 0 && num <= 100;
}

// Array validation
export function validateNonEmptyArray<T>(array: T[]): boolean {
  return Array.isArray(array) && array.length > 0;
}

// Object validation
export function validateNonEmptyObject(obj: Record<string, unknown>): boolean {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
}

// Custom validation with callback
export function validateWithCallback<T>(
  value: T,
  validator: (value: T) => boolean
): boolean {
  return validator(value);
}

// Composite validation - run multiple validators
export function validateAll(values: Record<string, unknown>, validators: Record<string, (value: unknown) => boolean>): ValidationErrors {
  const errors: ValidationErrors = {};
  
  for (const [key, validator] of Object.entries(validators)) {
    if (!validator(values[key])) {
      errors[key] = `Invalid ${key}`;
    }
  }
  
  return errors;
}