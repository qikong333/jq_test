/**
 * 渲染桥接器
 * 负责主线程与 Worker 线程之间的通信协调
 */

import { RenderResult } from './OffscreenCanvasManager';

export interface BridgeMessage {
  id: string;
  type: 'render-request' | 'render-response' | 'render-error' | 'status-update';
  payload: any;
  timestamp: number;
}

export interface RenderRequest {
  taskId: string;
  operation: string;
  data: any;
  priority: 'low' | 'normal' | 'high';
}

export interface StatusUpdate {
  type: 'performance' | 'queue' | 'error';
  data: any;
}

interface MessageHandler {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class RenderBridge {
  private messageQueue: BridgeMessage[] = [];
  private messageHandlers = new Map<string, MessageHandler>();
  private statusListeners: Function[] = [];
  private isProcessing = false;
  private messageCounter = 0;

  // 回调函数
  public onRenderComplete: ((result: RenderResult) => void) | null = null;
  public onRenderError: ((result: RenderResult) => void) | null = null;
  public onStatusUpdate: ((status: StatusUpdate) => void) | null = null;

  constructor() {
    this.startMessageProcessor();
  }

  /**
   * 发送渲染请求
   */
  async sendRenderRequest(request: RenderRequest): Promise<any> {
    const messageId = this.generateMessageId();

    const message: BridgeMessage = {
      id: messageId,
      type: 'render-request',
      payload: request,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      // 注册消息处理器
      this.messageHandlers.set(messageId, { resolve, reject });

      // 添加到消息队列
      this.addToQueue(message);

      // 设置超时
      setTimeout(() => {
        if (this.messageHandlers.has(messageId)) {
          this.messageHandlers.delete(messageId);
          reject(new Error('渲染请求超时'));
        }
      }, 15000); // 15秒超时
    });
  }

  /**
   * 通知渲染完成
   */
  notifyRenderComplete(result: RenderResult): void {
    const message: BridgeMessage = {
      id: this.generateMessageId(),
      type: 'render-response',
      payload: result,
      timestamp: Date.now(),
    };

    this.addToQueue(message);

    // 调用回调
    if (this.onRenderComplete) {
      this.onRenderComplete(result);
    }
  }

  /**
   * 通知渲染错误
   */
  notifyRenderError(result: RenderResult): void {
    const message: BridgeMessage = {
      id: this.generateMessageId(),
      type: 'render-error',
      payload: result,
      timestamp: Date.now(),
    };

    this.addToQueue(message);

    // 调用回调
    if (this.onRenderError) {
      this.onRenderError(result);
    }
  }

  /**
   * 发送状态更新
   */
  sendStatusUpdate(status: StatusUpdate): void {
    const message: BridgeMessage = {
      id: this.generateMessageId(),
      type: 'status-update',
      payload: status,
      timestamp: Date.now(),
    };

    this.addToQueue(message);

    // 通知状态监听器
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('状态监听器执行错误:', error);
      }
    });

    // 调用回调
    if (this.onStatusUpdate) {
      this.onStatusUpdate(status);
    }
  }

  /**
   * 添加消息到队列
   */
  private addToQueue(message: BridgeMessage): void {
    // 根据消息类型确定优先级
    if (
      message.type === 'render-error' ||
      (message.payload && message.payload.priority === 'high')
    ) {
      this.messageQueue.unshift(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * 启动消息处理器
   */
  private startMessageProcessor(): void {
    const processMessages = async () => {
      if (this.isProcessing || this.messageQueue.length === 0) {
        requestAnimationFrame(processMessages);
        return;
      }

      this.isProcessing = true;

      try {
        // 批量处理消息（最多5条）
        const batchSize = Math.min(5, this.messageQueue.length);
        const batch = this.messageQueue.splice(0, batchSize);

        for (const message of batch) {
          await this.processMessage(message);
        }
      } catch (error) {
        console.error('消息处理错误:', error);
      } finally {
        this.isProcessing = false;
      }

      requestAnimationFrame(processMessages);
    };

    requestAnimationFrame(processMessages);
  }

  /**
   * 处理单个消息
   */
  private async processMessage(message: BridgeMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'render-request':
          await this.handleRenderRequest(message);
          break;

        case 'render-response':
          this.handleRenderResponse(message);
          break;

        case 'render-error':
          this.handleRenderError(message);
          break;

        case 'status-update':
          this.handleStatusUpdate(message);
          break;

        default:
          console.warn('未知的消息类型:', message.type);
      }
    } catch (error) {
      console.error('处理消息失败:', error, message);
    }
  }

  /**
   * 处理渲染请求
   */
  private async handleRenderRequest(message: BridgeMessage): Promise<void> {
    const request = message.payload as RenderRequest;

    // 这里可以添加请求预处理逻辑
    // 例如：验证请求、添加元数据、记录日志等

    // console.log('处理渲染请求:', {
    //   taskId: request.taskId,
    //   operation: request.operation,
    //   priority: request.priority,
    //   timestamp: message.timestamp,
    // });
  }

  /**
   * 处理渲染响应
   */
  private handleRenderResponse(message: BridgeMessage): void {
    const result = message.payload as RenderResult;

    // 查找对应的消息处理器
    const handler = this.findHandlerByTaskId(result.taskId);
    if (handler) {
      handler.resolve(result);
      this.removeHandlerByTaskId(result.taskId);
    }
  }

  /**
   * 处理渲染错误
   */
  private handleRenderError(message: BridgeMessage): void {
    const result = message.payload as RenderResult;

    // 查找对应的消息处理器
    const handler = this.findHandlerByTaskId(result.taskId);
    if (handler) {
      handler.reject(new Error(result.error || '渲染失败'));
      this.removeHandlerByTaskId(result.taskId);
    }
  }

  /**
   * 处理状态更新
   */
  private handleStatusUpdate(message: BridgeMessage): void {
    const status = message.payload as StatusUpdate;

    // 可以在这里添加状态处理逻辑
    console.log('状态更新:', status);
  }

  /**
   * 根据任务ID查找处理器
   */
  private findHandlerByTaskId(taskId: string): any {
    // 这里需要一个更好的方式来关联消息ID和任务ID
    // 暂时使用简单的查找逻辑，返回第一个找到的处理器
    for (const [messageId, handler] of this.messageHandlers.entries()) {
      // 在实际实现中，应该有一个映射关系来关联taskId和messageId
      // 这里暂时返回第一个处理器作为示例
      if (messageId.includes(taskId) || this.messageHandlers.size === 1) {
        return handler;
      }
    }
    return null;
  }

  /**
   * 根据任务ID移除处理器
   */
  private removeHandlerByTaskId(taskId: string): void {
    // 这里需要改进，暂时清除第一个处理器
    const firstKey = this.messageHandlers.keys().next().value;
    if (firstKey) {
      this.messageHandlers.delete(firstKey);
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageCounter}`;
  }

  /**
   * 添加状态监听器
   */
  addStatusListener(listener: (status: StatusUpdate) => void): void {
    this.statusListeners.push(listener);
  }

  /**
   * 移除状态监听器
   */
  removeStatusListener(listener: (status: StatusUpdate) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this.messageQueue.length,
      pendingHandlers: this.messageHandlers.size,
      isProcessing: this.isProcessing,
      statusListeners: this.statusListeners.length,
    };
  }

  /**
   * 清空消息队列
   */
  clearQueue(): void {
    this.messageQueue = [];

    // 拒绝所有待处理的请求
    this.messageHandlers.forEach(({ reject }) => {
      reject(new Error('队列已清空'));
    });
    this.messageHandlers.clear();
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const now = Date.now();
    const recentMessages = this.messageQueue.filter(
      (msg) => now - msg.timestamp < 5000, // 最近5秒的消息
    );

    return {
      totalMessages: this.messageQueue.length,
      recentMessages: recentMessages.length,
      messageTypes: this.getMessageTypeStats(),
      averageProcessingTime: this.calculateAverageProcessingTime(),
    };
  }

  /**
   * 获取消息类型统计
   */
  private getMessageTypeStats() {
    const stats: Record<string, number> = {};

    this.messageQueue.forEach((msg) => {
      stats[msg.type] = (stats[msg.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 计算平均处理时间
   */
  private calculateAverageProcessingTime(): number {
    // 这里需要实际的处理时间记录
    // 暂时返回估算值
    return 16; // 约1帧的时间
  }

  /**
   * 销毁桥接器
   */
  destroy(): void {
    this.clearQueue();
    this.statusListeners = [];
    this.onRenderComplete = null;
    this.onRenderError = null;
    this.onStatusUpdate = null;
  }
}
