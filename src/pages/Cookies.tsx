import LegalLayout from '@/components/layout/LegalLayout';
import { useTranslation } from '@/contexts/LanguageContext';

export default function Cookies() {
  const { t } = useTranslation();

  return (
    <LegalLayout title={t('legal.cookies.title')} lastUpdated={t('legal.cookies.lastUpdated')}>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s1Title')}</h2>
        <p>{t('legal.cookies.s1Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s2Title')}</h2>
        <p>
          {t('legal.cookies.s2BodyPart1')} <strong>SmartFlow Labs</strong>
          {t('legal.cookies.s2BodyPart2')} <strong>97425559</strong>
          {t('legal.cookies.s2BodyPart3')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s3Title')}</h2>

        <h3 className="text-lg font-medium mt-4">{t('legal.cookies.s3Sub1Title')}</h3>
        <p>{t('legal.cookies.s3Sub1Body')}</p>
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm border border-border rounded-lg">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left border-b border-border">
                  {t('legal.cookies.tableCookieHeader')}
                </th>
                <th className="px-3 py-2 text-left border-b border-border">
                  {t('legal.cookies.tablePurposeHeader')}
                </th>
                <th className="px-3 py-2 text-left border-b border-border">
                  {t('legal.cookies.tableDurationHeader')}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border-b border-border font-mono">sb-*-auth-token</td>
                <td className="px-3 py-2 border-b border-border">
                  {t('legal.cookies.s3Sub1Row1Purpose')}
                </td>
                <td className="px-3 py-2 border-b border-border">
                  {t('legal.cookies.s3Sub1Row1Duration')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium mt-4">{t('legal.cookies.s3Sub2Title')}</h3>
        <p>{t('legal.cookies.s3Sub2Body')}</p>
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm border border-border rounded-lg">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left border-b border-border">
                  {t('legal.cookies.tableKeyHeader')}
                </th>
                <th className="px-3 py-2 text-left border-b border-border">
                  {t('legal.cookies.tablePurposeHeader')}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border-b border-border font-mono">sb-*-auth-token</td>
                <td className="px-3 py-2 border-b border-border">
                  {t('legal.cookies.s3Sub2Row1Purpose')}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 border-b border-border font-mono">theme</td>
                <td className="px-3 py-2 border-b border-border">
                  {t('legal.cookies.s3Sub2Row2Purpose')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s4Title')}</h2>
        <p>
          {t('legal.cookies.s4BodyPart1')} <strong>{t('legal.cookies.s4BodyStrong')}</strong>{' '}
          {t('legal.cookies.s4BodyPart2')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s5Title')}</h2>
        <p>
          {t('legal.cookies.s5Body1Part1')} <strong>{t('legal.cookies.s5Body1Strong1')}</strong>{' '}
          {t('legal.cookies.s5Body1Part2')} <strong>{t('legal.cookies.s5Body1Strong2')}</strong>
          {t('legal.cookies.s5Body1Part3')}
        </p>
        <p>
          {t('legal.cookies.s5Body2Part1')} <strong>{t('legal.cookies.s5Body2Strong')}</strong>{' '}
          {t('legal.cookies.s5Body2Part2')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s6Title')}</h2>
        <p>{t('legal.cookies.s6Body1')}</p>
        <p className="mt-2">{t('legal.cookies.s6Body2')}</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Chrome:</strong> {t('legal.cookies.s6Item1')}
          </li>
          <li>
            <strong>Firefox:</strong> {t('legal.cookies.s6Item2')}
          </li>
          <li>
            <strong>Safari:</strong> {t('legal.cookies.s6Item3')}
          </li>
          <li>
            <strong>Edge:</strong> {t('legal.cookies.s6Item4')}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s7Title')}</h2>
        <p>{t('legal.cookies.s7Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.cookies.s8Title')}</h2>
        <p>
          {t('legal.cookies.s8Body')}{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
