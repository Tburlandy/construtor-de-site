const normalizeWebhookUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsedUrl = new URL(trimmed);
    if (parsedUrl.pathname.length > 1) {
      parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
    }
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const isValidWebhookUrl = (url?: string) => {
  const normalizedUrl = normalizeWebhookUrl(url);
  return (
    !!normalizedUrl &&
    !normalizedUrl.includes("seu-webhook") &&
    !normalizedUrl.includes("[[")
  );
};

export const postWebhookForm = async (
  url: string,
  body: string,
  timeoutMs = 8000,
): Promise<boolean> => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    return res.ok;
  } catch (error) {
    console.warn("Webhook falhou:", error);
    return false;
  } finally {
    clearTimeout(t);
  }
};

export const sendWebhookToUrls = async (
  urls: string[],
  body: string,
): Promise<boolean> => {
  if (!urls.length) return false;

  const uniqueValidUrls = Array.from(
    new Set(urls.map((url) => normalizeWebhookUrl(url)).filter(isValidWebhookUrl)),
  );

  if (!uniqueValidUrls.length) return false;

  const results = await Promise.allSettled(
    uniqueValidUrls.map((url) => postWebhookForm(url, body)),
  );
  return results.some(
    (result) => result.status === "fulfilled" && result.value,
  );
};
