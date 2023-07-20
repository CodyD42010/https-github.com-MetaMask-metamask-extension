import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { getMostRecentOverviewPage } from '../../../ducks/history/history';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  Box,
  Button,
  BUTTON_VARIANT,
  Text,
} from '../../../components/component-library';
import {
  TextColor,
  TypographyVariant,
  Display,
  FlexDirection,
  AlignItems,
  TextAlign,
} from '../../../helpers/constants/design-system';

export default function InstitutionalEntityDonePage(props) {
  const mostRecentOverviewPage = useSelector(getMostRecentOverviewPage);
  const t = useI18nContext();
  const { history, location } = props;
  const { state } = location;

  return (
    <Box className="page-container">
      <Box className="page-container__content">
        <Box
          paddingBottom={6}
          paddingLeft={6}
          paddingRight={6}
          className="institutional-entity-done__form"
        >
          <Box
            display={Display.Flex}
            flexDirection={FlexDirection.Column}
            alignItems={AlignItems.center}
          >
            {state.imgSrc && (
              <img
                className="institutional-entity-done__img"
                src={state.imgSrc}
                alt="Entity image"
              />
            )}
            <Text
              as="h4"
              marginTop={4}
              marginBottom={4}
              color={TextColor.textDefault}
            >
              {state.title}
            </Text>
            <Text
              as="p"
              color={TextColor.textAlternative}
              marginTop={2}
              marginBottom={5}
              variant={TypographyVariant.headingSm}
              textAlign={TextAlign.Center}
            >
              {state.description}
            </Text>
          </Box>
        </Box>
      </Box>
      <Box as="footer" className="page-container__footer" padding={4}>
        <Box display={Display.Flex} gap={4}>
          <Button
            block
            variant={BUTTON_VARIANT.PRIMARY}
            data-testid="click-most-recent-overview-page"
            onClick={() => history.push(mostRecentOverviewPage)}
          >
            {t('close')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

InstitutionalEntityDonePage.propTypes = {
  history: PropTypes.object,
  location: PropTypes.object,
};
