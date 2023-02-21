import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { useI18nContext } from '../../../../hooks/useI18nContext';

import Card from '../../../ui/card';
import Box from '../../../ui/box';
import IconWithFallback from '../../../ui/icon-with-fallback';
import IconBorder from '../../../ui/icon-border';
import Typography from '../../../ui/typography/typography';
import ToggleButton from '../../../ui/toggle-button';
import Chip from '../../../ui/chip';
import ColorIndicator from '../../../ui/color-indicator';
import Button from '../../../ui/button';
import Tooltip from '../../../ui/tooltip';

import {
  Color,
  TypographyVariant,
  FONT_WEIGHT,
  AlignItems,
  JustifyContent,
  DISPLAY,
  TEXT_ALIGN,
  TextColor,
  BackgroundColor,
} from '../../../../helpers/constants/design-system';

const STATUSES = {
  INSTALLING: 'installing',
  RUNNING: 'running',
  STOPPED: 'stopped',
  CRASHED: 'crashed',
};

const STATUS_COLORS = {
  [STATUSES.INSTALLING]: Color.warningDefault,
  [STATUSES.RUNNING]: Color.successDefault,
  [STATUSES.STOPPED]: Color.infoMuted,
  [STATUSES.CRASHED]: Color.errorDefault,
};

const SnapSettingsCard = ({
  name,
  description,
  icon,
  dateAdded = '',
  version,
  url,
  onToggle,
  isEnabled = false,
  onClick,
  status,
  className,
  cardProps,
  toggleButtonProps,
  buttonProps,
  chipProps,
}) => {
  const t = useI18nContext();

  return (
    <Card
      className={classnames('snap-settings-card', className)}
      {...cardProps}
    >
      <Box
        display={DISPLAY.FLEX}
        alignItems={AlignItems.center}
        marginBottom={4}
      >
        {(icon || name) && (
          <Box>
            <IconBorder size={32}>
              <IconWithFallback icon={icon} size={32} name={name} />
            </IconBorder>
          </Box>
        )}
        <Typography
          boxProps={{
            marginLeft: 4,
            marginTop: 0,
            marginBottom: 0,
          }}
          color={TextColor.textDefault}
          variant={TypographyVariant.H4}
          fontWeight={FONT_WEIGHT.BOLD}
          className="snap-settings-card__title"
        >
          {name}
        </Typography>
        <Box paddingLeft={4} className="snap-settings-card__toggle-container">
          <Tooltip interactive position="bottom" html={t('snapsToggle')}>
            <ToggleButton
              value={isEnabled}
              onToggle={onToggle}
              className="snap-settings-card__toggle-container__toggle-button"
              {...toggleButtonProps}
            />
          </Tooltip>
        </Box>
      </Box>
      <Typography
        variant={TypographyVariant.paragraph}
        color={TextColor.textAlternative}
        fontWeight={FONT_WEIGHT.NORMAL}
        className="snap-settings-card__body"
        boxProps={{
          marginBottom: 4,
          marginTop: 0,
          margin: [0, 0, 4],
        }}
      >
        {description}
      </Typography>
      <Box>
        <Box marginBottom={4}>
          <Box
            display={DISPLAY.FLEX}
            alignItems={AlignItems.center}
            justifyContent={JustifyContent.spaceBetween}
            marginBottom={4}
          >
            <Box>
              <Button
                className="snap-settings-card__button"
                onClick={onClick}
                {...buttonProps}
              >
                {t('flaskSnapSettingsCardButtonCta')}
              </Button>
            </Box>
            <Tooltip interactive position="bottom" html={t('snapsStatus')}>
              <Chip
                leftIcon={
                  <Box paddingLeft={1}>
                    <ColorIndicator
                      color={STATUS_COLORS[status]}
                      type={ColorIndicator.TYPES.FILLED}
                    />
                  </Box>
                }
                label={status}
                labelProps={{
                  color: Color.textAlternative,
                  margin: [0, 1],
                }}
                backgroundColor={BackgroundColor.backgroundAlternative}
                className="snap-settings-card__chip"
                {...chipProps}
              />
            </Tooltip>
          </Box>
        </Box>
        <Box display={DISPLAY.FLEX} alignItems={AlignItems.center}>
          {(dateAdded || version) && (
            <>
              <Typography
                boxProps={{
                  margin: [0, 0],
                }}
                color={TextColor.textMuted}
                variant={TypographyVariant.H8}
                fontWeight={FONT_WEIGHT.NORMAL}
                as="span"
                className="snap-settings-card__date-added"
              >
                {`${
                  dateAdded && t('flaskSnapSettingsCardDateAddedOn')
                } ${dateAdded} ${url && t('flaskSnapSettingsCardFrom')} ${url}`}
              </Typography>
              <Typography
                boxProps={{
                  paddingLeft: 2,
                  margin: [0, 0],
                }}
                color={TextColor.textMuted}
                variant={TypographyVariant.H7}
                fontWeight={FONT_WEIGHT.NORMAL}
                align={TEXT_ALIGN.CENTER}
                as="span"
                className="snap-settings-card__version"
              >
                {t('shorthandVersion', [version])}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Card>
  );
};

SnapSettingsCard.propTypes = {
  /**
   * Name of the snap used for the title of the card and fallback letter for the snap icon
   */
  name: PropTypes.string,
  /**
   * Description of the snap. Truncates after 4 lines
   */
  description: PropTypes.string,
  /**
   * Image source of the snap icon for the IconWithFallback component
   */
  icon: PropTypes.string,
  /**
   * Date the snap was added. Date will need formatting
   */
  dateAdded: PropTypes.string,
  /**
   * The version of the snap in semver. Will truncate after 4 numbers e.g. 10.5.1...
   */
  version: PropTypes.string,
  /**
   * Url of the snap website
   */
  url: PropTypes.string,
  /**
   * The onChange function for the ToggleButton component
   */
  onToggle: PropTypes.func,
  /**
   * Whether the snap is enabled. `value` prop of the ToggleButton
   */
  isEnabled: PropTypes.bool,
  /**
   * onClick function of the "See Details" Button
   */
  onClick: PropTypes.func,
  /**
   * Status of the snap must be one
   */
  status: PropTypes.oneOf(Object.values(STATUSES)).isRequired,
  /**
   * Additional className added to the root div of the SnapSettingsCard component
   */
  className: PropTypes.string,
  /**
   * Optional additional props passed to the Card component
   */
  cardProps: PropTypes.shape(Card.propTypes),
  /**
   * Optional additional props passed to the ToggleButton component
   */
  toggleButtonProps: PropTypes.shape(ToggleButton.propTypes),
  /**
   * Optional additional props passed to the Button component
   */
  buttonProps: PropTypes.shape(Button.propTypes),
  /**
   * Optional additional props passed to the Chip component
   */
  chipProps: PropTypes.shape(Chip.propTypes),
};

export default SnapSettingsCard;
