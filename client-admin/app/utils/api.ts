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
