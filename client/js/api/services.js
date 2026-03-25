import { api } from './http.js';

export async function loadHealth() {
  const j = await api('/api/health');
  return Array.isArray(j.data) ? j.data : [];
}

export async function saveHealth(list) {
  await api('/api/health', { method: 'PUT', body: JSON.stringify({ data: list }) });
}

export async function loadGoals() {
  try {
    const j = await api('/api/goals');
    return Array.isArray(j.data) ? j.data : [];
  } catch {
    return [];
  }
}

export async function saveGoals(list) {
  await api('/api/goals', { method: 'PUT', body: JSON.stringify({ data: list }) });
}

export async function saveReminders(list) {
  await api('/api/reminders', { method: 'PUT', body: JSON.stringify({ data: list }) });
}

export async function loadReminders() {
  try {
    const j = await api('/api/reminders');
    return Array.isArray(j.data) ? j.data : [];
  } catch {
    return [];
  }
}

export async function loadCondition() {
  try {
    const j = await api('/api/condition');
    return Array.isArray(j.data) ? j.data : [];
  } catch {
    return [];
  }
}

export async function loadFood() {
  try {
    const j = await api('/api/food');
    return Array.isArray(j.data) ? j.data : [];
  } catch {
    return [];
  }
}

export async function loadConsult() {
  try {
    const j = await api('/api/consult');
    return Array.isArray(j.data) ? j.data : [];
  } catch {
    return [];
  }
}

export async function loadSettings() {
  try {
    const j = await api('/api/settings');
    return j.settings && typeof j.settings === 'object' ? j.settings : {};
  } catch {
    return {};
  }
}
