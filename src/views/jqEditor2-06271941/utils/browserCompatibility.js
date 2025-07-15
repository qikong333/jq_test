/**
 * 浏览器兼容性检测模块
 * 检测 OffscreenCanvas 和相关 API 的支持情况
 */

/**
 * 检测 OffscreenCanvas 支持情况
 * @returns {Object} 兼容性检测结果
 */
export function detectOffscreenCanvasSupport() {
  const support = {
    offscreenCanvas: false,
    transferControlToOffscreen: false,
    workerCanvas: false,
    imageData: false,
    webWorkers: false,
    overall: false,
  };

  try {
    // 检测 OffscreenCanvas 构造函数
    support.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

    // 检测 transferControlToOffscreen 方法
    if (typeof document !== 'undefined') {
      const testCanvas = document.createElement('canvas');
      support.transferControlToOffscreen =
        typeof testCanvas.transferControlToOffscreen === 'function';
    }

    // 检测 Web Workers 支持
    support.webWorkers = typeof Worker !== 'undefined';

    // 检测 ImageData 支持
    support.imageData = typeof ImageData !== 'undefined';

    // 检测 Worker 中的 Canvas 支持（需要在 Worker 中测试）
    support.workerCanvas = support.offscreenCanvas && support.webWorkers;

    // 综合评估
    support.overall =
      support.offscreenCanvas &&
      support.transferControlToOffscreen &&
      support.webWorkers &&
      support.imageData;
  } catch (error) {
    console.warn('OffscreenCanvas 兼容性检测失败:', error);
  }

  return support;
}

/**
 * 获取浏览器信息
 * @returns {Object} 浏览器信息
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  const info = {
    name: 'unknown',
    version: 'unknown',
    engine: 'unknown',
  };

  // 检测浏览器类型
  if (userAgent.includes('Chrome')) {
    info.name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    info.version = match ? match[1] : 'unknown';
    info.engine = 'Blink';
  } else if (userAgent.includes('Firefox')) {
    info.name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    info.version = match ? match[1] : 'unknown';
    info.engine = 'Gecko';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    info.name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    info.version = match ? match[1] : 'unknown';
    info.engine = 'WebKit';
  } else if (userAgent.includes('Edge')) {
    info.name = 'Edge';
    const match = userAgent.match(/Edge\/(\d+)/);
    info.version = match ? match[1] : 'unknown';
    info.engine = 'EdgeHTML';
  }

  return info;
}

/**
 * 创建兼容性报告
 * @returns {Object} 详细的兼容性报告
 */
export function generateCompatibilityReport() {
  const support = detectOffscreenCanvasSupport();
  const browserInfo = getBrowserInfo();

  const report = {
    timestamp: new Date().toISOString(),
    browser: browserInfo,
    support,
    recommendations: [],
    strategy: 'traditional', // 默认策略
  };

  // 生成建议
  if (support.overall) {
    report.strategy = 'offscreen';
    report.recommendations.push('推荐使用 OffscreenCanvas 以获得最佳性能');
  } else {
    report.strategy = 'traditional';

    if (!support.offscreenCanvas) {
      report.recommendations.push(
        '浏览器不支持 OffscreenCanvas，将使用传统 Canvas 渲染',
      );
    }

    if (!support.webWorkers) {
      report.recommendations.push('浏览器不支持 Web Workers，无法进行后台渲染');
    }

    if (!support.transferControlToOffscreen) {
      report.recommendations.push(
        '浏览器不支持 transferControlToOffscreen 方法',
      );
    }
  }

  // 浏览器特定建议
  if (browserInfo.name === 'Safari' && parseInt(browserInfo.version) < 16) {
    report.recommendations.push('Safari 16+ 才完全支持 OffscreenCanvas');
  }

  if (browserInfo.name === 'Firefox' && parseInt(browserInfo.version) < 105) {
    report.recommendations.push('Firefox 105+ 才完全支持 OffscreenCanvas');
  }

  return report;
}

/**
 * 检测降级策略
 * @returns {string} 推荐的渲染策略
 */
export function getRecommendedStrategy() {
  const support = detectOffscreenCanvasSupport();

  if (support.overall) {
    return {
      strategy: 'offscreen',
      reason: 'OffscreenCanvas 完全支持',
      fallback: 'traditional',
    };
  } else {
    return {
      strategy: 'traditional',
      reason: 'OffscreenCanvas 支持不完整',
      fallback: null,
    };
  }
}

/**
 * 输出兼容性信息到控制台
 */
export function logCompatibilityInfo() {
  const report = generateCompatibilityReport();

  console.group('🔍 OffscreenCanvas 兼容性检测');
  console.log('浏览器信息:', report.browser);
  console.log('支持情况:', report.support);
  console.log('推荐策略:', report.strategy);
  console.log('建议:', report.recommendations);
  console.groupEnd();
}
