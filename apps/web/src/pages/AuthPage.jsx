import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, PackageCheck, ShieldCheck, Store, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
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

  const from = location.state?.from?.pathname || '/';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    university: '',
    customUniversity: '',
  });

  const benefits = useMemo(
    () => [
      {
        icon: ShieldCheck,
        title: t('info.secure_title'),
        body: t('info.secure_body'),
      },
      {
        icon: PackageCheck,
        title: t('info.simple_title'),
        body: t('info.simple_body'),
      },
      {
        icon: Store,
        title: t('info.sustainable_title'),
        body: t('info.sustainable_body'),
      },
    ],
    [t]
  );

  const highlights = useMemo(
    () => [
      t('marketplace.subtitle'),
      t('shop.subtitle'),
      t('seller.hero_body'),
    ],
    [t]
  );

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const getErrorMessage = (error) => {
    const fieldErrors = error?.response?.data;

    if (fieldErrors && typeof fieldErrors === 'object') {
      const firstFieldError = Object.values(fieldErrors).find(
        (value) => value && typeof value === 'object' && typeof value.message === 'string'
      );

      if (firstFieldError?.message) {
        return firstFieldError.message;
      }
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return t('auth.generic_error');
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
        await login(formData.email, formData.password);
        toast.success(t('auth.login_success'));
      } else {
        if (formData.password !== formData.passwordConfirm) {
          throw new Error(t('auth.password_mismatch'));
        }

        const finalUniversity =
          formData.university === 'Andere' ? formData.customUniversity : formData.university;

        if (!finalUniversity?.trim()) {
          throw new Error(t('auth.select_university_error'));
        }

        await signup({
          email: formData.email.trim(),
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          name: formData.name.trim(),
          university: finalUniversity.trim(),
        });
        toast.success(t('auth.signup_success'));
      }

      navigate(from, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${isLogin ? t('auth.login') : t('auth.register')} - Zahniboerse`}</title>
      </Helmet>

      <main className="relative overflow-hidden bg-[linear-gradient(180deg,#f6f8fe_0%,#eef2fb_48%,#f7f8fc_100%)] px-4 py-10 md:px-6 md:py-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,rgba(0,0,255,0.11),transparent_40%),radial-gradient(circle_at_top_right,rgba(0,0,255,0.08),transparent_32%)]" />

        <div className="relative mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] bg-[linear-gradient(160deg,rgba(0,0,255,0.96),rgba(30,64,175,0.88))] px-6 py-7 text-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] md:px-8 md:py-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Zahniboerse
            </div>

            <div className="mt-8 max-w-xl space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/72">
                {isLogin ? t('auth.welcome_back') : t('auth.create_account')}
              </p>
              <h1 className="font-['Playfair_Display'] text-4xl leading-tight md:text-5xl">
                {isLogin ? t('home.hero_title') : t('seller.hero_title')}
              </h1>
              <p className="max-w-lg text-base leading-7 text-white/82 md:text-lg">
                {t('brand.tagline')}
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {benefits.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-white/16 bg-white/10 p-4 backdrop-blur"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/16">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-sm font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/76">{item.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-[26px] border border-white/16 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
                {t('nav.marketplace')} / {t('nav.shop')}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {highlights.map((text) => (
                  <div key={text} className="rounded-[20px] bg-white/10 px-4 py-4">
                    <p className="text-sm leading-6 text-white/82">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/60 bg-white/92 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
            <div className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#f9faff_100%)] p-5 md:p-7">
              <div className="flex flex-wrap gap-2 rounded-full bg-[hsl(var(--muted-bg))] p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange(true)}
                  className={cn(
                    'flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition',
                    isLogin ? 'bg-white text-[#0000FF] shadow-sm' : 'text-[hsl(var(--secondary-text))]'
                  )}
                >
                  {t('auth.login')}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange(false)}
                  className={cn(
                    'flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition',
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
                        className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                            className="h-12 w-full justify-between rounded-2xl border-[hsl(var(--border))] bg-white px-4 font-normal text-[hsl(var(--foreground))] hover:bg-white"
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
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-white/70 bg-white p-0 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
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
                          className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                    className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <span className="text-xs text-[hsl(var(--secondary-text))]">
                      {isLogin ? t('auth.login') : 'Min. 8'}
                    </span>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                      className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
                    />
                  </div>
                )}

                <div className="rounded-[22px] bg-[hsl(var(--muted-bg))] px-4 py-3 text-sm leading-6 text-[hsl(var(--secondary-text))]">
                  {isLogin ? t('marketplace.subtitle') : t('seller.activate_body')}
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[#0000FF] text-white hover:bg-[#0000CC]"
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
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default AuthPage;
