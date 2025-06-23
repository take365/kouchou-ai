/**
 * 実行環境に応じた適切なAPIのベースURLを取得する
 *
 * クライアントサイドではNEXT_PUBLIC_API_BASEPATHを使用し、
 * サーバーサイドではAPI_BASEPATHが設定されていればそれを使用する
 *
 * @returns APIのベースURL
 */
export const getApiBaseUrls = (): string[] => {
  const base =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASEPATH
      : process.env.API_BASEPATH || process.env.NEXT_PUBLIC_API_BASEPATH;
  return base ? base.split(",").map((s) => s.trim()).filter(Boolean) : [];
};

export const getApiBaseUrl = (): string => {
  const urls = getApiBaseUrls();
  return urls[0] || "";
};
