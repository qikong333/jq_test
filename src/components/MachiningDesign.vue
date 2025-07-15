<template>
  <div class="machining-design">
    <div class="header-section">
      <h1 class="main-title">CNC精加工零件设计系统</h1>
      <p class="subtitle">Professional CNC Machining Design & Code Generation</p>
    </div>

    <div class="design-container">
      <!-- 零件设计图 -->
      <div class="drawing-section">
        <div class="section-header">
          <h3><i class="icon">📐</i>零件设计图</h3>
          <div class="status-badge">高精度SVG绘图</div>
        </div>
        <div class="svg-container">
          <svg width="400" height="400" viewBox="0 0 400 400" class="part-drawing">
            <!-- 背景网格 -->
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5" />
              </pattern>
              <linearGradient id="steelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: #e8e8e8; stop-opacity: 1" />
                <stop offset="50%" style="stop-color: #d0d0d0; stop-opacity: 1" />
                <stop offset="100%" style="stop-color: #b8b8b8; stop-opacity: 1" />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3" />
              </filter>
            </defs>

            <!-- 背景网格 -->
            <rect width="400" height="400" fill="url(#grid)" opacity="0.3" />

            <!-- 坐标轴 -->
            <line
              x1="50"
              y1="350"
              x2="350"
              y2="350"
              stroke="#666"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />
            <line
              x1="50"
              y1="350"
              x2="50"
              y2="50"
              stroke="#666"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />

            <!-- 箭头标记 -->
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
              </marker>
            </defs>

            <!-- 6角螺丝帽主体 -->
            <g transform="translate(200,200)">
              <!-- 外六角形 (对边距离30mm) -->
              <polygon
                points="26,-15 26,15 0,30 -26,15 -26,-15 0,-30"
                fill="url(#steelGradient)"
                stroke="#333"
                stroke-width="2"
                filter="url(#shadow)"
              />

              <!-- 内螺纹孔 (M16螺纹) -->
              <circle
                cx="0"
                cy="0"
                r="8"
                fill="white"
                stroke="#666"
                stroke-width="1.5"
                stroke-dasharray="2,2"
              />

              <!-- 螺纹标记 -->
              <g stroke="#999" stroke-width="0.5" opacity="0.7">
                <circle cx="0" cy="0" r="6" fill="none" />
                <circle cx="0" cy="0" r="7" fill="none" />
                <circle cx="0" cy="0" r="8" fill="none" />
              </g>

              <!-- 倒角 -->
              <polygon
                points="24,-13 24,13 0,28 -24,13 -24,-13 0,-28"
                fill="none"
                stroke="#999"
                stroke-width="1"
                opacity="0.6"
              />
            </g>

            <!-- 尺寸标注 -->
            <!-- 对边距离标注 -->
            <g stroke="#e74c3c" stroke-width="1" fill="#e74c3c" font-family="Arial" font-size="12">
              <line x1="174" y1="170" x2="226" y2="170" stroke-width="1" />
              <line x1="174" y1="165" x2="174" y2="175" />
              <line x1="226" y1="165" x2="226" y2="175" />
              <text x="200" y="165" text-anchor="middle" font-weight="bold">30mm</text>
            </g>

            <!-- 螺纹孔标注 -->
            <g stroke="#3498db" stroke-width="1" fill="#3498db" font-family="Arial" font-size="12">
              <line x1="192" y1="200" x2="208" y2="200" stroke-width="1" />
              <text x="200" y="250" text-anchor="middle" font-weight="bold">M16×2.0</text>
            </g>

            <!-- 厚度标注 -->
            <g stroke="#27ae60" stroke-width="1" fill="#27ae60" font-family="Arial" font-size="12">
              <line x1="250" y1="185" x2="250" y2="215" stroke-width="1" />
              <line x1="245" y1="185" x2="255" y2="185" />
              <line x1="245" y1="215" x2="255" y2="215" />
              <text x="270" y="202" text-anchor="middle" font-weight="bold">12mm</text>
            </g>

            <!-- 工艺路径动画 -->
            <g class="tool-path" opacity="0.8">
              <circle r="2" fill="#ff6b6b">
                <animateMotion dur="4s" repeatCount="indefinite">
                  <path d="M 200,200 m 26,-15 L 26,15 L 0,30 L -26,15 L -26,-15 L 0,-30 Z" />
                </animateMotion>
              </circle>
            </g>

            <!-- 标题 -->
            <text
              x="200"
              y="30"
              text-anchor="middle"
              font-family="Arial"
              font-size="16"
              font-weight="bold"
              fill="#2c3e50"
            >
              6角螺丝帽 - 不锈钢304
            </text>
          </svg>
        </div>
      </div>

      <!-- 零件规格 -->
      <div class="specs-section">
        <div class="section-header">
          <h3><i class="icon">📋</i>零件规格</h3>
          <div class="status-badge success">标准件</div>
        </div>
        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-label">零件名称</span>
            <span class="spec-value">6角螺丝帽</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">材料</span>
            <span class="spec-value">不锈钢304</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">对边距离</span>
            <span class="spec-value">30mm</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">厚度</span>
            <span class="spec-value">12mm</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">螺纹规格</span>
            <span class="spec-value">M16×2.0</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">表面粗糙度</span>
            <span class="spec-value">Ra1.6</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">硬度</span>
            <span class="spec-value">HRC 25-35</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">公差等级</span>
            <span class="spec-value">IT7</span>
          </div>
        </div>
      </div>

      <!-- 3D模型展示区域 -->
      <div class="model-3d-section">
        <div class="section-header">
          <h3><i class="icon">🎯</i>3D模型预览</h3>
          <div class="status-badge info">实时渲染</div>
        </div>
        <CNCPart3D />
      </div>

      <!-- G代码 -->
      <div class="code-section">
        <div class="section-header">
          <h3><i class="icon">⚙️</i>G代码 - 几何运动指令</h3>
          <div class="status-badge warning">自动生成</div>
        </div>
        <div class="code-container">
          <div class="code-header">
            <span class="code-lang">G-Code</span>
            <button @click="copyGCode" class="copy-btn">
              <span class="btn-icon">📋</span>
              <span>复制代码</span>
            </button>
          </div>
          <pre class="code-block">{{ gCode }}</pre>
        </div>
      </div>

      <!-- M代码 -->
      <div class="code-section">
        <div class="section-header">
          <h3><i class="icon">🔧</i>M代码 - 机床辅助功能</h3>
          <div class="status-badge info">辅助控制</div>
        </div>
        <div class="code-container">
          <div class="code-header">
            <span class="code-lang">M-Code</span>
            <button @click="copyMCode" class="copy-btn">
              <span class="btn-icon">📋</span>
              <span>复制代码</span>
            </button>
          </div>
          <pre class="code-block">{{ mCode }}</pre>
        </div>
      </div>

      <!-- 操作面板 -->
      <div class="operation-panel">
        <div class="section-header">
          <h3><i class="icon">🎮</i>操作面板</h3>
          <div class="status-badge">交互控制</div>
        </div>
        <div class="operation-buttons">
          <button class="operation-btn primary" @click="downloadDrawing">
            <span class="btn-icon">💾</span>
            <span>下载图纸</span>
          </button>
          <button class="operation-btn secondary" @click="simulateMachining">
            <span class="btn-icon">⚡</span>
            <span>模拟加工</span>
          </button>
          <button class="operation-btn success" @click="exportCode">
            <span class="btn-icon">📤</span>
            <span>导出代码</span>
          </button>
          <button class="operation-btn info" @click="showDetails">
            <span class="btn-icon">📊</span>
            <span>工艺详情</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CNCPart3D from './CNCPart3D.vue'

// G代码 - 几何运动指令
const gCode = ref(`; 6角螺丝帽加工程序 - 不锈钢304
; 程序名: HEX_NUT_M16.nc
; 材料: 不锈钢304
; 刀具: 硬质合金铣刀

G21 ; 公制单位
G90 ; 绝对坐标
G54 ; 工件坐标系
G17 ; XY平面选择

; 主轴启动和进给设置
M03 S1200 ; 主轴正转 1200RPM (不锈钢低速)
G04 P2.0 ; 延时2秒

; 外六角形粗加工
G00 X15.0 Y0.0 Z5.0 ; 快速定位到起始点
G01 Z-2.0 F100 ; 下刀
G01 X15.0 Y-8.66 F200 ; 第一边
G01 X0.0 Y-17.32 F200 ; 第二边
G01 X-15.0 Y-8.66 F200 ; 第三边
G01 X-15.0 Y8.66 F200 ; 第四边
G01 X0.0 Y17.32 F200 ; 第五边
G01 X15.0 Y8.66 F200 ; 第六边
G01 X15.0 Y0.0 F200 ; 回到起始点

; 分层加工
G01 Z-4.0 F100
G01 X15.0 Y-8.66 F200
G01 X0.0 Y-17.32 F200
G01 X-15.0 Y-8.66 F200
G01 X-15.0 Y8.66 F200
G01 X0.0 Y17.32 F200
G01 X15.0 Y8.66 F200
G01 X15.0 Y0.0 F200

; 继续分层到最终深度
G01 Z-6.0 F100
G01 X15.0 Y-8.66 F200
G01 X0.0 Y-17.32 F200
G01 X-15.0 Y-8.66 F200
G01 X-15.0 Y8.66 F200
G01 X0.0 Y17.32 F200
G01 X15.0 Y8.66 F200
G01 X15.0 Y0.0 F200

; 精加工外轮廓
G01 Z-12.0 F50 ; 到最终深度
G01 X15.0 Y-8.66 F150 ; 精加工进给
G01 X0.0 Y-17.32 F150
G01 X-15.0 Y-8.66 F150
G01 X-15.0 Y8.66 F150
G01 X0.0 Y17.32 F150
G01 X15.0 Y8.66 F150
G01 X15.0 Y0.0 F150

; 中心螺纹孔预钻
G00 X0.0 Y0.0 Z5.0 ; 移动到中心
G01 Z-12.0 F80 ; 钻孔
G00 Z5.0 ; 退刀

; 倒角加工
G01 Z-0.5 F100
G01 X14.0 Y-8.08 F150
G01 X0.0 Y-16.16 F150
G01 X-14.0 Y-8.08 F150
G01 X-14.0 Y8.08 F150
G01 X0.0 Y16.16 F150
G01 X14.0 Y8.08 F150
G01 X14.0 Y0.0 F150

G00 Z50.0 ; 退刀到安全高度
M05 ; 主轴停止
M30 ; 程序结束`)

// M代码 - 机床辅助功能
const mCode = ref(`; M代码 - 机床辅助功能控制
; 6角螺丝帽加工 - 不锈钢304专用

M00 ; 程序暂停，检查工件装夹
M03 S1200 ; 主轴正转，转速1200RPM（不锈钢专用）
M08 ; 冷却液开启（不锈钢加工必需）

; 换刀指令
M06 T01 ; 换1号刀具（Φ10硬质合金立铣刀）
M06 T02 ; 换2号刀具（Φ6硬质合金立铣刀）
M06 T03 ; 换3号刀具（M16丝锥）

; 主轴控制
M03 S1200 ; 主轴正转 1200RPM
M04 S800 ; 主轴反转 800RPM（攻丝用）
M05 ; 主轴停止

; 冷却液控制
M08 ; 冷却液开启
M09 ; 冷却液关闭

; 程序控制
M00 ; 程序暂停
M01 ; 选择性暂停
M02 ; 程序结束
M30 ; 程序结束并复位

; 特殊功能
M19 ; 主轴定向停止
M98 P1001 ; 调用子程序1001
M99 ; 子程序返回

; 不锈钢加工注意事项：
; - 切削速度要低，进给要慢
; - 必须使用冷却液
; - 刀具要锋利，材质要硬
; - 避免积屑瘤产生`)

// 复制G代码
const copyGCode = () => {
  navigator.clipboard.writeText(gCode.value)
  showNotification('G代码已复制到剪贴板！', 'success')
}

// 复制M代码
const copyMCode = () => {
  navigator.clipboard.writeText(mCode.value)
  showNotification('M代码已复制到剪贴板！', 'success')
}

// 下载图纸
const downloadDrawing = () => {
  showNotification('图纸下载功能开发中...', 'info')
}

// 模拟加工
const simulateMachining = () => {
  showNotification('加工模拟功能开发中...', 'info')
}

// 导出代码
const exportCode = () => {
  const allCode = `${gCode.value}\n\n${mCode.value}`
  const blob = new Blob([allCode], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'HEX_NUT_M16.nc'
  a.click()
  URL.revokeObjectURL(url)
  showNotification('代码文件已导出！', 'success')
}

// 显示详情
const showDetails = () => {
  showNotification('工艺详情功能开发中...', 'info')
}

// 通知函数
const showNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error') => {
  // 创建通知元素
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.textContent = message

  // 样式
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    backgroundColor:
      type === 'success'
        ? '#10b981'
        : type === 'info'
          ? '#3b82f6'
          : type === 'warning'
            ? '#f59e0b'
            : '#ef4444',
  })

  document.body.appendChild(notification)

  // 显示动画
  setTimeout(() => {
    notification.style.transform = 'translateX(0)'
  }, 100)

  // 3秒后移除
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)'
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}
</script>

<style scoped>
.machining-design {
  padding: 20px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  min-height: 100vh;
}

.header-section {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 20px;
  background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%);
  border-radius: 20px;
  color: white;
  box-shadow: 0 10px 25px rgba(30, 64, 175, 0.3);
}

.main-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 10px;
  background: linear-gradient(45deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  font-weight: 300;
  letter-spacing: 1px;
}

.design-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  color: #1f2937;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge:not(.success):not(.warning):not(.info) {
  background: #e0f2fe;
  color: #0369a1;
}

.status-badge.success {
  background: #dcfce7;
  color: #166534;
}

.status-badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.info {
  background: #e0e7ff;
  color: #3730a3;
}

.drawing-section {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.svg-container {
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  background: white;
  margin: 20px 0;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.part-drawing {
  width: 100%;
  height: auto;
  display: block;
}

.specs-section {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
  border-left: 4px solid #3b82f6;
}

.spec-label {
  font-weight: 600;
  color: #4b5563;
  font-size: 14px;
}

.spec-value {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
}

.model-3d-section {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 30px;
}

.code-section {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.code-container {
  position: relative;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #374151;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  margin-bottom: 0;
}

.code-lang {
  color: #f9fafb;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.copy-btn {
  padding: 4px 8px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #2563eb;
  transform: scale(1.05);
}

.code-block {
  background: #1f2937;
  color: #f9fafb;
  padding: 20px;
  border-radius: 0 0 8px 8px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
  border: 1px solid #374151;
  border-top: none;
}

.operation-panel {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.operation-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.operation-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.operation-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.operation-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.operation-btn.secondary {
  background: linear-gradient(135deg, #6b7280, #374151);
  color: white;
}

.operation-btn.success {
  background: linear-gradient(135deg, #10b981, #047857);
  color: white;
}

.operation-btn.info {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.btn-icon {
  font-size: 1.2em;
}

/* 工艺路径动画 */
.tool-path {
  animation: dash 4s ease-in-out infinite;
}

@keyframes dash {
  0%,
  100% {
    stroke-dashoffset: 0;
    opacity: 0.7;
  }
  50% {
    stroke-dashoffset: -30;
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .design-container {
    grid-template-columns: 1fr;
    gap: 25px;
  }
}

@media (max-width: 768px) {
  .machining-design {
    padding: 15px;
  }

  .main-title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .drawing-section,
  .specs-section,
  .model-3d-section,
  .code-section,
  .operation-panel {
    padding: 20px;
  }

  .code-block {
    font-size: 10px;
    padding: 15px;
  }

  .operation-buttons {
    grid-template-columns: 1fr;
    gap: 15px;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
