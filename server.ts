import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("jobs.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    data TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/jobs", (req, res) => {
    const rows = db.prepare("SELECT data FROM jobs").all();
    res.json(rows.map((row: any) => JSON.parse(row.data)));
  });

  app.get("/api/jobs/:id", (req, res) => {
    const row = db.prepare("SELECT data FROM jobs WHERE id = ?").get(req.params.id);
    if (row) {
      res.json(JSON.parse((row as any).data));
    } else {
      res.status(404).send("Not found");
    }
  });

  app.post("/api/jobs", (req, res) => {
    const job = req.body;
    db.prepare("INSERT OR REPLACE INTO jobs (id, data) VALUES (?, ?)").run(job.id, JSON.stringify(job));
    res.json(job);
  });

  app.delete("/api/jobs/:id", (req, res) => {
    db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
    res.status(204).send();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
