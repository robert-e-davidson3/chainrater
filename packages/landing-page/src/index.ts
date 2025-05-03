import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get directory paths (needed for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(join(__dirname, "..", "public")));

// Start the server
app.listen(PORT, () => {
  console.log(`ChainRater landing page server listening on port ${PORT}`);
});
