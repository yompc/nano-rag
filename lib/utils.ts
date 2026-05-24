import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化时间戳为本地日期时间字符串
 * @param timestamp Unix 时间戳（秒）
 * @param includeYear 是否包含年份
 */
export function formatDate(timestamp: number, includeYear = false): string {
  const date = new Date(timestamp * 1000);
  const formatStr = includeYear
    ? 'yyyy/MM/dd HH:mm'
    : 'MM/dd HH:mm';
  return format(date, formatStr, { locale: zhCN });
}
