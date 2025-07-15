/**
 * OffscreenCanvas 兼容性检测工具
 * 检测浏览器对 OffscreenCanvas 的支持情况
 */

export interface CompatibilityResult {
  isSupported: boolean;
  features: {
    offscreenCanvas: boolean;
    transferControlToOffscreen: boolean;
    workerSupport: boolean;
    webgl2Support: boolean;
  };
  fallbackReason?: string;
  browserInfo: {
    userAgent: string;
    version: string;
    engine: string;
  };
}

export class CompatibilityChecker {
  private static instance: CompatibilityChecker;
  private cachedResult: CompatibilityResult | null = null;

  static getInstance(): CompatibilityChecker {
    if (!CompatibilityChecker.instance) {
      CompatibilityChecker.instance = new CompatibilityChecker();
    }
    return CompatibilityChecker.instance;
  }

  /**
   * 检测 OffscreenCanvas 兼容性
   */
  checkCompatibility(): CompatibilityResult {
    if (this.cachedResult) {
      return this.cachedResult;
    }

    const features = {
      offscreenCanvas: this.checkOffscreenCanvasSupport(),
      transferControlToOffscreen: this.checkTransferControlSupport(),
      workerSupport: this.checkWorkerSupport(),
      webgl2Support: this.checkWebGL2Support(),
    };

    const isSupported = Object.values(features).every(Boolean);
    const fallbackReason = this.getFallbackReason(features);
    const browserInfo = this.getBrowserInfo();

    this.cachedResult = {
      isSupported,
      features,
      fallbackReason,
      browserInfo,
    };

    return this.cachedResult;
  }

  /**
   * 检测 OffscreenCanvas 基础支持
   */
  private checkOffscreenCanvasSupport(): boolean {
    try {
      return (
        typeof OffscreenCanvas !== 'undefined' &&
        typeof OffscreenCanvas.prototype.getContext === 'function'
      );
    } catch {
      return false;
    }
  }

  /**
   * 检测 transferControlToOffscreen 支持
   */
  private checkTransferControlSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return typeof canvas.transferControlToOffscreen === 'function';
    } catch {
      return false;
    }
  }

  /**
   * 检测 Worker 支持
   */
  private checkWorkerSupport(): boolean {
    try {
      return typeof Worker !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * 检测 WebGL2 支持
   */
  private checkWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    } catch {
      return false;
    }
  }

  /**
   * 获取降级原因
   */
  private getFallbackReason(
    features: CompatibilityResult['features'],
  ): string | undefined {
    const missing = Object.entries(features)
      .filter(([, supported]) => !supported)
      .map(([feature]) => feature);

    if (missing.length === 0) return undefined;

    return `不支持的功能: ${missing.join(', ')}`;
  }

  /**
   * 获取浏览器信息
   */
  private getBrowserInfo(): CompatibilityResult['browserInfo'] {
    const userAgent = navigator.userAgent;

    // 简单的浏览器检测
    let engine = 'unknown';
    let version = 'unknown';

    if (userAgent.includes('Chrome')) {
      engine = 'Blink';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Firefox')) {
      engine = 'Gecko';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      engine = 'WebKit';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'unknown';
    }

    return {
      userAgent,
      version,
      engine,
    };
  }

  /**
   * 重置缓存结果
   */
  resetCache(): void {
    this.cachedResult = null;
  }

  /**
   * 获取详细的兼容性报告
   */
  getDetailedReport(): string {
    const result = this.checkCompatibility();

    let report = `OffscreenCanvas 兼容性报告\n`;
    report += `================================\n`;
    report += `总体支持: ${result.isSupported ? '✅ 支持' : '❌ 不支持'}\n`;

    if (result.fallbackReason) {
      report += `降级原因: ${result.fallbackReason}\n`;
    }

    report += `\n功能详情:\n`;
    Object.entries(result.features).forEach(([feature, supported]) => {
      report += `  ${feature}: ${supported ? '✅' : '❌'}\n`;
    });

    report += `\n浏览器信息:\n`;
    report += `  引擎: ${result.browserInfo.engine}\n`;
    report += `  版本: ${result.browserInfo.version}\n`;
    report += `  User Agent: ${result.browserInfo.userAgent}\n`;

    return report;
  }
}

// 导出单例实例
export const compatibilityChecker = CompatibilityChecker.getInstance();
