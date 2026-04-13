import React from 'react';
import { Zap, Leaf, Shield } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const InfoBannersSection = () => {
  const { t } = useTranslation();
  const banners = [
    {
      icon: Zap,
      title: t('info.simple_title'),
      description: t('info.simple_body')
    },
    {
      icon: Leaf,
      title: t('info.sustainable_title'),
      description: t('info.sustainable_body')
    },
    {
      icon: Shield,
      title: t('info.secure_title'),
      description: t('info.secure_body')
    }
  ];

  return (
    <section className="bg-[rgba(247,247,247,0.3)] py-16 md:py-24 px-4 md:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {banners.map((banner, index) => {
            const Icon = banner.icon;
            return (
              <div 
                key={index} 
                className="flex flex-col items-center text-center group"
              >
                <div className="w-[64px] h-[64px] lg:w-[80px] lg:h-[80px] bg-white rounded-full flex items-center justify-center shadow-card mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon 
                    className="w-[24px] h-[24px] lg:w-[32px] lg:h-[32px] text-[hsl(var(--primary))]" 
                    strokeWidth={1.5} 
                  />
                </div>
                <h3 className="font-['Playfair_Display'] font-semibold text-[20px] lg:text-[24px] text-[hsl(var(--foreground))] mb-2 md:mb-4">
                  {banner.title}
                </h3>
                <p className="text-[14px] lg:text-[16px] text-[hsl(var(--secondary))] leading-[1.6] max-w-[320px]">
                  {banner.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InfoBannersSection;
