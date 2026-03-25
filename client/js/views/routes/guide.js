import { escapeHtml } from '../../utils/html.js';

export function createGuidePage(ctx) {
  const { t } = ctx;
  return {
    title: 'Guide',
    render() {
      return (
        `<h2><i class="fa fa-book-open"></i> ${escapeHtml(t('guide.pageTitle'))}</h2>` +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('guide.principles'))}</div>` +
        '<ul class="hist-list">' +
        `<li>${escapeHtml(t('guide.p1'))}</li>` +
        `<li>${escapeHtml(t('guide.p2'))}</li>` +
        `<li>${escapeHtml(t('guide.p3'))}</li>` +
        '</ul></div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('guide.faq'))}</div>` +
        `<p><b>${escapeHtml(t('guide.q1'))}</b><br/>${escapeHtml(t('guide.a1'))}</p>` +
        `<p><b>${escapeHtml(t('guide.q2'))}</b><br/>${escapeHtml(t('guide.a2'))}</p>` +
        '</div>' +
        '<div class="card">' +
        `<div class='section-label'>${escapeHtml(t('guide.tips'))}</div>` +
        `<p>${escapeHtml(t('guide.tip1'))}</p>` +
        '</div>'
      );
    },
  };
}
