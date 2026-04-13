import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const UNIVERSITIES = [
  "Friedrich-Alexander-Universität Erlangen-Nürnberg",
  "Universität Bonn",
  "Universität Düsseldorf",
  "Universität Frankfurt",
  "Universität Freiburg",
  "Universität Greifswald",
  "Universität Halle-Wittenberg",
  "Universität Hamburg",
  "Universität Heidelberg",
  "Universität Jena",
  "Universität Kiel",
  "Universität Köln",
  "Universität Leipzig",
  "Universität Mainz",
  "Universität Marburg",
  "Universität München",
  "Universität Münster",
  "Universität Rostock",
  "Universität Tübingen",
  "Universität Ulm",
  "Universität Würzburg",
  "Charité Berlin",
  "Andere"
];

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
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
    customUniversity: ''
  });

  const [openUni, setOpenUni] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success(t('auth.login_success'));
      } else {
        if (formData.password !== formData.passwordConfirm) {
          throw new Error(t('auth.password_mismatch'));
        }
        
        const finalUniversity = formData.university === 'Andere' 
          ? formData.customUniversity 
          : formData.university;

        if (!isLogin && !finalUniversity) {
          throw new Error(t('auth.select_university_error'));
        }

        await signup({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          name: formData.name,
          university: finalUniversity,
          user_id: crypto.randomUUID(),
        });
        toast.success(t('auth.signup_success'));
      }
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message || t('auth.generic_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[hsl(var(--muted-bg))] px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-[var(--radius-lg)] shadow-card p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
          {isLogin ? t('auth.welcome_back') : t('auth.create_account')}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.full_name')}</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              
              <div className="space-y-2 flex flex-col">
                <Label>{t('auth.university')}</Label>
                <Popover open={openUni} onOpenChange={setOpenUni}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openUni}
                      className="w-full justify-between font-normal bg-white border-[hsl(var(--border))]"
                    >
                      {formData.university
                        ? (formData.university === 'Andere' ? t('auth.other_university') : formData.university)
                        : t('auth.search_university')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white">
                    <Command>
                      <CommandInput placeholder={t('auth.search_university')} />
                      <CommandList>
                        <CommandEmpty>{t('auth.no_university')}</CommandEmpty>
                        <CommandGroup>
                          {UNIVERSITIES.map((uni) => (
                            <CommandItem
                              key={uni}
                              value={uni}
                              onSelect={(currentValue) => {
                                setFormData({ ...formData, university: currentValue });
                                setOpenUni(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.university === uni ? "opacity-100" : "opacity-0"
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
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="customUniversity">{t('auth.custom_university')}</Label>
                  <Input 
                    id="customUniversity" 
                    name="customUniversity" 
                    placeholder={t('auth.custom_university_placeholder')}
                    value={formData.customUniversity} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              )}
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={8} />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">{t('auth.confirm_password')}</Label>
              <Input id="passwordConfirm" name="passwordConfirm" type="password" value={formData.passwordConfirm} onChange={handleChange} required minLength={8} />
            </div>
          )}

          <Button type="submit" className="w-full bg-[#0000FF] hover:bg-[#0000CC] text-white mt-2" disabled={loading}>
            {loading ? t('auth.wait') : (isLogin ? t('auth.login') : t('auth.register'))}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[hsl(var(--secondary-text))]">
          {isLogin ? `${t('auth.no_account')} ` : `${t('auth.has_account')} `}
          <button onClick={() => setIsLogin(!isLogin)} className="text-[#0000FF] font-medium hover:underline">
            {isLogin ? t('auth.register_now') : t('auth.login_here')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
