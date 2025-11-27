/**
 * Validates and formats Philippine phone numbers
 * Supports:
 * - Mobile: +63XXXXXXXXXX (11 digits after +63)
 * - Mobile: 09XXXXXXXXX (11 digits starting with 09)
 * - Landline: +63XXYYYYYYYY (area code + number)
 */

export function validatePhilippinePhone(phone: string): {
  isValid: boolean
  formatted: string
  error?: string
} {
  if (!phone || phone.trim() === "") {
    return {
      isValid: false,
      formatted: "",
      error: "Phone number is required",
    }
  }

  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "")

  // Check if it starts with +63
  if (cleaned.startsWith("+63")) {
    const digits = cleaned.substring(3) // Remove +63
    if (digits.length === 10 && /^9\d{9}$/.test(digits)) {
      // Mobile number: +639XXXXXXXXX
      return {
        isValid: true,
        formatted: `+63${digits}`,
      }
    } else if (digits.length >= 8 && digits.length <= 10) {
      // Landline: +63XXYYYYYYYY
      return {
        isValid: true,
        formatted: `+63${digits}`,
      }
    } else {
      return {
        isValid: false,
        formatted: cleaned,
        error: "Invalid Philippine phone number format. Use +63XXXXXXXXXX for mobile or +63XXYYYYYYYY for landline",
      }
    }
  }

  // Check if it starts with 0
  if (cleaned.startsWith("0")) {
    const digits = cleaned.substring(1) // Remove leading 0
    if (digits.length === 10 && /^9\d{9}$/.test(digits)) {
      // Mobile number: 09XXXXXXXXX
      return {
        isValid: true,
        formatted: `+63${digits}`,
      }
    } else if (digits.length >= 8 && digits.length <= 10) {
      // Landline: 0XXYYYYYYYY
      return {
        isValid: true,
        formatted: `+63${digits}`,
      }
    } else {
      return {
        isValid: false,
        formatted: cleaned,
        error: "Invalid Philippine phone number format. Use 09XXXXXXXXX for mobile or 0XXYYYYYYYY for landline",
      }
    }
  }

  // Check if it's just digits (10-11 digits)
  if (/^\d+$/.test(cleaned)) {
    if (cleaned.length === 10 && /^9\d{9}$/.test(cleaned)) {
      // Mobile: 9XXXXXXXXX (10 digits starting with 9)
      return {
        isValid: true,
        formatted: `+63${cleaned}`,
      }
    } else if (cleaned.length === 11 && /^09\d{9}$/.test(cleaned)) {
      // Mobile: 09XXXXXXXXX (11 digits)
      return {
        isValid: true,
        formatted: `+63${cleaned.substring(1)}`,
      }
    } else if (cleaned.length >= 8 && cleaned.length <= 10) {
      // Landline
      return {
        isValid: true,
        formatted: `+63${cleaned}`,
      }
    }
  }

  return {
    isValid: false,
    formatted: cleaned,
    error: "Invalid Philippine phone number. Use format: +639XXXXXXXXX or 09XXXXXXXXX",
  }
}

export function formatPhoneInput(value: string): string {
  // Allow only digits, +, spaces, dashes, and parentheses
  return value.replace(/[^\d\+\s\-\(\)]/g, "")
}



