import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  phone?: string;
  isAdmin: boolean;
  createdAt: string;
}

interface StoredUser extends User {
  passwordHash: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Simple hash: Web Crypto SHA-256 (async)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'windcast_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// User database stored in localStorage
function getUserDB(): Record<string, StoredUser> {
  try { return JSON.parse(localStorage.getItem('windcast_userdb') || '{}'); }
  catch { return {}; }
}
function saveUserDB(db: Record<string, StoredUser>) {
  localStorage.setItem('windcast_userdb', JSON.stringify(db));
}

// Pre-seed admin account
function ensureAdminExists() {
  const db = getUserDB();
  if (!db['admin@windcast.com']) {
    hashPassword('admin123').then(hash => {
      const adminDb = getUserDB();
      adminDb['admin@windcast.com'] = {
        email: 'admin@windcast.com',
        name: 'Administrator',
        isAdmin: true,
        createdAt: new Date().toISOString(),
        passwordHash: hash,
      };
      saveUserDB(adminDb);
    });
  }
}
ensureAdminExists();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('windcast_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Multi-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'windcast_user') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Validate inputs
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail) return { success: false, error: 'Email is required.' };
    if (!password) return { success: false, error: 'Password is required.' };

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    // Admin shortcut (legacy support)
    if (trimEmail === 'admin' || email.trim() === 'admin') {
      const hash = await hashPassword(password);
      const db = getUserDB();
      const adminUser = db['admin@windcast.com'];
      if (adminUser && adminUser.passwordHash === hash) {
        const sessionUser: User = { email: adminUser.email, name: adminUser.name, isAdmin: true, createdAt: adminUser.createdAt };
        setUser(sessionUser);
        localStorage.setItem('windcast_user', JSON.stringify(sessionUser));
        logActivity('Admin Login', 'Administrator logged in');
        return { success: true };
      }
      return { success: false, error: 'Invalid admin credentials.' };
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimEmail)) return { success: false, error: 'Enter a valid email address.' };

    const hash = await hashPassword(password);
    const db = getUserDB();
    const stored = db[trimEmail];

    if (!stored) return { success: false, error: 'No account found with this email. Please register first.' };
    if (stored.passwordHash !== hash) return { success: false, error: 'Incorrect password. Please try again.' };

    const sessionUser: User = { email: stored.email, name: stored.name, isAdmin: stored.isAdmin, createdAt: stored.createdAt };
    setUser(sessionUser);
    localStorage.setItem('windcast_user', JSON.stringify(sessionUser));
    logActivity('User Login', `${stored.name} logged in`);
    return { success: true };
  };

  const register = async (email: string, password: string, name: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    const trimEmail = email.trim().toLowerCase();
    const trimName = name.trim();

    if (!trimName) return { success: false, error: 'Name is required.' };
    if (!trimEmail) return { success: false, error: 'Email is required.' };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimEmail)) return { success: false, error: 'Enter a valid email address.' };

    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };
    if (!/[A-Za-z]/.test(password)) return { success: false, error: 'Password must contain at least one letter.' };

    // Simulate network delay
    await new Promise(r => setTimeout(r, 900));

    const db = getUserDB();
    if (db[trimEmail]) return { success: false, error: 'An account with this email already exists. Please login.' };

    const hash = await hashPassword(password);
    const newUser: StoredUser = {
      email: trimEmail,
      name: trimName,
      phone: phone?.trim() || undefined,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
    };
    db[trimEmail] = newUser;
    saveUserDB(db);

    const sessionUser: User = { email: trimEmail, name: trimName, phone: newUser.phone, isAdmin: false, createdAt: newUser.createdAt };
    setUser(sessionUser);
    localStorage.setItem('windcast_user', JSON.stringify(sessionUser));
    logActivity('User Registration', `${trimName} registered with ${trimEmail}`);
    return { success: true };
  };

  const logout = () => {
    if (user) logActivity('User Logout', `${user.name} logged out`);
    setUser(null);
    localStorage.removeItem('windcast_user');
  };

  const logActivity = (action: string, details: string) => {
    const activities = JSON.parse(localStorage.getItem('windcast_activities') || '[]');
    activities.unshift({
      id: Date.now(),
      action,
      details,
      timestamp: new Date().toISOString(),
      user: user?.name || 'Unknown',
    });
    localStorage.setItem('windcast_activities', JSON.stringify(activities.slice(0, 100)));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
