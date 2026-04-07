import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

// StrictMode removed intentionally — it double-fires useEffect in development,
// which causes Supabase realtime channels to throw
// "cannot add postgres_changes callbacks after subscribe()".
// StrictMode is a dev-only tool and has zero effect in production builds.

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
