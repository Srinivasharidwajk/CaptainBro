import React, { useState } from 'react';
import { Bike, Phone, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Rider {
  id: string;
  fullName: string;
  phone: string;
  password?: string;
  vehicleNumber?: string;
  isOnline?: boolean;
  activeOrderId?: string;
  totalDeliveries?: number;
}

interface RidersManagerProps {
  riders: Rider[];
}

export default function RidersManager({ riders }: RidersManagerProps) {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const filtered = riders.filter(
    (r) =>
      (r.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.phone || '').includes(search)
  );

  const toggleRiderStatus = async (rider: Rider) => {
    try {
      const ref = doc(db, 'users', rider.id);
      await updateDoc(ref, {
        isOnline: !rider.isOnline,
        updatedAt: new Date(),
      });
    } catch (err: any) {
      alert('Error updating rider status: ' + err.message);
    }
  };

  const handleAddRider = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!name.trim()) {
      alert('Please enter rider full name');
      return;
    }
    if (!password.trim()) {
      alert('Please set a rider login password / PIN');
      return;
    }

    setLoading(true);
    try {
      const riderUid = 'rider_' + cleanPhone;
      await setDoc(doc(db, 'users', riderUid), {
        fullName: name.trim(),
        phone: cleanPhone,
        password: password.trim(),
        vehicleNumber: vehicleNumber.trim() || 'TS-03-EB-1234',
        role: 'rider',
        isOnline: false,
        totalDeliveries: 0,
        createdAt: new Date(),
      }, { merge: true });

      alert(`Rider "${name.trim()}" registered successfully! They can now log in to the Rider App using Phone: ${cleanPhone} and Password: ${password.trim()}`);
      setIsAdding(false);
      setName('');
      setPhone('');
      setPassword('');
      setVehicleNumber('');
    } catch (err: any) {
      alert('Failed to add rider: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRider = async (riderId: string, riderName: string) => {
    if (!window.confirm(`Are you sure you want to remove rider "${riderName}"? They will lose access to the delivery app immediately.`)) return;
    try {
      await deleteDoc(doc(db, 'users', riderId));
    } catch (err: any) {
      alert('Failed to remove rider: ' + err.message);
    }
  };

  return (
    <div>
      <div className="section-header-bar">
        <div className="section-title">
          <h2>Delivery Fleet & Riders</h2>
          <p>Register and manage your in-house delivery staff with Phone + Password access</p>
        </div>

        <div className="search-filter-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search rider name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="action-btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={16} /> Add New Rider
          </button>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rider Name</th>
              <th>Phone & Login</th>
              <th>Rider Password / PIN</th>
              <th>Vehicle Number</th>
              <th>Current Status</th>
              <th>Active Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No delivery riders registered yet. Click "+ Add New Rider" to give a local delivery driver access.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(14, 165, 233, 0.15)',
                          color: '#0EA5E9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Bike size={18} />
                      </div>
                      <span style={{ fontWeight: 700 }}>{r.fullName}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <Phone size={14} color="var(--text-muted)" />
                      <span>{r.phone}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F3F4F6' }}>
                        {showPasswords[r.id] ? (r.password || '1234') : '••••••'}
                      </span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                        onClick={() => setShowPasswords((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                      >
                        {showPasswords[r.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </td>
                  <td>{r.vehicleNumber || 'TS-03-EB-1234'}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: r.isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                        color: r.isOnline ? '#10B981' : '#9CA3AF',
                      }}
                    >
                      {r.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td>
                    {r.activeOrderId ? (
                      <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: '0.8rem' }}>
                        Delivering #{r.activeOrderId.slice(-6)}
                      </span>
                    ) : (
                      <span style={{ color: '#10B981', fontSize: '0.8rem' }}>Available</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.75rem',
                          color: r.isOnline ? '#EF4444' : '#10B981',
                          borderColor: r.isOnline ? '#EF4444' : '#10B981',
                        }}
                        onClick={() => toggleRiderStatus(r)}
                      >
                        {r.isOnline ? 'Set Offline' : 'Set Online'}
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', color: '#EF4444' }}
                        onClick={() => handleDeleteRider(r.id, r.fullName)}
                        title="Delete Rider"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Rider Modal */}
      {isAdding && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>Register Delivery Rider</h3>
              <button className="close-btn" onClick={() => setIsAdding(false)}>✕</button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Create login credentials for your local in-house delivery rider. They will use this Phone Number and Password to log in on the Rider Mobile App.
            </p>

            <form onSubmit={handleAddRider}>
              <div className="form-group">
                <label>Rider Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="9876543211"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Login Password / PIN *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1234 or securepass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Bike Registration Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="TS-03-EB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn-primary" disabled={loading}>
                  {loading ? 'Registering...' : 'Add Rider & Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
