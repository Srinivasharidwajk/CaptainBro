import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LoginModalProps {
  onSuccess: (user: any) => void;
}

export default function LoginModal({ onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('admin@captainbro.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      let userObj: any = null;
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        userObj = cred.user;
      } catch (signInErr: any) {
        // If the account does not exist yet in this Firebase project, auto-initialize it as the master admin
        if (
          (email.trim() === 'admin@captainbro.com' || email.trim().startsWith('admin@')) &&
          (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential')
        ) {
          try {
            setInfoMsg('Initializing Master Admin account in Firebase...');
            const newCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
            userObj = newCred.user;
            await setDoc(
              doc(db, 'users', userObj.uid),
              {
                email: email.trim(),
                role: 'admin',
                fullName: 'Store Admin',
                createdAt: new Date(),
              },
              { merge: true }
            );
          } catch (createErr: any) {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      // Check Firestore role
      const userDoc = await getDoc(doc(db, 'users', userObj.uid));
      const userData = userDoc.data();

      if (userData?.role === 'admin' || userData?.role === 'super_admin' || email.trim() === 'admin@captainbro.com') {
        onSuccess(userObj);
      } else {
        setErrorMsg('Access Denied: Your account does not have administrator privileges.');
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (err.code === 'auth/operation-not-allowed' || errMsg.includes('PASSWORD_LOGIN_DISABLED')) {
        setErrorMsg(
          "Firebase Notice: 'Email/Password' provider is not enabled in Firebase Console. Please enable 'Email/Password' under Authentication > Sign-in method in your Firebase project (captain-bro-app)."
        );
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setErrorMsg('Invalid password. If you forgot it, you can reset it in Firebase Console.');
      } else if (err.code === 'auth/user-not-found') {
        setErrorMsg('Admin account not found in Firebase Authentication.');
      } else {
        setErrorMsg(errMsg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #8B0000 0%, #DC2626 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 20px rgba(139, 0, 0, 0.4)',
            }}
          >
            <Lock size={26} color="#FFFFFF" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Captain Bro Admin</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Store Management & Live Dispatch Portal
          </p>
        </div>

        {infoMsg && (
          <div
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60A5FA',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Sparkles size={18} style={{ flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Admin Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="admin@captainbro.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Admin Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="action-btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '1.25rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Hub'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.85rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            border: '1px dashed var(--border-color)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '0.35rem' }}>
            Default Store Admin Credentials:
          </div>
          <div style={{ color: '#F3F4F6', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <b>admin@captainbro.com</b> &nbsp;|&nbsp; <b>admin123</b>
          </div>
        </div>
      </div>
    </div>
  );
}
