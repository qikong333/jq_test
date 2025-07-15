import type { ColorPoolStats } from '../types/performance';

/**
 * 颜色池系统
 */
class ColorPool {
  private colorMap = new Map<string, string>();
  private accessCount = new Map<string, number>();
  private stats: ColorPoolStats = {
    totalColors: 0,
    memoryUsage: 0,
    hitRate: 0
  };
  private hits = 0;
  private misses = 0;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  normalize(color: string): string {
    // 尝试从缓存获取
    const cached = this.colorMap.get(color);
    if (cached) {
      this.hits++;
      this.incrementAccess(cached);
      this.updateStats();
      return cached;
    }

    this.misses++;
    
    // 标准化颜色格式
    let normalized: string;
    if (color.startsWith('#')) {
      normalized = color.toLowerCase();
      // 将3位hex扩展为6位
      if (normalized.length === 4) {
        normalized = '#' + normalized[1] + normalized[1] + 
                    normalized[2] + normalized[2] + 
                    normalized[3] + normalized[3];
      }
    } else if (color.startsWith('rgb')) {
      // 转换rgb()为hex
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        normalized = rgbToHex(r, g, b);
      } else {
        normalized = color;
      }
    } else {
      normalized = color;
    }

    // 检查池大小限制
    if (this.colorMap.size >= this.maxSize) {
      this.evictLRU();
    }

    // 存入池中
    this.colorMap.set(color, normalized);
    this.accessCount.set(normalized, 1);
    this.updateStats();
    
    return normalized;
  }

  getStats(): ColorPoolStats {
    return { ...this.stats };
  }

  clear(): void {
    this.colorMap.clear();
    this.accessCount.clear();
    this.hits = 0;
    this.misses = 0;
    this.updateStats();
  }

  private incrementAccess(color: string): void {
    const count = this.accessCount.get(color) || 0;
    this.accessCount.set(color, count + 1);
  }

  private evictLRU(): void {
    let lruColor = '';
    let minAccess = Infinity;
    
    for (const [color, count] of this.accessCount) {
      if (count < minAccess) {
        minAccess = count;
        lruColor = color;
      }
    }
    
    if (lruColor) {
      // 找到并删除对应的原始颜色键
      for (const [original, normalized] of this.colorMap) {
        if (normalized === lruColor) {
          this.colorMap.delete(original);
          break;
        }
      }
      this.accessCount.delete(lruColor);
    }
  }

  private updateStats(): void {
    this.stats.totalColors = this.colorMap.size;
    this.stats.memoryUsage = this.estimateMemoryUsage();
    const total = this.hits + this.misses;
    this.stats.hitRate = total > 0 ? this.hits / total : 0;
  }

  private estimateMemoryUsage(): number {
    // 估算内存使用量（字节）
    let size = 0;
    for (const [key, value] of this.colorMap) {
      size += key.length * 2 + value.length * 2; // Unicode字符占2字节
    }
    for (const [key] of this.accessCount) {
      size += key.length * 2 + 4; // 数字占4字节
    }
    return size;
  }
}

// 全局颜色池实例
const colorPool = new ColorPool(1000);

/**
 * 将RGB值转换为十六进制颜色
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 将十六进制颜色转换为RGB值
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * 计算两个颜色之间的距离
 */
export function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return Infinity;
  
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * 在给定的颜色列表中找到最接近的颜色
 */
export function findClosestColor(targetColor: string, availableColors: string[]): string {
  if (availableColors.length === 0) return targetColor;
  
  let closestColor = availableColors[0];
  let minDistance = colorDistance(targetColor, closestColor);
  
  for (let i = 1; i < availableColors.length; i++) {
    const distance = colorDistance(targetColor, availableColors[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = availableColors[i];
    }
  }
  
  return closestColor;
}

/**
 * 生成随机颜色
 */
export function generateRandomColor(): string {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return rgbToHex(r, g, b);
}

/**
 * 判断颜色是否为深色
 */
export function isDarkColor(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  
  // 使用亮度公式
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness < 128;
}

/**
 * 标准化颜色（使用颜色池）
 * @param color 原始颜色
 * @returns 标准化后的颜色
 */
export function normalizeColor(color: string): string {
  return colorPool.normalize(color);
}

/**
 * 获取颜色池统计信息
 * @returns 颜色池统计
 */
export function getColorPoolStats(): ColorPoolStats {
  return colorPool.getStats();
}

/**
 * 清空颜色池
 */
export function clearColorPool(): void {
  colorPool.clear();
}