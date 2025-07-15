import { ref, computed } from 'vue';

/**
 * 颜色系统Composable
 * 负责颜色选择、历史记录和调色板管理
 */
export function useColors() {
  // 当前选中的颜色
  const currentColor = ref('#000000');

  // 预设调色板
  const presetColors = ref([
    '#000000',
    '#FFFFFF',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#800080',
    '#FFA500',
    '#FFC0CB',
    '#A52A2A',
    '#808080',
    '#008000',
    '#000080',
    '#800000',
    '#808000',
    '#C0C0C0',
    '#FF6347',
    '#4682B4',
  ]);

  // 最近使用的颜色
  const recentColors = ref<string[]>([]);

  // 自定义颜色
  const customColors = ref<string[]>([]);

  // 最大历史记录数量
  const maxRecentColors = 10;
  const maxCustomColors = 20;

  /**
   * 获取所有可用颜色
   */
  const allColors = computed(() => [
    ...presetColors.value,
    ...customColors.value,
  ]);

  /**
   * 设置当前颜色
   * @param color 颜色值
   */
  const setCurrentColor = (color: string) => {
    if (!isValidColor(color)) {
      console.warn('Invalid color:', color);
      return;
    }

    currentColor.value = color;
    addToRecentColors(color);
  };

  /**
   * 添加颜色到最近使用
   * @param color 颜色值
   */
  const addToRecentColors = (color: string) => {
    // 移除重复项
    const index = recentColors.value.indexOf(color);
    if (index > -1) {
      recentColors.value.splice(index, 1);
    }

    // 添加到开头
    recentColors.value.unshift(color);

    // 限制数量
    if (recentColors.value.length > maxRecentColors) {
      recentColors.value = recentColors.value.slice(0, maxRecentColors);
    }
  };

  /**
   * 添加自定义颜色
   * @param color 颜色值
   */
  const addCustomColor = (color: string) => {
    if (!isValidColor(color)) {
      console.warn('Invalid color:', color);
      return false;
    }

    // 检查是否已存在
    if (
      customColors.value.includes(color) ||
      presetColors.value.includes(color)
    ) {
      return false;
    }

    customColors.value.unshift(color);

    // 限制数量
    if (customColors.value.length > maxCustomColors) {
      customColors.value = customColors.value.slice(0, maxCustomColors);
    }

    return true;
  };

  /**
   * 删除自定义颜色
   * @param color 颜色值
   */
  const removeCustomColor = (color: string) => {
    const index = customColors.value.indexOf(color);
    if (index > -1) {
      customColors.value.splice(index, 1);
      return true;
    }
    return false;
  };

  /**
   * 清空最近使用的颜色
   */
  const clearRecentColors = () => {
    recentColors.value = [];
  };

  /**
   * 清空自定义颜色
   */
  const clearCustomColors = () => {
    customColors.value = [];
  };

  /**
   * 验证颜色值是否有效
   * @param color 颜色值
   * @returns 是否有效
   */
  const isValidColor = (color: string): boolean => {
    if (!color || typeof color !== 'string') return false;

    // 创建临时元素测试颜色
    const div = document.createElement('div');
    div.style.color = color;
    return div.style.color !== '';
  };

  /**
   * 颜色格式转换
   */
  const colorUtils = {
    /**
     * HEX转RGB
     * @param hex HEX颜色值
     * @returns RGB对象
     */
    hexToRgb(hex: string): { r: number; g: number; b: number } | null {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    },

    /**
     * RGB转HEX
     * @param r 红色分量 (0-255)
     * @param g 绿色分量 (0-255)
     * @param b 蓝色分量 (0-255)
     * @returns HEX颜色值
     */
    rgbToHex(r: number, g: number, b: number): string {
      return (
        '#' +
        [r, g, b]
          .map((x) => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          })
          .join('')
      );
    },

    /**
     * 获取颜色亮度 (0-1)
     * @param color 颜色值
     * @returns 亮度值
     */
    getLuminance(color: string): number {
      const rgb = this.hexToRgb(color);
      if (!rgb) return 0;

      const { r, g, b } = rgb;
      const [rs, gs, bs] = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    },

    /**
     * 判断颜色是否为浅色
     * @param color 颜色值
     * @returns 是否为浅色
     */
    isLightColor(color: string): boolean {
      return this.getLuminance(color) > 0.5;
    },

    /**
     * 获取对比颜色（黑或白）
     * @param color 颜色值
     * @returns 对比颜色
     */
    getContrastColor(color: string): string {
      return this.isLightColor(color) ? '#000000' : '#FFFFFF';
    },
  };

  /**
   * 生成渐变色
   * @param startColor 起始颜色
   * @param endColor 结束颜色
   * @param steps 步数
   * @returns 颜色数组
   */
  const generateGradient = (
    startColor: string,
    endColor: string,
    steps: number,
  ): string[] => {
    const start = colorUtils.hexToRgb(startColor);
    const end = colorUtils.hexToRgb(endColor);

    if (!start || !end) return [];

    const colors: string[] = [];

    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      const r = Math.round(start.r + (end.r - start.r) * ratio);
      const g = Math.round(start.g + (end.g - start.g) * ratio);
      const b = Math.round(start.b + (end.b - start.b) * ratio);

      colors.push(colorUtils.rgbToHex(r, g, b));
    }

    return colors;
  };

  /**
   * 生成单色调色板
   * @param baseColor 基础颜色
   * @param variations 变化数量
   * @returns 颜色数组
   */
  const generateMonochrome = (baseColor: string, variations = 5): string[] => {
    const colors: string[] = [];

    // 生成从黑到基础色到白的变化
    const toWhite = generateGradient(
      baseColor,
      '#FFFFFF',
      Math.ceil(variations / 2),
    );
    const toBlack = generateGradient(
      '#000000',
      baseColor,
      Math.ceil(variations / 2),
    );

    colors.push(...toBlack.slice(0, -1), ...toWhite);

    return colors.slice(0, variations);
  };

  /**
   * 导出颜色配置
   * @returns 颜色配置对象
   */
  const exportColors = () => {
    return {
      currentColor: currentColor.value,
      presetColors: presetColors.value,
      recentColors: recentColors.value,
      customColors: customColors.value,
    };
  };

  /**
   * 导入颜色配置
   * @param config 颜色配置对象
   */
  const importColors = (config: {
    currentColor?: string;
    presetColors?: string[];
    recentColors?: string[];
    customColors?: string[];
  }) => {
    if (config.currentColor) {
      currentColor.value = config.currentColor;
    }
    if (config.presetColors) {
      presetColors.value = config.presetColors;
    }
    if (config.recentColors) {
      recentColors.value = config.recentColors;
    }
    if (config.customColors) {
      customColors.value = config.customColors;
    }
  };

  return {
    // 响应式数据
    currentColor,
    presetColors,
    recentColors,
    customColors,
    allColors,

    // 方法
    setCurrentColor,
    addCustomColor,
    removeCustomColor,
    clearRecentColors,
    clearCustomColors,
    isValidColor,

    // 工具方法
    colorUtils,
    generateGradient,
    generateMonochrome,

    // 导入导出
    exportColors,
    importColors,
  };
}
