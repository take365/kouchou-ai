import { Alert, Stack } from "@chakra-ui/react";

/**
 * 警告メッセージセクションコンポーネント
 */
export function WarningSection() {
  return (
    <Stack gap="4" width="full">
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>
          レポートの作成には数分かかる可能性があります。試験環境のため５分を超える処理は失敗する可能性があります。失敗する場合は処理のスキップや、データ量の調整などを試みてください
        </Alert.Title>
      </Alert.Root>
    </Stack>
  );
}
