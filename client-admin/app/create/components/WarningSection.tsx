import { Alert, Stack } from "@chakra-ui/react";
import {
  RadioCardRoot,
  RadioCardItem,
  RadioCardLabel,
} from "@/components/ui/radio-card";

interface Props {
  commentCount: number;
  useRandomSample: boolean;
  setUseRandomSample: (v: boolean) => void;
}

/**
 * 警告メッセージセクションコンポーネント
 */
export function WarningSection({ commentCount, useRandomSample, setUseRandomSample }: Props) {
  return (
    <Stack gap="4" width="full">
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>
          レポートの作成には数分かかる可能性があります。試験環境のため５分を超える処理は失敗する可能性があります。失敗する場合は処理のスキップや、データ量の調整などを試みてください
        </Alert.Title>
      </Alert.Root>
      {commentCount > 1000 && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>入力データが {commentCount} 件あります。1000件を超える場合、処理が失敗する可能性があります。</Alert.Title>
          <RadioCardRoot
            value={useRandomSample ? "sample" : "all"}
            onValueChange={(details) =>
              setUseRandomSample(details.value === "sample")
            }
          >
            <RadioCardLabel>処理方法を選択</RadioCardLabel>
            <RadioCardItem value="sample" label="ランダムに1000件を抜粋して処理" />
            <RadioCardItem value="all" label="リスクを承知して実施" />
          </RadioCardRoot>
        </Alert.Root>
      )}
    </Stack>
  );
}
