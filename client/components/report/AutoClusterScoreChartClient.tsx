"use client";

import { Box, Text } from "@chakra-ui/react";
import Plot from "react-plotly.js";

type DataPoint = {
  label: string; // 例: "top-3" / "bottom-15"
  score: number;
};

type Props = {
  data: DataPoint[];
  bestLv1: number;
  bestLv2: number;
  durationSec: number;
};

export default function AutoClusterScoreChartClient({ data, bestLv1, bestLv2, durationSec }: Props) {
  // x軸ラベルを数値だけに変換 & 上下層分類
  const simplified = data.map((d) => {
    const parts = d.label.split("-");
    const layer = parts[0].toLowerCase(); // ← 小文字化で "lv1", "lv2" に揃える
    const num = Number(parts[1]);
    return { ...d, labelNum: num, layer };
  });

  const lv1Data = simplified.filter((d) => d.layer === "lv1");
  const lv2Data = simplified.filter((d) => d.layer === "lv2");

  return (
    <Box w="100%" maxW="750px" mx="auto" mb={8}>
      <Text fontWeight="bold" mb={2}>
        意見グループ数ごとの「まとまりの良さ（シルエットスコア）」推移
      </Text>
      <Text mb={2}>グループ内の固まりがよく、他のグループと離れていると高い数値になります</Text>
      <Plot
        data={[
          {
            x: lv1Data.map((d) => d.labelNum),
            y: lv1Data.map((d) => d.score),
            type: "scatter",
            mode: "lines+markers",
            name: "第一階層",
            line: { color: "#3182CE" },
          },
          {
            x: lv2Data.map((d) => d.labelNum),
            y: lv2Data.map((d) => d.score),
            type: "scatter",
            mode: "lines+markers",
            name: "第二階層",
            line: { color: "#38A169" },
          },
        ]}
        layout={{
          margin: { t: 30, b: 40, l: 50, r: 30 },
          xaxis: {
            title: { text: "グループ数" },
            tickmode: "linear",
            dtick: 1,
          },
          yaxis: { title: { text: "シルエットスコア" } },
          height: 300,
          shapes: [
            {
              type: "line",
              x0: bestLv1,
              x1: bestLv1,
              y0: 0,
              y1: 1,
              xref: "x",
              yref: "paper",
              line: { color: "#3182CE", width: 2, dash: "dot" },
            },
            {
              type: "line",
              x0: bestLv2,
              x1: bestLv2,
              y0: 0,
              y1: 1,
              xref: "x",
              yref: "paper",
              line: { color: "#38A169", width: 2, dash: "dot" },
            },
          ],
          annotations: [
            {
              x: bestLv1,
              y: 1,
              xref: "x",
              yref: "paper",
              text: "選択",
              showarrow: false,
              font: { color: "#3182CE", size: 12 },
              yanchor: "bottom",
            },
            {
              x: bestLv2,
              y: 1,
              xref: "x",
              yref: "paper",
              text: "選択",
              showarrow: false,
              font: { color: "#38A169", size: 12 },
              yanchor: "bottom",
            },
          ],
        }}
        config={{ displayModeBar: false }}
      />
      <Text mt={4} fontSize="sm" color="gray.600">
        試行時間: {durationSec.toFixed(2)} 秒
      </Text>
    </Box>
  );
}
