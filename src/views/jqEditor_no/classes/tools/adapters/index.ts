/**
 * 工具适配器统一导出
 * 将现有工具逻辑适配到新的 ITool 接口
 */

// 导出工具适配器类
export { BrushToolAdapter } from './BrushToolAdapter'
export { PanToolAdapter } from './PanToolAdapter'
export { ImageUploadToolAdapter } from './ImageUploadToolAdapter'

// 创建工具实例工厂函数
import { BrushToolAdapter } from './BrushToolAdapter'
import { PanToolAdapter } from './PanToolAdapter'
import { ImageUploadToolAdapter } from './ImageUploadToolAdapter'
import type { useCanvas } from '../../composables/useCanvas'

// 工具适配器工厂函数
export function createToolAdapters(canvasComposable: ReturnType<typeof useCanvas>) {
  return {
    brushTool: new BrushToolAdapter(canvasComposable),
    panTool: new PanToolAdapter(canvasComposable),
    imageUploadTool: new ImageUploadToolAdapter()
  }
}

// 创建工具适配器列表的工厂函数
export function createToolAdapterList(canvasComposable: ReturnType<typeof useCanvas>) {
  const adapters = createToolAdapters(canvasComposable)
  return [adapters.brushTool, adapters.panTool, adapters.imageUploadTool]
}