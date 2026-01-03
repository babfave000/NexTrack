// src/components/Inventory/ProductList.tsx
import { useEffect, useState, useMemo } from 'react';
import { type Product } from '../../db/dexie';
import { useUserData } from '../../hooks/useUserData';
import { useSettings } from '../../hooks/useSettings';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  onEdit: (product: Product) => void;
  refreshTrigger?: boolean;
  lowStockThreshold?: number;
  userId: number;
}

export default function ProductList({
  onEdit,
  lowStockThreshold: propThreshold}: Props) {
  const { products } = useUserData();
  const { settings } = useSettings();
  const [threshold, setThreshold] = useState<number>(settings.lowStockThreshold); // FIXED: Use settings value
  
  useEffect(() => {
    const loadThreshold = async () => {
      if (propThreshold !== undefined) {
        setThreshold(propThreshold);
      } else {
        // Use the threshold from settings context
        setThreshold(settings.lowStockThreshold);
      }
    };
    loadThreshold();
  }, [propThreshold, settings.lowStockThreshold]);

  // Sort products alphabetically by name
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    
    return [...products].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [products]);

  if (!products) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-600">Get started by adding your first product</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Product Inventory</h2>
          <div className="text-sm text-gray-500">
            {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProducts.map((product) => {
              const isLowStock = product.stock <= threshold;
              const salePrice = Number(product.salePrice) || 0;
              const costPrice = Number(product.costPrice) || 0;

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-gray-50 transition-colors ${isLowStock ? 'bg-red-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}
                      <div className="flex items-center gap-2">
                        {product.brand && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.brand}
                          </span>
                        )}
                      </div>
                    </div>
                    {product.description && (
                      <div className="text-xs text-gray-500 mt-1">{product.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{product.sku || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.supplier || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isLowStock ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {product.stock}
                      </span>
                      {isLowStock && (
                        <ExclamationTriangleIcon
                          className="w-4 h-4 text-red-500"
                          title="Low Stock"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₦{salePrice.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₦{costPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}