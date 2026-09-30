import React from 'react';
import { ShoppingBag, Package, Bike, BarChart3, MapPin, Volume2, VolumeX, LogOut, BellRing, Play } from 'lucide-react';

interface NavbarProps {
  activeTab: 'orders' | 'products' | 'riders' | 'analytics' | 'zones';
  setActiveTab: (tab: 'orders' | 'products' | 'riders' | 'analytics' | 'zones') => void;
  pendingOrderCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isAlarmRinging?: boolean;
  onSilenceAlarm?: () => void;
  onTestSound?: () => void;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  pendingOrderCount,
  soundEnabled,
  setSoundEnabled,
  isAlarmRinging = false,
  onSilenceAlarm,
  onTestSound,
  onLogout,
}: NavbarProps) {
  return (
    <header className="navbar">
      <div className="brand-badge">
        <div className="brand-logo-circle">CB</div>
        <div className="brand-info">
          <h1>Captain Bro Hub</h1>
          <span>
            <div className="live-pulse" /> Live Store Operations
          </span>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={18} />
          Orders
          {pendingOrderCount > 0 && (
            <span className="tab-badge">{pendingOrderCount}</span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={18} />
          Products & Stock
        </button>

        <button
          className={`tab-btn ${activeTab === 'riders' ? 'active' : ''}`}
          onClick={() => setActiveTab('riders')}
        >
          <Bike size={18} />
          Riders Fleet
        </button>

        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={18} />
          Analytics
        </button>

        <button
          className={`tab-btn ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          <MapPin size={18} />
          Delivery Zones
        </button>
      </nav>

      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Active Ringing Alarm Quick-Silence Button */}
        {isAlarmRinging && onSilenceAlarm && (
          <button
            className="action-btn-primary"
            onClick={onSilenceAlarm}
            title="Silence active ringing order chime"
            style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'pulse 1.2s infinite',
            }}
          >
            <BellRing size={16} />
            Silence Alarm
          </button>
        )}

        {/* Test Sound Preview Button */}
        {onTestSound && (
          <button
            className="btn-secondary"
            onClick={onTestSound}
            title="Test store order chime"
            style={{ padding: '0.45rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Play size={13} color="#F59E0B" />
            <span>Test Sound</span>
          </button>
        )}

        {/* Sound ON/OFF Toggle */}
        <button
          className="tab-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute order notification chimes' : 'Unmute order notification chimes'}
          style={{ padding: '0.5rem 0.75rem' }}
        >
          {soundEnabled ? <Volume2 size={18} color="#10B981" /> : <VolumeX size={18} color="#EF4444" />}
          <span style={{ fontSize: '0.75rem' }}>{soundEnabled ? 'Chime ON' : 'Chime MUTED'}</span>
        </button>

        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
