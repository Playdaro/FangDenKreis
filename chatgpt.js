// ...existing code...
import { resolve } from "path";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";

// .env-Pfad explizit aus dem aktuellen Arbeitsverzeichnis laden
const envPath = resolve(process.cwd(), ".env");
const exists = fs.existsSync(envPath);
console.log("🔎 .env Pfad:", envPath, exists ? "(gefunden)" : "(NICHT gefunden)");
if (!exists) {
  console.warn("⚠️  .env nicht gefunden. Liegt die Datei wirklich hier und heißt exakt '.env' (ohne .txt)?");
}
dotenv.config({ path: envPath });

// Sicheres Logging: keine Rohinhalte oder Bytes der .env mehr ausgeben
console.log("🔐 OPENAI_API_KEY geladen?", Boolean(process.env.OPENAI_API_KEY));
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Kein API-Key gefunden! Bitte trage deinen Key in die .env Datei ein.");
  process.exit(1);
}
const client = new OpenAI({ apiKey });

// Frage aus CLI-Argumenten lesen, sonst Fallback
const frage = process.argv.slice(2).join(" ") || "Was ist der Unterschied zwischen GPT-3 und GPT-4?";

async function frageChatGPT(text) {
  const maxRetries = 5;
  let attempt = 0;

  while (true) {
    try {
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: text,
      });

      // Robuste, aber sichere Extraktion der Antwort
      let outputText = "";
      if (Array.isArray(response.output)) {
        for (const outItem of response.output) {
          if (Array.isArray(outItem.content)) {
            for (const c of outItem.content) {
              if (c.type === "output_text" && typeof c.text === "string") {
                outputText += c.text;
              } else if (typeof c === "string") {
                outputText += c;
              }
            }
          } else if (typeof outItem === "string") {
            outputText += outItem;
          }
        }
      } else if (typeof response.output_text === "string") {
        outputText = response.output_text;
      }

      console.log("\n💬 Antwort von ChatGPT:\n", outputText.trim() || "(keine Textantwort gefunden)");
      return;
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      const isRate = status === 429 || error?.code === "rate_limit_exceeded";

      if (isRate && attempt < maxRetries) {
        attempt++;
        const baseDelay = Math.min(1000 * 2 ** attempt, 30000); // exponential backoff, cap 30s
        const jitter = Math.floor(Math.random() * 1000);
        const waitMs = baseDelay + jitter;
        console.error(`⏱ Rate limit erkannt. Retry ${attempt}/${maxRetries} in ${Math.round(waitMs/1000)}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // Reduziertes, sicheres Fehler-Logging
      console.error('--- API Fehler ---');
      if (status) console.error('status:', status);
      console.error('message:', error?.message ?? 'Unbekannter Fehler');

      if (error?.code === "invalid_api_key" || status === 401) {
        console.error("❌ Fehler: API-Key ist ungültig oder fehlt. Bitte Key im Dashboard rotieren.");
      } else if (isRate) {
        console.error("⏱ Rate limit / Kontingent erreicht. Prüfe Billing oder warte.");
      } else {
        console.error("⚠️ Unbekannter Fehler. Siehe message oben.");
      }
      process.exit(1);
    }
  }
}

frageChatGPT(frage);

// Beispiel für cURL-Befehl zum Abrufen der verfügbaren Modelle
// curl https://api.openai.com/v1/models -H "Authorization: Bearer DEIN_KEY_HIER"
// ...existing code...