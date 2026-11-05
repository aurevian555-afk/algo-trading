import crypto from 'node:crypto';
import { db } from './db.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  balance: number;
  avatar_url?: string;
  created_at: number;
  last_login?: number;
}

class AuthService {
  private readonly SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.ensureDemoUser();
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private ensureDemoUser() {
    try {
      const demoEmail = 'demo@aurevian.io';
      const existing = db.getUserByEmail(demoEmail);
      if (!existing) {
        const salt = this.generateSalt();
        const hash = this.hashPassword('demo123456', salt);
        db.createUser({
          id: 'usr_demo_trader',
          email: demoEmail,
          name: 'Demo Trader',
          password_hash: hash,
          salt,
          role: 'trader',
          balance: 10000.0,
          created_at: Date.now(),
        });
        console.log('[AUTH] Seeded default Demo Trader account (demo@aurevian.io)');
      }
    } catch (err: any) {
      console.warn('[AUTH] Notice ensuring demo user:', err.message);
    }
  }

  public signUp(name: string, email: string, password: string): { success: boolean; token?: string; user?: AuthUser; error?: string } {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Full name must be at least 2 characters.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists. Please log in.' };
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);

    db.createUser({
      id: userId,
      email: cleanEmail,
      name: cleanName,
      password_hash: passwordHash,
      salt,
      role: 'trader',
      balance: 10000.0,
      created_at: Date.now(),
    });

    const token = this.generateToken();
    const expiresAt = Date.now() + this.SESSION_DURATION_MS;
    db.createSession(token, userId, expiresAt);
    db.updateUserLastLogin(userId);

    db.addLog('INFO', `New user registered: ${cleanName} (${cleanEmail})`);

    const user: AuthUser = {
      id: userId,
      email: cleanEmail,
      name: cleanName,
      role: 'trader',
      balance: 10000.0,
      created_at: Date.now(),
      last_login: Date.now(),
    };

    return { success: true, token, user };
  }

  public login(email: string, password: string): { success: boolean; token?: string; user?: AuthUser; error?: string } {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const record = db.getUserByEmail(cleanEmail);
    if (!record) {
      return { success: false, error: 'Invalid email or password. Please check your credentials.' };
    }

    const testHash = this.hashPassword(password, record.salt);
    if (testHash !== record.password_hash) {
      return { success: false, error: 'Invalid email or password. Please check your credentials.' };
    }

    const token = this.generateToken();
    const expiresAt = Date.now() + this.SESSION_DURATION_MS;
    db.createSession(token, record.id, expiresAt);
    db.updateUserLastLogin(record.id);

    db.addLog('INFO', `User logged in: ${record.name} (${record.email})`);

    const user: AuthUser = {
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role,
      balance: record.balance,
      avatar_url: record.avatar_url,
      created_at: record.created_at,
      last_login: Date.now(),
    };

    return { success: true, token, user };
  }

  public demoLogin(): { success: boolean; token: string; user: AuthUser } {
    this.ensureDemoUser();
    const demo = db.getUserByEmail('demo@aurevian.io');

    const token = this.generateToken();
    const expiresAt = Date.now() + this.SESSION_DURATION_MS;
    db.createSession(token, demo.id, expiresAt);
    db.updateUserLastLogin(demo.id);

    db.addLog('INFO', 'Demo Guest Trader session activated.');

    const user: AuthUser = {
      id: demo.id,
      email: demo.email,
      name: demo.name,
      role: demo.role,
      balance: demo.balance,
      avatar_url: demo.avatar_url,
      created_at: demo.created_at,
      last_login: Date.now(),
    };

    return { success: true, token, user };
  }

  public validateToken(token: string): AuthUser | null {
    if (!token) return null;
    const session = db.getSession(token);
    if (!session) return null;

    return {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      balance: session.balance,
      avatar_url: session.avatar_url,
      created_at: session.created_at,
    };
  }

  public logout(token: string) {
    if (token) {
      db.deleteSession(token);
    }
  }
}

export const authService = new AuthService();
