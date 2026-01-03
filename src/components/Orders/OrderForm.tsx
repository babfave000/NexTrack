// src/components/Orders/OrderForm.tsx
import { useState } from 'react';
import { type SalesOrder, type PurchaseOrder } from '../../db/dexie';
import { useUserData } from '../../hooks/useUserData';
import { addSalesOrder, addPurchaseOrder } from '../../db/operations';

type Mode = 'sales' | 'purchase';

interface Props {
  mode: Mode;
  onSave: () => void;
}

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  price: number;
  total: number;
}

export default function OrderForm({ mode, onSave }: Props) {
  const { user, products } = useUserData();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [party, setParty] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addItem = () => {
    if (!products || products.length === 0) return;
    const product = products[0];
    const unitPrice = mode === 'sales' ? product.salePrice : product.costPrice;
    setItems((prev) => [
      ...prev,
      {
        productId: product.id!,
        productName: product.name,
        quantity: 1,
        unitPrice,
        price: unitPrice,
        total: unitPrice,
      },
    ]);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setItems((prev) => {
      const newItems = [...prev];
      let itemToUpdate = { ...newItems[index] };
  
      if (field === 'productId') {
        const product = products?.find((p) => p.id === value);
        if (product) {
          const unitPrice = mode === 'sales' ? product.salePrice : product.costPrice;
          itemToUpdate = {
            ...itemToUpdate,
            productId: product.id!,
            productName: product.name,
            unitPrice: unitPrice,
            price: unitPrice,
            total: unitPrice * itemToUpdate.quantity,
          };
        }
      } else if (field === 'quantity') {
        itemToUpdate.quantity = +value;
        itemToUpdate.total = itemToUpdate.unitPrice * itemToUpdate.quantity;
      }
  
      newItems[index] = itemToUpdate;
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const isValid = party.trim() !== '' && items.length > 0 && user;

  const handleSubmit = async () => {
    if (!user || !isValid) {
      alert('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const baseOrder = {
        items,
        total: totalAmount,
        date: new Date().toISOString(),
        status: 'draft' as const,
        paymentStatus: 'unpaid' as const,
      };

      if (mode === 'sales') {
        const salesOrder: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
          ...baseOrder,
          customer: party,
        };
        await addSalesOrder(salesOrder, user.id!);
      } else {
        const purchaseOrder: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
          ...baseOrder,
          supplier: party,
        };
        await addPurchaseOrder(purchaseOrder, user.id!);
      }

      setItems([]);
      setParty('');
      onSave();
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Failed to save order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        New {mode === 'sales' ? 'Sales' : 'Purchase'} Order
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {mode === 'sales' ? 'Customer Name' : 'Supplier Name'} *
        </label>
        <input
          placeholder={mode === 'sales' ? 'Enter customer name' : 'Enter supplier name'}
          value={party}
          onChange={(e) => setParty(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Order Items</h3>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
            <select
              value={item.productId}
              onChange={(e) => updateItem(i, 'productId', parseInt(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - ₦{(mode === 'sales' ? p.salePrice : p.costPrice).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(i, 'quantity', e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Qty"
              disabled={isLoading}
            />

            <div className="text-sm font-medium text-gray-900 w-24 text-right">
              ₦{item.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>

            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
          disabled={isLoading || !products || products.length === 0}
        >
          + Add Item
        </button>
      </div>

      <div className="flex justify-between items-center border-t pt-4">
        <div className="text-lg font-semibold text-gray-900">Total:</div>
        <div className="text-xl font-bold text-green-700">
          ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Saving...' : 'Save Order'}
      </button>
    </div>
  );
}