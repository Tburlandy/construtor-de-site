export const isValidWebhookUrl = (url?: string) =>
  !!url && !url.includes("seu-webhook") && !url.includes("[[");

export const postWebhookForm = async (
  url: string,
  body: string,
  timeoutMs = 5000,
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
    if (!res.ok) throw new Error(`Webhook falhou: ${res.status}`);
    return true;
  } catch (error) {
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], {
          type: "application/x-www-form-urlencoded",
        });
        const sent = navigator.sendBeacon(url, blob);
        if (sent) return true;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      return res.ok;
    } catch (retryError) {
      console.warn("Webhook falhou:", retryError);
      return false;
    }
  } finally {
    clearTimeout(t);
  }
};

export const sendWebhookToUrls = async (
  urls: string[],
  body: string,
): Promise<boolean> => {
  if (!urls.length) return false;
  const results = await Promise.allSettled(
    urls.map((url) => postWebhookForm(url, body)),
  );
  return results.some(
    (result) => result.status === "fulfilled" && result.value,
  );
};
