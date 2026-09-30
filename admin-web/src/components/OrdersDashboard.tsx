import React, { useState } from 'react';
import { Search, Eye, CheckCircle2, Truck, XCircle, UserCheck, Phone, MapPin, Printer, Scissors, Bike } from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  weight?: string;
  cuttingType?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  deliverySchedule?: string;
  paymentMethod?: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
  createdAt?: any;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
}

interface OrdersDashboardProps {
  orders: Order[];
  riders: { id: string; fullName: string; phone: string; isOnline?: boolean }[];
}

export default function OrdersDashboard({ orders, riders }: OrdersDashboardProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigningRiderOrderId, setAssigningRiderOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerPhone || '').includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const nowIso = new Date().toISOString();
      const payload: any = {
        status: newStatus,
        updatedAt: nowIso,
      };
      if (newStatus === 'delivered') {
        payload.deliveredAt = nowIso;
      }
      if (newStatus === 'out_for_delivery') {
        payload.dispatchedAt = nowIso;
      }
      await setDoc(orderRef, payload, { merge: true });
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      alert('Failed to update status: ' + (err as any).message);
    }
  };

  const handleAssignRider = async (orderId: string, rider: { id: string; fullName: string; phone: string }) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, {
        riderId: rider.id,
        riderName: rider.fullName,
        riderPhone: rider.phone,
        status: 'out_for_delivery',
        assignedAt: new Date().toISOString(),
      }, { merge: true });
      setAssigningRiderOrderId(null);
    } catch (err) {
      alert('Failed to assign rider: ' + (err as any).message);
    }
  };

  const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const handlePrintKOT = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert('Please allow popups to print Kitchen Order Ticket / Packing Slip.');
      return;
    }

    const dateStr = order.createdAt?.seconds
      ? new Date(order.createdAt.seconds * 1000).toLocaleString('en-IN')
      : new Date().toLocaleString('en-IN');

    const itemsHtml = (order.items || [])
      .map(
        (item) => `
        <tr style="border-bottom: 1px dashed #bbb;">
          <td style="padding: 6px 0; font-size: 13px; font-weight: bold;">
            ${item.name}
            ${item.cuttingType ? `<div style="font-size: 11px; color: #8B0000; font-weight: 800;">CUT: ${item.cuttingType.toUpperCase()}</div>` : ''}
            ${item.weight ? `<div style="font-size: 11px; color: #555;">Weight: ${item.weight}</div>` : ''}
          </td>
          <td style="padding: 6px 0; text-align: center; font-size: 13px; font-weight: bold;">x${item.quantity}</td>
          <td style="padding: 6px 0; text-align: right; font-size: 13px;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT - Order #${order.id.slice(-6)}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; }
          }
          body { font-family: 'Courier New', Courier, monospace; width: 320px; margin: 0 auto; padding: 10px; color: #000; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .title { font-size: 18px; font-weight: bold; }
          .sub { font-size: 11px; }
          .meta { font-size: 11px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px; line-height: 1.4; }
          .pin-box { border: 2px solid #000; text-align: center; padding: 4px; margin: 8px 0; font-weight: bold; font-size: 14px; }
          .notes-box { background: #eee; padding: 6px; font-size: 11px; margin: 6px 0; border-left: 3px solid #000; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          .total { border-top: 2px dashed #000; padding-top: 6px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">CAPTAIN BRO</div>
          <div class="sub">Fresh Meat & Groceries • Warangal</div>
          <div class="sub" style="margin-top: 2px; font-weight: bold;">KITCHEN PACKING SLIP / KOT</div>
        </div>
        <div class="meta">
          <div><b>ORDER:</b> #${order.id}</div>
          <div><b>DATE:</b> ${dateStr}</div>
          <div><b>CUSTOMER:</b> ${order.customerName || 'Customer'} (${order.customerPhone || 'N/A'})</div>
          <div><b>SLOT:</b> ${order.deliverySchedule || 'Instant Delivery (10-30 mins)'}</div>
          <div><b>ADDRESS:</b> ${order.address || 'Address provided at checkout'}</div>
        </div>
        ${(order as any).deliveryPin ? `<div class="pin-box">CUSTOMER VERIFICATION PIN: ${(order as any).deliveryPin}</div>` : ''}
        ${(order as any).notes ? `<div class="notes-box"><b>CUSTOMER NOTE:</b> ${(order as any).notes}</div>` : ''}
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 11px;">
              <th style="text-align: left;">ITEM & CUT</th>
              <th style="text-align: center;">QTY</th>
              <th style="text-align: right;">PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="total">
          <span>TOTAL (${order.paymentMethod || 'COD'}):</span>
          <span>₹${order.total.toLocaleString('en-IN')}</span>
        </div>
        <div style="text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 6px;">
          *** Fresh Butchery Packed Hygienically ***
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div className="section-header-bar">
        <div className="section-title">
          <h2>Live Customer Orders</h2>
          <p>Real-time order dispatch board connected directly to Firebase Cloud</p>
        </div>

        <div className="search-filter-row">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search Order ID, Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Orders ({orders.length})</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items & Qty</th>
              <th>Amount</th>
              <th>Delivery Schedule</th>
              <th>Assigned Rider</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No orders found matching this filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: '#F3F4F6' }}>#{order.id.slice(-6)}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{order.customerName || 'Customer'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customerPhone}</div>
                  </td>
                  <td>
                    <div>
                      {order.items?.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600 }}>{item.name}</span> <span style={{ color: 'var(--text-muted)' }}>×{item.quantity}</span>
                          {item.cuttingType && (
                            <div style={{ fontSize: '0.72rem', color: '#F97316', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Scissors size={11} /> {item.cuttingType}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#F9FAFB' }}>{formatCurrency(order.total)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#10B981' }}>{order.paymentMethod}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem' }}>{order.deliverySchedule || 'Instant (10-30m)'}</span>
                  </td>
                  <td>
                    {order.riderName ? (
                      <div style={{ fontSize: '0.8rem', color: '#0EA5E9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bike size={13} /> {order.riderName}
                      </div>
                    ) : (
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setAssigningRiderOrderId(order.id)}
                      >
                        Assign Rider
                      </button>
                    )}
                  </td>
                  <td>
                    <select
                      className={`status-pill status-${order.status === 'confirmed' ? 'accepted' : order.status}`}
                      value={order.status === 'accepted' ? 'confirmed' : order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                      style={{
                        background: 'transparent',
                        fontWeight: 700,
                        cursor: 'pointer',
                        outline: 'none',
                        border: '1px solid var(--border)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '999px',
                      }}
                      title="Click to change order status"
                    >
                      <option value="pending" style={{ background: '#1E293B', color: '#F59E0B' }}>Placed (Pending)</option>
                      <option value="confirmed" style={{ background: '#1E293B', color: '#3B82F6' }}>Confirmed</option>
                      <option value="preparing" style={{ background: '#1E293B', color: '#A855F7' }}>Preparing</option>
                      <option value="out_for_delivery" style={{ background: '#1E293B', color: '#0EA5E9' }}>On The Way</option>
                      <option value="delivered" style={{ background: '#1E293B', color: '#10B981' }}>Delivered</option>
                      <option value="cancelled" style={{ background: '#1E293B', color: '#EF4444' }}>Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.6rem' }}
                        onClick={() => setSelectedOrder(order)}
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.6rem' }}
                        onClick={() => handlePrintKOT(order)}
                        title="Print KOT / Packing Slip"
                      >
                        <Printer size={15} />
                      </button>

                      {order.status === 'pending' && (
                        <button
                          className="action-btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#3B82F6' }}
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          title="Confirm order"
                        >
                          <CheckCircle2 size={14} /> Confirm
                        </button>
                      )}

                      {(order.status === 'accepted' || order.status === 'confirmed') && (
                        <button
                          className="action-btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#8B5CF6' }}
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          title="Send to butchery preparation"
                        >
                          🍳 Prepare
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button
                            className="action-btn-primary"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', backgroundColor: '#0EA5E9' }}
                            onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                            title="Mark as On The Way"
                          >
                            <Truck size={13} /> On The Way
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => setAssigningRiderOrderId(order.id)}
                            title="Assign to delivery driver"
                          >
                            <Bike size={13} />
                          </button>
                        </div>
                      )}

                      {order.status === 'out_for_delivery' && (
                        <button
                          className="action-btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#10B981' }}
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          title="Mark delivered"
                        >
                          ✓ Delivered
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Order #{selectedOrder.id}</h3>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', background: '#0F172A', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Phone size={16} color="#8B0000" />
                {selectedOrder.customerName} ({selectedOrder.customerPhone})
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{selectedOrder.address || 'Address provided at checkout'}</span>
              </div>
            </div>

            {/* Quick Status Pipeline Bar inside Modal */}
            <div style={{ marginBottom: '1.25rem', background: '#1E293B', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Update Order Status (Syncs Live to Customer Tracking):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: (selectedOrder.status === 'confirmed' || selectedOrder.status === 'accepted') ? '#3B82F6' : undefined,
                    color: (selectedOrder.status === 'confirmed' || selectedOrder.status === 'accepted') ? '#FFFFFF' : undefined,
                  }}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                >
                  ✓ Confirmed
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: selectedOrder.status === 'preparing' ? '#8B5CF6' : undefined,
                    color: selectedOrder.status === 'preparing' ? '#FFFFFF' : undefined,
                  }}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                >
                  🍳 Preparing
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: selectedOrder.status === 'out_for_delivery' ? '#0EA5E9' : undefined,
                    color: selectedOrder.status === 'out_for_delivery' ? '#FFFFFF' : undefined,
                  }}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'out_for_delivery')}
                >
                  🛵 On The Way
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: selectedOrder.status === 'delivered' ? '#10B981' : undefined,
                    color: selectedOrder.status === 'delivered' ? '#FFFFFF' : undefined,
                  }}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                >
                  🎉 Delivered
                </button>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Ordered Items
            </h4>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              {selectedOrder.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>×{item.quantity}</span>
                    {item.cuttingType && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#F97316' }}>
                        Cut: {item.cuttingType}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
              <span>Total Payable ({selectedOrder.paymentMethod}):</span>
              <span style={{ color: '#F43F5E' }}>{formatCurrency(selectedOrder.total)}</span>
            </div>

            <div className="form-actions">
              <button
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handlePrintKOT(selectedOrder)}
              >
                <Printer size={15} /> Print KOT Slip
              </button>

              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <button
                  className="btn-secondary"
                  style={{ color: '#EF4444', borderColor: '#EF4444' }}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                >
                  <XCircle size={15} style={{ marginRight: '4px' }} /> Cancel Order
                </button>
              )}
              <button className="action-btn-primary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Rider Modal */}
      {assigningRiderOrderId && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Assign Delivery Rider</h3>
              <button className="close-btn" onClick={() => setAssigningRiderOrderId(null)}>✕</button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select an active delivery partner to dispatch this order:
            </p>

            {riders.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active riders found in database.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {riders.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.875rem',
                      background: '#0F172A',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.fullName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.phone}</div>
                    </div>
                    <button
                      className="action-btn-primary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => handleAssignRider(assigningRiderOrderId, r)}
                    >
                      <UserCheck size={14} /> Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
