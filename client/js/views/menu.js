/**
 * @param {(key: string, vars?: Record<string, string>) => string} t
 */
export function getMenuItems(t) {
  return [
    { key: 'dashboard', label: t('menu.dashboard'), icon: 'fa-solid fa-chart-pie' },
    { key: 'health', label: t('menu.health'), icon: 'fa-solid fa-heart-pulse' },
    { key: 'condition', label: t('menu.condition'), icon: 'fa-solid fa-face-smile-beam' },
    { key: 'food', label: t('menu.food'), icon: 'fa-solid fa-bowl-food' },
    { key: 'consult', label: t('menu.consult'), icon: 'fa-solid fa-comments' },
    { key: 'guide', label: t('menu.guide'), icon: 'fa-solid fa-book-open' },
    { key: 'contact', label: t('menu.contact'), icon: 'fa-solid fa-address-book' },
    { key: 'settings', label: t('menu.settings'), icon: 'fa-solid fa-gear' },
  ];
}
