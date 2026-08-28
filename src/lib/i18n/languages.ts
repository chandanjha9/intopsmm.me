export type LanguageCode = "en" | "hi" | "ru" | "mai";

export type LanguageOption = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
};

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
  { code: "mai", label: "Maithili", nativeLabel: "मैथिली", flag: "🇮🇳" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const LANGUAGE_STORAGE_KEY = "site-language";

type Dictionary = Record<string, string>;

export const TRANSLATIONS: Record<LanguageCode, Dictionary> = {
  en: {
    home: "Home",
    whyUs: "Why us",
    howItWorks: "How it works",
    faq: "FAQ",
    contact: "Contact",
    terms: "Terms",
    getStarted: "Get Started",
    language: "Language",
  },
  hi: {
    home: "होम",
    whyUs: "हमें क्यों चुनें",
    howItWorks: "कैसे काम करता है",
    faq: "सामान्य प्रश्न",
    contact: "संपर्क",
    terms: "नियम",
    getStarted: "शुरू करें",
    language: "भाषा",
  },
  ru: {
    home: "Главная",
    whyUs: "Почему мы",
    howItWorks: "Как это работает",
    faq: "ЧаВо",
    contact: "Контакты",
    terms: "Условия",
    getStarted: "Начать",
    language: "Язык",
  },
  mai: {
    home: "घर",
    whyUs: "हमरा किएक",
    howItWorks: "कोना काज करैत अछि",
    faq: "प्रश्न",
    contact: "संपर्क",
    terms: "नियम",
    getStarted: "शुरू करू",
    language: "भाषा",
  },
};

export function translate(code: LanguageCode, key: string): string {
  return TRANSLATIONS[code]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
