import type { Warning } from "./useClusterSettings";

/**
 * 手動モード向けクラスタ数のチェック＆補正
 * @param clusterLv1 - 第1階層クラスタ数
 * @param clusterLv2 - 第2階層クラスタ数
 * @param bounds - 第1/第2階層の許容範囲
 * @returns 補正後のクラスタ数と警告リスト
 */
export function validateManualClusterCounts(
  clusterLv1: number,
  clusterLv2: number,
  bounds: { level1: { min: number; max: number }; level2: { min: number; max: number } },
): { clusterLv1: number; clusterLv2: number; warnings: Warning[] } {
  const warnings: Warning[] = [];

  // 1. 第1階層の範囲チェック＆補正
  let clampedLv1 = clusterLv1;
  if (clampedLv1 < bounds.level1.min) {
    clampedLv1 = bounds.level1.min;
    warnings.push({
      field: "lv1",
      message: `第1階層の値は ${bounds.level1.min}〜${bounds.level1.max} の範囲で指定してください。${bounds.level1.min}に補正しました。`,
    });
  } else if (clampedLv1 > bounds.level1.max) {
    clampedLv1 = bounds.level1.max;
    warnings.push({
      field: "lv1",
      message: `第1階層の値は ${bounds.level1.min}〜${bounds.level1.max} の範囲で指定してください。${bounds.level1.max}に補正しました。`,
    });
  }

  // 2. 第2階層の範囲チェック＆補正
  let clampedLv2 = clusterLv2;
  if (clampedLv2 < bounds.level2.min) {
    clampedLv2 = bounds.level2.min;
    warnings.push({
      field: "lv2",
      message: `第2階層の値は ${bounds.level2.min}〜${bounds.level2.max} の範囲で指定してください。${bounds.level2.min}に補正しました。`,
    });
  } else if (clampedLv2 > bounds.level2.max) {
    clampedLv2 = bounds.level2.max;
    warnings.push({
      field: "lv2",
      message: `第2階層の値は ${bounds.level2.min}〜${bounds.level2.max} の範囲で指定してください。${bounds.level2.max}に補正しました。`,
    });
  }

  // 3. 第1階層に紐づく第2階層の依存チェック (Lv2 >= Lv1*2)
  const minLv2 = clampedLv1 * 2;
  if (clampedLv2 < minLv2) {
    clampedLv2 = minLv2;
    warnings.push({
      field: "lv2",
      message: `第2階層の値は第1階層の2倍以上に指定してください。${minLv2}に補正しました。`,
    });
  }

  return { clusterLv1: clampedLv1, clusterLv2: clampedLv2, warnings };
}
