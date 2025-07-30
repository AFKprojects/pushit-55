// Security utilities for input validation and sanitization

/**
 * Sanitizes user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove potentially dangerous HTML tags and attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Validates poll question input
 */
export const validatePollQuestion = (question: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(question);
  
  if (!sanitized || sanitized.length < 10) {
    return { isValid: false, error: 'Question must be at least 10 characters long' };
  }
  
  if (sanitized.length > 200) {
    return { isValid: false, error: 'Question must be 200 characters or less' };
  }
  
  // Check for suspicious patterns
  if (sanitized !== question) {
    return { isValid: false, error: 'Question contains invalid content' };
  }
  
  return { isValid: true };
};

/**
 * Validates poll option input
 */
export const validatePollOption = (option: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(option);
  
  if (!sanitized || sanitized.length < 1) {
    return { isValid: false, error: 'Option cannot be empty' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Option must be 100 characters or less' };
  }
  
  // Check for suspicious patterns
  if (sanitized !== option) {
    return { isValid: false, error: 'Option contains invalid content' };
  }
  
  return { isValid: true };
};

/**
 * Validates all poll options
 */
export const validatePollOptions = (options: string[]): { isValid: boolean; error?: string } => {
  if (options.length < 2) {
    return { isValid: false, error: 'At least 2 options are required' };
  }
  
  if (options.length > 10) {
    return { isValid: false, error: 'Maximum 10 options allowed' };
  }
  
  for (const option of options) {
    const validation = validatePollOption(option);
    if (!validation.isValid) {
      return validation;
    }
  }
  
  return { isValid: true };
};

/**
 * Generates a cryptographically secure device ID
 */
export const generateSecureDeviceId = (): string => {
  // Use crypto.getRandomValues for cryptographically secure random numbers
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to hex string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Safely handles and logs errors without exposing sensitive information
 */
export const handleSecureError = (error: any, context: string): string => {
  // Log the full error for debugging (server-side in production)
  console.error(`Error in ${context}:`, error);
  
  // Return a safe, generic error message to the user
  if (error?.message?.includes('Invalid content detected')) {
    return 'Invalid content detected. Please check your input.';
  }
  
  if (error?.message?.includes('must be between')) {
    return error.message; // Length validation errors are safe to show
  }
  
  if (error?.message?.includes('Authentication required')) {
    return 'Please log in to continue.';
  }
  
  if (error?.message?.includes('rate limit')) {
    return 'Too many requests. Please wait before trying again.';
  }
  
  // Generic error message for everything else
  return 'An error occurred. Please try again later.';
};

/**
 * Rate limiting helper for client-side operations
 */
export class RateLimiter {
  private operations: Map<string, number[]> = new Map();
  
  constructor(private maxOperations: number, private windowMs: number) {}
  
  canPerform(key: string): boolean {
    const now = Date.now();
    const operations = this.operations.get(key) || [];
    
    // Remove operations outside the time window
    const validOperations = operations.filter(time => now - time < this.windowMs);
    
    if (validOperations.length >= this.maxOperations) {
      return false;
    }
    
    // Add current operation
    validOperations.push(now);
    this.operations.set(key, validOperations);
    
    return true;
  }
}