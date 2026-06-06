import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Environment variables type
 */
interface Env {
  ADMIN_PASSWORD?: string;
}

/**
 * Verify admin password
 * @param providedPassword Password provided by user
 * @returns Verification result
 */
export async function verifyAdminPassword(
  providedPassword: string | undefined
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    const configuredPassword = env.ADMIN_PASSWORD;
    
    if (!configuredPassword) {
      return { valid: false, error: 'Feature not enabled' };
    }
    
    if (!providedPassword || providedPassword !== configuredPassword) {
      return { valid: false, error: 'Unauthorized' };
    }
    
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `Verification failed: ${message}` };
  }
}

/**
 * Check if admin password is configured
 * @returns Whether password is configured
 */
export async function isAdminPasswordConfigured(): Promise<boolean> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    return !!env.ADMIN_PASSWORD;
  } catch {
    return false;
  }
}
