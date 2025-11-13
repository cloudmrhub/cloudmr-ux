export interface PasswordValidation {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
}

export const validatePassword = (password: string): PasswordValidation => {
  return {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
  };
};

export const isPasswordValid = (validation: PasswordValidation): boolean => {
  return Object.values(validation).every((valid) => valid);
};

export const getPasswordRequirements = () => [
  { key: 'minLength', label: 'Minimum 8 characters' },
  { key: 'hasNumber', label: 'Contains at least 1 number' },
  { key: 'hasSpecial', label: 'Contains at least 1 special character' },
  { key: 'hasUppercase', label: 'Contains at least 1 uppercase letter' },
  { key: 'hasLowercase', label: 'Contains at least 1 lowercase letter' },
] as const;
