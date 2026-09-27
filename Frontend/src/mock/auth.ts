import type { User } from '../types/user';


export interface DevAccount {
  email: string;
  password: string;
  name: string;
  role: string;
}

export const DEVELOPMENT_ACCOUNTS: DevAccount[] = [
  {
    email: 'demo@testforge.ai',
    password: 'TestForge@123',
    name: 'Demo User',
    role: 'Lead AI Engineer',
  },
  {
    email: 'student@testforge.ai',
    password: 'Student@123',
    name: 'Student User',
    role: 'Research Student',
  },
];

const STORAGE_KEY = 'testforge_auth_session';
const MOCK_REGISTERED_KEY = 'testforge_mock_registered_users';

function getMockRegisteredAccounts(): DevAccount[] {
  try {
    const raw = localStorage.getItem(MOCK_REGISTERED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Validates credentials against development mock accounts.
 * Passwords are NEVER persisted to state, localStorage, or displayed in the UI.
 */
export async function mockLogin(email: string, password: string): Promise<User> {
  // Simulate realistic network latency for the auth check
  await new Promise((resolve) => setTimeout(resolve, 350));

  const trimmedEmail = email.trim().toLowerCase();
  const registered = getMockRegisteredAccounts();
  const allAccounts = [...DEVELOPMENT_ACCOUNTS, ...registered];

  const matched = allAccounts.find(
    (acc) => acc.email.toLowerCase() === trimmedEmail && acc.password === password
  );

  if (!matched) {
    throw new Error('Invalid email or password.');
  }

  const user: User = {
    id: matched.email === 'demo@testforge.ai' ? 'usr_demo_01' : matched.email === 'student@testforge.ai' ? 'usr_student_02' : `usr_${Date.now()}`,
    email: matched.email,
    name: matched.name,
    role: matched.role,
  };

  storeUser(user);
  return user;
}

/**
 * Mock registration when backend is offline.
 */
export async function mockRegister(
  email: string,
  password: string,
  name: string,
  role?: string,
): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const trimmedEmail = email.trim().toLowerCase();
  const registered = getMockRegisteredAccounts();
  const allAccounts = [...DEVELOPMENT_ACCOUNTS, ...registered];

  if (allAccounts.some((acc) => acc.email.toLowerCase() === trimmedEmail)) {
    throw new Error('An account with this email already exists');
  }

  const newAcc: DevAccount = {
    email: trimmedEmail,
    password,
    name: name.trim(),
    role: role || 'Developer',
  };

  registered.push(newAcc);
  try {
    localStorage.setItem(MOCK_REGISTERED_KEY, JSON.stringify(registered));
  } catch {
    // Ignore storage quota errors
  }

  const user: User = {
    id: `usr_${Date.now()}`,
    email: newAcc.email,
    name: newAcc.name,
    role: newAcc.role,
  };

  return user;
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
      return parsed as User;
    }
    return null;
  } catch {
    return null;
  }
}

export function storeUser(user: User): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Gracefully handle storage quota or private window errors
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Gracefully handle storage error
  }
}
