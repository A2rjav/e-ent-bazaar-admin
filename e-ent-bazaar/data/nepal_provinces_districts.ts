// Map of Nepal provinces to their districts
export interface ProvinceDistrict {
  province: string;
  districts: string[];
}

export const nepalProvincesDistricts: Record<string, string[]> = {
  "Koshi Province": [
  "Bhojpur",
  "Dhankuta",
  "Ilam",
  "Jhapa",
  "Khotang",
  "Morang",
  "Okhaldhunga",
  "Panchthar",
  "Sankhuwasabha",
  "Solukhumbu",
  "Sunsari",
  "Taplejung",
  "Terhathum",
  "Udayapur"
  ],
  "Madhesh Province": [
  "Bara",
  "Dhanusha",
  "Mahottari",
  "Parsa",
  "Rautahat",
  "Saptari",
  "Sarlahi",
  "Siraha"
  ],
  "Bagmati Province": [
  "Bhaktapur",
  "Chitwan",
  "Dhading",
  "Dolakha",
  "Kathmandu",
  "Kavrepalanchok",
  "Lalitpur",
  "Makwanpur",
  "Nuwakot",
  "Ramechhap",
  "Rasuwa",
  "Sindhuli",
  "Sindhupalchok"
  ],
  "Gandaki Province": [
  "Baglung",
  "Gorkha",
  "Kaski",
  "Lamjung",
  "Manang",
  "Mustang",
  "Myagdi",
  "Nawalpur",
  "Parbat",
  "Syangja",
  "Tanahun"
  ],
  "Lumbini Province": [
  "Arghakhanchi",
  "Banke",
  "Bardiya",
  "Dang",
  "Eastern Rukum",
  "Gulmi",
  "Kapilvastu",
  "Palpa",
  "Parasi",
  "Pyuthan",
  "Rolpa",
  "Rupandehi"
  ],
  "Karnali Province": [
  "Dailekh",
  "Dolpa",
  "Humla",
  "Jajarkot",
  "Jumla",
  "Kalikot",
  "Mugu",
  "Salyan",
  "Surkhet",
  "Western Rukum"
  ],
  "Sudurpashchim Province": [
  "Achham",
  "Baitadi",
  "Bajhang",
  "Bajura",
  "Dadeldhura",
  "Darchula",
  "Doti",
  "Kailali",
  "Kanchanpur"
  ]
  }

export const getDistrictsByProvince = (provinceName: string): string[] => {
  return nepalProvincesDistricts[provinceName] || [];
};

export const getProvinces = (): string[] => {
  return Object.keys(nepalProvincesDistricts);
}; 