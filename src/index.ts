import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
const ai = new GoogleGenAI({});
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
);
async function normalise() {
  const __fileName = fileURLToPath(import.meta.url);
  const __dirName = path.dirname(__fileName);

  const dirPath = path.join(__dirName, "../data");
  const directoryFiles = await fs.readdir(dirPath);
  let dataString = "";

  for (const file of directoryFiles) {
    const filePath = path.join(dirPath, "/" + file);
    const data = await fs.readFile(filePath, "utf-8");

    const dataObject = JSON.parse(data);
    dataString += "\n\n";
    for (const [key, value] of Object.entries(dataObject)) {
      if (key === "bestTimeToVisit") {
        dataString += "best time to visit" + " " + ":" + " " + value + "\n";
      } else if (key === "idealDuration") {
        dataString += "ideal duration" + " " + ":" + " " + value + "\n";
      } else if (key === "approximateDailyBudgetINR") {
        dataString +=
          "approximate daily budget INR" + " " + ":" + " " + value + "\n";
      } else if (key === "travelTips") {
        dataString += "travel Tips" + " " + ":" + " " + value + "\n";
      } else if (key === "topAttractions") {
        dataString += "top Attractions" + " " + ":" + " " + value + "\n";
      } else {
        dataString += key + " " + ":" + " " + value + "\n";
      }
    }
  }

  const chunks = dataString
    .split("\n\n")
    .map((c) => c.trim())
    .filter(Boolean);

  console.log(chunks.length);

  for (let i = 0; i < chunks.length; i++) {
    const res = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: chunks[i],
    });
    if (!res.embeddings || !res.embeddings[0].values) return;
    const { data, error } = await supabase.from("travel_embeddings").insert({
      content: chunks[i],
      embedding: res.embeddings[0].values,
      metadata: { country: "India", type: "destination" },
    });
    console.log({ data, error });
    console.log("added : " + i);
  }

  // await fs.writeFile(newFilePath, dataString);
}

normalise();
