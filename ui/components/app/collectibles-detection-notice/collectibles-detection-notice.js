import React from 'react';
import { useHistory } from 'react-router-dom';
import Box from '../../ui/box';
import Dialog from '../../ui/dialog';
import Typography from '../../ui/typography/typography';
import {
  TypographyVariant,
  TEXT_ALIGN,
  FONT_WEIGHT,
  DISPLAY,
  TextColor,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import Button from '../../ui/button';
import { EXPERIMENTAL_ROUTE } from '../../../helpers/constants/routes';

export default function CollectiblesDetectionNotice() {
  const t = useI18nContext();
  const history = useHistory();

  return (
    <Box className="collectibles-detection-notice">
      <Dialog type="message" className="collectibles-detection-notice__message">
        <Box display={DISPLAY.FLEX}>
          <Box paddingTop={1}>
            <i
              style={{
                fontSize: '1rem',
                color: 'var(--color-primary-default)',
              }}
              className="fa fa-info-circle"
            />
          </Box>
          <Box paddingLeft={2}>
            <Typography
              color={TextColor.textDefault}
              align={TEXT_ALIGN.LEFT}
              variant={TypographyVariant.H7}
              fontWeight={FONT_WEIGHT.BOLD}
            >
              {t('newNFTsDetected')}
            </Typography>
            <Typography
              color={TextColor.textDefault}
              align={TEXT_ALIGN.LEFT}
              variant={TypographyVariant.H7}
              boxProps={{ marginBottom: 4 }}
            >
              {t('newNFTDetectedMessage')}
            </Typography>
            <Button
              type="link"
              onClick={(e) => {
                e.preventDefault();
                history.push(`${EXPERIMENTAL_ROUTE}#autodetect-nfts`);
              }}
              className="collectibles-detection-notice__message__link"
            >
              {t('selectNFTPrivacyPreference')}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
