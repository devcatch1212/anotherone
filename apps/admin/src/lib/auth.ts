// admin-token key
const TOKEN_KEY = 'admin_token';
const ADMIN_KEY = 'admin_user';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function getAdminUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(ADMIN_KEY);
  return user ? JSON.parse(user) : null;
}

export function setAdminUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_KEY, JSON.stringify(user));
}
