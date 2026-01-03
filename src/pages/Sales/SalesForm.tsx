// src/pages/Sales/SalesForm.tsx
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useUserData } from '../../hooks/useUserData';
import { db, type SalesOrder } from '../../db/dexie';
import { addSalesOrder, updateSalesOrder, getSalesOrder } from "../../db/operations/sales";
import { toast } from 'react-toastify';

const emptyItem: SalesOrder['items'][number] = { 
  productId: 0, 
  productName: '', 
  quantity: 1, 
  unitPrice: 0, 
  price: 0, 
  total: 0 
};

const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

interface SalesFormProps {
  orderId?: number;
  onSave: () => void;
  onCancel: () => void;
  userId: number;
}

const SalesForm = ({ orderId, onSave, onCancel, userId }: SalesFormProps) => {
  const { id } = useParams();
  const isEdit = Boolean(orderId || id);
  const actualOrderId = orderId || (id ? Number(id) : undefined);

  const { products } = useUserData();

  const [order, setOrder] = useState<Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>({
    date: new Date().toISOString().slice(0, 10),
    customer: '',
    status: 'draft',
    paymentStatus: 'unpaid',
    items: [deepClone(emptyItem)],
    notes: '',
    total: 0,
  });

  const [changeLeft, setChangeLeft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Check if this is an approved order (read-only except payment status)
  const isApprovedOrder = order.status === 'approved';

  // Sort products alphabetically by name with brands
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    
    return [...products].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [products]);

  useEffect(() => {
    const loadOrder = async () => {
      if (actualOrderId) {
        const orderData = await getSalesOrder(actualOrderId, userId);
        if (orderData) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, userId: _userId, createdAt, updatedAt, ...rest } = orderData;
          setOrder(rest);
        }
      }
    };

    loadOrder();
  }, [actualOrderId, userId]);

  // FIXED: Proper decimal precision function
  const parseDecimal = (value: string): number => {
    if (!value) return 0;
    
    // Handle comma as decimal separator (common in some locales)
    const normalizedValue = value.replace(',', '.');
    
    // Parse as float and round to 2 decimal places using integer math
    const numberValue = Number(normalizedValue);
    
    // Use integer math to avoid floating point errors
    return Math.round(numberValue * 100) / 100;
  };

  const handleItemChange = (index: number, field: keyof typeof emptyItem, value: string | number) => {
    if (isApprovedOrder) return; // Prevent changes for approved orders
    
    const updatedItems = [...order.items];
    const item = updatedItems[index];

    if (field === 'productId') {
      const productId = Number(value);
      const product = sortedProducts?.find(p => p.id === productId);
      
      if (product) {
        item.productId = productId;
        item.productName = product.name;
        item.unitPrice = product.salePrice ?? 0;
        item.price = product.salePrice ?? 0;
        item.total = item.quantity * item.unitPrice;
      } else {
        item.productId = 0;
        item.productName = '';
        item.unitPrice = 0;
        item.price = 0;
        item.total = 0;
      }
    } else if (field === 'quantity') {
      item.quantity = Number(value);
      item.total = item.unitPrice * item.quantity;
    } else if (field === 'unitPrice') {
      item.unitPrice = Number(value);
      item.price = Number(value);
      item.total = item.quantity * item.unitPrice;
    }

    updatedItems[index] = item;
    setOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    if (isApprovedOrder) return; // Prevent adding items for approved orders
    setOrder(prev => ({ ...prev, items: [...prev.items, deepClone(emptyItem)] }));
  };

  const removeItem = (index: number) => {
    if (isApprovedOrder) return; // Prevent removing items for approved orders
    const items = [...order.items];
    items.splice(index, 1);
    setOrder(prev => ({ ...prev, items }));
  };

  const totalAmount = order.items.reduce((sum, item) => sum + item.total, 0);

  const handleSaveAsDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveOrder('draft');
  };

  const handleApproveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate stock before approval
    for (const item of order.items) {
      if (!item.productId || item.quantity <= 0) continue;
      const product = await db.products.get(item.productId);
      if (product && product.userId === userId && (product.stock ?? 0) < item.quantity) {
        alert(`Cannot approve order: Insufficient stock for ${product.name}. Only ${product.stock} available.`);
        return;
      }
    }

    if (window.confirm('Are you sure you want to approve this order? This will deduct stock from inventory.')) {
      await saveOrder('approved');
    }
  };

  const saveOrder = async (status: SalesOrder['status']) => {
    setIsSaving(true);
    try {
      // For approved orders, only update payment status, keep other fields as is
      const orderData = isApprovedOrder 
        ? { 
            ...order, 
            paymentStatus: order.paymentStatus, 
            status: 'approved' as const 
          }
        : { 
            ...order, 
            total: totalAmount, 
            status 
          };
      
      console.log('Saving order:', orderData);
      
      let savedOrderId;
      if (isEdit && actualOrderId) {
        await updateSalesOrder(actualOrderId, orderData, userId);
        savedOrderId = actualOrderId;
        console.log('Order updated successfully');
      } else {
        savedOrderId = await addSalesOrder(orderData, userId);
        console.log('Order created successfully with ID:', savedOrderId);
      }

      // Save change left if amount is provided - FIXED: Use proper decimal precision
      if (changeLeft && parseDecimal(changeLeft) > 0 && !isApprovedOrder) {
        const changeAmount = parseDecimal(changeLeft);
        
        const changeRecord = {
          orderId: savedOrderId,
          customerName: order.customer,
          amount: changeAmount,
          status: 'uncollected' as const,
          createdAt: new Date().toISOString(),
          userId,
        };

        await db.changeLeft.add(changeRecord);
        console.log('Change left recorded successfully');
        
        // FIXED: Use the same amount for display to ensure consistency
        toast.success(`Order saved and ₦${changeAmount.toFixed(2)} change left recorded!`);
      } else {
        if (isApprovedOrder) {
          toast.success('Payment status updated successfully!');
        } else {
          toast.success('Order saved successfully!');
        }
      }
      
      onSave();
      
    } catch (error) {
      console.error('Failed to save sales order:', error);
      alert('Failed to save sales order. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasLowStockItems = order.items.some(item => {
    if (!item.productId) return false;
    const product = sortedProducts?.find(p => p.id === item.productId);
    return product && product.userId === userId && (product.stock ?? 0) < item.quantity;
  });

  // Helper function to format product display name with brand
  const getProductDisplayName = (product: { name?: string; brand?: string }) => {
    const baseName = product.name || 'Unknown Product';
    if (product.brand) {
      return `${baseName} (${product.brand})`;
    }
    return baseName;
  };

  // FIXED: Format currency with proper rounding
  const formatCurrency = (amount: number) => {
    // Round to 2 decimal places to ensure consistency
    const roundedAmount = Math.round(amount * 100) / 100;
    return `₦${roundedAmount.toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold">
          {isEdit ? (isApprovedOrder ? 'Update Payment Status' : 'Edit Sales Order') : 'New Sales Order'}
        </h2>
        {isApprovedOrder && (
          <span className="ml-4 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full border border-yellow-200">
            Only payment status can be edited
          </span>
        )}
      </div>

      <form className="space-y-6 bg-white p-4 rounded shadow">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            Date
            <input
              type="date"
              className={`border px-3 py-2 rounded ${isApprovedOrder ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
              value={order.date}
              onChange={e => !isApprovedOrder && setOrder({ ...order, date: e.target.value })}
              required
              disabled={isApprovedOrder}
            />
          </label>

          <label className="flex flex-col">
            Customer
            <input
              type="text"
              className={`border px-3 py-2 rounded ${isApprovedOrder ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
              value={order.customer}
              onChange={e => !isApprovedOrder && setOrder({ ...order, customer: e.target.value })}
              required
              disabled={isApprovedOrder}
            />
          </label>

          <label className="flex flex-col">
            Payment Status
            <select
              className="border px-3 py-2 rounded"
              value={order.paymentStatus}
              onChange={e =>
                setOrder({ ...order, paymentStatus: e.target.value as SalesOrder['paymentStatus'] })
              }
            >
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </label>

          <label className="flex flex-col">
            Change Left (₦)
            <input
              type="number"
              step="0.01"
              min="0"
              value={changeLeft}
              onChange={(e) => !isApprovedOrder && setChangeLeft(e.target.value)}
              className={`border px-3 py-2 rounded ${isApprovedOrder ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
              placeholder="0.00"
              disabled={isApprovedOrder}
            />
            <p className="text-xs text-gray-500 mt-1">
              Amount of change owed to customer (optional)
            </p>
          </label>
        </div>

        {/* Items section - hide for approved orders */}
        {!isApprovedOrder && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Items</h3>
            {hasLowStockItems && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded mb-4">
                ⚠️ Warning: Some items have insufficient stock for the requested quantities.
              </div>
            )}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2">Product</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Unit Price</th>
                  <th className="p-2">Total</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => {
                  const product = sortedProducts?.find(p => p.id === item.productId);
                  const lowStock = product && product.userId === userId && (product.stock ?? 0) < item.quantity;
                  return (
                    <tr key={idx} className={lowStock ? 'bg-red-50' : ''}>
                      <td className="p-2">
                        <select
                          className="border px-2 py-1 rounded w-full"
                          value={item.productId || ''}
                          onChange={e => handleItemChange(idx, 'productId', Number(e.target.value))}
                          required
                        >
                          <option value="">Select a product</option>
                          {sortedProducts?.map(prod => (
                            <option key={prod.id} value={prod.id}>
                              {getProductDisplayName(prod)} {prod.stock !== undefined ? `(Stock: ${prod.stock})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="border px-2 py-1 rounded w-20"
                          min={1}
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="border px-2 py-1 rounded w-24"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          readOnly={!!item.productId}
                        />
                      </td>
                      <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                      <td className="p-2">
                        <button 
                          type="button" 
                          onClick={() => removeItem(idx)} 
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button 
              type="button" 
              onClick={addItem} 
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Item
            </button>
          </div>
        )}

        {/* Notes section - hide for approved orders */}
        {!isApprovedOrder && (
          <div className="flex justify-between items-center">
            <textarea
              rows={3}
              className="border px-3 py-2 rounded w-full"
              placeholder="Notes (optional)"
              value={order.notes}
              onChange={e => setOrder({ ...order, notes: e.target.value })}
            />
            <div className="text-right font-bold text-xl pl-6">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        )}

        {/* Show order total for approved orders (read-only) */}
        {isApprovedOrder && (
          <div className="flex justify-end">
            <div className="text-right font-bold text-xl">
              Order Total: {formatCurrency(totalAmount)}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button 
            type="button" 
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
            disabled={isSaving}
          >
            Cancel
          </button>
          
          {!isApprovedOrder && (
            <>
              <button 
                type="button" 
                onClick={handleSaveAsDraft}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </button>
              
              <button 
                type="button" 
                onClick={handleApproveOrder}
                disabled={hasLowStockItems || isSaving}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Processing...' : 'Approve Order'}
              </button>
            </>
          )}
          
          {isApprovedOrder && (
            <button 
              type="button" 
              onClick={() => saveOrder('approved')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Updating...' : 'Update Payment Status'}
            </button>
          )}
        </div>

        {/* Debug info */}
        {isSaving && (
          <div className="text-center text-blue-600">
            {isApprovedOrder ? 'Updating payment status...' : 'Saving order, please wait...'}
          </div>
        )}
      </form>
    </div>
  );
};

export default SalesForm;