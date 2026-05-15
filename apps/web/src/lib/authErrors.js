const getResponse = (error) => error?.response || error?.data || {};

const getStatus = (error) => Number(error?.status || error?.response?.status || 0);

const getFieldErrors = (error) => {
  const response = getResponse(error);
  return response?.data && typeof response.data === 'object' ? response.data : {};
};

const getText = (error) => [
  error?.message,
  getResponse(error)?.message,
  ...Object.values(getFieldErrors(error)).map((value) => value?.message || value?.code || ''),
].filter(Boolean).join(' ').toLowerCase();

const hasFieldError = (fieldErrors, fieldName, patterns = []) => {
  const field = fieldErrors?.[fieldName];
  const text = `${field?.code || ''} ${field?.message || ''}`.toLowerCase();
  return Boolean(field) && (patterns.length === 0 || patterns.some((pattern) => text.includes(pattern)));
};

export const getAuthErrorKey = (error, mode = 'login') => {
  const status = getStatus(error);
  const text = getText(error);
  const fieldErrors = getFieldErrors(error);
  const hasRemoteError = Boolean(error?.response || error?.data || error?.status);

  if (error?.isAbort || text.includes('autocancelled')) return 'auth.error_cancelled';
  if ((hasRemoteError && status === 0) || text.includes('failed to fetch') || text.includes('networkerror')) return 'auth.error_network';
  if (!hasRemoteError) return '';
  if (status === 429 || text.includes('rate limit')) return 'auth.error_rate_limited';
  if (status >= 500) return 'auth.error_server';

  if (text.includes('verified') || text.includes('confirm') || text.includes('verification')) {
    return 'auth.error_email_unverified';
  }

  if (mode === 'login') {
    if (hasFieldError(fieldErrors, 'identity') || hasFieldError(fieldErrors, 'email') || hasFieldError(fieldErrors, 'password')) {
      return 'auth.error_login_required_fields';
    }

    if ([400, 401, 403, 404].includes(status) || text.includes('authenticate') || text.includes('invalid')) {
      return 'auth.error_login_invalid_credentials';
    }

    return 'auth.error_login_generic';
  }

  if (mode === 'passwordReset') {
    if (hasFieldError(fieldErrors, 'email', ['invalid', 'required']) || text.includes('email')) {
      return 'auth.error_reset_email_invalid';
    }

    if ([400, 404, 422].includes(status)) return 'auth.error_reset_request_invalid';
    if ([401, 403].includes(status)) return 'auth.error_reset_forbidden';

    return 'auth.error_reset_generic';
  }

  if (mode === 'passwordResetConfirm') {
    if (hasFieldError(fieldErrors, 'password', ['length', 'weak', 'invalid'])) return 'auth.error_signup_password_invalid';
    if (hasFieldError(fieldErrors, 'passwordConfirm', ['match', 'equal'])) return 'auth.password_mismatch';
    if (hasFieldError(fieldErrors, 'token') || text.includes('token') || [400, 401, 403, 404].includes(status)) {
      return 'auth.error_reset_token_invalid';
    }

    return 'auth.error_reset_confirm_generic';
  }

  if (mode === 'emailVerification') {
    if (hasFieldError(fieldErrors, 'email', ['invalid', 'required']) || text.includes('email')) {
      return 'auth.error_verify_email_invalid';
    }

    if ([400, 404, 422].includes(status)) return 'auth.error_verify_request_invalid';
    if ([401, 403].includes(status)) return 'auth.error_verify_forbidden';

    return 'auth.error_verify_generic';
  }

  if (mode === 'emailVerificationConfirm') {
    if (hasFieldError(fieldErrors, 'token') || text.includes('token') || [400, 401, 403, 404].includes(status)) {
      return 'auth.error_verify_token_invalid';
    }

    return 'auth.error_verify_confirm_generic';
  }

  if (hasFieldError(fieldErrors, 'email', ['unique', 'already', 'exists'])) return 'auth.error_signup_email_exists';
  if (hasFieldError(fieldErrors, 'email', ['invalid', 'format'])) return 'auth.error_signup_email_invalid';
  if (hasFieldError(fieldErrors, 'password', ['length', 'weak', 'invalid'])) return 'auth.error_signup_password_invalid';
  if (hasFieldError(fieldErrors, 'passwordConfirm', ['match', 'equal'])) return 'auth.password_mismatch';
  if (hasFieldError(fieldErrors, 'name') || hasFieldError(fieldErrors, 'university')) return 'auth.error_signup_required_fields';

  if ([400, 422].includes(status)) return 'auth.error_signup_invalid';
  if ([401, 403].includes(status)) return 'auth.error_signup_forbidden';

  return 'auth.error_signup_generic';
};

export const getAuthErrorMessage = (error, { t, mode = 'login' } = {}) => {
  const key = getAuthErrorKey(error, mode);
  const translated = typeof t === 'function' ? t(key) : key;

  if (translated && translated !== key) return translated;

  if (!getStatus(error) && typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return typeof t === 'function' ? t('auth.generic_error') : 'Authentication failed';
};
