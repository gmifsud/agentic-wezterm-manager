import { Router } from "express";
import { z } from "zod";
import {
  loadConfig,
  saveConfig,
  generateLuaText,
  getMetadata,
} from "./storage";
import { agenticConfigSchema } from "../shared/schema";

export const routes = Router();

routes.get("/settings", (req, res) => {
  const config = loadConfig();
  const metadata = getMetadata();
  res.json({ ...config, _metadata: metadata });
});

routes.post("/settings", (req, res) => {
  try {
    const config = agenticConfigSchema.parse(req.body);
    saveConfig(config);
    res.json({ success: true });
  } catch (err) {
    // Surface the validation failure in the response so the UI can show
    // the user *what* went wrong (e.g. "Max 1000 characters" on
    // startup.layout.leftBottomCommand.command) instead of an opaque 500.
    // Also return 400 for parse/validation errors so the UI can distinguish
    // "your input was wrong" from "the server fell over".
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "validation", issues: err.issues });
      return;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

routes.get("/generated-lua", (req, res) => {
  const config = loadConfig();
  const metadata = getMetadata();
  const luaContent = generateLuaText(config, metadata);
  res.send({ lua: luaContent });
});
