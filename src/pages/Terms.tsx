import LegalLayout from '@/components/layout/LegalLayout';

export default function Terms() {
  return (
    <LegalLayout title="Términos y Condiciones de Uso" lastUpdated="19 de febrero de 2026">
      <section>
        <h2 className="text-xl font-semibold">1. Identificación del titular</h2>
        <p>
          El presente sitio web y la aplicación <strong>Sharp Time Pro</strong> (en adelante, la
          «Plataforma») son propiedad de <strong>SmartFlow Labs</strong>, empresa individual
          (eenmanszaak) inscrita en la Cámara de Comercio de los Países Bajos con número KvK{' '}
          <strong>97425559</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Correo electrónico de contacto: claudia@smartflow-labs.com</li>
          <li>Sitio web: https://smartflow-labs.com</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Objeto y ámbito de aplicación</h2>
        <p>
          Estos Términos y Condiciones regulan el acceso y uso de la Plataforma, una herramienta de
          gestión de citas, agenda y administración para negocios de barbería y peluquería. Al
          acceder o utilizar la Plataforma, el usuario acepta íntegramente estos Términos. Si no
          está de acuerdo, debe abstenerse de utilizar la Plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Registro y cuentas de usuario</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            El acceso a la Plataforma requiere una cuenta proporcionada por el administrador del
            negocio (propietario).
          </li>
          <li>
            El usuario es responsable de mantener la confidencialidad de sus credenciales y de todas
            las actividades realizadas con su cuenta.
          </li>
          <li>
            El usuario debe notificar de inmediato cualquier uso no autorizado de su cuenta a
            claudia@smartflow-labs.com.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Uso permitido</h2>
        <p>El usuario se compromete a:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Utilizar la Plataforma únicamente con fines legítimos y relacionados con su actividad profesional.</li>
          <li>No introducir datos falsos, difamatorios o que infrinjan derechos de terceros.</li>
          <li>No intentar acceder a datos, cuentas o funcionalidades para las que no tenga autorización.</li>
          <li>No realizar ingeniería inversa, descompilar ni intentar extraer el código fuente de la Plataforma.</li>
          <li>No utilizar la Plataforma para enviar comunicaciones no solicitadas (spam).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Propiedad intelectual</h2>
        <p>
          Todos los contenidos de la Plataforma —incluidos textos, diseños, logotipos, iconos,
          código fuente y bases de datos— están protegidos por derechos de propiedad intelectual y
          son titularidad de SmartFlow Labs o de sus licenciantes. Queda prohibida su reproducción,
          distribución o transformación sin autorización expresa.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Protección de datos</h2>
        <p>
          El tratamiento de datos personales se rige por nuestra{' '}
          <a href="/privacidad" className="text-primary underline">
            Política de Privacidad
          </a>
          , que forma parte integrante de estos Términos. SmartFlow Labs cumple con el Reglamento
          General de Protección de Datos (RGPD) de la Unión Europea.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Disponibilidad del servicio</h2>
        <p>
          SmartFlow Labs se esfuerza por mantener la Plataforma disponible de forma ininterrumpida,
          pero no garantiza la ausencia de interrupciones, errores técnicos o fallos de seguridad.
          Se podrán realizar mantenimientos programados que serán comunicados con antelación
          razonable cuando sea posible.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Limitación de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley aplicable, SmartFlow Labs no será responsable de
          daños indirectos, incidentales, especiales o consecuentes derivados del uso o la
          imposibilidad de uso de la Plataforma, incluidos —sin limitación— pérdida de datos,
          pérdida de beneficios o interrupciones de negocio.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">9. Modificaciones</h2>
        <p>
          SmartFlow Labs se reserva el derecho de modificar estos Términos en cualquier momento. Los
          cambios serán comunicados a través de la Plataforma y/o por correo electrónico. El uso
          continuado de la Plataforma tras la notificación constituye la aceptación de los nuevos
          Términos.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">10. Resolución y suspensión</h2>
        <p>
          SmartFlow Labs podrá suspender o cancelar el acceso de un usuario que incumpla estos
          Términos, sin perjuicio de las acciones legales que pudieran corresponder.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">11. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por la legislación del Reino de los Países Bajos. Para cualquier
          controversia derivada de estos Términos, las partes se someten a la jurisdicción de los
          tribunales competentes de los Países Bajos, sin perjuicio de los derechos que asistan al
          consumidor conforme al Reglamento (UE) n.º 1215/2012.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">12. Contacto</h2>
        <p>
          Para cualquier consulta relacionada con estos Términos, puede contactarnos en:{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
