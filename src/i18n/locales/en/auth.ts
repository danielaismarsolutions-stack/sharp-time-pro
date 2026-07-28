import type { LocaleShape } from '../../types';
import type { auth as esAuth } from '../es/auth';

export const auth: LocaleShape<typeof esAuth> = {
  // Login
  welcomeBack: 'Welcome back',
  loginSubtitle: 'Sign in to manage your salon',
  email: 'Email address',
  password: 'Password',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  rememberMe: 'Remember me for 30 days',
  signIn: 'Sign in',
  signingIn: 'Signing in...',
  signOut: 'Sign out',
  // Login toasts
  incompleteCredentialsTitle: 'Missing credentials',
  incompleteCredentialsDesc: 'Please enter your email and password.',
  welcomeToastTitle: 'Welcome back!',
  welcomeToastDesc: 'You have signed in successfully.',
  loginErrorTitle: 'Sign in failed',
  loginErrorFallback: 'Please check your credentials and try again.',
  // Authentication errors (AuthContext)
  invalidCredentials: 'Incorrect email or password.',
  emailNotConfirmed: 'You must confirm your email before signing in. Check your inbox.',
  // Change password
  changePasswordTitle: 'Change password',
  changePasswordDesc: 'Enter your new password. It must be at least 8 characters long.',
  newPassword: 'New password',
  confirmPassword: 'Confirm password',
  updatePassword: 'Update password',
  updatingPassword: 'Updating...',
  requiredFieldsTitle: 'Required fields',
  requiredFieldsDesc: 'Please fill in both fields.',
  passwordTooShortTitle: 'Password too short',
  passwordTooShortDesc: 'The password must be at least 8 characters long.',
  passwordMismatchTitle: 'Passwords do not match',
  passwordMismatchDesc: 'Please make sure both passwords are the same.',
  passwordUpdatedTitle: 'Password updated',
  passwordUpdatedDesc: 'Your password has been updated successfully.',
  passwordUpdateError: 'Could not update the password.',
} as const;
