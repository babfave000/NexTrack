// src/components/Inventory/ProductForm.tsx
import { useState, useEffect, useRef } from 'react';
import { type Product } from '../../db/dexie';
import { generateSKU } from '../../db/operations/products';
import { useUserData } from '../../hooks/useUserData';

interface ProductFormProps {
  product?: Product;
  onSubmit: (product: Omit<Product, 'id'>) => void | Promise<void>;
  onSave: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({ 
  product, 
  onSubmit, 
  onSave,
  onCancel, 
  isLoading = false 
}) => {
  const { user } = useUserData();
  const autoSkuLastGeneratedFrom = useRef<string>('');
  const isEditingExisting = Boolean(product?.id);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    stock: 0,
    costPrice: 0,
    salePrice: 0,
    description: '',
    brand: '',
    supplier: '',
    category: '',
    lowStockThreshold: 0,
    userId: 0,
    firebaseUid: undefined as string | undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [suppliersList, setSuppliersList] = useState<string[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        stock: product.stock || 0,
        costPrice: product.costPrice || 0,
        salePrice: product.salePrice || 0,
        description: product.description || '',
        brand: product.brand || '',
        supplier: product.supplier || '',
        category: product.category || '',
        lowStockThreshold: product.lowStockThreshold ?? 0,
        userId: product.userId || 0,
        firebaseUid: product.firebaseUid ?? undefined,
      });
      autoSkuLastGeneratedFrom.current = product.name || '';
    }
  }, [product]);

  useEffect(() => {
    // Live-generate SKU for new products. If user already typed a custom
    // SKU that doesn't match the auto-gen pattern for the current name,
    // we leave it alone (respects manual edits).
    if (isEditingExisting) return;
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      if (!formData.sku || formData.sku === autoSkuLastGeneratedFrom.current + '-AUTO') {
        setFormData(prev => (prev.sku ? { ...prev, sku: '' } : prev));
      }
      autoSkuLastGeneratedFrom.current = '';
      return;
    }
    // Skip if the user appears to have manually edited the SKU
    const expectedPrefix = trimmedName.substring(0, 3).toUpperCase();
    const alreadyAuto = autoSkuLastGeneratedFrom.current &&
      formData.sku.startsWith(autoSkuLastGeneratedFrom.current.substring(0, 3).toUpperCase() + '-');
    const matchesPrefix = !formData.sku || formData.sku.startsWith(expectedPrefix + '-') || alreadyAuto;
    if (!matchesPrefix) return;

    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      const generated = await generateSKU(trimmedName, user.id);
      if (cancelled) return;
      setFormData(prev => {
        const currentPrefix = trimmedName.substring(0, 3).toUpperCase();
        const prevWasAuto = autoSkuLastGeneratedFrom.current &&
          prev.sku.startsWith(autoSkuLastGeneratedFrom.current.substring(0, 3).toUpperCase() + '-');
        const stillMatches = !prev.sku || prev.sku.startsWith(currentPrefix + '-') || prevWasAuto;
        if (!stillMatches) return prev;
        return { ...prev, sku: generated };
      });
      autoSkuLastGeneratedFrom.current = trimmedName;
    })();
    return () => { cancelled = true; };
  }, [formData.name, user?.id, isEditingExisting, formData.sku]);

  useEffect(() => {
    // Extract unique brands and suppliers from existing products
    const brands = Array.from(new Set(['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'LG']));
    const suppliers = Array.from(new Set(['Global Tech', 'Tech Supplies Inc', 'Wholesale Distributors', 'Direct Import']));
    setBrandsList(brands);
    setSuppliersList(suppliers);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (formData.stock < 0) {
      newErrors.stock = 'Stock must be a positive number';
    }

    if (formData.costPrice < 0) {
      newErrors.costPrice = 'Cost price must be a positive number';
    }

    if (formData.salePrice < 0) {
      newErrors.salePrice = 'Sale price must be a positive number';
    }

    if (formData.costPrice > 0 && formData.salePrice > 0 && formData.costPrice >= formData.salePrice) {
      newErrors.salePrice = 'Sale price must be greater than cost price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      await onSubmit(formData);
      onSave();
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleAddNewBrand = () => {
    if (newBrand.trim()) {
      setBrandsList(prev => [...prev, newBrand]);
      setFormData(prev => ({ ...prev, brand: newBrand }));
      setNewBrand('');
      setShowNewBrand(false);
    }
  };

  const handleAddNewSupplier = () => {
    if (newSupplier.trim()) {
      setSuppliersList(prev => [...prev, newSupplier]);
      setFormData(prev => ({ ...prev, supplier: newSupplier }));
      setNewSupplier('');
      setShowNewSupplier(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {product ? 'Edit Product' : 'Add New Product'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-sm">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter product name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* SKU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                SKU
              </label>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                isEditingExisting
                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                {isEditingExisting ? 'Preserved' : 'Auto-generated'}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                readOnly={!isEditingExisting}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  isEditingExisting
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 cursor-default'
                }`}
                placeholder={isEditingExisting ? 'Product SKU' : 'Enter product name to generate'}
              />
            </div>
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {isEditingExisting
                ? 'Edit if needed — SKU is kept when updating.'
                : formData.name
                  ? `Generated from product name, auto-incrementing counter.`
                  : 'Type a product name above to generate a unique SKU automatically.'}
            </p>
          </div>

          {/* Stock Quantity */}
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity *
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.stock ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
          </div>

          {/* Brand */}
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
              Brand (Optional)
            </label>
            {!showNewBrand ? (
              <div className="flex gap-2">
                <select
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Brand</option>
                  {brandsList.map((brand, index) => (
                    <option key={index} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewBrand(true)}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new brand"
                />
                <button
                  type="button"
                  onClick={handleAddNewBrand}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewBrand(false)}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Supplier */}
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
              Supplier (Optional)
            </label>
            {!showNewSupplier ? (
              <div className="flex gap-2">
                <select
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliersList.map((supplier, index) => (
                    <option key={index} value={supplier}>
                      {supplier}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewSupplier(true)}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new supplier"
                />
                <button
                  type="button"
                  onClick={handleAddNewSupplier}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewSupplier(false)}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Cost Price */}
          <div>
            <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price *
            </label>
            <input
              type="number"
              id="costPrice"
              name="costPrice"
              value={formData.costPrice}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.costPrice ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>}
          </div>

          {/* Sale Price */}
          <div>
            <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 mb-1">
              Sale Price *
            </label>
            <input
              type="number"
              id="salePrice"
              name="salePrice"
              value={formData.salePrice}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.salePrice ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.salePrice && <p className="text-red-500 text-xs mt-1">{errors.salePrice}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter product description"
            />
        </div>

        {/* Form Actions */}
        <div className="form-actions flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
          >
            {isLoading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
