import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { getAuthErrorMessage } from '@/lib/authErrors.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

const PasswordResetPage = () => {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);
  const isConfirming = Boolean(token);
  const [email, setEmail] = useState('');
  const [passwords, setPasswords] = useState({ password: '', passwordConfirm: '' });
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRequestReset = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setEmailSent(true);
      toast.success(t('auth.reset_request_success'));
    } catch (error) {
      toast.error(getAuthErrorMessage(error, { t, mode: 'passwordReset' }));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (event) => {
    event.preventDefault();

    if (passwords.password !== passwords.passwordConfirm) {
      toast.error(t('auth.password_mismatch'));
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({
        token,
        password: passwords.password,
        passwordConfirm: passwords.passwordConfirm,
      });
      toast.success(t('auth.reset_confirm_success'));
      navigate('/auth', { replace: true });
    } catch (error) {
      toast.error(getAuthErrorMessage(error, { t, mode: 'passwordResetConfirm' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('auth.reset_meta_title')} - Zahnibörse</title>
      </Helmet>

      <main className="bg-[hsl(var(--background))] px-4 py-10 md:px-6 md:py-16">
        <Card className="mx-auto max-w-md rounded-[8px] border-[hsl(var(--border))] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#0000FF]/10 text-[#0000FF]">
              {isConfirming ? <ShieldCheck className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="font-['Playfair_Display'] text-3xl leading-tight">
                {isConfirming ? t('auth.reset_confirm_title') : t('auth.reset_request_title')}
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">
                {isConfirming ? t('auth.reset_confirm_body') : t('auth.reset_request_body')}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {isConfirming ? (
              <form onSubmit={handleConfirmReset} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={passwords.password}
                    onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
                    className="h-12 rounded-[8px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">{t('auth.confirm_password')}</Label>
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={passwords.passwordConfirm}
                    onChange={(event) => setPasswords((current) => ({ ...current, passwordConfirm: event.target.value }))}
                    className="h-12 rounded-[8px]"
                  />
                </div>
                <Button type="submit" className="h-12 w-full rounded-[8px] bg-[#0000FF] text-white hover:bg-[#0000CC]" disabled={loading}>
                  {loading ? t('auth.wait') : t('auth.reset_confirm_submit')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-[8px]"
                  />
                </div>
                <Button type="submit" className="h-12 w-full rounded-[8px] bg-[#0000FF] text-white hover:bg-[#0000CC]" disabled={loading || emailSent}>
                  {loading ? t('auth.wait') : emailSent ? t('auth.reset_request_sent') : t('auth.reset_request_submit')}
                </Button>
                {emailSent && (
                  <p className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                    {t('auth.reset_request_sent_body')}
                  </p>
                )}
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <Link to="/auth" className="font-medium text-[#0000FF] transition hover:underline">
                {t('auth.back_to_login')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default PasswordResetPage;
