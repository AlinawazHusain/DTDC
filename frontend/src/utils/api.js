// src/utils/api.js
export async function callApi({ url, method = "GET", body = null, headers = {} }) {
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json", ...headers }
    };

    if (body) {
      // Only stringify if not FormData
      options.body = body instanceof FormData ? body : JSON.stringify(body);
      // Remove Content-Type for FormData (browser will set correct boundary)
      if (body instanceof FormData) delete options.headers["Content-Type"];
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    // Try parsing JSON, fallback to text
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (err) {
    console.error(err);
    throw err; // Let caller handle
  }
}