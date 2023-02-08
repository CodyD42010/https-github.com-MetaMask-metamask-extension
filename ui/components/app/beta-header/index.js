import React from 'react';
import { useI18nContext } from '../../../hooks/useI18nContext';

import Box from '../../ui/box/box';
import Typography from '../../ui/typography/typography';
import {
  TypographyVariant,
  Color,
  BLOCK_SIZES,
  DISPLAY,
} from '../../../helpers/constants/design-system';
import { BETA_BUGS_URL } from '../../../helpers/constants/beta';

import { hideBetaHeader } from '../../../store/actions';

const BetaHeader = () => {
  const t = useI18nContext();

  return (
    <Box
      display={DISPLAY.FLEX}
      width={BLOCK_SIZES.FULL}
      backgroundColor={Color.warningDefault}
      padding={2}
      className="beta-header"
    >
      <Typography
        variant={TypographyVariant.H7}
        marginTop={0}
        marginBottom={0}
        className="beta-header__message"
        color={Color.warningInverse}
      >
        {t('betaHeaderText', [
          <a
            href={BETA_BUGS_URL}
            key="link"
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('here')}
          </a>,
        ])}
      </Typography>
      <button
        className="beta-header__button"
        data-testid="beta-header-close"
        onClick={() => {
          hideBetaHeader();
        }}
        aria-label={t('close')}
      >
        <i className="fa fa-times" />
      </button>
    </Box>
  );
};

export default BetaHeader;
