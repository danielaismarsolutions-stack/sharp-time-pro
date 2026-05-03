import LegalLayout from '@/components/layout/LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated="19 de febrero de 2026">
      <section>
        <h2 className="text-xl font-semibold">1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de sus datos personales es{' '}
          <strong>SmartFlow Labs</strong>, empresa individual (eenmanszaak) inscrita en la Cámara de
          Comercio de los Países Bajos con número KvK <strong>97425559</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Correo electrónico: claudia@smartflow-labs.com</li>
          <li>Sitio web: https://smartflow-labs.com</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Datos que recopilamos</h2>
        <p>En función de su interacción con la Plataforma, podemos recopilar:</p>

        <h3 className="text-lg font-medium mt-4">2.1. Datos de usuarios del sistema (personal del negocio y administradores)</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nombre completo, dirección de correo electrónico, número de teléfono.</li>
          <li>Fotografía de perfil (avatar) si se proporciona voluntariamente.</li>
          <li>Horarios de trabajo y períodos de descanso configurados.</li>
          <li>Credenciales de acceso (la contraseña se almacena de forma cifrada).</li>
        </ul>

        <h3 className="text-lg font-medium mt-4">2.2. Datos de clientes del negocio</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nombre, teléfono, correo electrónico.</li>
          <li>Historial de citas y servicios contratados.</li>
          <li>Notas internas del negocio sobre el cliente.</li>
        </ul>

        <h3 className="text-lg font-medium mt-4">2.3. Datos de consultas (leads)</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nombre, teléfono, correo electrónico, servicio de interés.</li>
          <li>Mensaje o notas de la consulta.</li>
        </ul>

        <h3 className="text-lg font-medium mt-4">2.4. Datos técnicos</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Dirección IP, tipo y versión del navegador, sistema operativo.</li>
          <li>Datos de suscripción a notificaciones push (endpoint, claves).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Base legal del tratamiento</h2>
        <p>
          Conforme al artículo 6 del Reglamento General de Protección de Datos (RGPD), tratamos sus
          datos con base en:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Ejecución contractual</strong> (art. 6.1.b RGPD): el tratamiento es necesario
            para prestar el servicio contratado (gestión de citas, agenda, clientes).
          </li>
          <li>
            <strong>Interés legítimo</strong> (art. 6.1.f RGPD): mejora del servicio, prevención
            del fraude y seguridad de la Plataforma.
          </li>
          <li>
            <strong>Consentimiento</strong> (art. 6.1.a RGPD): para el envío de notificaciones push
            y el uso de cookies no esenciales.
          </li>
          <li>
            <strong>Obligación legal</strong> (art. 6.1.c RGPD): cumplimiento de obligaciones
            fiscales y legales aplicables.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Finalidades del tratamiento</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Gestión de citas, reservas y agenda del negocio.</li>
          <li>Administración de la relación comercial con los clientes del negocio.</li>
          <li>Envío de notificaciones y recordatorios relacionados con citas.</li>
          <li>Generación de informes y estadísticas internas del negocio.</li>
          <li>Mantenimiento de la seguridad y funcionamiento de la Plataforma.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Destinatarios de los datos</h2>
        <p>Sus datos podrán ser comunicados a los siguientes encargados del tratamiento:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Supabase Inc.</strong> — Alojamiento de base de datos y autenticación (servidores
            en la Unión Europea).
          </li>
          <li>
            <strong>Vercel Inc.</strong> — Alojamiento de la aplicación web.
          </li>
        </ul>
        <p className="mt-2">
          No vendemos, alquilamos ni compartimos sus datos personales con terceros para fines
          comerciales propios.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Transferencias internacionales</h2>
        <p>
          Algunos proveedores de servicios pueden estar ubicados fuera del Espacio Económico Europeo
          (EEE). En tales casos, las transferencias se realizan al amparo de cláusulas contractuales
          tipo aprobadas por la Comisión Europea (art. 46.2.c RGPD) o sobre la base de decisiones
          de adecuación (art. 45 RGPD).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Plazo de conservación</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Datos de usuarios activos:</strong> mientras la cuenta permanezca activa.
          </li>
          <li>
            <strong>Datos de clientes del negocio:</strong> mientras sean necesarios para la relación
            comercial y, posteriormente, durante los plazos legales de conservación.
          </li>
          <li>
            <strong>Datos fiscales:</strong> 7 años conforme a la legislación neerlandesa.
          </li>
          <li>
            <strong>Datos de notificaciones push:</strong> hasta la cancelación de la suscripción.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Derechos del interesado</h2>
        <p>
          Conforme al RGPD, usted tiene derecho a:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Acceso:</strong> conocer qué datos personales tratamos sobre usted.</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
          <li><strong>Supresión:</strong> solicitar la eliminación de sus datos («derecho al olvido»).</li>
          <li><strong>Limitación:</strong> restringir el tratamiento en determinadas circunstancias.</li>
          <li><strong>Portabilidad:</strong> recibir sus datos en un formato estructurado y legible por máquina.</li>
          <li><strong>Oposición:</strong> oponerse al tratamiento basado en interés legítimo.</li>
          <li>
            <strong>Revocación del consentimiento:</strong> retirar su consentimiento en cualquier
            momento sin que ello afecte a la licitud del tratamiento previo.
          </li>
        </ul>
        <p className="mt-2">
          Para ejercer sus derechos, envíe un correo a{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>{' '}
          indicando su solicitud y adjuntando un documento identificativo. Responderemos en un plazo
          máximo de 30 días.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">9. Derecho a presentar reclamación</h2>
        <p>
          Si considera que el tratamiento de sus datos vulnera la normativa de protección de datos,
          tiene derecho a presentar una reclamación ante la{' '}
          <strong>Autoriteit Persoonsgegevens</strong> (Autoridad Neerlandesa de Protección de Datos)
          o ante la autoridad de control del Estado miembro donde resida habitualmente.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">10. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos personales,
          incluyendo:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Cifrado de datos en tránsito (HTTPS/TLS) y en reposo.</li>
          <li>Contraseñas almacenadas con hash seguro (bcrypt).</li>
          <li>Control de acceso basado en roles (RBAC) y políticas de seguridad a nivel de fila (RLS).</li>
          <li>Tokens JWT con expiración para autenticación.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">11. Cookies</h2>
        <p>
          Para información detallada sobre las cookies que utilizamos, consulte nuestra{' '}
          <a href="/cookies" className="text-primary underline">
            Política de Cookies
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">12. Modificaciones</h2>
        <p>
          Nos reservamos el derecho de actualizar esta Política de Privacidad. Cualquier cambio será
          publicado en esta página con la fecha de última actualización. Le recomendamos revisarla
          periódicamente.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">13. Contacto</h2>
        <p>
          Para cualquier consulta sobre protección de datos, puede contactarnos en:{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
