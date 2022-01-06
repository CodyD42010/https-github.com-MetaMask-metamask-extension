import React, { useState, useEffect, useCallback } from 'react';
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

import {
  COLORS,
  TYPOGRAPHY,
  FONT_WEIGHT,
  ALIGN_ITEMS,
  DISPLAY,
  TEXT_ALIGN,
} from '../../../../helpers/constants/design-system';

const STATUSES = {
  INSTALLING: 'installing',
  RUNNING: 'running',
  STOPPED: 'stopped',
  CRASHED: 'crashed',
};

const STATUS_COLORS = {
  [STATUSES.INSTALLING]: COLORS.ALERT1,
  [STATUSES.RUNNING]: COLORS.SUCCESS1,
  [STATUSES.STOPPED]: COLORS.UI4,
  [STATUSES.CRASHED]: COLORS.ERROR1,
};

const SnapSettingsCard = ({
  name,
  description,
  icon,
  dateAdded,
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
  const [chipStatus, setChipStatus] = useState(STATUSES.INSTALLING);

  // TODO: use state directly in place of memoization
  const handleStatus = useCallback(() => {
    switch (status) {
      case STATUSES.INSTALLING: {
        setChipStatus(STATUSES.INSTALLING);
        break;
      }
      case STATUSES.RUNNING: {
        setChipStatus(STATUSES.RUNNING);
        break;
      }
      case STATUSES.STOPPED: {
        setChipStatus(STATUSES.STOPPED);
        break;
      }
      case STATUSES.CRASHED: {
        setChipStatus(STATUSES.CRASHED);
        break;
      }
      default: {
        setChipStatus(STATUSES.INSTALLING);
      }
    }
  }, [status]);

  useEffect(() => {
    handleStatus(status);
  }, [handleStatus, status]);

  return (
    <Card
      className={classnames('snap-settings-card', className)}
      {...cardProps}
    >
      <Box
        display={DISPLAY.FLEX}
        alignItems={ALIGN_ITEMS.CENTER}
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
          color={COLORS.BLACK}
          variant={TYPOGRAPHY.H4}
          fontWeight={FONT_WEIGHT.BOLD}
          className="snap-settings-card__title"
        >
          {name}
        </Typography>
        <Box paddingLeft={4} className="snap-settings-card__toggle-container">
          <ToggleButton
            value={isEnabled}
            onToggle={onToggle}
            className="snap-settings-card__toggle-container__toggle-button"
            {...toggleButtonProps}
          />
        </Box>
      </Box>
      <Typography
        variant={TYPOGRAPHY.Paragraph}
        color={COLORS.UI4}
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
            alignItems={ALIGN_ITEMS.CENTER}
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
            <Chip
              leftIcon={
                <Box paddingLeft={1}>
                  <ColorIndicator
                    color={STATUS_COLORS[chipStatus]}
                    type={ColorIndicator.TYPES.FILLED}
                  />
                </Box>
              }
              label={chipStatus}
              labelProps={{
                color: COLORS.UI4,
                margin: [0, 1],
              }}
              backgroundColor={COLORS.UI1}
              className="snap-settings-card__chip"
              {...chipProps}
            />
          </Box>
        </Box>
        <Box display={DISPLAY.FLEX} alignItems={ALIGN_ITEMS.CENTER}>
          {(dateAdded || version) && (
            <>
              <Typography
                boxProps={{
                  margin: [0, 0],
                }}
                color={COLORS.UI3}
                variant={TYPOGRAPHY.H8}
                fontWeight={FONT_WEIGHT.NORMAL}
                tag="span"
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
                color={COLORS.UI4}
                variant={TYPOGRAPHY.H7}
                fontWeight={FONT_WEIGHT.NORMAL}
                align={TEXT_ALIGN.CENTER}
                tag="span"
                className="snap-settings-card__version"
              >
                v {version}
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
