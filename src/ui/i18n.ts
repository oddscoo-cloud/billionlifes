export const languages = [
  ['ru', 'Русский'], ['en', 'English'], ['zh', '中文'], ['es', 'Español'],
  ['hi', 'हिन्दी'], ['ar', 'العربية'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['pt', 'Português'], ['ja', '日本語'], ['ko', '한국어'],
] as const;

export type Language = (typeof languages)[number][0];

const storageKey = 'beyond-birth-language';

export function getLanguage(): Language {
  const saved = localStorage.getItem(storageKey);
  return languages.some(([code]) => code === saved) ? saved as Language : 'ru';
}

export function setLanguage(language: Language): void {
  localStorage.setItem(storageKey, language);
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
}

const common: Record<Language, Record<string, string>> = {
  ru: {},
  en: {
    'home-title': 'A whole life ahead',
    'feedback-title': 'Suggest or report',
    'feedback-category': 'Type',
    'feedback-suggestion': 'Suggestion',
    'feedback-bug': 'Bug',
    'feedback-question': 'Question',
    'feedback-other': 'Other',
    'feedback-name': 'Name',
    'feedback-contact': 'Email for reply',
    'feedback-message': 'Message',
    'feedback-placeholder': 'Describe a suggestion, reproduction steps, or a problem…',
    'feedback-hint': 'The message will open in your email app and be sent manually.',
    'feedback-cancel': 'Cancel',
    'feedback-submit': 'Open email',
    'home-lede-saved': 'Every choice leaves a mark. Return to the hero’s life or begin another story from scratch.',
    'saved-none': 'None yet',
    'new-life': 'New life',
    'continue': 'Continue',
    'open-summary': 'Open life summary',
    'feedback': 'Feedback',
    'odds': 'How chances work',
    'home-eyebrow': 'Saved history',
    'home-eyebrow-new': 'New story',
    'home-lede': 'Create a hero, live through months or years, and make decisions as they grow. Every turn is saved.',
  },
  zh: { 'new-life': '新生活', 'continue': '继续', 'open-summary': '查看人生总结', 'feedback': '反馈', 'odds': '概率说明', 'home-eyebrow': '已保存的故事', 'home-eyebrow-new': '新故事', 'home-title': '前方是一整段人生', 'saved-none': '暂无', 'home-lede-saved': '每个选择都会留下痕迹。回到主角的人生，或重新开始另一段故事。', 'home-lede': '创建角色，逐月或逐年生活，并在成长过程中作出决定。每一步都会保存。' },
  es: { 'new-life': 'Nueva vida', 'continue': 'Continuar', 'open-summary': 'Abrir resumen', 'feedback': 'Comentarios', 'odds': 'Cómo funcionan las probabilidades', 'home-eyebrow': 'Historia guardada', 'home-eyebrow-new': 'Historia nueva', 'home-title': 'Toda una vida por delante', 'saved-none': 'Ninguna', 'home-lede-saved': 'Cada decisión deja huella. Vuelve a la vida del personaje o empieza otra desde cero.', 'home-lede': 'Crea un personaje, vive meses o años y toma decisiones mientras crece. Cada turno se guarda.' },
  hi: { 'new-life': 'नई जिंदगी', 'continue': 'जारी रखें', 'open-summary': 'जीवन सारांश खोलें', 'feedback': 'प्रतिक्रिया', 'odds': 'संभावनाएं कैसे काम करती हैं', 'home-eyebrow': 'सहेजी हुई कहानी', 'home-eyebrow-new': 'नई कहानी', 'home-title': 'आगे पूरी जिंदगी है', 'saved-none': 'अभी नहीं', 'home-lede-saved': 'हर फैसला निशान छोड़ता है। नायक की जिंदगी में लौटें या नई कहानी शुरू करें।', 'home-lede': 'एक पात्र बनाएं, महीने या वर्ष जिएं और बढ़ने के साथ फैसले लें। हर बारी सहेजी जाती है।' },
  ar: { 'new-life': 'حياة جديدة', 'continue': 'متابعة', 'open-summary': 'فتح ملخص الحياة', 'feedback': 'ملاحظات', 'odds': 'كيف تعمل الاحتمالات', 'home-eyebrow': 'قصة محفوظة', 'home-eyebrow-new': 'قصة جديدة', 'home-title': 'حياة كاملة تنتظرك', 'saved-none': 'لا توجد', 'home-lede-saved': 'كل قرار يترك أثراً. عد إلى حياة البطل أو ابدأ قصة أخرى من جديد.', 'home-lede': 'أنشئ بطلاً، واعش شهوراً أو سنوات، واتخذ قرارات مع نموه. يتم حفظ كل دور.' },
  fr: { 'new-life': 'Nouvelle vie', 'continue': 'Continuer', 'open-summary': 'Voir le bilan', 'feedback': 'Retour', 'odds': 'Comment fonctionnent les chances', 'home-eyebrow': 'Histoire sauvegardée', 'home-eyebrow-new': 'Nouvelle histoire', 'home-title': 'Toute une vie devant vous', 'saved-none': 'Aucune', 'home-lede-saved': 'Chaque choix laisse une trace. Reprenez la vie du héros ou commencez une autre histoire.', 'home-lede': 'Créez un personnage, vivez mois ou années et prenez des décisions en grandissant. Chaque tour est enregistré.' },
  de: { 'new-life': 'Neues Leben', 'continue': 'Fortsetzen', 'open-summary': 'Lebenszusammenfassung öffnen', 'feedback': 'Feedback', 'odds': 'Wie Chancen funktionieren', 'home-eyebrow': 'Gespeicherte Geschichte', 'home-eyebrow-new': 'Neue Geschichte', 'home-title': 'Ein ganzes Leben liegt vor dir', 'saved-none': 'Noch keine', 'home-lede-saved': 'Jede Entscheidung hinterlässt Spuren. Setze das Leben fort oder beginne eine neue Geschichte.', 'home-lede': 'Erstelle einen Helden, erlebe Monate oder Jahre und triff Entscheidungen beim Erwachsenwerden. Jeder Zug wird gespeichert.' },
  pt: { 'new-life': 'Nova vida', 'continue': 'Continuar', 'open-summary': 'Abrir resumo da vida', 'feedback': 'Feedback', 'odds': 'Como funcionam as chances', 'home-eyebrow': 'História salva', 'home-eyebrow-new': 'Nova história', 'home-title': 'Uma vida inteira pela frente', 'saved-none': 'Nenhuma', 'home-lede-saved': 'Cada escolha deixa uma marca. Volte à vida do personagem ou comece outra história.', 'home-lede': 'Crie um personagem, viva meses ou anos e tome decisões ao crescer. Cada turno é salvo.' },
  ja: { 'new-life': '新しい人生', 'continue': '続ける', 'open-summary': '人生のまとめを開く', 'feedback': 'フィードバック', 'odds': '確率の仕組み', 'home-eyebrow': '保存された物語', 'home-eyebrow-new': '新しい物語', 'home-title': 'これから始まる長い人生', 'saved-none': 'まだありません', 'home-lede-saved': '選択の一つひとつが軌跡になります。主人公の人生を続けるか、新しい物語を始めましょう。', 'home-lede': '主人公を作り、月や年を過ごしながら成長の判断をしてください。すべてのターンは保存されます。' },
  ko: { 'new-life': '새로운 삶', 'continue': '계속하기', 'open-summary': '인생 요약 열기', 'feedback': '의견 보내기', 'odds': '확률 작동 방식', 'home-eyebrow': '저장된 이야기', 'home-eyebrow-new': '새 이야기', 'home-title': '앞에 펼쳐진 온전한 삶', 'saved-none': '없음', 'home-lede-saved': '모든 선택은 흔적을 남깁니다. 주인공의 삶을 이어가거나 새로운 이야기로 시작하세요.', 'home-lede': '주인공을 만들고, 월별 또는 연도별로 생활하며 성장 과정에서 선택하세요. 모든 턴이 저장됩니다.' },
};

export function translate(key: string, fallback = ''): string {
  const language = getLanguage();
  return common[language][key] ?? (language === 'ru' ? fallback : common.en[key] ?? fallback);
}
