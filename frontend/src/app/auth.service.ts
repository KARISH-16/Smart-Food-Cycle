import { Injectable, signal } from '@angular/core';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthResult {
  success: boolean;
  message: string;
}

const TOKEN_STORAGE_KEY = 'sfc_auth_token';
const USER_STORAGE_KEY = 'sfc_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(this.readStoredToken());
  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  authHeader(): Record<string, string> {
    const activeToken = this.token();
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  }

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const result = await response.json();

      if (result.success) {
        this.startSession(result.token, result.user);
      }

      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: 'Network error while creating your account.' };
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (result.success) {
        this.startSession(result.token, result.user);
      }

      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: 'Network error while signing in.' };
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader() }
      });
    } catch (error) {
      // Logging out client-side is still safe even if the network call fails.
    } finally {
      this.endSession();
    }
  }

  private startSession(token: string, user: AuthUser): void {
    this.token.set(token);
    this.currentUser.set(user);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  private endSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
