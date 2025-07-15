// 颜色处理 Worker - 处理颜色转换、混合和分析等任务

import type {
  WorkerMessage,
  WorkerResponse,
  ColorProcessRequest,
  ColorProcessResponse,
} from './types';

// Worker 上下文类型声明
declare const self: DedicatedWorkerGlobalScope;

interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface HSLColor {
  h: number;
  s: number;
  l: number;
  a: number;
}

class ColorWorker {
  private processingTasks = new Set<string>();

  constructor() {
    self.onmessage = (event: MessageEvent<WorkerMessage>) => {
      this.handleMessage(event.data);
    };
  }

  private async handleMessage(message: WorkerMessage): Promise<void> {
    const startTime = performance.now();

    try {
      this.processingTasks.add(message.id);

      let result: any;

      switch (message.type) {
        case 'colorConvert':
          result = await this.convertColors(
            message.payload as ColorProcessRequest,
          );
          break;
        case 'colorBlend':
          result = await this.blendColors(
            message.payload as ColorProcessRequest,
          );
          break;
        case 'colorAnalyze':
          result = await this.analyzeColors(
            message.payload as ColorProcessRequest,
          );
          break;
        default:
          throw new Error(`Unknown task type: ${message.type}`);
      }

      const response: WorkerResponse = {
        id: message.id,
        type: message.type,
        success: true,
        data: result,
        timestamp: Date.now(),
        executionTime: performance.now() - startTime,
      };

      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        id: message.id,
        type: message.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        executionTime: performance.now() - startTime,
      };

      self.postMessage(response);
    } finally {
      this.processingTasks.delete(message.id);
    }
  }

  private async convertColors(
    request: ColorProcessRequest,
  ): Promise<ColorProcessResponse> {
    const { colors, options } = request;
    const targetFormat = options?.format || 'rgba';
    const processedColors: any[] = [];

    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < colors.length; i += batchSize) {
      const batch = colors.slice(i, i + batchSize);

      for (const color of batch) {
        let convertedColor: any;

        switch (targetFormat) {
          case 'rgb':
            convertedColor = this.toRGB(color);
            break;
          case 'rgba':
            convertedColor = this.toRGBA(color);
            break;
          case 'hex':
            convertedColor = this.toHex(color);
            break;
          case 'hsl':
            convertedColor = this.toHSL(color);
            break;
          default:
            convertedColor = color;
        }

        processedColors.push(convertedColor);
        processed++;
      }

      // 每批处理后让出控制权
      if (i + batchSize < colors.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return {
      processedColors,
      statistics: {
        uniqueColors: new Set(processedColors).size,
        dominantColor: this.findDominantColor(processedColors),
        averageColor: this.calculateAverageColor(processedColors),
      },
    };
  }

  private async blendColors(
    request: ColorProcessRequest,
  ): Promise<ColorProcessResponse> {
    const { colors, options } = request;
    const blendMode = options?.blendMode || 'normal';
    const processedColors: string[] = [];

    if (colors.length < 2) {
      throw new Error('At least 2 colors required for blending');
    }

    for (let i = 0; i < colors.length - 1; i++) {
      const color1 = this.parseColor(colors[i]);
      const color2 = this.parseColor(colors[i + 1]);

      let blendedColor: RGBAColor;

      switch (blendMode) {
        case 'multiply':
          blendedColor = this.multiplyBlend(color1, color2);
          break;
        case 'screen':
          blendedColor = this.screenBlend(color1, color2);
          break;
        case 'normal':
        default:
          blendedColor = this.normalBlend(color1, color2);
          break;
      }

      processedColors.push(this.rgbaToHex(blendedColor));

      // 每10个颜色让出一次控制权
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return {
      processedColors,
      statistics: {
        uniqueColors: new Set(processedColors).size,
        dominantColor: processedColors[0] || '#000000',
        averageColor: this.calculateAverageColor(processedColors),
      },
    };
  }

  private async analyzeColors(
    request: ColorProcessRequest,
  ): Promise<ColorProcessResponse> {
    const { colors, options } = request;
    const tolerance = options?.tolerance || 0;

    const colorMap = new Map<string, number>();
    const processedColors: any[] = [];

    // 统计颜色频率
    for (const color of colors) {
      const normalizedColor = this.normalizeColor(color);
      const count = colorMap.get(normalizedColor) || 0;
      colorMap.set(normalizedColor, count + 1);
      processedColors.push({
        original: color,
        normalized: normalizedColor,
        rgba: this.parseColor(color),
        hsl: this.rgbaToHsl(this.parseColor(color)),
      });

      // 每100个颜色让出一次控制权
      if (processedColors.length % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // 找到最频繁的颜色
    let dominantColor = '#000000';
    let maxCount = 0;
    for (const [color, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }

    // 计算平均颜色
    const averageColor = this.calculateAverageColor(
      Array.from(colorMap.keys()),
    );

    return {
      processedColors,
      statistics: {
        uniqueColors: colorMap.size,
        dominantColor,
        averageColor,
      },
    };
  }

  // 颜色转换方法
  private parseColor(color: string): RGBAColor {
    if (color.startsWith('#')) {
      return this.hexToRgba(color);
    } else if (color.startsWith('rgb')) {
      return this.parseRgbString(color);
    } else if (color.startsWith('hsl')) {
      return this.hslToRgba(this.parseHslString(color));
    }

    // 默认返回黑色
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  private hexToRgba(hex: string): RGBAColor {
    const result =
      /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
    if (!result) {
      return { r: 0, g: 0, b: 0, a: 1 };
    }

    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: result[4] ? parseInt(result[4], 16) / 255 : 1,
    };
  }

  private rgbaToHex(rgba: RGBAColor): string {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}${
      rgba.a < 1 ? toHex(rgba.a * 255) : ''
    }`;
  }

  private parseRgbString(rgb: string): RGBAColor {
    const match = rgb.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (!match) {
      return { r: 0, g: 0, b: 0, a: 1 };
    }

    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] ? parseFloat(match[4]) : 1,
    };
  }

  private parseHslString(hsl: string): HSLColor {
    const match = hsl.match(
      /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/,
    );
    if (!match) {
      return { h: 0, s: 0, l: 0, a: 1 };
    }

    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]) / 100,
      l: parseInt(match[3]) / 100,
      a: match[4] ? parseFloat(match[4]) : 1,
    };
  }

  private rgbaToHsl(rgba: RGBAColor): HSLColor {
    const r = rgba.r / 255;
    const g = rgba.g / 255;
    const b = rgba.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100) / 100,
      l: Math.round(l * 100) / 100,
      a: rgba.a,
    };
  }

  private hslToRgba(hsl: HSLColor): RGBAColor {
    const h = hsl.h / 360;
    const s = hsl.s;
    const l = hsl.l;

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a: hsl.a,
    };
  }

  // 颜色混合方法
  private normalBlend(color1: RGBAColor, color2: RGBAColor): RGBAColor {
    const alpha = color2.a;
    const invAlpha = 1 - alpha;

    return {
      r: Math.round(color1.r * invAlpha + color2.r * alpha),
      g: Math.round(color1.g * invAlpha + color2.g * alpha),
      b: Math.round(color1.b * invAlpha + color2.b * alpha),
      a: color1.a + color2.a * (1 - color1.a),
    };
  }

  private multiplyBlend(color1: RGBAColor, color2: RGBAColor): RGBAColor {
    return {
      r: Math.round((color1.r * color2.r) / 255),
      g: Math.round((color1.g * color2.g) / 255),
      b: Math.round((color1.b * color2.b) / 255),
      a: color1.a * color2.a,
    };
  }

  private screenBlend(color1: RGBAColor, color2: RGBAColor): RGBAColor {
    return {
      r: Math.round(255 - ((255 - color1.r) * (255 - color2.r)) / 255),
      g: Math.round(255 - ((255 - color1.g) * (255 - color2.g)) / 255),
      b: Math.round(255 - ((255 - color1.b) * (255 - color2.b)) / 255),
      a: 1 - (1 - color1.a) * (1 - color2.a),
    };
  }

  // 辅助方法
  private normalizeColor(color: string): string {
    const rgba = this.parseColor(color);
    return this.rgbaToHex(rgba);
  }

  private findDominantColor(colors: any[]): string {
    const colorMap = new Map<string, number>();

    for (const color of colors) {
      const colorStr =
        typeof color === 'string' ? color : this.rgbaToHex(color);
      const count = colorMap.get(colorStr) || 0;
      colorMap.set(colorStr, count + 1);
    }

    let dominantColor = '#000000';
    let maxCount = 0;
    for (const [color, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }

    return dominantColor;
  }

  private calculateAverageColor(colors: any[]): string {
    if (colors.length === 0) return '#000000';

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalA = 0;

    for (const color of colors) {
      const rgba = typeof color === 'string' ? this.parseColor(color) : color;
      totalR += rgba.r;
      totalG += rgba.g;
      totalB += rgba.b;
      totalA += rgba.a;
    }

    const count = colors.length;
    return this.rgbaToHex({
      r: Math.round(totalR / count),
      g: Math.round(totalG / count),
      b: Math.round(totalB / count),
      a: totalA / count,
    });
  }

  private toRGB(color: string): string {
    const rgba = this.parseColor(color);
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  }

  private toRGBA(color: string): string {
    const rgba = this.parseColor(color);
    return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
  }

  private toHex(color: string): string {
    const rgba = this.parseColor(color);
    return this.rgbaToHex(rgba);
  }

  private toHSL(color: string): string {
    const rgba = this.parseColor(color);
    const hsl = this.rgbaToHsl(rgba);
    return `hsl(${hsl.h}, ${Math.round(hsl.s * 100)}%, ${Math.round(
      hsl.l * 100,
    )}%)`;
  }
}

// 初始化 Worker
new ColorWorker();

// 导出类型供 TypeScript 使用
export type { ColorWorker };
