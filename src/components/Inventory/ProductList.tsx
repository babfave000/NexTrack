// src/components/Inventory/ProductList.tsx
import { useEffect, useState, useMemo } from 'react';
import { type Product } from '../../db/dexie';
import { useUserData } from '../../hooks/useUserData';
import { useSettings } from '../../hooks/useSettings';
import { ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'healthy'>('all');
  
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

  const lowStockCount = useMemo(
    () => products?.filter(product => product.stock <= threshold).length || 0,
    [products, threshold]
  );

  // Filter first so the table remains useful as the catalogue grows, then sort the result.
  const sortedProducts = useMemo(() => {
    if (!products) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return products
      .filter(product => {
        const matchesSearch = !normalizedSearch || [product.name, product.sku, product.brand, product.supplier]
          .some(value => value?.toLowerCase().includes(normalizedSearch));
        const isLowStock = product.stock <= threshold;
        const matchesStock = stockFilter === 'all' || (stockFilter === 'low' ? isLowStock : !isLowStock);
        return matchesSearch && matchesStock;
      })
      .sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
      });
  }, [products, searchTerm, stockFilter, threshold]);

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
    <div className="inventory-list-panel bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Product Inventory</h2>
            <p className="text-sm text-gray-500 mt-1">
              {sortedProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''} shown
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:min-w-[32rem]">
            <label className="relative flex-1">
              <span className="sr-only">Search inventory</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search name, SKU, brand..."
                className="pl-9"
              />
            </label>
            <select
              aria-label="Filter stock status"
              value={stockFilter}
              onChange={event => setStockFilter(event.target.value as 'all' | 'low' | 'healthy')}
              className="sm:w-40"
            >
              <option value="all">All stock</option>
              <option value="low">Low stock ({lowStockCount})</option>
              <option value="healthy">Healthy stock</option>
            </select>
          </div>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 px-6 py-3 bg-orange-50 border-b border-orange-100 text-sm text-orange-800">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
          <span><strong>{lowStockCount}</strong> product{lowStockCount !== 1 ? 's are' : ' is'} below your stock threshold of {threshold}.</span>
        </div>
      )}

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

      {sortedProducts.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="font-medium text-gray-800">No matching products</p>
          <p className="mt-1 text-sm text-gray-500">Try a different search term or stock filter.</p>
        </div>
      )}
    </div>
  );
}