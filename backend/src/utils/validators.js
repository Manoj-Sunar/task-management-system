
import mongoose from "mongoose";

const validators = {
  // Validate MongoDB ObjectId
  isObjectId: (value) => {
    return mongoose.Types.ObjectId.isValid(value);
  },

  // Validate email format
  isEmail: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  // Validate URL format
  isURL: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // Validate strong password
  isStrongPassword: (value) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(value);
  },

  // Validate phone number
  isPhoneNumber: (value) => {
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    return phoneRegex.test(value);
  },

  // Validate date is in the future
  isFutureDate: (value) => {
    return new Date(value) > new Date();
  },

  // Validate date is in the past
  isPastDate: (value) => {
    return new Date(value) < new Date();
  },

  // Validate array contains unique values
  hasUniqueValues: (array) => {
    return new Set(array).size === array.length;
  },

  // Validate number is positive
  isPositiveNumber: (value) => {
    return typeof value === 'number' && value > 0;
  },

  // Validate number is non-negative
  isNonNegativeNumber: (value) => {
    return typeof value === 'number' && value >= 0;
  },

  // Validate string length is within range
  isLengthWithinRange: (value, min, max) => {
    return value.length >= min && value.length <= max;
  },

  // Validate string contains only alphanumeric characters and spaces
  isAlphanumericWithSpaces: (value) => {
    const regex = /^[a-zA-Z0-9\s]+$/;
    return regex.test(value);
  },

  // Validate string contains only letters and spaces
  isAlphaWithSpaces: (value) => {
    const regex = /^[a-zA-Z\s]+$/;
    return regex.test(value);
  },
};

module.exports = validators;