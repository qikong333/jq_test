import type {
  TileHistory,
  TileCoordinate,
  MemoryConfig,
} from '../types/history';

/**
 * 分片管理器
 * 负责将画布分割成小块，管理分片的历史记录
 * 用于优化大画布的性能和内存使用
 */
export class TileManager {
  private tiles: Map<string, TileHistory> = new Map();
  private tileSize: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private maxTiles: number;

  constructor(canvasWidth: number, canvasHeight: number, config: MemoryConfig) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.tileSize = config.tileSize;
    this.maxTiles = config.maxTiles;
  }

  /**
   * 根据格子坐标获取分片ID
   * @param x 格子X坐标
   * @param y 格子Y坐标
   * @returns 分片ID
   */
  getTileId(x: number, y: number): string {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    return `${tileX}_${tileY}`;
  }

  /**
   * 根据格子坐标获取分片坐标信息
   * @param x 格子X坐标
   * @param y 格子Y坐标
   * @returns 分片坐标信息
   */
  getTileCoordinate(x: number, y: number): TileCoordinate {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    const localX = x % this.tileSize;
    const localY = y % this.tileSize;

    return {
      tileX,
      tileY,
      localX,
      localY,
    };
  }

  /**
   * 创建或获取分片历史记录
   * @param tileId 分片ID
   * @returns 分片历史记录
   */
  getOrCreateTile(tileId: string): TileHistory {
    let tile = this.tiles.get(tileId);

    if (!tile) {
      const [tileXStr, tileYStr] = tileId.split('_');
      const tileX = parseInt(tileXStr, 10);
      const tileY = parseInt(tileYStr, 10);

      tile = {
        tileId,
        x: tileX * this.tileSize,
        y: tileY * this.tileSize,
        size: this.tileSize,
        actions: [],
        lastModified: Date.now(),
      };

      // 检查是否超过最大分片数量限制
      if (this.tiles.size >= this.maxTiles) {
        this.cleanupOldTiles();
      }

      this.tiles.set(tileId, tile);
    }

    return tile;
  }

  /**
   * 为分片添加动作ID
   * @param tileId 分片ID
   * @param actionId 动作ID
   */
  addActionToTile(tileId: string, actionId: string): void {
    const tile = this.getOrCreateTile(tileId);
    tile.actions.push(actionId);
    tile.lastModified = Date.now();
  }

  /**
   * 获取受操作影响的所有分片ID
   * @param x 起始X坐标
   * @param y 起始Y坐标
   * @param width 影响区域宽度
   * @param height 影响区域高度
   * @returns 分片ID集合
   */
  getAffectedTiles(
    x: number,
    y: number,
    width: number = 1,
    height: number = 1,
  ): Set<string> {
    const tileIds = new Set<string>();

    const startTileX = Math.floor(x / this.tileSize);
    const startTileY = Math.floor(y / this.tileSize);
    const endTileX = Math.floor((x + width - 1) / this.tileSize);
    const endTileY = Math.floor((y + height - 1) / this.tileSize);

    for (let tileX = startTileX; tileX <= endTileX; tileX++) {
      for (let tileY = startTileY; tileY <= endTileY; tileY++) {
        tileIds.add(`${tileX}_${tileY}`);
      }
    }

    return tileIds;
  }

  /**
   * 获取分片历史记录
   * @param tileId 分片ID
   * @returns 分片历史记录或undefined
   */
  getTile(tileId: string): TileHistory | undefined {
    return this.tiles.get(tileId);
  }

  /**
   * 获取所有活跃分片
   * @returns 分片历史记录数组
   */
  getAllTiles(): TileHistory[] {
    return Array.from(this.tiles.values());
  }

  /**
   * 清理旧的分片记录
   * 基于LRU策略清理最久未使用的分片
   */
  private cleanupOldTiles(): void {
    const tiles = Array.from(this.tiles.entries());

    // 按最后修改时间排序，最旧的在前
    tiles.sort((a, b) => a[1].lastModified - b[1].lastModified);

    // 清理最旧的25%的分片
    const cleanupCount = Math.floor(this.maxTiles * 0.25);
    for (let i = 0; i < cleanupCount && tiles.length > 0; i++) {
      const [tileId] = tiles[i];
      this.tiles.delete(tileId);
    }
  }

  /**
   * 强制清理指定分片
   * @param tileId 分片ID
   */
  removeTile(tileId: string): void {
    this.tiles.delete(tileId);
  }

  /**
   * 清空所有分片
   */
  clear(): void {
    this.tiles.clear();
  }

  /**
   * 获取分片统计信息
   * @returns 分片统计信息
   */
  getStats() {
    const totalTiles = this.tiles.size;
    const totalActions = Array.from(this.tiles.values()).reduce(
      (sum, tile) => sum + tile.actions.length,
      0,
    );

    const averageActionsPerTile =
      totalTiles > 0 ? totalActions / totalTiles : 0;

    return {
      totalTiles,
      totalActions,
      averageActionsPerTile,
      maxTiles: this.maxTiles,
      tileSize: this.tileSize,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * 估算内存使用量
   * @returns 内存使用量(bytes)
   */
  private estimateMemoryUsage(): number {
    let totalMemory = 0;

    for (const tile of this.tiles.values()) {
      // 估算每个分片的内存占用
      // 基础对象: ~200 bytes
      // 每个动作ID: ~36 bytes (UUID)
      totalMemory += 200 + tile.actions.length * 36;
    }

    return totalMemory;
  }

  /**
   * 更新画布尺寸
   * @param width 新的画布宽度
   * @param height 新的画布高度
   */
  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // 清理超出画布范围的分片
    const tilesToRemove: string[] = [];

    for (const [tileId, tile] of this.tiles) {
      if (tile.x >= width || tile.y >= height) {
        tilesToRemove.push(tileId);
      }
    }

    tilesToRemove.forEach((tileId) => this.tiles.delete(tileId));
  }

  /**
   * 检查分片是否在画布范围内
   * @param tileId 分片ID
   * @returns 是否在范围内
   */
  isTileInBounds(tileId: string): boolean {
    const tile = this.tiles.get(tileId);
    if (!tile) return false;

    return tile.x < this.canvasWidth && tile.y < this.canvasHeight;
  }
}
