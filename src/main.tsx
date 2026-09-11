import { createRoot } from "react-dom/client";

import App from "./App";
import { ErrorBoundary } from "@/components/error-boundary";

import "./index.css";

const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const baseUrl = import.meta.env.BASE_URL;

    void navigator.serviceWorker
      .register(`${baseUrl}sw.js`, {
        scope: baseUrl,
        updateViaCache: "none",
      })
      .catch((error) => {
        console.error(
          "CM Interiors service worker registration failed:",
          error,
        );
      });
  });
};

createRoot(document.getElementById("root")!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

registerServiceWorker();
