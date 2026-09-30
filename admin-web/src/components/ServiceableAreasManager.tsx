import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, CheckCircle2, RotateCcw, Zap } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_WARANGAL_PINCODES: { pincode: string; area: string }[] = [
  { pincode: '506001', area: 'Warangal Railway Station / City Center' },
  { pincode: '506002', area: 'Hanamkonda Main / Chowrasta' },
  { pincode: '506003', area: 'Kazipet Junction / Diesel Colony' },
  { pincode: '506004', area: 'Subedari / Court Road' },
  { pincode: '506005', area: 'Narsampet Road / Geesugonda Cross' },
  { pincode: '506006', area: 'Hunter Road / Shyampet' },
  { pincode: '506009', area: 'Kakatiya University (KU) Campus' },
  { pincode: '506015', area: 'Waddepally / Teachers Colony' },
  { pincode: '506142', area: 'Hasanparthy / Ananthasagar' },
  { pincode: '506370', area: 'Madikonda IT Park / Rampur' },
];

export default function ServiceableAreasManager() {
  const [pincodes, setPincodes] = useState<string[]>(DEFAULT_WARANGAL_PINCODES.map((i) => i.pincode));
  const [areaLabels, setAreaLabels] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    DEFAULT_WARANGAL_PINCODES.forEach((i) => {
      map[i.pincode] = i.area;
    });
    return map;
  });

  const [newPincode, setNewPincode] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'serviceable_areas'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.pincodes) && data.pincodes.length > 0) {
          const cleaned = data.pincodes.map((p: any) => String(p).trim()).filter(Boolean);
          setPincodes(cleaned);
        }
        if (data?.areaLabels && typeof data.areaLabels === 'object') {
          setAreaLabels((prev) => ({ ...prev, ...data.areaLabels }));
        }
      }
    });

    return () => unsub();
  }, []);

  const handleSaveToFirestore = async (updatedPins: string[], updatedLabels: Record<string, string>) => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'settings', 'serviceable_areas'),
        {
          pincodes: updatedPins,
          areaLabels: updatedLabels,
          city: 'Warangal Urban',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Error updating serviceable areas: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = newPincode.replace(/\D/g, '').trim();
    if (cleanPin.length !== 6) {
      alert('Please enter a valid 6-digit postal pincode.');
      return;
    }
    if (pincodes.includes(cleanPin)) {
      alert(`Pincode ${cleanPin} is already active in serviceable areas.`);
      return;
    }

    const updatedPins = [...pincodes, cleanPin];
    const updatedLabels = {
      ...areaLabels,
      [cleanPin]: newAreaName.trim() || 'Warangal Suburb',
    };

    setPincodes(updatedPins);
    setAreaLabels(updatedLabels);
    setNewPincode('');
    setNewAreaName('');
    await handleSaveToFirestore(updatedPins, updatedLabels);
  };

  const handleRemovePincode = async (pinToRemove: string) => {
    if (!confirm(`Are you sure you want to stop deliveries to pincode ${pinToRemove}? Customers with this pincode will no longer be able to place orders.`)) {
      return;
    }
    const updatedPins = pincodes.filter((p) => p !== pinToRemove);
    const updatedLabels = { ...areaLabels };
    delete updatedLabels[pinToRemove];

    setPincodes(updatedPins);
    setAreaLabels(updatedLabels);
    await handleSaveToFirestore(updatedPins, updatedLabels);
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset serviceable areas back to default Warangal core locations?')) {
      return;
    }
    const defaultPins = DEFAULT_WARANGAL_PINCODES.map((i) => i.pincode);
    const defaultLabels: Record<string, string> = {};
    DEFAULT_WARANGAL_PINCODES.forEach((i) => {
      defaultLabels[i.pincode] = i.area;
    });

    setPincodes(defaultPins);
    setAreaLabels(defaultLabels);
    await handleSaveToFirestore(defaultPins, defaultLabels);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="section-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} color="#F87171" />
            Serviceable Delivery Zones & Pincodes
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Manage active delivery areas in Warangal. Customer apps validate checkout in real-time against this list.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {savedSuccess && (
            <span style={{ color: '#34D399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Synced to Mobile Apps
            </span>
          )}
          <button className="btn-secondary" onClick={handleResetDefaults} title="Restore default Warangal hubs">
            <RotateCcw size={14} style={{ marginRight: '6px' }} /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Add New Area Card */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#0F172A', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#FFFFFF' }}>
          Add New Delivery Suburb / Pincode
        </h3>
        <form onSubmit={handleAddArea} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: '10px', alignItems: 'center' }}>
          <div>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 506007"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value)}
              className="form-control"
              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', width: '100%' }}
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Area Name / Locality (e.g. Mamnoor / Postal Colony)"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="form-control"
              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', width: '100%' }}
            />
          </div>
          <div>
            <button
              type="submit"
              className="action-btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '42px', padding: '0 1.2rem' }}
            >
              <Plus size={16} /> Add Zone
            </button>
          </div>
        </form>
      </div>

      {/* Active Pincodes List */}
      <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
            Active Serviceable Locations ({pincodes.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <Zap size={13} style={{ marginRight: '4px' }} /> Changes reflect instantly in Customer Checkout
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {pincodes.map((pin) => (
            <div
              key={pin}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1E293B',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #334155',
              }}
            >
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F87171', letterSpacing: '0.5px' }}>
                  {pin}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {areaLabels[pin] || 'Warangal Locality'}
                </div>
              </div>

              <button
                onClick={() => handleRemovePincode(pin)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.15s ease',
                }}
                title={`Remove ${pin} from deliveries`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
