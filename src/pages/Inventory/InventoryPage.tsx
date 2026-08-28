// src/pages/Inventory/InventoryPage.tsx
import { useState } from 'react';
import ProductForm from '../../components/Inventory/ProductForm';
import ProductList from '../../components/Inventory/ProductList';
import { useUserData } from '../../hooks/useUserData';
import { useSettings } from '../../hooks/useSettings';
import type { Product } from '../../db/dexie'; // Import the Product type
import { addProduct, updateProduct } from '../../db/operations/products';

export default function Inventory() {
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [refreshList, setRefreshList] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('list');
  const [, setIsFormExpanded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { isAuthenticated, user } = useUserData();
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();

  const handleSave = () => {
    setSelectedProduct(undefined);
    setRefreshList(prev => !prev);
    setIsFormExpanded(false);
    setActiveTab('list');
    setFormKey(prev => prev + 1);
  };

  const handleSubmit = async (product: Omit<Product, 'id'>) => {
    if (selectedProduct?.id !== undefined) {
      await updateProduct(selectedProduct.id, product, user!.id!);
    } else {
      await addProduct(product, user!.id!);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsFormExpanded(true);
    setActiveTab('form');
  };

  const handleCancelEdit = () => {
    setSelectedProduct(undefined);
    setIsFormExpanded(false);
    setActiveTab('list');
  };

  const handleThresholdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Number(e.target.value));
    await updateSettings({ lowStockThreshold: value });
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Please log in to access inventory management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-page max-w-6xl mx-auto px-4 py-6">
      <div className="inventory-heading">
        <div>
          <p className="dashboard-kicker">Catalogue control</p>
          <h1 className="text-2xl font-bold text-gray-800">Inventory workspace</h1>
          <p className="text-gray-600 mt-1">Keep product details, pricing, and stock levels in sync.</p>
        </div>
        
        {/* Low Stock Alert Form - Now stands alone in the header */}
        <div className="inventory-threshold">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                Alert threshold
              </label>
              <input
                type="number"
                id="lowStockThreshold"
                min={1}
                value={settingsLoading ? '' : settings.lowStockThreshold}
                onChange={handleThresholdChange}
                disabled={settingsLoading}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={settingsLoading ? "Loading..." : "5"}
              />
            </div>
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-500 max-w-[150px]">
                Flag products when stock drops below this number.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="inventory-workspace bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-4 pt-4">
          <div className="inventory-tabs" role="tablist" aria-label="Inventory workspace views">
            <button
              role="tab"
              aria-selected={activeTab === 'form'}
              className={`inventory-tab ${activeTab === 'form' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              {selectedProduct ? 'Edit Product' : 'Add Product'}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'list'}
              className={`inventory-tab ${activeTab === 'list' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Product List
            </button>
          </div>
        </div>
        
        <div className={`transition-all duration-300 ${activeTab === 'form' ? 'block' : 'hidden'}`}>
          <div className="p-6">
            <ProductForm
              key={formKey}
              product={selectedProduct}
              onSubmit={handleSubmit}
              onSave={handleSave}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
        
        <div className={`transition-all duration-300 ${activeTab === 'list' ? 'block' : 'hidden'}`}>
          <div className="p-6">
            <ProductList
              onEdit={handleEdit}
              refreshTrigger={refreshList}
              userId={user.id!}
            />
          </div>
        </div>
      </div>
    </div>
  );
}