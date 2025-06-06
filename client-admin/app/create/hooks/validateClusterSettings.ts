import type { Warning } from "./useClusterSettings";
export const CLUSTER_LIMITS = {
  level1: { min: 2, max: 40 },
  level2: { min: 4, max: 1000 },
};

type Range = { min: number; max: number };
type Level = "lv1" | "lv2";

interface ValidateInput {
  lv1Min: number;
  lv1Max: number;
  lv2Min: number;
  lv2Max: number;
}
interface ValidateOutput extends ValidateInput {
  warnings: Warning[];
}

/** 値を [min,max] で補正し、補正時に警告を返す */
function clamp(field: Level, value: number, range: Range, label: string): { value: number; warning?: Warning } {
  if (value < range.min) {
    return {
      value: range.min,
      warning: {
        field,
        message: `${label}の値は ${range.min}～${range.max} の範囲で指定してください。${range.min} に補正しました。`,
      },
    };
  }
  if (value > range.max) {
    return {
      value: range.max,
      warning: {
        field,
        message: `${label}の値は ${range.min}～${range.max} の範囲で指定してください。${range.max} に補正しました。`,
      },
    };
  }
  return { value };
}

/** min と max の大小関係を保証し、必要なら補正＆警告 */
function ensureOrder(
  field: Level,
  min: number,
  max: number,
  labelMin: string,
  labelMax: string,
): { min: number; max: number; warning?: Warning } {
  if (min > max) {
    // min を max にあわせる
    return {
      min: max,
      max,
      warning: { field, message: `${labelMin} が ${labelMax} を超えたため両方 ${max} に補正しました。` },
    };
  }
  return { min, max };
}

export function validateClusterSettings(input: ValidateInput): ValidateOutput {
  const warnings: Warning[] = [];
  // Lv1
  const r1 = CLUSTER_LIMITS.level1;
  let { value: lv1Min, warning: w1 } = clamp("lv1", input.lv1Min, r1, "Lv1最小");
  if (w1) warnings.push(w1);
  let { value: lv1Max, warning: w2 } = clamp("lv1", input.lv1Max, r1, "Lv1最大");
  if (w2) warnings.push(w2);
  const ord1 = ensureOrder("lv1", lv1Min, lv1Max, "Lv1最小", "Lv1最大");
  if (ord1.warning) {
    lv1Min = ord1.min;
    lv1Max = ord1.max;
    warnings.push(ord1.warning);
  }
  // Lv2
  const r2 = CLUSTER_LIMITS.level2;
  let { value: lv2Min, warning: w3 } = clamp("lv2", input.lv2Min, r2, "Lv2最小");
  if (w3) warnings.push(w3);
  let { value: lv2Max, warning: w4 } = clamp("lv2", input.lv2Max, r2, "Lv2最大");
  if (w4) warnings.push(w4);
  const ord2 = ensureOrder("lv2", lv2Min, lv2Max, "Lv2最小", "Lv2最大");
  if (ord2.warning) {
    lv2Min = ord2.min;
    lv2Max = ord2.max;
    warnings.push(ord2.warning);
  }
  //  Lv1.max < Lv2.min を保証 ──
  // ── 追加: 第1階層の最大値を跨がないように Lv2.min と Lv2.max を補正 ──
  if (lv2Min <= lv1Max) {
    const correctedMin = lv1Max + 1;
    warnings.push({
      field: "lv2",
      message: `第2階層の最小値は第1階層の最大値より大きく指定してください。${correctedMin} に補正しました。`,
    });
    lv2Min = correctedMin;
  }
  if (lv2Max <= lv1Max) {
    const correctedMax = lv1Max + 1;
    warnings.push({
      field: "lv2",
      message: `第2階層の最大値は第1階層の最大値より大きく指定してください。${correctedMax} に補正しました。`,
    });
    lv2Max = correctedMax;
  }
  return { lv1Min, lv1Max, lv2Min, lv2Max, warnings };
}
