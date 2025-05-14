import { FileUploadDropzone, FileUploadList, FileUploadRoot } from "@/components/ui/file-upload";
import { Box, Tabs, VStack } from "@chakra-ui/react";
import { DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useClusterSettings } from "../hooks/useClusterSettings";
import { parseCsv } from "../parseCsv";
import { getBestCommentColumn } from "../utils/columnScorer";
import { ClusterSettingsSection } from "./ClusterSettingsSection";
import { CommentColumnSelector } from "./CommentColumnSelector";

// CSVファイルタブコンポーネント
export function CsvFileTab({
  csv,
  setCsv,
  csvColumns,
  setCsvColumns,
  selectedCommentColumn,
  setSelectedCommentColumn,
  clusterSettings
}: {
  csv: File | null;
  setCsv: (file: File | null) => void;
  csvColumns: string[];
  setCsvColumns: (columns: string[]) => void;
  selectedCommentColumn: string;
  setSelectedCommentColumn: (column: string) => void;
  clusterSettings: ReturnType<typeof useClusterSettings>;
}) {
  const [commentCount, setCommentCount] = useState(0); // ✅ コメント数ステートを追加

  return (
    <Tabs.Content value="file">
      <VStack alignItems="stretch" w="full">
        <Link
          href="/sample_comments.csv"
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "8px",
            textDecoration: "underline",
            fontSize: "0.8rem",
          }}
        >
          <DownloadIcon size={14} />
          サンプルCSVをダウンロード
        </Link>

        <FileUploadRoot
          w={"full"}
          alignItems="stretch"
          accept={["text/csv"]}
          inputProps={{ multiple: false }}
          onFileChange={async (e) => {
            const file = e.acceptedFiles[0];
            setCsv(file);
            if (file) {
              const parsed = await parseCsv(file);
              if (parsed.length > 0) {
                const columns = Object.keys(parsed[0]);
                setCsvColumns(columns);

                // 最適なカラムを自動選択
                const bestColumn = getBestCommentColumn(parsed);
                if (bestColumn) {
                  setSelectedCommentColumn(bestColumn);
                }

                clusterSettings.setRecommended(parsed.length);
                setCommentCount(parsed.length); // ✅ コメント数を更新
              }
            }
          }}
        >
          <Box
            opacity={csv ? 0.5 : 1}
            pointerEvents={csv ? "none" : "auto"}
          >
            <FileUploadDropzone
              label="分析するコメントファイルを選択してください"
              description=".csv"
            />
          </Box>
          <FileUploadList
            clearable={true}
            onRemove={() => {
              setCsv(null);
              setCsvColumns([]);
              setSelectedCommentColumn("");
              clusterSettings.resetClusterSettings();
              setCommentCount(0); // ✅ リセット時にカウントも0に
            }}
          />
        </FileUploadRoot>

        <CommentColumnSelector
          columns={csvColumns}
          selectedColumn={selectedCommentColumn}
          onColumnChange={setSelectedCommentColumn}
        />

        <ClusterSettingsSection
          clusterLv1={clusterSettings.clusterLv1}
          clusterLv2={clusterSettings.clusterLv2}
          recommendedClusters={clusterSettings.recommendedClusters}
          autoAdjusted={clusterSettings.autoAdjusted}
          onLv1Change={clusterSettings.handleLv1Change}
          onLv2Change={clusterSettings.handleLv2Change}
          calculateRecommendedClusters={clusterSettings.calculateRecommendedClusters}
          autoClusterEnabled={clusterSettings.autoClusterEnabled}
          setAutoClusterEnabled={clusterSettings.setAutoClusterEnabled}
          commentCount={commentCount} // ✅ ここで渡す
        />
      </VStack>
    </Tabs.Content>
  );
}
