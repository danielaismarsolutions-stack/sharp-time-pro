import LegalLayout from '@/components/layout/LegalLayout';
import { useTranslation } from '@/contexts/LanguageContext';

export default function Privacy() {
  const { t } = useTranslation();

  return (
    <LegalLayout title={t('legal.privacy.title')} lastUpdated={t('legal.privacy.lastUpdated')}>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s1Title')}</h2>
        <p>
          {t('legal.privacy.s1BodyPart1')} <strong>SmartFlow Labs</strong>
          {t('legal.privacy.s1BodyPart2')} <strong>97425559</strong>
          {t('legal.privacy.s1BodyPart3')}
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.privacy.s1Item1')}</li>
          <li>{t('legal.privacy.s1Item2')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s2Title')}</h2>
        <p>{t('legal.privacy.s2Intro')}</p>

        <h3 className="text-lg font-medium mt-4">{t('legal.privacy.s2Sub1Title')}</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.privacy.s2Sub1Item1')}</li>
          <li>{t('legal.privacy.s2Sub1Item2')}</li>
          <li>{t('legal.privacy.s2Sub1Item3')}</li>
          <li>{t('legal.privacy.s2Sub1Item4')}</li>
        </ul>

        <h3 className="text-lg font-medium mt-4">{t('legal.privacy.s2Sub2Title')}</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.privacy.s2Sub2Item1')}</li>
          <li>{t('legal.privacy.s2Sub2Item2')}</li>
          <li>{t('legal.privacy.s2Sub2Item3')}</li>
        </ul>

        <h3 className="text-lg font-medium mt-4">{t('legal.privacy.s2Sub3Title')}</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.privacy.s2Sub3Item1')}</li>
          <li>{t('legal.privacy.s2Sub3Item2')}</li>
        </ul>

        <h3 className="text-lg font-medium mt-4">{t('legal.privacy.s2Sub4Title')}</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.privacy.s2Sub4Item1')}</li>
          <li>{t('legal.privacy.s2Sub4Item2')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s3Title')}</h2>
        <p>{t('legal.privacy.s3Intro')}</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>{t('legal.privacy.s3Item1Label')}</strong> {t('legal.privacy.s3Item1Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s3Item2Label')}</strong> {t('legal.privacy.s3Item2Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s3Item3Label')}</strong> {t('legal.privacy.s3Item3Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s3Item4Label')}</strong> {t('legal.privacy.s3Item4Body')}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s4Title')}</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.privacy.s4Item1')}</li>
          <li>{t('legal.privacy.s4Item2')}</li>
          <li>{t('legal.privacy.s4Item3')}</li>
          <li>{t('legal.privacy.s4Item4')}</li>
          <li>{t('legal.privacy.s4Item5')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s5Title')}</h2>
        <p>{t('legal.privacy.s5Intro')}</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Supabase Inc.</strong> {t('legal.privacy.s5Item1Body')}
          </li>
          <li>
            <strong>Vercel Inc.</strong> {t('legal.privacy.s5Item2Body')}
          </li>
        </ul>
        <p className="mt-2">{t('legal.privacy.s5Note')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s6Title')}</h2>
        <p>{t('legal.privacy.s6Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s7Title')}</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>{t('legal.privacy.s7Item1Label')}</strong> {t('legal.privacy.s7Item1Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s7Item2Label')}</strong> {t('legal.privacy.s7Item2Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s7Item3Label')}</strong> {t('legal.privacy.s7Item3Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s7Item4Label')}</strong> {t('legal.privacy.s7Item4Body')}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s8Title')}</h2>
        <p>{t('legal.privacy.s8Intro')}</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>{t('legal.privacy.s8Item1Label')}</strong> {t('legal.privacy.s8Item1Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s8Item2Label')}</strong> {t('legal.privacy.s8Item2Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s8Item3Label')}</strong> {t('legal.privacy.s8Item3Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s8Item4Label')}</strong> {t('legal.privacy.s8Item4Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s8Item5Label')}</strong> {t('legal.privacy.s8Item5Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s8Item6Label')}</strong> {t('legal.privacy.s8Item6Body')}
          </li>
          <li>
            <strong>{t('legal.privacy.s8Item7Label')}</strong> {t('legal.privacy.s8Item7Body')}
          </li>
        </ul>
        <p className="mt-2">
          {t('legal.privacy.s8OutroPart1')}{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>{' '}
          {t('legal.privacy.s8OutroPart2')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s9Title')}</h2>
        <p>
          {t('legal.privacy.s9BodyPart1')} <strong>Autoriteit Persoonsgegevens</strong>{' '}
          {t('legal.privacy.s9BodyPart2')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s10Title')}</h2>
        <p>{t('legal.privacy.s10Intro')}</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.privacy.s10Item1')}</li>
          <li>{t('legal.privacy.s10Item2')}</li>
          <li>{t('legal.privacy.s10Item3')}</li>
          <li>{t('legal.privacy.s10Item4')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s11Title')}</h2>
        <p>
          {t('legal.privacy.s11BodyPart1')}{' '}
          <a href="/cookies" className="text-primary underline">
            {t('legal.privacy.s11Link')}
          </a>
          {t('legal.privacy.s11BodyPart2')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s12Title')}</h2>
        <p>{t('legal.privacy.s12Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.privacy.s13Title')}</h2>
        <p>
          {t('legal.privacy.s13Body')}{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
