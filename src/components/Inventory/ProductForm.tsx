// src/components/Inventory/ProductForm.tsx
import { useState, useEffect } from 'react';
import { validateProductForm } from '../../utils/validation';
import { addOrUpdateProduct, getUserBrands, getUserSuppliers } from '../../db/operations/products';
import { toast } from 'react-toastify';

interface Product {
  id?: number;
  name?: string;
  description?: string;
  sku?: string;
  costPrice?: number;
  salePrice?: number;
  stock?: number;
  brand?: string;
  supplier?: string;
  lowStockThreshold?: number;
}

interface ProductFormProps {
  product?: Product;
  onSave: (isEdit: boolean) => void;
  onCancel: () => void;
  userId: number;
}

export default function ProductForm({ product, onSave, onCancel, userId }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    costPrice: '',
    salePrice: '',
    stock: '',
    brand: '',
    supplier: '',
    lowStockThreshold: '5'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [suppliersList, setSuppliersList] = useState<string[]>([]);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  // Load brands and suppliers
  useEffect(() => {
    const loadData = async () => {
      try {
        const brands = await getUserBrands(userId);
        const suppliers = await getUserSuppliers(userId);
        // Filter out undefined values and ensure they are strings
        setBrandsList(brands.filter((brand): brand is string => brand !== undefined));
        setSuppliersList(suppliers.filter((supplier): supplier is string => supplier !== undefined));
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    };

    loadData();
  }, [userId]);

  // Populate form when editing product
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        costPrice: product.costPrice?.toString() || '',
        salePrice: product.salePrice?.toString() || '',
        stock: product.stock?.toString() || '',
        brand: product.brand || '',
        supplier: product.supplier || '',
        lowStockThreshold: product.lowStockThreshold?.toString() || '5'
      });
    } else {
      // Reset form for new product
      setFormData({
        name: '',
        description: '',
        sku: '',
        costPrice: '',
        salePrice: '',
        stock: '',
        brand: '',
        supplier: '',
        lowStockThreshold: '5'
      });
    }
  }, [product]);

  // Capitalize first letter of each word
  const capitalizeWords = (text: string): string => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Auto-capitalize product name, brand, and supplier
    let processedValue = value;
    if (name === 'name' || name === 'brand' || name === 'supplier') {
      processedValue = capitalizeWords(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAddNewBrand = () => {
    if (newBrand.trim()) {
      const capitalizedBrand = capitalizeWords(newBrand.trim());
      setFormData(prev => ({ ...prev, brand: capitalizedBrand }));
      setBrandsList(prev => [...prev, capitalizedBrand].sort());
      setNewBrand('');
      setShowNewBrand(false);
      toast.success(`Brand "${capitalizedBrand}" added successfully!`);
    }
  };

  const handleAddNewSupplier = () => {
    if (newSupplier.trim()) {
      const capitalizedSupplier = capitalizeWords(newSupplier.trim());
      setFormData(prev => ({ ...prev, supplier: capitalizedSupplier }));
      setSuppliersList(prev => [...prev, capitalizedSupplier].sort());
      setNewSupplier('');
      setShowNewSupplier(false);
      toast.success(`Supplier "${capitalizedSupplier}" added successfully!`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Prepare data for validation - convert empty strings to "" and valid numbers to numbers
    const getNumericValue = (value: string): number | "" => {
      if (value === '') return '';
      const num = parseFloat(value);
      return isNaN(num) ? '' : num;
    };

    const validationData = {
      name: formData.name,
      costPrice: getNumericValue(formData.costPrice),
      salePrice: getNumericValue(formData.salePrice),
      stock: getNumericValue(formData.stock),
      category: formData.brand, // Using brand as category for validation
      brand: formData.brand,
      supplier: formData.supplier,
      description: formData.description,
      sku: formData.sku
    };

    // Validate form using the imported function
    const validationErrors = validateProductForm(validationData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const productData = {
        id: product?.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        sku: formData.sku.trim() || undefined,
        costPrice: parseFloat(formData.costPrice),
        salePrice: parseFloat(formData.salePrice),
        stock: parseInt(formData.stock),
        brand: formData.brand.trim() || undefined,
        supplier: formData.supplier.trim() || undefined,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
      };

      const result = await addOrUpdateProduct(productData, userId, !!product?.id);
      
      // Show success notification
      if (result.isEditing) {
        toast.success('Product updated successfully!');
      } else {
        toast.success('Product added successfully!');
      }
      
      // Call parent's save handler
      onSave(result.isEditing);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product. Please try again.');
      setErrors({ submit: 'Failed to save product. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form state
    setFormData({
      name: '',
      description: '',
      sku: '',
      costPrice: '',
      salePrice: '',
      stock: '',
      brand: '',
      supplier: '',
      lowStockThreshold: '5'
    });
    setErrors({});
    setShowNewBrand(false);
    setShowNewSupplier(false);
    setNewBrand('');
    setNewSupplier('');
    
    // Call parent's cancel handler
    onCancel();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter product name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            <p className="text-xs text-gray-500 mt-1">First letter of each word will be capitalized automatically</p>
          </div>

          {/* SKU */}
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU (Auto-generated if empty)
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.sku ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Leave empty for auto-generation"
            />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {formData.name ? `Will generate: ${formData.name.substring(0, 3).toUpperCase()}-001` : 'Enter product name first'}
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

          {/* Low Stock Threshold */}
          <div>
            <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Alert
            </label>
            <input
              type="number"
              id="lowStockThreshold"
              name="lowStockThreshold"
              value={formData.lowStockThreshold}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="5"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this number</p>
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
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
}