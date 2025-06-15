import type { Meta } from "@/type";
import { Alert, HStack, Image } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export function Header() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // メタ情報の取得
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASEPATH}/meta`)
      .then((response) => response.json())
      .then((data) => setMeta(data))
      .catch(() => setMeta(null));
  }, []);

  return (
    <HStack justify="space-between" alignItems={"center"} mb={8} mx={"auto"} maxW={"1200px"}>
      <HStack>
        {meta && !meta.isDefault && (
          <Image
            src={`${process.env.NEXT_PUBLIC_API_BASEPATH}/meta/reporter.png`}
            mx={"auto"}
            objectFit={"cover"}
            maxH={{ base: "40px", md: "60px" }}
            maxW={{ base: "120px", md: "200px" }}
            alt={meta.reporter}
            onLoad={() => setImageLoaded(true)}
            display={imageLoaded ? "block" : "none"}
          />
        )}
      </HStack>
      <HStack>
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title fontSize={"md"}>【重要】試験環境に関する免責事項</Alert.Title>
            <Alert.Description style={{ whiteSpace: "pre-line" }}>
              {`本システムは、オープンソースプロジェクトTalk to the Cityを参考に開発された
                広聴AIをもとに、構成変更を加えた非公式な派生バージョンです。
            試験環境であり、以下の点にご注意ください：  
• 緊急停止：システムは予告なく停止・メンテナンスされる場合があります  
• データ保証なし：入力されたデータの漏洩・継続性は一切保証されません  
• 結果の信頼性：AI生成結果は試験的なものであり、実用性・正確性を保証しません  
• セキュリティ：本番レベルのセキュリティ対策は実装されていません  
• サポート対象外：技術的な問い合わせやトラブルシューティングは対応いたしません  
  
本試験環境の利用により生じた一切の損害について、開発者・運営者は責任を負いません。  
重要な業務での利用は避け、あくまで検証・テスト目的でのみご利用ください。`}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </HStack>
    </HStack>
  );
}
