/** Fetches JSON, with an error that names the URL and says what went wrong. */
export async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const cause = (error as { cause?: { message?: string } }).cause?.message ?? (error as Error).message;
    throw new Error(`Could not reach ${url}: ${cause}`);
  }
  if (!response.ok) throw new Error(`${url} answered ${response.status}${response.status === 404 ? ", no such item" : ""}.`);
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${url} did not return JSON.`);
  }
}
