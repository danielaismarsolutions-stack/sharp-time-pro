import { Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';

export default function LegalFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-muted/30 py-4">
      <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} {t('legal.footer.copyright')}</span>
        <nav className="flex items-center gap-4">
          <Link to="/terminos" className="hover:text-foreground transition-colors">
            {t('legal.footer.termsLink')}
          </Link>
          <Link to="/privacidad" className="hover:text-foreground transition-colors">
            {t('legal.footer.privacyLink')}
          </Link>
          <Link to="/cookies" className="hover:text-foreground transition-colors">
            {t('legal.footer.cookiesLink')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
