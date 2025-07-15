/**
 * 工具管理器测试文件
 * 用于验证新工具管理系统的功能
 */

import { ref } from 'vue'
import { useCanvas } from '../composables/useCanvas'
import { useGrid } from '../composables/useGrid'
import { useBrush } from '../composables/useBrush'
import { useImageUpload } from '../composables/useImageUpload'

/**
 * 测试工具管理器基本功能
 */
export async function testToolManager() {
  console.log('开始测试工具管理器...')
  
  try {
    // 创建canvas composable实例（用于测试）
    const mockProps = {
      width: 800,
      height: 600,
      actualWidth: 50,
    actualHeight: 50,
      bgColor: '#ffffff',
      sourceType: 1 as const,
      readonly: false,
      maxUndoSteps: 50
    }
    const canvas = useCanvas(
      ref(undefined),
      ref(undefined),
      undefined
    )
     
     // 创建工具适配器列表
     const toolAdapterList = createToolAdapterList(canvas)
    
    // 测试工具适配器创建
    console.log('\n1. 测试工具适配器创建:')
    for (const adapter of toolAdapterList) {
      console.log(`✓ 已创建适配器: ${adapter.name} (${adapter.id})`)
    }
    
    console.log(`\n创建完成，可用适配器: [${toolAdapterList.map(a => a.id).join(', ')}]`)
    
    // 测试适配器基本功能
    console.log('\n2. 测试适配器基本功能:')
    
    const brushAdapter = toolAdapterList.find(a => a.id === 'brush')
    if (brushAdapter) {
      console.log(`✓ 画笔适配器: ${brushAdapter.name}`)
      console.log(`  - 描述: ${brushAdapter.name}`)
      console.log(`  - 图标: ${brushAdapter.icon || 'N/A'}`)
    }
    
    const panAdapter = toolAdapterList.find(a => a.id === 'pan')
    if (panAdapter) {
      console.log(`✓ 平移适配器: ${panAdapter.name}`)
      console.log(`  - 描述: ${panAdapter.name}`)
      console.log(`  - 图标: ${panAdapter.icon || 'N/A'}`)
    }
    
    // 测试适配器状态
    console.log('\n3. 测试适配器状态:')
    if (brushAdapter) {
      console.log(`画笔适配器状态:`, {
        id: brushAdapter.id,
        name: brushAdapter.name,
        isActive: brushAdapter.state.value.isActive
      })
    }
    
    console.log('\n✅ 工具管理器测试完成！')
    return true
    
  } catch (error) {
    console.error('❌ 工具管理器测试失败:', error)
    return false
  }
}

/**
 * 测试工具生命周期
 */
export async function testToolLifecycle() {
  console.log('\n开始测试工具生命周期...')
  
  try {
    // 创建canvas composable实例（用于测试）
    const mockProps = {
      width: 800,
      height: 600,
      actualWidth: 50,
    actualHeight: 50,
      bgColor: '#ffffff',
      sourceType: 1 as const,
      readonly: false,
      maxUndoSteps: 50
    }
    const canvas = useCanvas(
      ref(undefined),
      ref(undefined),
      undefined
    )
    
    // 创建工具适配器列表
    const toolAdapterList = createToolAdapterList(canvas)
    
    // 找到画笔适配器
    const brushAdapter = toolAdapterList.find(adapter => adapter.id === 'brush')
    if (!brushAdapter) {
      throw new Error('找不到画笔适配器')
    }
    
    console.log('1. 测试适配器基本属性:')
    console.log(`✓ 适配器ID: ${brushAdapter.id}`)
    console.log(`✓ 适配器名称: ${brushAdapter.name}`)
    console.log(`✓ 适配器状态: ${brushAdapter.state.value.isActive ? '激活' : '未激活'}`)
    
    console.log('\n✅ 工具生命周期测试完成！')
    return true
    
  } catch (error) {
    console.error('❌ 工具生命周期测试失败:', error)
    return false
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('🚀 开始运行工具管理器测试套件...')
  
  const results = {
    basicFunctionality: await testToolManager(),
    lifecycle: await testToolLifecycle()
  }
  
  const allPassed = Object.values(results).every(result => result)
  
  console.log('\n📊 测试结果汇总:')
  console.log(`基本功能测试: ${results.basicFunctionality ? '✅ 通过' : '❌ 失败'}`)
  console.log(`生命周期测试: ${results.lifecycle ? '✅ 通过' : '❌ 失败'}`)
  console.log(`\n总体结果: ${allPassed ? '🎉 所有测试通过！' : '⚠️ 部分测试失败'}`)
  
  return results
}

// 在浏览器控制台中可以调用的全局函数
if (typeof window !== 'undefined') {
  (window as typeof window & { testToolManager: typeof runAllTests }).testToolManager = runAllTests
}