const app = require('./app');

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`HealthCare API: http://localhost:${PORT}/`);
});
