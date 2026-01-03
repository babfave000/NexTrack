// src/pages/Purchases/PurchasePage.tsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import PurchaseOrderDetail from './PurchaseOrderDetail';
import { useUserData } from '../../hooks/useUserData';
import { addPurchaseOrder, updatePurchaseOrderPaymentStatus, addSupplier, addProduct } from '../../db/operations';

interface PurchaseItem {
  productId: number;
  productName: string;
  brand: string;
  quantity: number;
  price: number;
  total: number;
}

interface PurchasePageProps {
  initialTab?: 'new' | 'history';
}

export default function PurchasePage({ initialTab = 'new' }: PurchasePageProps) {
  const { isAuthenticated, user, products: userProducts, suppliers: userSuppliers, purchaseOrders: userPurchaseOrders } = useUserData();
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [selectedPO, setSelectedPO] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<number | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<number | null>(null);
  
  // New supplier form state
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState('');
  const [supplierSuccess, setSupplierSuccess] = useState('');

  // New product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductCostPrice, setNewProductCostPrice] = useState<number>(0);
  const [newProductPrice, setNewProductPrice] = useState<number>(0);
  const [newProductStock, setNewProductStock] = useState<number>(0);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      window.history.replaceState(null, '', '/purchase/history');
    } else {
      window.history.replaceState(null, '', '/purchase');
    }
  }, [activeTab]);

  // Sync with initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const addItem = () => {
    if (!selectedProductId || quantity <= 0 || price <= 0) return;
    
    const product = userProducts?.find(p => p.id === selectedProductId);
    if (!product) return;

    const newItem: PurchaseItem = {
      productId: selectedProductId,
      productName: product.name,
      brand: product.brand || 'No Brand',
      quantity,
      price,
      total: quantity * price
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setQuantity(1);
    setPrice(0);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      setSelectedProductId('');
      setPrice(0);
      return;
    }
    
    const productId = Number(value);
    setSelectedProductId(productId);
    
    const product = userProducts?.find(p => p.id === productId);
    if (product) {
      setPrice(product.costPrice || 0);
    }
  };

  const savePurchaseOrder = async () => {
    if (!user || items.length === 0 || !userProducts) return;

    setIsSaving(true);
    try {
      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }));

      const total = items.reduce((sum, item) => sum + item.total, 0);

      // Save purchase order using the new authenticated function
      await addPurchaseOrder({
        supplier: supplier.trim() || 'No Supplier',
        items: orderItems,
        total,
        date: new Date().toISOString(),
        status: 'approved' as const,
        paymentStatus: paymentStatus
      }, user.id!);

      setSupplier('');
      setItems([]);
      setSelectedProductId('');
      setQuantity(1);
      setPrice(0);
      setPaymentStatus('paid');
      
      // Switch to history tab after successful save
      setActiveTab('history');
    } catch (error) {
      console.error('Failed to save purchase order:', error);
      alert('Failed to save purchase order. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSupplierName.trim()) return;

    setIsAddingSupplier(true);
    setSupplierError('');
    setSupplierSuccess('');

    try {
      await addSupplier({
        name: newSupplierName.trim(),
        contactEmail: newSupplierEmail.trim(),
        phone: newSupplierPhone.trim(),
        address: newSupplierAddress.trim(),
      }, user.id!);

      setSupplierSuccess('Supplier added successfully!');
      setNewSupplierName('');
      setNewSupplierEmail('');
      setNewSupplierPhone('');
      setNewSupplierAddress('');
      
      // Auto-select the new supplier in the dropdown
      setSupplier(newSupplierName.trim());
      
      // Close the form after a delay
      setTimeout(() => {
        setShowSupplierForm(false);
        setSupplierSuccess('');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to add supplier:', error);
      setSupplierError(error instanceof Error ? error.message : 'Failed to add supplier');
    } finally {
      setIsAddingSupplier(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProductName.trim()) return;

    setIsAddingProduct(true);
    setProductError('');
    setProductSuccess('');

    try {
      await addProduct({
        name: newProductName.trim(),
        brand: newProductBrand.trim(),
        costPrice: newProductCostPrice,
        salePrice: newProductPrice,
        stock: newProductStock,
        lowStockThreshold: 0
      }, user.id!);

      setProductSuccess('Product added successfully!');
      setNewProductName('');
      setNewProductBrand('');
      setNewProductCostPrice(0);
      setNewProductPrice(0);
      setNewProductStock(0);
      
      // Close the form after a delay
      setTimeout(() => {
        setShowProductForm(false);
        setProductSuccess('');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to add product:', error);
      setProductError(error instanceof Error ? error.message : 'Failed to add product');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handlePaymentStatusEdit = (poId: number) => {
    setEditingPaymentStatus(poId);
  };

  const handlePaymentStatusChange = async (poId: number, newStatus: 'paid' | 'unpaid') => {
    if (!user) return;

    setUpdatingPayment(poId);
    try {
      await updatePurchaseOrderPaymentStatus(poId, newStatus, user.id!);
      setEditingPaymentStatus(null);
    } catch (error) {
      console.error('Failed to update payment status:', error);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setUpdatingPayment(null);
    }
  };

  const cancelPaymentStatusEdit = () => {
    setEditingPaymentStatus(null);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Please log in to access purchase management.</p>
        </div>
      </div>
    );
  }

  if (selectedPO !== null) {
    return <PurchaseOrderDetail poId={selectedPO} onBack={() => setSelectedPO(null)} userId={user.id!} />;
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage supplier orders and inventory restocking</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'new' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            New Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Order History
          </button>
        </div>
      </div>

      {/* New Purchase Order Form */}
      {activeTab === 'new' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Create New Purchase Order</h2>
            {items.length > 0 && (
              <div className="text-lg font-bold text-blue-600">
                Total: ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Supplier Selection - Now with Add Supplier Option */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="supplier-select" className="block text-sm font-medium text-gray-700">
                Supplier (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowSupplierForm(!showSupplierForm)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {showSupplierForm ? 'Cancel' : 'Add New Supplier'}
              </button>
            </div>

            {!showSupplierForm ? (
              <>
                <select
                  id="supplier-select"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No supplier selected</option>
                  {userSuppliers?.map(supplier => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a supplier if applicable, or leave blank for general purchases
                </p>
              </>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Add New Supplier</h4>
                
                <form onSubmit={handleAddSupplier} className="space-y-3">
                  <div>
                    <label htmlFor="new-supplier-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Name *
                    </label>
                    <input
                      id="new-supplier-name"
                      type="text"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter supplier name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="new-supplier-email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        id="new-supplier-email"
                        type="email"
                        value={newSupplierEmail}
                        onChange={(e) => setNewSupplierEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="supplier@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="new-supplier-phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        id="new-supplier-phone"
                        type="tel"
                        value={newSupplierPhone}
                        onChange={(e) => setNewSupplierPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+234 800 000 0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="new-supplier-address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      id="new-supplier-address"
                      value={newSupplierAddress}
                      onChange={(e) => setNewSupplierAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Supplier address..."
                      rows={2}
                    />
                  </div>

                  {/* Supplier Form Status Messages */}
                  {supplierError && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-700 text-sm">{supplierError}</span>
                    </div>
                  )}

                  {supplierSuccess && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-700 text-sm">{supplierSuccess}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isAddingSupplier || !newSupplierName.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      {isAddingSupplier ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Add Supplier
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSupplierForm(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Payment Status Selection */}
          <div className="mb-6">
            <label htmlFor="payment-status" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Status *
            </label>
            <select
              id="payment-status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'unpaid')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {paymentStatus === 'paid' 
                ? 'Amount will be recorded as paid purchase' 
                : 'Amount will be recorded as payable'
              }
            </p>
          </div>

          {/* Product Selection Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Add Products</h3>
              <button
                type="button"
                onClick={() => setShowProductForm(!showProductForm)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {showProductForm ? 'Cancel' : 'Add New Product'}
              </button>
            </div>

            {showProductForm ? (
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                <h4 className="font-medium text-gray-700 mb-3">Add New Product</h4>
                
                <form onSubmit={handleAddProduct} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="new-product-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name *
                      </label>
                      <input
                        id="new-product-name"
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter product name"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="new-product-brand" className="block text-sm font-medium text-gray-700 mb-1">
                        Brand
                      </label>
                      <input
                        id="new-product-brand"
                        type="text"
                        value={newProductBrand}
                        onChange={(e) => setNewProductBrand(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter brand name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="new-product-cost-price" className="block text-sm font-medium text-gray-700 mb-1">
                        Cost Price (₦) *
                      </label>
                      <input
                        id="new-product-cost-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newProductCostPrice}
                        onChange={(e) => setNewProductCostPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="new-product-price" className="block text-sm font-medium text-gray-700 mb-1">
                        Price (₦) *
                      </label>
                      <input
                        id="new-product-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="new-product-stock" className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Stock
                      </label>
                      <input
                        id="new-product-stock"
                        type="number"
                        min="0"
                        value={newProductStock}
                        onChange={(e) => setNewProductStock(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Product Form Status Messages */}
                  {productError && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-700 text-sm">{productError}</span>
                    </div>
                  )}

                  {productSuccess && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-700 text-sm">{productSuccess}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isAddingProduct || !newProductName.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      {isAddingProduct ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Add Product
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div className="md:col-span-2">
                  <label htmlFor="product-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    id="product-select"
                    value={selectedProductId}
                    onChange={handleProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a product</option>
                    {userProducts?.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.brand && `- ${product.brand}`} {product.stock !== undefined && `(Stock: ${product.stock})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Qty"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={addItem}
                    disabled={!selectedProductId || quantity <= 0 || price <= 0}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-4">Order Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price (₦)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal (₦)</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.brand}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">₦{item.price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">₦{item.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Remove item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={savePurchaseOrder}
            disabled={items.length === 0 || isSaving}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Save Purchase Order
              </>
            )}
          </button>
        </div>
      )}

      {/* Purchase Order History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Purchase Order History</h2>
            <span className="text-sm text-gray-500">
              {userPurchaseOrders?.length || 0} orders total
            </span>
          </div>

          {userPurchaseOrders && userPurchaseOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₦)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userPurchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {po.supplier === 'No Supplier' ? (
                          <span className="text-gray-400 italic">No supplier</span>
                        ) : (
                          po.supplier
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {format(new Date(po.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">
                        ₦{po.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        {editingPaymentStatus === po.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <select
                              value={po.paymentStatus || 'unpaid'}
                              onChange={(e) => handlePaymentStatusChange(po.id!, e.target.value as 'paid' | 'unpaid')}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              disabled={updatingPayment === po.id}
                            >
                              <option value="paid">Paid</option>
                              <option value="unpaid">Unpaid</option>
                            </select>
                            <button
                              onClick={cancelPaymentStatusEdit}
                              className="text-gray-500 hover:text-gray-700 text-xs"
                              disabled={updatingPayment === po.id}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              po.paymentStatus === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {po.paymentStatus || 'unpaid'}
                            </span>
                            <button
                              onClick={() => handlePaymentStatusEdit(po.id!)}
                              className="text-blue-600 hover:text-blue-800 transition-colors text-xs"
                              title="Edit payment status"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {updatingPayment === po.id && (
                          <div className="mt-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mx-auto"></div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 text-center">
                        {po.items?.length || 0}
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <button
                          onClick={() => po.id !== undefined && setSelectedPO(po.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders yet</h3>
              <p className="text-gray-600">Create your first purchase order to get started</p>
              <button
                onClick={() => setActiveTab('new')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Create Purchase Order
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}