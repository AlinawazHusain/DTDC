export async function callApi({ url, method = "GET", body = null, headers = {} }) {
  const makeRequest = async () => {
    const options = {
      method,
      headers: { "Content-Type": "application/json", ...headers },
    };
    if (body) {
      options.body = body instanceof FormData ? body : JSON.stringify(body);
      if (body instanceof FormData) delete options.headers["Content-Type"];
    }
    return fetch(url, options);
  };

  try {
    const response = await makeRequest();

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    const contentType = response.headers.get("Content-Type") || "";
    return contentType.includes("application/json") ? await response.json() : await response.text();

  } catch (err) {
    // Check if it's an unauthorized error
    if (err.message.includes("401")) {
      const currentPath = window.location.pathname;
      // Don't refresh token if on login or signup page
      if (currentPath.includes("/login") || currentPath.includes("/signup")) {
        throw err; // just throw the error, don't refresh
      }

      try {
        // Attempt refresh token
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const refreshRes = await fetch("/api/refreshAccessToken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!refreshRes.ok) throw new Error("Refresh token failed");
        const refreshData = await refreshRes.json();
        localStorage.setItem("access_token", refreshData.access_token);

        // Retry original request with new token
        headers.Authorization = `Bearer ${refreshData.access_token}`;
        return await makeRequest();
      } catch {
        // Remove tokens and redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (!currentPath.includes("/login") && !currentPath.includes("/signup")) {
          window.location.href = "/";
        }
        throw new Error("Session expired. Redirecting to homepage.");
      }
    }
    throw err; // Re-throw other errors
  }
}