import * as countries from "i18n-iso-countries";

// The backend tsconfig does not need resolveJsonModule when this is loaded
// through require().
const englishLocale = require("i18n-iso-countries/langs/en.json");

countries.registerLocale(englishLocale);

export const FREE_SHIPPING_THRESHOLD_SEK = 499;
export const STANDARD_SHIPPING_FEE_SEK = 49;

export type ShippingCountryCode = string;

export const normalizeShippingCountryCode = (
  value: unknown,
): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
};

export const isShippingCountryCode = (
  value: unknown,
): value is ShippingCountryCode => {
  const code = normalizeShippingCountryCode(value);

  return /^[A-Z]{2}$/.test(code) && countries.isValid(code);
};

export const getShippingCountryName = (
  value: string,
): string => {
  const code = normalizeShippingCountryCode(value);

  return (
    countries.getName(code, "en", {
      select: "official",
    }) || code
  );
};

export const getShippingFee = (
  subtotal: number,
): number => {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return STANDARD_SHIPPING_FEE_SEK;
  }

  return subtotal >= FREE_SHIPPING_THRESHOLD_SEK
    ? 0
    : STANDARD_SHIPPING_FEE_SEK;
};