import * as THREE from 'three'

// G代码指令类型
export interface GCodeInstruction {
  type: 'G' | 'M' | 'T' | 'F' | 'S'
  code: number
  parameters: { [key: string]: number }
  originalLine: string
  lineNumber: number
}

// 刀具路径点
export interface ToolPathPoint {
  position: THREE.Vector3
  feedRate: number
  spindleSpeed: number
  toolNumber: number
  moveType: 'rapid' | 'linear' | 'arc'
  instruction: GCodeInstruction
}

// 加工状态
export interface MachiningState {
  position: THREE.Vector3
  feedRate: number
  spindleSpeed: number
  toolNumber: number
  coordinateMode: 'absolute' | 'incremental'
  units: 'mm' | 'inch'
  spindleRunning: boolean
}

export class GCodeParser {
  private state: MachiningState
  private toolPath: ToolPathPoint[]
  private instructions: GCodeInstruction[]

  constructor() {
    this.state = {
      position: new THREE.Vector3(0, 0, 0),
      feedRate: 100,
      spindleSpeed: 1000,
      toolNumber: 1,
      coordinateMode: 'absolute',
      units: 'mm',
      spindleRunning: false,
    }
    this.toolPath = []
    this.instructions = []
  }

  /**
   * 解析G代码字符串
   */
  parse(gCodeText: string): { instructions: GCodeInstruction[]; toolPath: ToolPathPoint[] } {
    const lines = gCodeText.split('\n')
    this.instructions = []
    this.toolPath = []
    this.resetState()

    lines.forEach((line, index) => {
      const cleanLine = this.cleanLine(line)
      if (cleanLine) {
        const instruction = this.parseLine(cleanLine, index + 1)
        if (instruction) {
          this.instructions.push(instruction)
          this.processInstruction(instruction)
        }
      }
    })

    return {
      instructions: this.instructions,
      toolPath: this.toolPath,
    }
  }

  /**
   * 清理G代码行（移除注释和空白）
   */
  private cleanLine(line: string): string {
    // 移除注释
    const commentIndex = line.indexOf(';')
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex)
    }

    // 移除括号注释
    line = line.replace(/\([^)]*\)/g, '')

    return line.trim().toUpperCase()
  }

  /**
   * 解析单行G代码
   */
  private parseLine(line: string, lineNumber: number): GCodeInstruction | null {
    if (!line) return null

    const matches = line.match(/([GMT])(\d+(?:\.\d+)?)|([XYZIJKFSR])([+-]?\d+(?:\.\d+)?)/g)
    if (!matches) return null

    let type: 'G' | 'M' | 'T' | 'F' | 'S' = 'G'
    let code = 0
    const parameters: { [key: string]: number } = {}

    matches.forEach((match) => {
      const letter = match[0]
      const value = parseFloat(match.substring(1))

      if (letter === 'G' || letter === 'M' || letter === 'T') {
        type = letter as 'G' | 'M' | 'T'
        code = value
      } else if (letter === 'F') {
        type = 'F'
        parameters['F'] = value
      } else if (letter === 'S') {
        type = 'S'
        parameters['S'] = value
      } else {
        parameters[letter] = value
      }
    })

    return {
      type,
      code,
      parameters,
      originalLine: line,
      lineNumber,
    }
  }

  /**
   * 处理G代码指令
   */
  private processInstruction(instruction: GCodeInstruction): void {
    switch (instruction.type) {
      case 'G':
        this.processGCode(instruction)
        break
      case 'M':
        this.processMCode(instruction)
        break
      case 'F':
        this.state.feedRate = instruction.parameters.F || this.state.feedRate
        break
      case 'S':
        this.state.spindleSpeed = instruction.parameters.S || this.state.spindleSpeed
        break
      case 'T':
        this.state.toolNumber = instruction.code
        break
    }
  }

  /**
   * 处理G代码指令
   */
  private processGCode(instruction: GCodeInstruction): void {
    const { code, parameters } = instruction

    switch (code) {
      case 0: // G00 - 快速定位
        this.processRapidMove(instruction, parameters)
        break
      case 1: // G01 - 直线插补
        this.processLinearMove(instruction, parameters)
        break
      case 2: // G02 - 顺时针圆弧插补
        this.processArcMove(instruction, parameters, 'cw')
        break
      case 3: // G03 - 逆时针圆弧插补
        this.processArcMove(instruction, parameters, 'ccw')
        break
      case 17: // G17 - XY平面选择
        // 设置工作平面为XY
        break
      case 20: // G20 - 英制单位
        this.state.units = 'inch'
        break
      case 21: // G21 - 公制单位
        this.state.units = 'mm'
        break
      case 90: // G90 - 绝对坐标
        this.state.coordinateMode = 'absolute'
        break
      case 91: // G91 - 增量坐标
        this.state.coordinateMode = 'incremental'
        break
    }
  }

  /**
   * 处理M代码指令
   */
  private processMCode(instruction: GCodeInstruction): void {
    const { code } = instruction

    switch (code) {
      case 3: // M03 - 主轴正转
        this.state.spindleRunning = true
        break
      case 4: // M04 - 主轴反转
        this.state.spindleRunning = true
        break
      case 5: // M05 - 主轴停止
        this.state.spindleRunning = false
        break
      case 8: // M08 - 冷却液开
        break
      case 9: // M09 - 冷却液关
        break
      case 30: // M30 - 程序结束
        break
    }
  }

  /**
   * 处理快速移动
   */
  private processRapidMove(
    instruction: GCodeInstruction,
    parameters: { [key: string]: number },
  ): void {
    const newPosition = this.calculateNewPosition(parameters)

    this.addToolPathPoint({
      position: newPosition.clone(),
      feedRate: this.state.feedRate,
      spindleSpeed: this.state.spindleSpeed,
      toolNumber: this.state.toolNumber,
      moveType: 'rapid',
      instruction,
    })

    this.state.position = newPosition
  }

  /**
   * 处理直线移动
   */
  private processLinearMove(
    instruction: GCodeInstruction,
    parameters: { [key: string]: number },
  ): void {
    const newPosition = this.calculateNewPosition(parameters)

    // 更新进给速度
    if (parameters.F !== undefined) {
      this.state.feedRate = parameters.F
    }

    this.addToolPathPoint({
      position: newPosition.clone(),
      feedRate: this.state.feedRate,
      spindleSpeed: this.state.spindleSpeed,
      toolNumber: this.state.toolNumber,
      moveType: 'linear',
      instruction,
    })

    this.state.position = newPosition
  }

  /**
   * 处理圆弧移动
   */
  private processArcMove(
    instruction: GCodeInstruction,
    parameters: { [key: string]: number },
    direction: 'cw' | 'ccw',
  ): void {
    const endPosition = this.calculateNewPosition(parameters)
    const center = new THREE.Vector3(
      this.state.position.x + (parameters.I || 0),
      this.state.position.y + (parameters.J || 0),
      this.state.position.z + (parameters.K || 0),
    )

    // 计算圆弧路径点
    const arcPoints = this.calculateArcPoints(this.state.position, endPosition, center, direction)

    // 添加圆弧路径点
    arcPoints.forEach((point) => {
      this.addToolPathPoint({
        position: point,
        feedRate: this.state.feedRate,
        spindleSpeed: this.state.spindleSpeed,
        toolNumber: this.state.toolNumber,
        moveType: 'arc',
        instruction,
      })
    })

    this.state.position = endPosition
  }

  /**
   * 计算新位置
   */
  private calculateNewPosition(parameters: { [key: string]: number }): THREE.Vector3 {
    let newPosition = this.state.position.clone()

    if (this.state.coordinateMode === 'absolute') {
      if (parameters.X !== undefined) newPosition.x = parameters.X
      if (parameters.Y !== undefined) newPosition.y = parameters.Y
      if (parameters.Z !== undefined) newPosition.z = parameters.Z
    } else {
      if (parameters.X !== undefined) newPosition.x += parameters.X
      if (parameters.Y !== undefined) newPosition.y += parameters.Y
      if (parameters.Z !== undefined) newPosition.z += parameters.Z
    }

    return newPosition
  }

  /**
   * 计算圆弧路径点
   */
  private calculateArcPoints(
    start: THREE.Vector3,
    end: THREE.Vector3,
    center: THREE.Vector3,
    direction: 'cw' | 'ccw',
    segments: number = 16,
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = []

    // 计算起始和结束角度
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x)
    const radius = start.distanceTo(center)

    let totalAngle = endAngle - startAngle
    if (direction === 'cw') {
      if (totalAngle > 0) totalAngle -= 2 * Math.PI
    } else {
      if (totalAngle < 0) totalAngle += 2 * Math.PI
    }

    // 生成圆弧点
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = startAngle + totalAngle * t
      const x = center.x + radius * Math.cos(angle)
      const y = center.y + radius * Math.sin(angle)
      const z = start.z + (end.z - start.z) * t

      points.push(new THREE.Vector3(x, y, z))
    }

    return points
  }

  /**
   * 添加刀具路径点
   */
  private addToolPathPoint(point: ToolPathPoint): void {
    this.toolPath.push(point)
  }

  /**
   * 重置解析状态
   */
  private resetState(): void {
    this.state = {
      position: new THREE.Vector3(0, 0, 0),
      feedRate: 100,
      spindleSpeed: 1000,
      toolNumber: 1,
      coordinateMode: 'absolute',
      units: 'mm',
      spindleRunning: false,
    }
  }

  /**
   * 获取刀具路径总长度
   */
  getToolPathLength(): number {
    let totalLength = 0
    for (let i = 1; i < this.toolPath.length; i++) {
      totalLength += this.toolPath[i].position.distanceTo(this.toolPath[i - 1].position)
    }
    return totalLength
  }

  /**
   * 估算加工时间（分钟）
   */
  estimateMachiningTime(): number {
    let totalTime = 0

    for (let i = 1; i < this.toolPath.length; i++) {
      const distance = this.toolPath[i].position.distanceTo(this.toolPath[i - 1].position)
      const feedRate = this.toolPath[i].feedRate
      const time = distance / feedRate // 分钟
      totalTime += time
    }

    return totalTime
  }

  /**
   * 获取边界框
   */
  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3()
    this.toolPath.forEach((point) => {
      box.expandByPoint(point.position)
    })
    return box
  }

  /**
   * 导出为Three.js路径几何体
   */
  toThreeJSPath(): THREE.BufferGeometry {
    const points = this.toolPath.map((point) => point.position)
    return new THREE.BufferGeometry().setFromPoints(points)
  }
}

// 预定义的G代码程序模板
export const GCodeTemplates = {
  // 六角螺丝帽加工程序
  hexNut: `
G21 ; 公制单位
G90 ; 绝对坐标模式
G17 ; XY工作平面

; 主轴启动
M03 S1200

; 外形粗加工
G00 X30.0 Y0.0 Z5.0 ; 快速定位到起始点
G01 Z-2.0 F100 ; 下刀
G01 X26.0 Y-15.0 F200 ; 第一边
G01 X0.0 Y-30.0 F200 ; 第二边
G01 X-26.0 Y-15.0 F200 ; 第三边
G01 X-26.0 Y15.0 F200 ; 第四边
G01 X0.0 Y30.0 F200 ; 第五边
G01 X26.0 Y15.0 F200 ; 第六边
G01 X30.0 Y0.0 F200 ; 回到起始点

; 中央孔加工
G00 X0.0 Y0.0 Z5.0 ; 移动到中心
G01 Z-12.0 F50 ; 钻孔
G00 Z5.0 ; 退刀

; 主轴停止
M05
G00 Z50.0 ; 退到安全高度
M30 ; 程序结束
  `.trim(),

  // 简单矩形加工
  rectangle: `
G21 ; 公制单位
G90 ; 绝对坐标
M03 S1500

G00 X0.0 Y0.0 Z5.0
G01 Z-5.0 F100
G01 X50.0 Y0.0 F300
G01 X50.0 Y30.0 F300
G01 X0.0 Y30.0 F300
G01 X0.0 Y0.0 F300
G00 Z50.0

M05
M30
  `.trim(),

  // 圆形加工
  circle: `
G21 ; 公制单位
G90 ; 绝对坐标
M03 S2000

G00 X25.0 Y0.0 Z5.0
G01 Z-3.0 F100
G02 X25.0 Y0.0 I-25.0 J0.0 F400
G00 Z50.0

M05
M30
  `.trim(),
}
