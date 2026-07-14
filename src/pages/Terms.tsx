import LegalLayout from '@/components/layout/LegalLayout';
import { useTranslation } from '@/contexts/LanguageContext';

export default function Terms() {
  const { t } = useTranslation();

  return (
    <LegalLayout title={t('legal.terms.title')} lastUpdated={t('legal.terms.lastUpdated')}>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s1Title')}</h2>
        <p>
          {t('legal.terms.s1BodyPart1')} <strong>Nexio</strong> {t('legal.terms.s1BodyPart2')}{' '}
          <strong>SmartFlow Labs</strong>
          {t('legal.terms.s1BodyPart3')} <strong>97425559</strong>
          {t('legal.terms.s1BodyPart4')}
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.terms.s1Item1')}</li>
          <li>{t('legal.terms.s1Item2')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s2Title')}</h2>
        <p>{t('legal.terms.s2Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s3Title')}</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.terms.s3Item1')}</li>
          <li>{t('legal.terms.s3Item2')}</li>
          <li>{t('legal.terms.s3Item3')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s4Title')}</h2>
        <p>{t('legal.terms.s4Intro')}</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>{t('legal.terms.s4Item1')}</li>
          <li>{t('legal.terms.s4Item2')}</li>
          <li>{t('legal.terms.s4Item3')}</li>
          <li>{t('legal.terms.s4Item4')}</li>
          <li>{t('legal.terms.s4Item5')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s5Title')}</h2>
        <p>{t('legal.terms.s5Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s6Title')}</h2>
        <p>
          {t('legal.terms.s6BodyPart1')}{' '}
          <a href="/privacidad" className="text-primary underline">
            {t('legal.terms.s6Link')}
          </a>
          {t('legal.terms.s6BodyPart2')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s7Title')}</h2>
        <p>{t('legal.terms.s7Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s8Title')}</h2>
        <p>{t('legal.terms.s8Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s9Title')}</h2>
        <p>{t('legal.terms.s9Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s10Title')}</h2>
        <p>{t('legal.terms.s10Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s11Title')}</h2>
        <p>{t('legal.terms.s11Body')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.terms.s12Title')}</h2>
        <p>
          {t('legal.terms.s12Body')}{' '}
          <a href="mailto:claudia@smartflow-labs.com" className="text-primary underline">
            claudia@smartflow-labs.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
