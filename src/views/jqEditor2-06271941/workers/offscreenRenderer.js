/**
 * OffscreenCanvas 渲染 Worker
 * 在 Web Worker 中处理画布渲染操作
 */

let offscreenCanvas = null;
let ctx = null;
let gridWidth = 0;
let gridHeight = 0;
let cellSize = 10;
let renderQueue = [];
let isProcessing = false;

/**
 * 初始化 OffscreenCanvas
 * @param {Object} config 配置参数
 */
function initOffscreenCanvas(config) {
  try {
    offscreenCanvas = config.canvas;
    ctx = offscreenCanvas.getContext('2d');
    gridWidth = config.gridWidth;
    gridHeight = config.gridHeight;
    cellSize = config.cellSize;

    // 设置画布尺寸
    offscreenCanvas.width = gridWidth * cellSize;
    offscreenCanvas.height = gridHeight * cellSize;

    // 优化设置
    ctx.imageSmoothingEnabled = false;

    postMessage({
      type: 'init-success',
      data: {
        width: offscreenCanvas.width,
        height: offscreenCanvas.height,
      },
    });
  } catch (error) {
    postMessage({
      type: 'error',
      error: error.message,
    });
  }
}

/**
 * 填充单个网格
 * @param {number} x 网格 X 坐标
 * @param {number} y 网格 Y 坐标
 * @param {string} color 颜色
 */
function fillCell(x, y, color) {
  if (!ctx || x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) {
    return;
  }

  ctx.fillStyle = color;
  ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
}

/**
 * 擦除单个网格
 * @param {number} x 网格 X 坐标
 * @param {number} y 网格 Y 坐标
 */
function eraseCell(x, y) {
  if (!ctx || x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) {
    return;
  }

  ctx.clearRect(x * cellSize, y * cellSize, cellSize, cellSize);
}

/**
 * 绘制线条
 * @param {Array} points 点数组
 * @param {string} color 颜色
 */
function drawLine(points, color) {
  if (!ctx || !points || points.length < 2) {
    return;
  }

  for (const point of points) {
    fillCell(point.x, point.y, color);
  }
}

/**
 * 清空画布
 */
function clearCanvas() {
  if (!ctx) return;

  ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
}

/**
 * 获取 ImageData
 * @param {number} x 起始 X 坐标
 * @param {number} y 起始 Y 坐标
 * @param {number} width 宽度
 * @param {number} height 高度
 * @returns {ImageData} 图像数据
 */
function getImageData(x = 0, y = 0, width = null, height = null) {
  if (!ctx) return null;

  const w = width || offscreenCanvas.width;
  const h = height || offscreenCanvas.height;

  return ctx.getImageData(x, y, w, h);
}

/**
 * 设置 ImageData
 * @param {ImageData} imageData 图像数据
 * @param {number} x 起始 X 坐标
 * @param {number} y 起始 Y 坐标
 */
function putImageData(imageData, x = 0, y = 0) {
  if (!ctx || !imageData) return;

  ctx.putImageData(imageData, x, y);
}

/**
 * 批量处理渲染队列
 */
function processRenderQueue() {
  if (isProcessing || renderQueue.length === 0) {
    return;
  }

  isProcessing = true;

  try {
    // 批量处理所有操作
    for (const operation of renderQueue) {
      switch (operation.type) {
        case 'fillCell':
          fillCell(operation.x, operation.y, operation.color);
          break;
        case 'eraseCell':
          eraseCell(operation.x, operation.y);
          break;
        case 'drawLine':
          drawLine(operation.points, operation.color);
          break;
        case 'clear':
          clearCanvas();
          break;
      }
    }

    // 清空队列
    renderQueue = [];

    // 发送完成通知
    postMessage({
      type: 'render-complete',
      timestamp: Date.now(),
    });
  } catch (error) {
    postMessage({
      type: 'error',
      error: error.message,
    });
  } finally {
    isProcessing = false;
  }
}

/**
 * 添加渲染操作到队列
 * @param {Object} operation 渲染操作
 */
function addToRenderQueue(operation) {
  renderQueue.push(operation);

  // 如果队列达到一定长度，立即处理
  if (renderQueue.length >= 50) {
    processRenderQueue();
  }
}

/**
 * 处理消息
 */
self.onmessage = function (e) {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      initOffscreenCanvas(data);
      break;

    case 'fillCell':
      addToRenderQueue({
        type: 'fillCell',
        x: data.x,
        y: data.y,
        color: data.color,
      });
      break;

    case 'eraseCell':
      addToRenderQueue({
        type: 'eraseCell',
        x: data.x,
        y: data.y,
      });
      break;

    case 'drawLine':
      addToRenderQueue({
        type: 'drawLine',
        points: data.points,
        color: data.color,
      });
      break;

    case 'clear':
      addToRenderQueue({
        type: 'clear',
      });
      break;

    case 'flush':
      processRenderQueue();
      break;

    case 'getImageData':
      try {
        const imageData = getImageData(data.x, data.y, data.width, data.height);
        postMessage({
          type: 'imageData',
          data: imageData,
          requestId: data.requestId,
        });
      } catch (error) {
        postMessage({
          type: 'error',
          error: error.message,
          requestId: data.requestId,
        });
      }
      break;

    case 'putImageData':
      try {
        putImageData(data.imageData, data.x, data.y);
        postMessage({
          type: 'putImageData-complete',
          requestId: data.requestId,
        });
      } catch (error) {
        postMessage({
          type: 'error',
          error: error.message,
          requestId: data.requestId,
        });
      }
      break;

    default:
      postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`,
      });
  }
};

// 定期处理渲染队列
setInterval(() => {
  if (renderQueue.length > 0) {
    processRenderQueue();
  }
}, 16); // 60fps

// Worker 启动通知
postMessage({
  type: 'worker-ready',
});
