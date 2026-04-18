import { Router } from 'express';
import { loadConfig, saveConfig, generateLuaText } from './storage';
import { agenticConfigSchema } from '../shared/schema';

export const routes = Router();

routes.get('/settings', (req, res) => {
  const config = loadConfig();
  res.json(config);
});

routes.post('/settings', (req, res) => {
  try {
    const config = agenticConfigSchema.parse(req.body);
    saveConfig(config);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

routes.get('/generated-lua', (req, res) => {
  const config = loadConfig();
  const luaContent = generateLuaText(config);
  res.send({ lua: luaContent });
});
