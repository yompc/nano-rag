import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * 环境变量类型
 */
interface Env {
  ADMIN_PASSWORD?: string;
}

/**
 * 验证管理员密码
 * @param providedPassword 用户提供的密码
 * @returns 验证结果
 */
export async function verifyAdminPassword(
  providedPassword: string | undefined
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    const configuredPassword = env.ADMIN_PASSWORD;
    
    if (!configuredPassword) {
      return { valid: false, error: '功能未启用' };
    }
    
    if (!providedPassword || providedPassword !== configuredPassword) {
      return { valid: false, error: 'Unauthorized' };
    }
    
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { valid: false, error: `验证失败: ${message}` };
  }
}

/**
 * 检查管理员密码是否已配置
 * @returns 是否已配置密码
 */
export async function isAdminPasswordConfigured(): Promise<boolean> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    return !!env.ADMIN_PASSWORD;
  } catch {
    return false;
  }
}
