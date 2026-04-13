import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import PopularProductsSection from '@/components/PopularProductsSection.jsx';
import InfoBannersSection from '@/components/InfoBannersSection.jsx';
import CustomerReviewsSection from '@/components/CustomerReviewsSection.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    isAuthenticated,
    isSeller
  } = useAuth();
  const handleSellClick = e => {
    e.preventDefault();
    if (!isAuthenticated || !isSeller) {
      navigate('/seller-info');
    } else {
      navigate('/seller/new-product');
    }
  };
  return <>
      <Helmet>
        <title>{t('home.title')}</title>
        <meta name="description" content={t('home.description')} />
      </Helmet>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] md:min-h-[100vh] flex items-center justify-center overflow-hidden">
          {/* Background Image & Overlay */}
          <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{
          backgroundImage: 'url("https://horizons-cdn.hostinger.com/ee44c44d-e3d6-46f2-a1fd-aa631a0ae621/26ed7fd00031da8fdf628fedafde213f.jpg")'
        }}>
            <div className="absolute inset-0 bg-black opacity-40"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[896px] px-4 text-center mt-[64px] md:mt-[80px]">
            
            <motion.h1 initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: 0
          }} className="font-['Playfair_Display'] font-bold text-[36px] md:text-[48px] lg:text-[72px] text-white leading-tight mb-4 md:mb-6 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
              {t('home.hero_title')}
            </motion.h1>

            <motion.p initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: 0.2
          }} className="font-light text-[18px] md:text-[20px] lg:text-[24px] text-[#f3f4f6] max-w-[672px] mb-8 md:mb-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {t('home.hero_subtitle')}
            </motion.p>

            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: 0.4
          }} className="flex flex-col md:flex-row gap-3 md:gap-4 w-full md:w-auto">
              <Link to="/marketplace" className="flex items-center justify-center gap-2 bg-[hsl(var(--primary))] text-white h-[48px] md:h-[56px] px-6 md:px-10 text-[16px] md:text-[18px] font-medium rounded-[8px] shadow-button hover:bg-[rgba(0,0,255,0.9)] hover:-translate-y-[2px] transition-all duration-300">
                {t('home.explore_marketplace')}
                <ArrowRight size={20} />
              </Link>
              
              <button onClick={handleSellClick} className="flex items-center justify-center bg-[rgba(255,255,255,0.1)] text-white border border-[rgba(255,255,255,0.3)] backdrop-blur-[8px] h-[48px] md:h-[56px] px-6 md:px-10 text-[16px] md:text-[18px] font-medium rounded-[8px] hover:bg-[rgba(255,255,255,0.2)] hover:-translate-y-[2px] transition-all duration-300">
                {t('home.sell_now')}
              </button>
            </motion.div>

          </div>
        </section>

        <PopularProductsSection />
        <InfoBannersSection />
        <CustomerReviewsSection />
      </main>
    </>;
};
export default HomePage;
