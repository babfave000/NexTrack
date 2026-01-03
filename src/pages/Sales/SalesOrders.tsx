// src/pages/Sales/SalesOrders.tsx

import OrderForm from '../../components/Orders/OrderForm';
import OrderList from '../../components/Orders/OrderList';
import { useNavigate } from 'react-router-dom';

export default function SalesOrders() {
  // Removed unused setSelectedOrderId state
  const navigate = useNavigate();

  const handleViewOrder = (orderId: number) => {
    navigate(`/sales/${orderId}`); // navigates to SalesDetail.tsx
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🧾 Sales Orders</h1>

      {/* Order creation form */}
      <div className="bg-white p-4 shadow rounded mb-8">
        <OrderForm
          mode="sales"
          onSave={() => {
            // Placeholder: Add notification/toast or refresh trigger if needed
          }}
        />
      </div>

      {/* Sales order list */}
      <div className="bg-white p-4 shadow rounded">
        <OrderList
          mode="sales"
          onView={handleViewOrder}
          // onEdit={() => {}} // Add if editable orders are supported
        />
      </div>
    </div>
  );
}
