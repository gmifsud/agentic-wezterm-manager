import express from 'express';
import cors from 'cors';
import { routes } from './routes';

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
