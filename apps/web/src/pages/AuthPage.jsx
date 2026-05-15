import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { getAuthErrorMessage } from '@/lib/authErrors.js';
import { getPostLoginRedirectPath } from '@/lib/authRedirects.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const UNIVERSITIES = [
  'Friedrich-Alexander-Universitaet Erlangen-Nuernberg',
  'Universitaet Bonn',
  'Universitaet Duesseldorf',
  'Universitaet Frankfurt',
  'Universitaet Freiburg',
  'Universitaet Greifswald',
  'Universitaet Halle-Wittenberg',
  'Universitaet Hamburg',
  'Universitaet Heidelberg',
  'Universitaet Jena',
  'Universitaet Kiel',
  'Universitaet Koeln',
  'Universitaet Leipzig',
  'Universitaet Mainz',
  'Universitaet Marburg',
  'Universitaet Muenchen',
  'Universitaet Muenster',
  'Universitaet Rostock',
  'Universitaet Tuebingen',
  'Universitaet Ulm',
  'Universitaet Wuerzburg',
  'Charite Berlin',
  'Andere',
];

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [openUni, setOpenUni] = useState(false);
  const { login, signup } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = location.state?.from;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    university: '',
    customUniversity: '',
  });

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleModeChange = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setFormData((current) => ({
      ...current,
      password: '',
      passwordConfirm: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const authData = await login(formData.email, formData.password);
        toast.success(t('auth.login_success'));
        const redirectPath = await getPostLoginRedirectPath({
          user: authData?.record,
          token: authData?.token,
          fromLocation,
        });
        navigate(redirectPath, { replace: true });
        return;
      } else {
        if (formData.password !== formData.passwordConfirm) {
          throw new Error(t('auth.password_mismatch'));
        }

        const finalUniversity =
          formData.university === 'Andere' ? formData.customUniversity : formData.university;

        if (!finalUniversity?.trim()) {
          throw new Error(t('auth.select_university_error'));
        }

        const signupResult = await signup({
          email: formData.email.trim(),
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          name: formData.name.trim(),
          university: finalUniversity.trim(),
        });

        if (signupResult?.requiresVerification) {
          toast.success(t('auth.signup_verify_required'));
          navigate(`/auth/verify-email?email=${encodeURIComponent(formData.email.trim())}`, { replace: true });
          return;
        }

        toast.success(signupResult?.verificationSent ? t('auth.signup_success_verify_sent') : t('auth.signup_success'));
        const redirectPath = await getPostLoginRedirectPath({
          user: signupResult?.record,
          token: signupResult?.token,
          fromLocation,
        });
        navigate(redirectPath, { replace: true });
        return;
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error, { t, mode: isLogin ? 'login' : 'signup' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${isLogin ? t('auth.login') : t('auth.register')} - Zahnibörse`}</title>
      </Helmet>

      <main className="bg-[hsl(var(--background))] px-4 py-10 md:px-6 md:py-16">
        <section className="mx-auto max-w-md rounded-[8px] border border-[hsl(var(--border))] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:p-7">
              <div className="flex flex-wrap gap-2 rounded-[8px] bg-[hsl(var(--muted-bg))] p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange(true)}
                  className={cn(
                    'flex-1 rounded-[6px] px-4 py-2.5 text-sm font-medium transition',
                    isLogin ? 'bg-white text-[#0000FF] shadow-sm' : 'text-[hsl(var(--secondary-text))]'
                  )}
                >
                  {t('auth.login')}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange(false)}
                  className={cn(
                    'flex-1 rounded-[6px] px-4 py-2.5 text-sm font-medium transition',
                    !isLogin ? 'bg-white text-[#0000FF] shadow-sm' : 'text-[hsl(var(--secondary-text))]'
                  )}
                >
                  {t('auth.register')}
                </button>
              </div>

              <div className="mt-6 space-y-2">
                <h2 className="font-['Playfair_Display'] text-3xl leading-tight text-[hsl(var(--foreground))]">
                  {isLogin ? t('auth.welcome_back') : t('auth.create_account')}
                </h2>
                <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">
                  {isLogin ? t('auth.no_account') : t('auth.has_account')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('auth.full_name')}</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="h-12 rounded-[8px] border-[hsl(var(--border))] bg-white px-4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('auth.university')}</Label>
                      <Popover open={openUni} onOpenChange={setOpenUni}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openUni}
                            className="h-12 w-full justify-between rounded-[8px] border-[hsl(var(--border))] bg-white px-4 font-normal text-[hsl(var(--foreground))] hover:bg-white"
                          >
                            <span className="truncate">
                              {formData.university
                                ? formData.university === 'Andere'
                                  ? t('auth.other_university')
                                  : formData.university
                                : t('auth.search_university')}
                            </span>
                            <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-[8px] border-white/70 bg-white p-0 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                          <Command>
                            <CommandInput placeholder={t('auth.search_university')} />
                            <CommandList>
                              <CommandEmpty>{t('auth.no_university')}</CommandEmpty>
                              <CommandGroup>
                                {UNIVERSITIES.map((uni) => (
                                  <CommandItem
                                    key={uni}
                                    value={uni}
                                    onSelect={() => {
                                      setFormData((current) => ({ ...current, university: uni }));
                                      setOpenUni(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        formData.university === uni ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    {uni === 'Andere' ? t('auth.other_university') : uni}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {formData.university === 'Andere' && (
                      <div className="space-y-2">
                        <Label htmlFor="customUniversity">{t('auth.custom_university')}</Label>
                        <Input
                          id="customUniversity"
                          name="customUniversity"
                          placeholder={t('auth.custom_university_placeholder')}
                          value={formData.customUniversity}
                          onChange={handleChange}
                          required
                          className="h-12 rounded-[8px] border-[hsl(var(--border))] bg-white px-4"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-[8px] border-[hsl(var(--border))] bg-white px-4"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    {isLogin ? (
                      <Link to="/auth/reset-password" className="text-xs font-medium text-[#0000FF] hover:underline">
                        {t('auth.forgot_password')}
                      </Link>
                    ) : (
                      <span className="text-xs text-[hsl(var(--secondary-text))]">Min. 8</span>
                    )}
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="h-12 rounded-[8px] border-[hsl(var(--border))] bg-white px-4"
                  />
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirm">{t('auth.confirm_password')}</Label>
                    <Input
                      id="passwordConfirm"
                      name="passwordConfirm"
                      type="password"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="h-12 rounded-[8px] border-[hsl(var(--border))] bg-white px-4"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-[8px] bg-[#0000FF] text-white hover:bg-[#0000CC]"
                  disabled={loading}
                >
                  {loading ? t('auth.wait') : isLogin ? t('auth.login') : t('auth.register')}
                </Button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-[hsl(var(--secondary-text))]">
                <span>{isLogin ? t('auth.no_account') : t('auth.has_account')}</span>
                <button
                  type="button"
                  onClick={() => handleModeChange(!isLogin)}
                  className="font-medium text-[#0000FF] transition hover:underline"
                >
                  {isLogin ? t('auth.register_now') : t('auth.login_here')}
                </button>
              </div>
              {isLogin && (
                <div className="mt-3 text-center text-sm">
                  <Link to="/auth/verify-email" className="font-medium text-[#0000FF] transition hover:underline">
                    {t('auth.need_verification_email')}
                  </Link>
                </div>
              )}
        </section>
      </main>
    </>
  );
};

export default AuthPage;
