import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const Logo = ({ size = 'md', color = '#0000FF', className = '' }) => {
  const { t } = useTranslation();
  const sizeMap = {
    sm: '24px',
    md: '30px',
    lg: '30px'
  };

  return (
    <Link 
      to="/" 
      className={`font-['Playfair_Display'] font-bold tracking-[-0.025em] inline-block ${className}`}
      style={{ fontSize: sizeMap[size], color }}
      aria-label={t('brand.home_aria')}
    >
      Zahnibörse
    </Link>
  );
};

export default Logo;
