// src/pages/Sales/InvoicePreview.tsx
//
// Preview wrapper used by SalesOrderDetail and (optionally) SalesForm.
// Layout lives entirely in <InvoiceOrder />; this component only:
//   (1) Ensures the order has a sensible shape for the canonical renderer,
//   (2) Forwards showPrintButton (default true) to the renderer.

import InvoiceOrder from './InvoiceOrder';

interface InvoiceItem {
  product: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  price?: number;
  total?: number;
}

interface SalesOrder {
  id: number | string;
  customer?: string;
  date: string;
  items: InvoiceItem[];
  total?: number;
  status?: string;
  paymentStatus?: string;
  notes?: string;
}

interface InvoicePreviewProps {
  order: SalesOrder;
  showPrintButton?: boolean;
}

export default function InvoicePreview({ order, showPrintButton = true }: InvoicePreviewProps) {
  return <InvoiceOrder order={order} showPrintButton={showPrintButton} />;
}
