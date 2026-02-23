export interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
  maxDigits: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "IN", dialCode: "+91", name: "India", flag: "🇮🇳", maxDigits: 10 },
  { code: "US", dialCode: "+1", name: "United States", flag: "🇺🇸", maxDigits: 10 },
  { code: "GB", dialCode: "+44", name: "United Kingdom", flag: "🇬🇧", maxDigits: 10 },
  { code: "AE", dialCode: "+971", name: "UAE", flag: "🇦🇪", maxDigits: 9 },
  { code: "SA", dialCode: "+966", name: "Saudi Arabia", flag: "🇸🇦", maxDigits: 9 },
  { code: "AU", dialCode: "+61", name: "Australia", flag: "🇦🇺", maxDigits: 9 },
  { code: "CA", dialCode: "+1", name: "Canada", flag: "🇨🇦", maxDigits: 10 },
  { code: "DE", dialCode: "+49", name: "Germany", flag: "🇩🇪", maxDigits: 11 },
  { code: "FR", dialCode: "+33", name: "France", flag: "🇫🇷", maxDigits: 9 },
  { code: "IT", dialCode: "+39", name: "Italy", flag: "🇮🇹", maxDigits: 10 },
  { code: "ES", dialCode: "+34", name: "Spain", flag: "🇪🇸", maxDigits: 9 },
  { code: "BR", dialCode: "+55", name: "Brazil", flag: "🇧🇷", maxDigits: 11 },
  { code: "MX", dialCode: "+52", name: "Mexico", flag: "🇲🇽", maxDigits: 10 },
  { code: "JP", dialCode: "+81", name: "Japan", flag: "🇯🇵", maxDigits: 10 },
  { code: "CN", dialCode: "+86", name: "China", flag: "🇨🇳", maxDigits: 11 },
  { code: "KR", dialCode: "+82", name: "South Korea", flag: "🇰🇷", maxDigits: 10 },
  { code: "SG", dialCode: "+65", name: "Singapore", flag: "🇸🇬", maxDigits: 8 },
  { code: "MY", dialCode: "+60", name: "Malaysia", flag: "🇲🇾", maxDigits: 10 },
  { code: "TH", dialCode: "+66", name: "Thailand", flag: "🇹🇭", maxDigits: 9 },
  { code: "ID", dialCode: "+62", name: "Indonesia", flag: "🇮🇩", maxDigits: 12 },
  { code: "PH", dialCode: "+63", name: "Philippines", flag: "🇵🇭", maxDigits: 10 },
  { code: "VN", dialCode: "+84", name: "Vietnam", flag: "🇻🇳", maxDigits: 10 },
  { code: "BD", dialCode: "+880", name: "Bangladesh", flag: "🇧🇩", maxDigits: 10 },
  { code: "PK", dialCode: "+92", name: "Pakistan", flag: "🇵🇰", maxDigits: 10 },
  { code: "LK", dialCode: "+94", name: "Sri Lanka", flag: "🇱🇰", maxDigits: 9 },
  { code: "NP", dialCode: "+977", name: "Nepal", flag: "🇳🇵", maxDigits: 10 },
  { code: "ZA", dialCode: "+27", name: "South Africa", flag: "🇿🇦", maxDigits: 9 },
  { code: "NG", dialCode: "+234", name: "Nigeria", flag: "🇳🇬", maxDigits: 10 },
  { code: "KE", dialCode: "+254", name: "Kenya", flag: "🇰🇪", maxDigits: 9 },
  { code: "EG", dialCode: "+20", name: "Egypt", flag: "🇪🇬", maxDigits: 10 },
  { code: "TR", dialCode: "+90", name: "Turkey", flag: "🇹🇷", maxDigits: 10 },
  { code: "RU", dialCode: "+7", name: "Russia", flag: "🇷🇺", maxDigits: 10 },
  { code: "NL", dialCode: "+31", name: "Netherlands", flag: "🇳🇱", maxDigits: 9 },
  { code: "SE", dialCode: "+46", name: "Sweden", flag: "🇸🇪", maxDigits: 9 },
  { code: "CH", dialCode: "+41", name: "Switzerland", flag: "🇨🇭", maxDigits: 9 },
  { code: "AT", dialCode: "+43", name: "Austria", flag: "🇦🇹", maxDigits: 10 },
  { code: "BE", dialCode: "+32", name: "Belgium", flag: "🇧🇪", maxDigits: 9 },
  { code: "PL", dialCode: "+48", name: "Poland", flag: "🇵🇱", maxDigits: 9 },
  { code: "PT", dialCode: "+351", name: "Portugal", flag: "🇵🇹", maxDigits: 9 },
  { code: "GR", dialCode: "+30", name: "Greece", flag: "🇬🇷", maxDigits: 10 },
  { code: "IE", dialCode: "+353", name: "Ireland", flag: "🇮🇪", maxDigits: 9 },
  { code: "NZ", dialCode: "+64", name: "New Zealand", flag: "🇳🇿", maxDigits: 9 },
  { code: "AR", dialCode: "+54", name: "Argentina", flag: "🇦🇷", maxDigits: 10 },
  { code: "CL", dialCode: "+56", name: "Chile", flag: "🇨🇱", maxDigits: 9 },
  { code: "CO", dialCode: "+57", name: "Colombia", flag: "🇨🇴", maxDigits: 10 },
  { code: "PE", dialCode: "+51", name: "Peru", flag: "🇵🇪", maxDigits: 9 },
  { code: "QA", dialCode: "+974", name: "Qatar", flag: "🇶🇦", maxDigits: 8 },
  { code: "KW", dialCode: "+965", name: "Kuwait", flag: "🇰🇼", maxDigits: 8 },
  { code: "BH", dialCode: "+973", name: "Bahrain", flag: "🇧🇭", maxDigits: 8 },
  { code: "OM", dialCode: "+968", name: "Oman", flag: "🇴🇲", maxDigits: 8 },
  { code: "IL", dialCode: "+972", name: "Israel", flag: "🇮🇱", maxDigits: 9 },
  { code: "HK", dialCode: "+852", name: "Hong Kong", flag: "🇭🇰", maxDigits: 8 },
  { code: "TW", dialCode: "+886", name: "Taiwan", flag: "🇹🇼", maxDigits: 9 },
  { code: "NO", dialCode: "+47", name: "Norway", flag: "🇳🇴", maxDigits: 8 },
  { code: "DK", dialCode: "+45", name: "Denmark", flag: "🇩🇰", maxDigits: 8 },
  { code: "FI", dialCode: "+358", name: "Finland", flag: "🇫🇮", maxDigits: 10 },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0]; // India

export function findCountryByDialCode(dialCode: string): CountryCode | undefined {
  return COUNTRY_CODES.find((c) => c.dialCode === dialCode);
}

export function findCountryByCode(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find((c) => c.code === code);
}
