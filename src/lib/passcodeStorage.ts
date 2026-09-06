import fs from 'fs';
import path from 'path';
import { getAdminPasscode } from './auth';

let inMemoryPasscode: string | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const PASSCODE_FILE = path.join(DATA_DIR, 'passcode.json');

/**
 * Get the current active admin passcode.
 * Priority:
 * 1. In-memory cached passcode (updated during runtime)
 * 2. Stored passcode in data/passcode.json
 * 3. process.env.ADMIN_PASSCODE
 * 4. DEFAULT_PASSCODE ('Alza0839')
 */
export function getActivePasscode(): string {
  if (inMemoryPasscode) {
    return inMemoryPasscode;
  }

  try {
    if (fs.existsSync(PASSCODE_FILE)) {
      const raw = fs.readFileSync(PASSCODE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.passcode === 'string' && parsed.passcode.trim()) {
        const stored = parsed.passcode.trim();
        inMemoryPasscode = stored;
        return stored;
      }
    }
  } catch (err) {
    console.warn('[PasscodeStorage] Error reading stored passcode file:', err);
  }

  return getAdminPasscode();
}

/**
 * Save new passcode to persistent storage and in-memory cache.
 */
export function setActivePasscode(newPasscode: string): { success: boolean; persisted: boolean } {
  const trimmed = newPasscode.trim();
  inMemoryPasscode = trimmed;
  let persisted = false;

  // 1. Write to data/passcode.json
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      PASSCODE_FILE,
      JSON.stringify(
        {
          passcode: trimmed,
          updatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf-8'
    );
    persisted = true;
  } catch (err) {
    console.warn('[PasscodeStorage] Could not write to data/passcode.json (read-only system):', err);
  }

  // 2. Also sync to .env or .env.local if present in project root
  try {
    const envCandidates = ['.env', '.env.local'];
    for (const envName of envCandidates) {
      const envPath = path.join(process.cwd(), envName);
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf-8');
        if (content.includes('ADMIN_PASSCODE=')) {
          content = content.replace(/ADMIN_PASSCODE=.*/g, `ADMIN_PASSCODE=${trimmed}`);
        } else {
          content += `\nADMIN_PASSCODE=${trimmed}\n`;
        }
        fs.writeFileSync(envPath, content, 'utf-8');
        persisted = true;
      }
    }
  } catch (err) {
    console.warn('[PasscodeStorage] Could not update .env file:', err);
  }

  return { success: true, persisted };
}
