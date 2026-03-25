const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const conditionRoutes = require('./routes/condition');
const foodRoutes = require('./routes/food');
const goalsRoutes = require('./routes/goals');
const remindersRoutes = require('./routes/reminders');
const consultRoutes = require('./routes/consult');
const consultAiRoutes = require('./routes/consultAi');
const settingsRoutes = require('./routes/settings');
const profileRoutes = require('./routes/profile');
const contactRoutes = require('./routes/contact');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '6mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/condition', conditionRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/consult/ai', consultAiRoutes);
app.use('/api/consult', consultRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contact', contactRoutes);

app.use(express.static(path.join(__dirname, '../client')));

module.exports = app;
