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