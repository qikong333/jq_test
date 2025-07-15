# OffscreenCanvas 功能测试

这个测试套件用于验证和测试 OffscreenCanvas 功能在画布编辑器中的实现。

## 📁 文件结构

```
test/
├── README.md                 # 本文档
├── offscreen-test.html       # 主测试页面
├── start-test.js            # 测试服务器启动脚本
└── performance-test.js      # 性能测试脚本（待创建）
```

## 🚀 快速开始

### 方法一：使用 Node.js 服务器（推荐）

1. 确保已安装 Node.js
2. 在终端中导航到测试目录：
   ```bash
   cd src/views/jqEditor2/test
   ```
3. 启动测试服务器：
   ```bash
   node start-test.js
   ```
4. 在浏览器中打开 `http://localhost:3001`

### 方法二：直接打开 HTML 文件

直接在浏览器中打开 `offscreen-test.html` 文件，但某些功能可能受到同源策略限制。

## 🧪 测试功能

### 1. 兼容性检测
- **OffscreenCanvas 支持**：检测浏览器是否支持 OffscreenCanvas API
- **transferControlToOffscreen**：检测画布控制权转移功能
- **Web Workers**：检测 Web Workers 支持
- **WebGL 2.0**：检测 WebGL 2.0 支持
- **ImageBitmap**：检测 ImageBitmap API 支持

### 2. 性能测试
- **FPS 监控**：实时监控渲染帧率
- **CPU 使用率**：模拟 CPU 使用情况
- **内存使用**：监控内存占用
- **渲染基准测试**：对比不同渲染方法的性能

### 3. 功能测试
- **基础绘制测试**：测试基本的像素绘制功能
- **洪水填充测试**：测试区域填充算法
- **图像处理测试**：测试图像数据处理能力
- **错误处理测试**：验证错误处理和回退机制
- **降级模式测试**：测试在不支持 OffscreenCanvas 时的降级处理

## 📊 测试结果解读

### 兼容性状态
- **完全兼容**：所有功能都支持，可以使用完整的 OffscreenCanvas 功能
- **部分兼容**：大部分功能支持，某些高级功能可能不可用
- **兼容性差**：基础功能缺失，建议使用传统渲染方式

### 性能指标
- **FPS**：每秒帧数，越高越好（目标 >30 FPS）
- **CPU 使用率**：处理器占用百分比，越低越好
- **内存使用**：内存占用量，应保持稳定

### 渲染状态
- **绘制正常**：OffscreenCanvas 渲染工作正常
- **绘制异常**：渲染过程中出现错误
- **降级模式**：使用传统渲染方式

## 🔧 浏览器支持

### 完全支持
- Chrome 69+
- Firefox 105+
- Safari 16.4+
- Edge 79+

### 部分支持
- 较旧版本的现代浏览器可能支持基础功能但缺少某些高级特性

### 不支持
- Internet Explorer（所有版本）
- 非常旧的浏览器版本

## 🐛 故障排除

### 常见问题

1. **页面无法加载**
   - 确保使用 HTTP(S) 协议访问，而不是 file:// 协议
   - 检查是否有防火墙或安全软件阻止

2. **OffscreenCanvas 不支持**
   - 更新浏览器到最新版本
   - 尝试在 Chrome 或 Firefox 中测试
   - 检查浏览器的实验性功能设置

3. **性能测试结果异常**
   - 关闭其他占用资源的应用程序
   - 确保浏览器没有运行其他重负载标签页
   - 检查系统资源使用情况

4. **Worker 相关错误**
   - 确保在 HTTP 服务器环境下运行
   - 检查浏览器控制台是否有 CORS 错误
   - 验证 Worker 文件路径是否正确

### 调试技巧

1. **开启浏览器开发者工具**
   - 按 F12 或右键选择"检查元素"
   - 查看 Console 标签页的错误信息
   - 使用 Network 标签页检查资源加载

2. **查看详细日志**
   - 测试页面底部有详细的日志面板
   - 可以导出日志进行进一步分析

3. **性能分析**
   - 使用浏览器的 Performance 标签页
   - 录制性能配置文件分析瓶颈

## 📈 性能优化建议

### 针对 OffscreenCanvas
1. **批量处理**：将多个绘制操作合并为批次
2. **适当的 Worker 数量**：避免创建过多 Worker
3. **内存管理**：及时释放不需要的 ImageData
4. **错误处理**：实现健壮的回退机制

### 针对传统渲染
1. **减少重绘**：使用脏矩形技术
2. **优化算法**：使用高效的绘制算法
3. **缓存策略**：缓存常用的绘制结果

## 🔗 相关资源

- [OffscreenCanvas MDN 文档](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Web Workers MDN 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Canvas API 性能优化指南](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

## 📝 更新日志

### v1.0.0 (当前版本)
- 初始版本
- 基础兼容性检测
- 性能监控功能
- 功能测试套件
- 错误处理和日志系统

---

**注意**：这是一个测试工具，主要用于开发和调试阶段。在生产环境中，请确保已经充分测试了 OffscreenCanvas 功能的兼容性和性能。