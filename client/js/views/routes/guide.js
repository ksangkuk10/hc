export function createGuidePage() {
  return {
    title: '건강 가이드',
    render() {
      return (
        '<h2><i class="fa fa-book-open"></i> 건강 가이드 & AI 코칭</h2>' +
        '<div class="card">' +
        "<div class='section-label'>맞춤 원칙</div>" +
        '<ul class="hist-list">' +
        '<li>규칙적인 수면과 가벼운 유산소를 병행하면 혈압·체중 관리에 도움이 됩니다.</li>' +
        '<li>가공식품·외식은 나트륨이 높을 수 있어, 물 섭취와 채소 비율을 늘려 보세요.</li>' +
        '<li>만성 질환이나 약물 복용 중이면 앱 정보만으로 판단하지 말고 담당 의료진과 상담하세요.</li>' +
        '</ul></div>' +
        '<div class="card">' +
        "<div class='section-label'>자주 묻는 질문</div>" +
        '<p><b>Q. 이 앱의 수치는 의료 진단인가요?</b><br/>A. 아닙니다. 생활 기록·교육용이며 진단·치료를 대체하지 않습니다.</p>' +
        '<p><b>Q. 데이터는 안전한가요?</b><br/>A. 데모는 로컬 DB에 저장됩니다. 운영 시 TLS, 접근 통제, 암호화·법규 준수 설계가 필요합니다.</p>' +
        '</div>' +
        '<div class="card">' +
        "<div class='section-label'>생활 팁</div>" +
        '<p>하루 걷기 목표를 작게 잡고 지키는 것이, 큰 목표를 자주 놓치는 것보다 효과적입니다.</p>' +
        '</div>'
      );
    },
  };
}
