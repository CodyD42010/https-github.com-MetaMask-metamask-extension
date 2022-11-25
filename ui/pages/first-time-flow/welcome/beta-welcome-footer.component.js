import React from 'react';
import { useI18nContext } from '../../../hooks/useI18nContext';

import Typography from '../../../components/ui/typography/typography';
import {
  TEXT_ALIGN,
  FONT_WEIGHT,
} from '../../../helpers/constants/design-system';

const BetaWelcomeFooter = () => {
  const t = useI18nContext();

  return (
    <>
      <div className="welcome-page__header">{t('betaWelcome')}</div>
      <div className="welcome-page__description">
        <Typography align={TEXT_ALIGN.CENTER} marginBottom={6}>
          {t('betaMetamaskDescription')}
        </Typography>
        <Typography
          align={TEXT_ALIGN.CENTER}
          marginBottom={6}
          fontWeight={FONT_WEIGHT.BOLD}
        >
          {t('betaMetamaskDescriptionDisclaimerHeading')}
        </Typography>
        <Typography align={TEXT_ALIGN.CENTER} marginBottom={6}>
          {t('betaMetamaskDescriptionExplanation', [
            <a href="https://metamask.io/terms.html" key="terms-link">
              {t('betaMetamaskDescriptionExplanationTermsLinkText')}
            </a>,
            <a href="https://metamask.io/beta-terms.html" key="beta-terms-link">
              {t('betaMetamaskDescriptionExplanationBetaTermsLinkText')}
            </a>,
          ])}
        </Typography>
        <Typography align={TEXT_ALIGN.CENTER}>
          {t('betaMetamaskDescriptionExplanation2', [
            <a href="https://metamask.io/terms.html" key="terms-link">
              {t('betaMetamaskDescriptionExplanationTermsLinkText')}
            </a>,
            <a href="https://metamask.io/beta-terms.html" key="beta-terms-link">
              {t('betaMetamaskDescriptionExplanation2BetaTermsLinkText')}
            </a>,
          ])}
        </Typography>
      </div>
    </>
  );
};

export default BetaWelcomeFooter;
