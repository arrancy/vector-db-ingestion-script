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

async function vectorSearch() {
  const cityName = "Goa";
  const response = await ai.models.embedContent({
    contents: cityName,
    model: "gemini-embedding-001",
  });
  if (!response || !response.embeddings)
    return console.log("did not get response");
  console.log("embedding generated!");
  const embeddingArray = response.embeddings[0].values;
  if (!embeddingArray) return console.log("did not find embedding array");
  const { data, error } = await supabase.rpc("match_travel_embeddings", {
    query_embedding: embeddingArray,
    match_count: 3,
  });

  if (error) return console.log("search error : " + error);
  console.log("received contents : ");
  data.forEach((row: { content: string }, index: number) => {
    console.log(index + 1 + " : ");
    console.log("content : " + row.content);
    console.log("-------");
  });
}

vectorSearch();

// rpc sql function
// create or replace function match_travel_embeddings(
//   query_embedding vector(3072),
//   match_count int
// )
// returns table (
//   id uuid,
//   content text,
//   metadata json
// )
// language sql
// as $$
//   select
//     id,
//     content,
//     metadata
//   from travel_embeddings
//   order by embedding <=> query_embedding
//   limit match_count;
// $$;
