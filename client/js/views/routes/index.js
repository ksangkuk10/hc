import { createDashboardPage } from './dashboard.js';
import { createHealthPage } from './health.js';
import { createConditionPage } from './condition.js';
import { createFoodPage } from './food.js';
import { createGuidePage } from './guide.js';
import { createConsultPage } from './consult.js';
import { createContactPage } from './contact.js';
import { createSettingsPage } from './settings.js';

export function createRoutes(ctx) {
  return {
    dashboard: createDashboardPage(ctx),
    health: createHealthPage(ctx),
    condition: createConditionPage(ctx),
    food: createFoodPage(ctx),
    guide: createGuidePage(ctx),
    consult: createConsultPage(ctx),
    contact: createContactPage(ctx),
    settings: createSettingsPage(ctx),
  };
}
