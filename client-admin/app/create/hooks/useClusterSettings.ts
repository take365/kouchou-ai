import { useCallback, useState } from "react";
import type { ClusterSettings } from "../types";
import { CLUSTER_LIMITS, validateClusterSettings } from "./validateClusterSettings";
import { validateManualClusterCounts } from "./validateManualClusterCounts";

export type Warning = {
  field: "lv1" | "lv2";
  message: string;
};

export function useClusterSettings(
  initialLv1 = Math.floor(CLUSTER_LIMITS.level1.max / 2),
  initialLv2 = Math.floor(CLUSTER_LIMITS.level2.max / 2),
) {
  // クラスタ数状態
  const [clusterLv1, setClusterLv1] = useState<number>(initialLv1);
  const [clusterLv2, setClusterLv2] = useState<number>(initialLv2);
  const bounds = {
    level1: { min: CLUSTER_LIMITS.level1.min, max: CLUSTER_LIMITS.level1.max },
    level2: { min: CLUSTER_LIMITS.level2.min, max: CLUSTER_LIMITS.level2.max },
  };
  // 自動モード時の入力範囲
  const [clusterLv1Min, setClusterLv1Min] = useState<number>(CLUSTER_LIMITS.level1.min);
  const [clusterLv1Max, setClusterLv1Max] = useState<number>(CLUSTER_LIMITS.level1.max);
  const [clusterLv2Min, setClusterLv2Min] = useState<number>(CLUSTER_LIMITS.level2.min);
  const [clusterLv2Max, setClusterLv2Max] = useState<number>(CLUSTER_LIMITS.level2.max);

  // 推奨クラスタ数の保持
  const [recommendedClusters, setRecommendedClusters] = useState<ClusterSettings | null>(null);

  // 補正検知フラグ
  const [autoAdjusted, setAutoAdjusted] = useState<boolean>(false);
  const [autoClusterEnabled, setAutoClusterEnabled] = useState<boolean>(false);

  // 手動入力時の警告メッセージ
  const [manualWarnings, setManualWarnings] = useState<Warning[]>([]);

  /**
   * Lv1/Lv2 の Min/Max 入力変更を一元処理
   */
  const handleRangeChange = useCallback(
    (field: "lv1" | "lv2", side: "Min" | "Max", value: number) => {
      const input = {
        lv1Min: clusterLv1Min,
        lv1Max: clusterLv1Max,
        lv2Min: clusterLv2Min,
        lv2Max: clusterLv2Max,
      };
      if (field === "lv1") {
        if (side === "Min") input.lv1Min = value;
        else input.lv1Max = value;
      } else {
        if (side === "Min") input.lv2Min = value;
        else input.lv2Max = value;
      }

      const result = validateClusterSettings(input);
      setClusterLv1Min(result.lv1Min);
      setClusterLv1Max(result.lv1Max);
      setClusterLv2Min(result.lv2Min);
      setClusterLv2Max(result.lv2Max);
      setManualWarnings(result.warnings);
      setAutoAdjusted(result.warnings.length > 0);
    },
    [clusterLv1Min, clusterLv1Max, clusterLv2Min, clusterLv2Max],
  );

  const handleLv1MinChange = useCallback(
    (value: number) => handleRangeChange("lv1", "Min", value),
    [handleRangeChange],
  );
  const handleLv1MaxChange = useCallback(
    (value: number) => handleRangeChange("lv1", "Max", value),
    [handleRangeChange],
  );
  const handleLv2MinChange = useCallback(
    (value: number) => handleRangeChange("lv2", "Min", value),
    [handleRangeChange],
  );
  const handleLv2MaxChange = useCallback(
    (value: number) => handleRangeChange("lv2", "Max", value),
    [handleRangeChange],
  );

  /**
   * 手動モード（AutoCluster無効時）でのクラスタ数変更
   */
  // --- 第1階層ハンドラ ---
  function handleLv1Change(value: number) {
    const { clusterLv1: newLv1, clusterLv2: newLv2, warnings } = validateManualClusterCounts(value, clusterLv2, bounds);

    setClusterLv1(newLv1);
    setClusterLv2(newLv2);
    setManualWarnings(warnings);
  }

  // --- 第2階層ハンドラ ---
  function handleLv2Change(value: number) {
    const { clusterLv1: newLv1, clusterLv2: newLv2, warnings } = validateManualClusterCounts(clusterLv1, value, bounds);

    setClusterLv1(newLv1); // Lv1 は変更しないが戻り値に含まれる
    setClusterLv2(newLv2);
    setManualWarnings(warnings);
  }

  /**
   * コメント数から推奨クラスタ数を計算
   */
  const calculateRecommendedClusters = useCallback((commentCount: number) => {
    const lv1 = Math.max(
      CLUSTER_LIMITS.level1.min,
      Math.min(Math.floor(CLUSTER_LIMITS.level1.max / 2), Math.round(Math.cbrt(commentCount))),
    );
    const lv2 = Math.max(CLUSTER_LIMITS.level2.min, Math.min(CLUSTER_LIMITS.level2.max, Math.round(lv1 * lv1)));
    return { lv1, lv2 };
  }, []);

  /**
   * 推奨クラスタ数を適用し、AutoClusterモードの範囲にも反映
   */
  const setRecommended = useCallback(
    (commentCount: number) => {
      const rec = calculateRecommendedClusters(commentCount);
      setRecommendedClusters(rec);
      setClusterLv1(rec.lv1);
      setClusterLv2(rec.lv2);

      const result = validateClusterSettings({
        lv1Min: Math.floor(rec.lv1 / 2),
        lv1Max: rec.lv1 * 2,
        lv2Min: Math.max(rec.lv1 * 2 + 1, Math.floor(rec.lv2 / 2)),
        lv2Max: Math.min(rec.lv2 * 2, CLUSTER_LIMITS.level2.max),
      });
      setClusterLv1Min(result.lv1Min);
      setClusterLv1Max(result.lv1Max);
      setClusterLv2Min(result.lv2Min);
      setClusterLv2Max(result.lv2Max);
      setManualWarnings(result.warnings);
      setAutoAdjusted(result.warnings.length > 0);

      return rec;
    },
    [calculateRecommendedClusters],
  );

  /**
   * AutoClusterモード切替
   */
  const handleAutoClusterToggle = useCallback(
    (enabled: boolean) => {
      setAutoClusterEnabled(enabled);
      if (enabled) {
        const result = validateClusterSettings({
          lv1Min: clusterLv1Min,
          lv1Max: clusterLv1Max,
          lv2Min: clusterLv2Min,
          lv2Max: clusterLv2Max,
        });
        setClusterLv1Min(result.lv1Min);
        setClusterLv1Max(result.lv1Max);
        setClusterLv2Min(result.lv2Min);
        setClusterLv2Max(result.lv2Max);
        setManualWarnings(result.warnings);
        setAutoAdjusted(result.warnings.length > 0);
      }
    },
    [clusterLv1Min, clusterLv1Max, clusterLv2Min, clusterLv2Max],
  );

  /**
   * すべての設定を初期状態にリセット
   */
  const resetClusterSettings = useCallback(() => {
    setClusterLv1(initialLv1);
    setClusterLv2(initialLv2);
    setRecommendedClusters(null);
    setAutoAdjusted(false);
    setAutoClusterEnabled(false);
    setManualWarnings([]);
    setClusterLv1Min(CLUSTER_LIMITS.level1.min);
    setClusterLv1Max(CLUSTER_LIMITS.level1.max);
    setClusterLv2Min(CLUSTER_LIMITS.level2.min);
    setClusterLv2Max(CLUSTER_LIMITS.level2.max);
  }, [initialLv1, initialLv2]);

  return {
    // 現在値
    clusterLv1,
    clusterLv2,
    // AutoCluster範囲
    clusterLv1Min,
    clusterLv1Max,
    clusterLv2Min,
    clusterLv2Max,
    // 推奨クラスタ数
    recommendedClusters,
    // フラグ
    autoAdjusted,
    autoClusterEnabled,
    // 警告メッセージ
    manualWarnings,
    // ハンドラ
    handleLv1Change,
    handleLv2Change,
    handleLv1MinChange,
    handleLv1MaxChange,
    handleLv2MinChange,
    handleLv2MaxChange,
    setRecommended,
    handleAutoClusterToggle,
    resetClusterSettings,
  };
}
