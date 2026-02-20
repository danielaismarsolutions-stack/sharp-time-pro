import LegalLayout from '@/components/layout/LegalLayout';

export default function Cookies() {
  return (
    <LegalLayout title="Política de Cookies" lastUpdated="19 de febrero de 2026">
      <section>
        <h2 className="text-xl font-semibold">1. ¿Qué son las cookies?</h2>
        <p>
          Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo
          (ordenador, tablet o teléfono móvil) cuando los visita. Permiten que el sitio web
          recuerde sus acciones y preferencias durante un período de tiempo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Responsable</h2>
        <p>
          El responsable del uso de cookies en esta Plataforma es{' '}
          <strong>SmartFlow Labs</strong>, empresa individual (eenmanszaak), KvK{' '}
          <strong>97425559</strong>, Países Bajos.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Cookies que utilizamos</h2>

        <h3 className="text-lg font-medium mt-4">3.1. Cookies estrictamente necesarias</h3>
        <p>
          Estas cookies son esenciales para el funcionamiento de la Plataforma y no pueden ser
          desactivadas. Se utilizan para:
        </p>
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm border border-border rounded-lg">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left border-b border-border">Cookie</th>
                <th className="px-3 py-2 text-left border-b border-border">Finalidad</th>
                <th className="px-3 py-2 text-left border-b border-border">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border-b border-border font-mono">sb-*-auth-token</td>
                <td className="px-3 py-2 border-b border-border">
                  Autenticación del usuario (sesión de Supabase)
                </td>
                <td className="px-3 py-2 border-b border-border">Sesión / 30 días</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium mt-4">3.2. Almacenamiento local (localStorage)</h3>
        <p>
          Además de cookies, la Plataforma utiliza el almacenamiento local del navegador para:
        </p>
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm border border-border rounded-lg">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left border-b border-border">Clave</th>
                <th className="px-3 py-2 text-left border-b border-border">Finalidad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border-b border-border font-mono">sb-*-auth-token</td>
                <td className="px-3 py-2 border-b border-border">
                  Persistencia de la sesión de autenticación
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 border-b border-border font-mono">theme</td>
                <td className="px-3 py-2 border-b border-border">
                  Preferencia de tema (claro/oscuro)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Cookies de terceros</h2>
        <p>
          Actualmente, la Plataforma <strong>no utiliza</strong> cookies de análisis, publicidad ni
          redes sociales de terceros. Si en el futuro se incorporasen, esta política será
          actualizada y, en su caso, se solicitará su consentimiento previo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Base legal</h2>
        <p>
          Las cookies estrictamente necesarias se utilizan al amparo del <strong>interés
          legítimo</strong> y la <strong>ejecución contractual</strong>, ya que son imprescindibles
          para prestar el servicio (art. 6.1.b y 6.1.f RGPD, en relación con el art. 5.3 de la
          Directiva 2002/58/CE de ePrivacy).
        </p>
        <p>
          Para cualquier cookie no esencial que se incorpore en el futuro, se solicitará su{' '}
          <strong>consentimiento previo</strong> (art. 6.1.a RGPD).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Cómo gestionar las cookies</h2>
        <p>
          Puede configurar su navegador para bloquear o eliminar cookies. Tenga en cuenta que, si
          bloquea las cookies esenciales, es posible que la Plataforma no funcione correctamente.
        </p>
        <p className="mt-2">
          Instrucciones para los navegadores más comunes:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies y otros datos de sitios
          </li>
          <li>
            <strong>Firefox:</strong> Ajustes &gt; Privacidad y seguridad &gt; Cookies y datos del sitio
          </li>
          <li>
            <strong>Safari:</strong> Preferencias &gt; Privacidad &gt; Cookies y datos de sitios web
          </li>
          <li>
            <strong>Edge:</strong> Configuración &gt; Cookies y permisos del sitio &gt; Cookies y datos del sitio
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Modificaciones</h2>
        <p>
          Esta Política de Cookies podrá ser actualizada para reflejar cambios en las cookies
          utilizadas o en la normativa aplicable. Le recomendamos revisarla periódicamente.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Contacto</h2>
        <p>
          Si tiene alguna pregunta sobre el uso de cookies, puede contactarnos en:{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
