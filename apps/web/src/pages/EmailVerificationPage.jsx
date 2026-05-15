import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MailCheck, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { getAuthErrorMessage } from '@/lib/authErrors.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

const EmailVerificationPage = () => {
  const { requestEmailVerification, confirmEmailVerification, refreshUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);
  const initialEmail = useMemo(() => String(searchParams.get('email') || '').trim(), [searchParams]);
  const isConfirming = Boolean(token);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const confirmationStartedRef = useRef(false);

  useEffect(() => {
    if (!token || confirmationStartedRef.current) return;

    let active = true;
    confirmationStartedRef.current = true;
    setLoading(true);
    confirmEmailVerification(token)
      .then(async () => {
        if (!active) return;
        await refreshUser().catch(() => null);
        setConfirmed(true);
        toast.success(t('auth.verify_confirm_success'));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(getAuthErrorMessage(error, { t, mode: 'emailVerificationConfirm' }));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [confirmEmailVerification, refreshUser, t, token]);

  const handleRequestVerification = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await requestEmailVerification(email);
      setSent(true);
      toast.success(t('auth.verify_request_success'));
    } catch (error) {
      toast.error(getAuthErrorMessage(error, { t, mode: 'emailVerification' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('auth.verify_meta_title')} - Zahnibörse</title>
      </Helmet>

      <main className="bg-[hsl(var(--background))] px-4 py-10 md:px-6 md:py-16">
        <Card className="mx-auto max-w-md rounded-[8px] border-[hsl(var(--border))] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#0000FF]/10 text-[#0000FF]">
              {isConfirming ? <MailCheck className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="font-['Playfair_Display'] text-3xl leading-tight">
                {isConfirming ? t('auth.verify_confirm_title') : t('auth.verify_request_title')}
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">
                {isConfirming ? t('auth.verify_confirm_body') : t('auth.verify_request_body')}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {isConfirming ? (
              <div className="space-y-5">
                <div className={`rounded-[8px] border p-3 text-sm leading-6 ${
                  confirmed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
                }`}
                >
                  {loading
                    ? t('auth.verify_confirm_processing')
                    : confirmed
                      ? t('auth.verify_confirm_success')
                      : t('auth.verify_confirm_pending')}
                </div>
                <Button
                  type="button"
                  className="h-12 w-full rounded-[8px] bg-[#0000FF] text-white hover:bg-[#0000CC]"
                  disabled={loading}
                  onClick={() => navigate('/auth', { replace: true })}
                >
                  {t('auth.back_to_login')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRequestVerification} className="space-y-5">
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
                <Button type="submit" className="h-12 w-full rounded-[8px] bg-[#0000FF] text-white hover:bg-[#0000CC]" disabled={loading || sent}>
                  {loading ? t('auth.wait') : sent ? t('auth.verify_request_sent') : t('auth.verify_request_submit')}
                </Button>
                {sent && (
                  <p className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                    {t('auth.verify_request_sent_body')}
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

export default EmailVerificationPage;
