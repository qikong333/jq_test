import { defineOptions, ref } from 'vue'

const DPI = 96 // 假设标准DPI为96
const INCH_PER_CM = 0.393701

/**
 * 将厘米转换为像素
 * @param cm - 厘米值
 * @returns 像素值
 */
export function cmToPx(cm: number): number {
  const inches = cm * INCH_PER_CM
  return Math.round(inches * DPI)
}

/**
 * 将像素转换为厘米
 * @param px - 像素值
 * @returns 厘米值
 */
export function pxToCm(px: number): number {
  const inches = px / DPI
  return inches / INCH_PER_CM
}
