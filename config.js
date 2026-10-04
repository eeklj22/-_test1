/*
 * ============================================================
 *  사이트 설정 파일 — 이 파일 하나만 고치면 사이트 전체 내용이 바뀝니다
 * ============================================================
 *  - 문자열은 따옴표("...") 안에서 수정하세요.
 *  - 목록 항목을 추가/삭제할 때는 쉼표(,)를 잘 맞춰 주세요.
 *  - 문자열 안에서 줄바꿈이 필요하면 \n 을 넣으세요.
 *  - 날짜는 "YYYY-MM-DD", 마감 일시는 "YYYY-MM-DDTHH:MM" 형식(한국 시간 기준)입니다.
 *  - JSON 대신 JS 파일을 쓰는 이유: 서버 없이 index.html 을 더블클릭으로
 *    열어도(file://) 브라우저 보안 제한 없이 읽히도록 하기 위함입니다.
 */
window.SITE_CONFIG = {
  /* ---------- 기본 정보 ---------- */
  site: {
    title: "*** | 고려대학교 **학과",           // 브라우저 탭 제목
    description: "고려대학교 **학과 「***」 — AI 기반 데이터 활용능력 배양",
    logoText: "***",                            // 헤더 왼쪽 로고 글자
    logoMark: "AI",                             // 로고 동그라미 안 글자 (1~2자)
  },

  /* ---------- 공지사항 (관리자 화면에서 올리거나 여기서 직접 추가) ---------- */
  // important: true 이면 맨 위에 '중요' 표시와 함께 고정됩니다.
  notices: [
    { date: "2026-02-20", title: "2026 상반기 수강 신청 안내", body: "수강 신청은 학교 포털과 이 사이트의 신청서 작성을 모두 마쳐야 완료됩니다.", important: true },
    { date: "2026-02-25", title: "첫 수업 준비물 안내", body: "1주차부터 실습이 있습니다. 노트북과 구글 계정을 꼭 준비해 주세요.", important: false },
  ],

  /* ---------- 상단 메뉴 (target 은 아래 섹션 id) ---------- */
  nav: [
    { label: "프로그램 소개", target: "about" },
    { label: "커리큘럼", target: "curriculum" },
    { label: "참여하기", target: "join" },
    { label: "수강 안내", target: "enroll" },
    { label: "FAQ", target: "faq" },
    { label: "교수자", target: "instructor" },
  ],

  /* ---------- 첫 화면 ---------- */
  hero: {
    badge: "2026 상반기 집중 프로그램",
    title: "「***」",
    subtitle: "AI 기반 데이터 활용능력 배양",
    description:
      "생성형 AI와 데이터 분석 도구를 직접 다루며, 데이터를 읽고·정리하고·해석하는 힘을 기르는 15주 실습 중심 강의입니다.\n전공과 상관없이 누구나 AI를 ‘쓸 줄 아는’ 사람이 되도록 함께합니다.",
    // href 가 "#섹션id" 이면 페이지 안에서 이동, "https://..." 이면 새 창으로 열립니다.
    buttons: [
      { label: "수강 신청", href: "#apply", primary: true },
      { label: "커리큘럼 보기", href: "#curriculum", primary: false },
    ],
    // 첫 화면 왼쪽 아래 해시태그 목록
    tags: ["#생성형AI", "#프롬프트", "#데이터분석", "#Python", "#시각화", "#AI윤리"],
    // 첫 화면 오른쪽 파란 그래픽: 큰 글자 줄(영문 대문자 권장)과 연도
    art: { lines: ["DATA", "AI"], year: "2026" },
    // 첫 화면 아래 ‘See More’ 줄
    seeMore: { label: "See More", href: "#about" },
    // value 를 "auto" 로 두면 커리큘럼 일정(아래 schedule)에서 자동으로 계산됩니다.
    info: [
      { icon: "📅", label: "일정", value: "auto" },
      { icon: "⏰", label: "시간", value: "매주 화요일 14:00 – 16:50" },
      { icon: "💻", label: "수업 방식", value: "대면 강의 + 실습 (노트북 지참)" },
      { icon: "🎓", label: "수강 대상", value: "**학과 및 전 학과 학부생" },
    ],
  },

  /* ---------- 프로그램 소개 (통계 + 장점 슬라이드) ---------- */
  about: {
    title: "프로그램 소개",
    lead: "숫자로 보는 「***」",
    // value 는 숫자만, 단위는 suffix 에 적으세요 (숫자가 0부터 올라가는 애니메이션).
    stats: [
      { value: 15, suffix: "주", label: "체계적인 과정" },
      { value: 6, suffix: "종", label: "실습 AI 도구" },
      { value: 5, suffix: "권", label: "교수자 저술" },
      { value: 20, suffix: "년+", label: "강의 경력" },
    ],
    strengthsTitle: "이 강의가 특별한 이유",
    strengths: [
      { icon: "🌸", title: "비전공자도 OK", text: "코딩 경험이 없어도 AI 도구와 함께 차근차근 따라올 수 있도록 설계했습니다." },
      { icon: "🛠️", title: "매주 실습", text: "이론 설명은 짧게, 매 수업마다 직접 손으로 데이터를 다루는 실습을 진행합니다." },
      { icon: "📊", title: "실제 데이터", text: "공공데이터·학과 관련 실제 데이터셋으로 현실적인 문제를 풀어 봅니다." },
      { icon: "🤖", title: "최신 AI 도구", text: "ChatGPT, Claude, Gemini, Colab 등 현업에서 쓰는 도구를 두루 경험합니다." },
      { icon: "🧭", title: "AI 윤리까지", text: "저작권·개인정보·편향 문제를 함께 다뤄 책임 있게 AI를 쓰는 법을 배웁니다." },
      { icon: "🏆", title: "포트폴리오 완성", text: "기말 프로젝트 결과물을 그대로 나만의 데이터 포트폴리오로 활용할 수 있습니다." },
    ],
  },

  /* ---------- 커리큘럼 & 달력 ---------- */
  curriculum: {
    title: "커리큘럼",
    lead: "주차를 누르면 상세 내용이 펼쳐집니다",
    schedule: {
      startDate: "2026-03-03",            // 1주차 수업 날짜 (이후 매주 같은 요일로 자동 계산)
      time: "14:00 – 16:50",              // 기본 수업 시간
      location: "○○관 ○○○호 (실습실)",     // 기본 수업 장소
      // 휴강일: 이 날은 건너뛰고 다음 주로 일정이 밀립니다.
      holidays: [
        { date: "2026-05-05", label: "어린이날 휴강" },
      ],
    },
    // 각 주차: date/time/location 을 적으면 자동 일정 대신 그 값을 사용합니다.
    // assignment 가 있는 주차에만 과제·마감·제출 버튼이 표시됩니다.
    weeks: [
      {
        title: "오리엔테이션 · AI 시대의 데이터 리터러시",
        topics: ["강의 목표와 평가 방식 안내", "데이터 리터러시란 무엇인가", "실습 환경(구글 계정·AI 서비스) 준비"],
        videos: [{ title: "데이터 리터러시 입문", url: "https://www.youtube.com/results?search_query=데이터+리터러시" }],
      },
      {
        title: "생성형 AI 기초와 프롬프트 엔지니어링",
        topics: ["대규모 언어모델(LLM)의 작동 원리", "좋은 프롬프트의 구성 요소", "역할·예시·형식 지정 실습"],
        videos: [{ title: "프롬프트 엔지니어링 기초", url: "https://www.youtube.com/results?search_query=프롬프트+엔지니어링+기초" }],
        assignment: {
          title: "과제 1 · 프롬프트 실습 리포트",
          description: "같은 질문을 3가지 프롬프트 방식으로 요청하고, 결과를 비교·분석한 1–2쪽 리포트를 제출하세요.",
          due: "2026-03-16T23:59",
        },
      },
      {
        title: "데이터의 이해: 유형 · 수집 · 윤리",
        topics: ["정형/비정형 데이터", "공공데이터 포털 활용법", "데이터 수집 시 윤리와 출처 표기"],
        videos: [{ title: "공공데이터 포털 활용", url: "https://www.youtube.com/results?search_query=공공데이터포털+활용" }],
      },
      {
        title: "스프레드시트와 AI로 데이터 정리하기",
        topics: ["구글 스프레드시트 핵심 함수", "AI에게 수식·정리 작업 맡기기", "결측치·중복 데이터 처리"],
        videos: [{ title: "구글 시트 데이터 정리", url: "https://www.youtube.com/results?search_query=구글+스프레드시트+데이터+정리" }],
      },
      {
        title: "Python & Google Colab 첫걸음",
        topics: ["Colab 노트북 사용법", "AI 코딩 보조로 첫 코드 작성", "변수·리스트·반복문 맛보기"],
        videos: [{ title: "Google Colab 시작하기", url: "https://www.youtube.com/results?search_query=google+colab+시작하기" }],
        assignment: {
          title: "과제 2 · Colab 기초 실습",
          description: "제공된 CSV 파일을 Colab에서 불러와 기초 통계(평균·최댓값·최솟값)를 출력하는 노트북을 제출하세요.",
          due: "2026-04-06T23:59",
        },
      },
      {
        title: "pandas로 데이터 전처리",
        topics: ["DataFrame 기본 조작", "필터링·정렬·그룹화", "AI와 함께 전처리 코드 디버깅"],
        videos: [{ title: "pandas 기초", url: "https://www.youtube.com/results?search_query=pandas+기초+강의" }],
      },
      {
        title: "데이터 시각화 기초",
        topics: ["좋은 차트 vs 나쁜 차트", "matplotlib·차트 도구 실습", "AI로 시각화 아이디어 얻기"],
        videos: [{ title: "데이터 시각화 원칙", url: "https://www.youtube.com/results?search_query=데이터+시각화+원칙" }],
      },
      {
        title: "중간 프로젝트 발표",
        topics: ["팀별 데이터 탐색 결과 발표", "동료 피드백", "후반부 학습 계획 공유"],
        videos: [],
        assignment: {
          title: "과제 3 · 중간 프로젝트 보고서",
          description: "팀별로 선택한 데이터셋의 탐색 결과와 시각화 3개 이상을 포함한 보고서(PDF)를 제출하세요.",
          due: "2026-04-20T23:59",
        },
      },
      {
        title: "AI로 탐색적 데이터 분석(EDA) 자동화",
        topics: ["EDA의 절차", "AI 데이터 분석 기능 활용", "자동 분석 결과 검증하기"],
        videos: [{ title: "EDA 탐색적 데이터 분석", url: "https://www.youtube.com/results?search_query=탐색적+데이터+분석+EDA" }],
      },
      {
        title: "통계적 사고와 AI 결과 해석",
        topics: ["상관과 인과", "표본·편향·오차", "AI가 틀리는 순간 알아차리기"],
        videos: [{ title: "상관관계와 인과관계", url: "https://www.youtube.com/results?search_query=상관관계+인과관계" }],
      },
      {
        title: "머신러닝 개념 입문 (노코드)",
        topics: ["지도학습과 비지도학습", "노코드 도구로 분류 모델 만들기", "모델 성능 지표 읽기"],
        videos: [{ title: "머신러닝 입문", url: "https://www.youtube.com/results?search_query=머신러닝+입문" }],
        assignment: {
          title: "과제 4 · 나만의 분류 모델",
          description: "노코드 도구로 간단한 분류 모델을 만들고, 성능과 한계를 정리한 1쪽 요약을 제출하세요.",
          due: "2026-05-25T23:59",
        },
      },
      {
        title: "AI 리서치: NotebookLM · Perplexity",
        topics: ["출처 기반 AI 검색", "문헌·자료 요약과 비교", "인용과 사실 확인 습관"],
        videos: [{ title: "NotebookLM 활용법", url: "https://www.youtube.com/results?search_query=NotebookLM+활용법" }],
      },
      {
        title: "AI 윤리 · 저작권 · 개인정보",
        topics: ["생성물의 저작권 이슈", "개인정보 비식별화", "알고리즘 편향 사례 토론"],
        videos: [{ title: "AI 윤리 이슈", url: "https://www.youtube.com/results?search_query=AI+윤리+이슈" }],
      },
      {
        title: "기말 프로젝트 워크숍",
        topics: ["팀별 프로젝트 중간 점검", "교수자 1:1 피드백", "발표 자료 구성 팁"],
        videos: [],
      },
      {
        title: "기말 프로젝트 발표 · 종강",
        topics: ["팀별 최종 발표", "우수 프로젝트 시상", "한 학기 회고"],
        videos: [],
        assignment: {
          title: "과제 5 · 기말 프로젝트 최종 보고서",
          description: "분석 노트북(ipynb)·발표 자료·최종 보고서를 하나의 압축 파일로 제출하세요.",
          due: "2026-06-21T23:59",
        },
      },
    ],
  },

  /* ---------- 수강생 공간 (로그인 · 출석 · 과제 제출) ---------- */
  student: {
    title: "수강생 공간",
    lead: "로그인하고 출석 체크와 과제 제출을 한 곳에서",
    // 로그인 허용 기준: "none"(누구나) | "applicants"(신청서 낸 학번만) | "roster"(관리자가 등록한 명단의 학번·이름만)
    loginCheck: "none",
    attendance: {
      // true: 지난 수업도 언제든 출석 체크 가능 (데모·테스트용)
      // false: 수업 당일, 시작 openBefore 분 전부터 시작 후 closeAfter 분까지만 가능
      anytime: true,
      openBefore: 10,
      closeAfter: 30,
    },
    submission: {
      accept: ".pdf,.docx,.hwp,.hwpx,.pptx,.ipynb,.zip",   // 허용 파일 형식
      maxMB: 20,                                          // 최대 파일 크기(MB)
      allowLate: true,                                    // 마감 후 지각 제출 허용 여부
    },
  },

  /* ---------- 참여하기: 실시간 투표 ---------- */
  poll: {
    title: "가장 먼저 배우고 싶은 주제는?",
    desc: "하나를 골라 주세요. 다른 항목을 누르면 선택을 바꿀 수 있어요. 결과는 실시간으로 반영됩니다.",
    // id 는 영문으로, 한 번 정한 뒤에는 바꾸지 마세요 (바꾸면 기존 표가 사라집니다).
    options: [
      { id: "prompt", label: "프롬프트 엔지니어링" },
      { id: "python", label: "Python · Colab 기초" },
      { id: "viz", label: "데이터 시각화" },
      { id: "ml", label: "머신러닝 입문" },
      { id: "research", label: "AI 리서치 도구" },
      { id: "ethics", label: "AI 윤리 · 저작권" },
    ],
  },

  /* ---------- 참여하기: 수강 신청서 ---------- */
  // type: text | email | tel | select | radio | checkbox(복수 선택) | textarea | consent(동의 체크)
  // required: 필수 여부, pattern: 형식 검사(정규식), patternMessage: 형식이 틀렸을 때 안내
  application: {
    title: "수강 신청서",
    desc: "아래 내용을 작성해 제출해 주세요. * 표시는 필수 항목입니다.",
    fields: [
      { name: "name", label: "이름", type: "text", required: true, placeholder: "홍길동" },
      { name: "studentId", label: "학번", type: "text", required: true, placeholder: "2024123456", inputmode: "numeric",
        pattern: "^\\d{10}$", patternMessage: "학번은 숫자 10자리로 입력해 주세요." },
      { name: "department", label: "소속 학과", type: "text", required: true, placeholder: "**학과" },
      { name: "grade", label: "학년", type: "select", required: true, options: ["1학년", "2학년", "3학년", "4학년", "기타"] },
      { name: "email", label: "이메일", type: "email", required: true, placeholder: "you@korea.ac.kr" },
      { name: "phone", label: "연락처", type: "tel", required: false, placeholder: "010-1234-5678",
        pattern: "^01[016789]-?\\d{3,4}-?\\d{4}$", patternMessage: "010-1234-5678 형식으로 입력해 주세요." },
      { name: "level", label: "AI 도구 사용 경험", type: "radio", required: true, options: ["처음이에요", "가끔 써요", "자주 써요"] },
      { name: "interests", label: "관심 주제 (복수 선택)", type: "checkbox", required: true,
        options: ["프롬프트", "Python", "시각화", "머신러닝", "리서치", "AI 윤리"] },
      { name: "motivation", label: "수강 동기", type: "textarea", required: true, minLength: 20,
        placeholder: "이 강의에서 기대하는 점을 20자 이상 적어 주세요." },
      { name: "agree", label: "개인정보 수집·이용에 동의합니다. (수강 관리 목적, 학기 종료 후 파기)", type: "consent", required: true,
        summaryLabel: "개인정보 수집·이용 동의" },   // summaryLabel: 오류 안내 목록에 보일 짧은 이름
    ],
    submitLabel: "신청서 제출",
    successTitle: "신청이 완료되었어요! 🌸",
    successText: "제출한 학번으로 ‘수강생 공간’에 로그인할 수 있습니다.",
  },

  /* ---------- 첫 방문 환영 · 안내 팝업 ---------- */
  welcome: {
    confetti: true,                         // 처음 방문했을 때 폭죽 효과
    message: "처음 오셨군요! 환영합니다 🎉",
  },
  popup: {
    enabled: true,
    delaySeconds: 2,                        // 페이지가 열리고 몇 초 뒤에 뜰지
    badge: "수강 신청 안내",
    title: "2026 상반기 「***」 수강생 모집",
    body: "AI와 데이터를 처음 접하는 학생도 환영합니다.\n신청서를 작성하면 수강생 공간에서 출석과 과제를 관리할 수 있어요.",
    items: ["📅 매주 화요일 14:00 – 16:50", "👥 정원 40명 · 선착순", "💻 노트북 지참"],
    ctaLabel: "수강 신청하러 가기",
    ctaHref: "#apply",
    hideTodayLabel: "오늘 하루 보지 않기",
  },

  /* ---------- 수강 안내 (AI 도구 + 준비물) ---------- */
  enroll: {
    title: "수강 안내",
    lead: "실습에 쓰는 도구와 준비물을 확인하세요",
    toolsTitle: "실습에 쓰는 AI 도구",
    tools: [
      { icon: "💬", name: "ChatGPT", desc: "질문·요약·코드 작성 등 범용 AI 보조", url: "https://chatgpt.com" },
      { icon: "✍️", name: "Claude", desc: "긴 문서 분석과 글쓰기, 데이터 해석", url: "https://claude.ai" },
      { icon: "✨", name: "Gemini", desc: "구글 서비스와 연동한 자료 탐색", url: "https://gemini.google.com" },
      { icon: "📓", name: "Google Colab", desc: "설치 없이 브라우저에서 Python 실습", url: "https://colab.research.google.com" },
      { icon: "📚", name: "NotebookLM", desc: "내 자료를 기반으로 한 AI 리서치 노트", url: "https://notebooklm.google.com" },
      { icon: "🔎", name: "Perplexity", desc: "출처를 함께 보여주는 AI 검색", url: "https://www.perplexity.ai" },
    ],
    prepTitle: "수강 준비물",
    prep: [
      { icon: "💻", title: "노트북", text: "매 수업 실습이 있으니 꼭 지참하세요. (OS 무관)" },
      { icon: "🔑", title: "구글 계정", text: "Colab·NotebookLM·스프레드시트 실습에 사용합니다." },
      { icon: "🤖", title: "AI 서비스 가입", text: "위 AI 도구들의 무료 계정을 첫 주 전에 만들어 두세요." },
      { icon: "🔌", title: "충전기", text: "3시간 연속 실습이므로 충전기를 챙겨 주세요." },
    ],
    notice: "수강신청 일정과 방법은 학교 포털 공지를 기준으로 합니다. 유료 AI 서비스 가입은 필요하지 않습니다.",
  },

  /* ---------- FAQ ---------- */
  faq: {
    title: "자주 묻는 질문",
    lead: "궁금한 점을 먼저 확인해 보세요",
    items: [
      { q: "코딩을 전혀 몰라도 수강할 수 있나요?", a: "네. AI 코딩 보조와 함께 기초부터 진행하므로 사전 코딩 경험은 필요 없습니다." },
      { q: "타 학과 학생도 수강할 수 있나요?", a: "가능합니다. 전공과 무관하게 데이터와 AI 활용 역량을 키우고 싶은 학생 모두 환영합니다." },
      { q: "유료 AI 서비스에 가입해야 하나요?", a: "아니요. 모든 실습은 무료 버전으로 진행할 수 있도록 구성했습니다." },
      { q: "과제는 어디에 제출하나요?", a: "‘수강생 공간’에 로그인한 뒤, 커리큘럼 각 주차나 수강생 공간의 ‘과제 제출’ 버튼으로 파일을 올리면 됩니다." },
      { q: "팀 프로젝트는 어떻게 구성되나요?", a: "3–4인 1팀으로, 1주차 오리엔테이션 이후 전공이 섞이도록 편성합니다." },
      { q: "결석하면 수업 내용은 어떻게 따라가나요?", a: "주차별 참고 영상과 강의 자료로 복습할 수 있으며, 오피스아워에 질문하실 수 있습니다." },
    ],
  },

  /* ---------- 교수자 (페이지 맨 아래 푸터) ---------- */
  instructor: {
    title: "교수자 소개",
    name: "홍길동 교수",
    position: "고려대학교 **학과 교수",
    photo: "",   // 사진 경로 (예: "images/professor.jpg"). 비워 두면 기본 아이콘이 표시됩니다.
    hello: "Hello,",                                     // 사진 카드 위 작은 인사말
    quote: "학생 스스로 질문하고 답을 찾아가는 수업을 만듭니다.",  // 사진 카드 아래 한 줄 소개
    bio: "데이터 활용과 AI 리터러시를 연구하며, 학생들이 스스로 질문하고 답을 찾아가는 수업을 지향합니다.",
    career: ["現 고려대학교 **학과 교수", "저서 『○○○○』 외 4권", "○○ 데이터 정책 자문위원"],
    contacts: [
      { icon: "✉️", label: "이메일", value: "professor@korea.ac.kr", href: "mailto:professor@korea.ac.kr" },
      { icon: "📞", label: "연구실 전화", value: "02-3290-0000", href: "tel:02-3290-0000" },
      { icon: "🏛️", label: "연구실", value: "○○관 ○○○호" },
      { icon: "🕑", label: "오피스아워", value: "수 14:00 – 16:00 (사전 예약)" },
    ],
  },

  footer: {
    copyright: "© 2026 고려대학교 **학과. All rights reserved.",
  },

  /* ---------- 관리자 (오른쪽 위 자물쇠 아이콘) ---------- */
  // 비밀번호 원문은 저장하지 않고, 되돌릴 수 없는 해시값만 저장합니다.
  // 비밀번호를 바꾸려면 관리자 화면 > '비밀번호 변경'에서 새 값을 만든 뒤 설정 파일을 저장하세요.
  admin: {
    salt: "f1995fe99c7e0aa3",
    iterations: 20000,
    passwordHash: "ab944960f6e0b56deeb6dc219b9b87f74fc58e9e924e7cd69499e1cc0be7932e",
  },
};
