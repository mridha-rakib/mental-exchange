import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { subscribeToNewsletter } from '@/lib/newsletterApi.js';
import Logo from './Logo.jsx';
const Footer = () => {
  const {
    currentUser
  } = useAuth();
  const {
    t,
    language,
    setLanguage
  } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const handleNewsletterSignup = async e => {
    e.preventDefault();
    const targetEmail = currentUser ? currentUser.email : email;
    if (!targetEmail) return;
    setLoading(true);
    try {
      await subscribeToNewsletter({
        email: targetEmail,
        fallbackMessage: t('footer.newsletter_error'),
      });
      toast.success(t('footer.newsletter_success'));
      setEmail('');
    } catch (error) {
      console.error('Newsletter error:', error);
      toast.error(t('footer.newsletter_error'));
    } finally {
      setLoading(false);
    }
  };
  return <footer className="bg-[#333333] text-[#ffffff] pt-[80px] pb-[40px] mt-auto">
      <div className="max-w-[1280px] mx-auto px-[16px] md:px-[24px] lg:px-[32px]">
        
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[48px] mb-[64px]">
          
          {/* Column 1: Branding */}
          <div className="flex flex-col">
            <div className="mb-[24px]">
              <Logo size="md" color="#ffffff" className="font-['Playfair_Display'] font-bold text-[30px] tracking-[-0.025em]" />
            </div>
            <p className="font-['Inter'] text-[14px] font-normal text-[#9ca3af] leading-[1.6] max-w-[288px] mb-[24px]">
              {t('brand.tagline')}
            </p>
            <div className="flex items-center gap-[16px] mt-[8px]">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">
                <Instagram size={20} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Rechtliches */}
          <div className="flex flex-col">
            <h3 className="font-['Playfair_Display'] font-semibold text-[18px] text-[#ffffff] mb-[24px]">
              {t('footer.legal')}
            </h3>
            <nav className="flex flex-col gap-[12px]">
              <Link to="/impressum" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.impressum')}</Link>
              <Link to="/datenschutz" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.privacy')}</Link>
              <Link to="/agb" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.terms')}</Link>
              <Link to="/widerrufsbelehrung" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.revocation')}</Link>
              <Link to="/widerrufsformular" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.revocation_form')}</Link>
            </nav>
          </div>

          {/* Column 3: Hilfe & Support */}
          <div className="flex flex-col">
            <h3 className="font-['Playfair_Display'] font-semibold text-[18px] text-[#ffffff] mb-[24px]">
              {t('footer.support')}
            </h3>
            <nav className="flex flex-col gap-[12px]">
              <Link to="/faq" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.faq')}</Link>
              <Link to="/contact" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.contact')}</Link>
              <Link to="/hilfe" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.shipping')}</Link>
              <Link to="/about" className="font-['Inter'] text-[14px] text-[#9ca3af] hover:text-[#0000FF] transition-all duration-150">{t('footer.about')}</Link>
            </nav>
          </div>

          {/* Column 4: Newsletter */}
          <div className="flex flex-col">
            <h3 className="font-['Playfair_Display'] font-semibold text-[18px] text-[#ffffff] mb-[24px]">
              {t('footer.newsletter')}
            </h3>
            <p className="font-['Inter'] text-[14px] text-[#9ca3af] mb-[16px]">
              {t('footer.newsletter_desc')}
            </p>
            <form onSubmit={handleNewsletterSignup} className="flex flex-col gap-[12px]">
              {!currentUser && <input type="email" placeholder={t('footer.email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} required aria-label={t('footer.email_label')} className="w-full bg-[#444444] border-none text-[#ffffff] placeholder:text-[#6b7280] rounded-[8px] px-[14px] py-[10px] font-['Inter'] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0000FF] transition-all duration-150 min-h-[44px]" />}
              <button type="submit" disabled={loading} className="w-full bg-[#0000FF] text-[#ffffff] font-['Inter'] font-medium text-[14px] rounded-[8px] px-[16px] py-[10px] hover:bg-[#0000CC] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
                {loading ? t('footer.subscribing') : currentUser ? t('footer.subscribe_current') : t('footer.subscribe')}
              </button>
            </form>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="border-t border-[#374151] pt-[32px] flex flex-col lg:flex-row justify-between items-center gap-[16px]">
          <p className="font-['Inter'] text-[14px] text-[#6b7280] text-center lg:text-left">
            © {new Date().getFullYear()} Zahnibörse. {t('footer.rights')}
          </p>
          
          <div className="flex items-center gap-2 text-[#9ca3af]">
            <Globe size={16} />
            <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-transparent border-none text-[14px] font-['Inter'] focus:outline-none cursor-pointer hover:text-white transition-colors" aria-label={t('footer.language')}>
              <option value="DE" className="text-black">{t('language.german')}</option>
              <option value="EN" className="text-black">{t('language.english')}</option>
            </select>
          </div>
        </div>

      </div>
    </footer>;
};
export default Footer;
