import OpenAI from "openai";

// API-Key aus .env laden
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ Kein API-Key gefunden! Bitte trage deinen Key in die .env Datei ein.");
  process.exit(1); // beendet das Script sofort
}

console.log("Gelesener API Key:", apiKey);

const client = new OpenAI({ apiKey });

async function frageChatGPT(frage) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: frage }],
    });
    console.log("Antwort von ChatGPT:", response.choices[0].message.content);
  } catch (error) {
    if (error.code === "invalid_api_key") {
      console.error("❌ Fehler: API-Key ist ungültig oder fehlt.");
    } else if (error.code === "rate_limit_exceeded" || error.status === 429) {
      console.error("⏱ Du hast dein Kontingent überschritten. Warte oder prüfe dein Plan/Billing.");
    } else {
      console.error("⚠️ Unbekannter Fehler:", error.message);
    }
  }
}

// Testfrage
console.log("Frage an ChatGPT:");
frageChatGPT("Was ist der Unterschied zwischen GPT-3 und GPT-4?");
