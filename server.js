require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const app  = express();
const PORT = 3000;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CARBONE_API_KEY   = process.env.CARBONE_API_KEY;
const CARBONE_TEMPLATE  = "b741454c1c4601470e9d264f2f378d0babcabb9ccb6245b9428833046cff335c";

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/extract", async (req, res) => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/pdf", async (req, res) => {
  try {
    const carboneData = JSON.parse(req.body.carboneData);

    // 1. Render
    const renderRes = await fetch(`https://api.carbone.io/render/${CARBONE_TEMPLATE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "carbone-version": "4",
        "Authorization": `Bearer ${CARBONE_API_KEY}`,
      },
      body: JSON.stringify({ data: carboneData, convertTo: "pdf" }),
    });
    const renderJson = await renderRes.json();
    console.log("CARBONE RENDER:", JSON.stringify(renderJson));
    if (!renderJson.data?.renderId) throw new Error("Carbone render failed: " + JSON.stringify(renderJson));

    // 2. Download
    const pdfRes = await fetch(`https://api.carbone.io/render/${renderJson.data.renderId}`, {
      headers: { "Authorization": `Bearer ${CARBONE_API_KEY}` }
    });
    const buffer = await pdfRes.arrayBuffer();
    res.status(200).set("Content-Type", "application/pdf").send(Buffer.from(buffer));
  } catch (e) {
    console.error("PDF ERROR:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log("✅ INOMED App → http://localhost:3000");
});