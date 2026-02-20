import { Link } from 'react-router-dom';

export default function LegalFooter() {
  return (
    <footer className="border-t bg-muted/30 py-4">
      <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} SmartFlow Labs. Todos los derechos reservados.</span>
        <nav className="flex items-center gap-4">
          <Link to="/terminos" className="hover:text-foreground transition-colors">
            Términos de servicio
          </Link>
          <Link to="/privacidad" className="hover:text-foreground transition-colors">
            Política de privacidad
          </Link>
          <Link to="/cookies" className="hover:text-foreground transition-colors">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
