import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { migrate } from './db/migrate.js';
import applicationsRouter from './routes/applications.js';
import parseRouter from './routes/parse.js';
import tagsRouter from './routes/tags.js';
import statsRouter from './routes/stats.js';
import exportRouter from './routes/export.js';
import settingsRouter from './routes/settings.js';

// Run migrations on startup
migrate();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/applications', applicationsRouter);
app.use('/api/parse', parseRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', exportRouter);
app.use('/api/settings', settingsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
