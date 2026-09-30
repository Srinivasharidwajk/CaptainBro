import React from 'react';
import { IndianRupee, ShoppingCart, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Order } from './OrdersDashboard';
import { Product } from './ProductManager';

interface AnalyticsViewProps {
  orders: Order[];
  products: Product[];
}

export default function AnalyticsView({ orders, products }: AnalyticsViewProps) {
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const completedOrders = orders.filter((o) => o.status === 'delivered').length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const outForDelivery = orders.filter((o) => o.status === 'out_for_delivery').length;
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / Math.max(orders.length, 1)) : 0;
  const outOfStockCount = products.filter((p) => p.inStock === false).length;

  return (
    <div>
      <div className="section-header-bar">
        <div className="section-title">
          <h2>Store Analytics & Performance</h2>
          <p>Real-time revenue metrics, delivery fulfillment, and catalog health</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <p>Total Store Gross Revenue</p>
            <h3 style={{ color: '#10B981' }}>₹{totalRevenue.toLocaleString('en-IN')}</h3>
          </div>
          <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <p>Total Placed Orders</p>
            <h3>{orders.length}</h3>
          </div>
          <div className="metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <p>Completed Deliveries</p>
            <h3 style={{ color: '#10B981' }}>{completedOrders}</h3>
          </div>
          <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <p>Avg Order Basket</p>
            <h3>₹{avgOrderValue}</h3>
          </div>
          <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="table-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 800 }}>Delivery Pipeline Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pending Store Acceptance:</span>
              <span style={{ fontWeight: 800, color: '#F59E0B' }}>{pendingOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Out with Riders:</span>
              <span style={{ fontWeight: 800, color: '#0EA5E9' }}>{outForDelivery}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Successfully Delivered:</span>
              <span style={{ fontWeight: 800, color: '#10B981' }}>{completedOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cancelled Orders:</span>
              <span style={{ fontWeight: 800, color: '#EF4444' }}>{cancelledOrders}</span>
            </div>
          </div>
        </div>

        <div className="table-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 800 }}>Catalog & Inventory Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Listed SKUs:</span>
              <span style={{ fontWeight: 800 }}>{products.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Currently In Stock:</span>
              <span style={{ fontWeight: 800, color: '#10B981' }}>{products.length - outOfStockCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Marked Out of Stock:</span>
              <span style={{ fontWeight: 800, color: '#EF4444' }}>{outOfStockCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
