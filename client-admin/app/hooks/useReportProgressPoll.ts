import { useCallback, useEffect, useState } from "react";

export function useReportProgressPoll(slug: string, shouldSubscribe: boolean, autoReload = true) {
  const [progress, setProgress] = useState<string>("loading");
  const [errorStep, setErrorStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStackTrace, setErrorStackTrace] = useState<string | null>(null);
  const [lastValidStep, setLastValidStep] = useState<string>("loading");
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [tokenUsage, setTokenUsage] = useState<number>(0);
  const [tokenUsageInput, setTokenUsageInput] = useState<number>(0);
  const [tokenUsageOutput, setTokenUsageOutput] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [provider, setProvider] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<Record<string, Record<string, { input: number; output: number }>>>({});
  const [isPricingLoaded, setIsPricingLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function fetchPricingData() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASEPATH}/admin/llm-pricing`, {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPricingData(data);
        } else {
          console.error("Failed to fetch LLM pricing data");
          setPricingData({});
        }
        setIsPricingLoaded(true);
      } catch (error) {
        console.error("Error fetching LLM pricing data:", error);
        setIsPricingLoaded(true);
      }
    }

    fetchPricingData();
  }, []);

  const calculateCost = useCallback(
    (provider: string | null, model: string | null, tokenUsageInput: number, tokenUsageOutput: number): number => {
      if (!provider || !model || !isPricingLoaded) return 0;

      const price = pricingData[provider]?.[model];
      if (!price) return 0;

      const inputCost = (tokenUsageInput / 1_000_000) * price.input;
      const outputCost = (tokenUsageOutput / 1_000_000) * price.output;
      return inputCost + outputCost;
    },
    [isPricingLoaded, pricingData],
  );

  const [hasReloaded, setHasReloaded] = useState<boolean>(false);

  useEffect(() => {
    if (!shouldSubscribe || !isPolling) return;

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 10;

    async function poll() {
      if (cancelled) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASEPATH}/admin/reports/${slug}/status/step-json`, {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.token_usage !== undefined) {
            setTokenUsage(data.token_usage);
          }
          if (data.token_usage_input !== undefined) {
            setTokenUsageInput(data.token_usage_input);
          }
          if (data.token_usage_output !== undefined) {
            setTokenUsageOutput(data.token_usage_output);
          }
          if (data.estimated_cost !== undefined) {
            setEstimatedCost(data.estimated_cost);
          }
          if (data.provider !== undefined) {
            setProvider(data.provider);
          }
          if (data.model !== undefined) {
            setModel(data.model);
          }

          if (
            (data.token_usage_input !== undefined || data.token_usage_output !== undefined) &&
            data.provider !== undefined &&
            data.model !== undefined
          ) {
            const newTokenUsageInput = data.token_usage_input !== undefined ? data.token_usage_input : tokenUsageInput;
            const newTokenUsageOutput =
              data.token_usage_output !== undefined ? data.token_usage_output : tokenUsageOutput;
            const newEstimatedCost = calculateCost(data.provider, data.model, newTokenUsageInput, newTokenUsageOutput);
            setEstimatedCost(newEstimatedCost);
          }

          if (!data.current_step || data.current_step === "loading") {
            retryCount = 0;
            setTimeout(poll, 3000);
            return;
          }

          if (data.current_step === "error") {
            setErrorStep(data.error_step || lastValidStep);
            setErrorMessage(data.error_message || null);
            setErrorStackTrace(data.error_stack_trace || null);
            setProgress("error");
            setIsPolling(false);
            return;
          }

          setLastValidStep(data.current_step);
          setErrorStep(null);
          setErrorMessage(null);
          setErrorStackTrace(null);
          setProgress(data.current_step);

          if (data.current_step === "completed") {
            setIsPolling(false);
            return;
          }

          setTimeout(poll, 3000);
        } else {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Maximum retry attempts reached");
            setProgress("error");
            setIsPolling(false);
            return;
          }
          const retryInterval = retryCount < 3 ? 2000 : 5000;
          setTimeout(poll, retryInterval);
        }
      } catch (error) {
        console.error("Polling error:", error);
        retryCount++;
        if (retryCount >= maxRetries) {
          setProgress("error");
          setIsPolling(false);
          return;
        }
        setTimeout(poll, 5000);
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [slug, shouldSubscribe, lastValidStep, isPolling, tokenUsageInput, tokenUsageOutput, calculateCost]);

  useEffect(() => {
    if (autoReload && (progress === "completed" || progress === "error") && !hasReloaded) {
      setHasReloaded(true);
      const reloadTimeout = setTimeout(() => {
        window.location.reload();
      }, 1500);
      return () => clearTimeout(reloadTimeout);
    }
  }, [progress, hasReloaded, autoReload]);

  return {
    progress,
    errorStep,
    errorMessage,
    errorStackTrace,
    tokenUsage,
    tokenUsageInput,
    tokenUsageOutput,
    estimatedCost,
    provider,
    model,
  };
}

export default useReportProgressPoll;
