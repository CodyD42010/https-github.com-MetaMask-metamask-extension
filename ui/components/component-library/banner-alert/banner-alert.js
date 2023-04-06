import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { BannerBase, Icon, IconName, IconSize } from '..';

import {
  BackgroundColor,
  IconColor,
  SEVERITIES,
} from '../../../helpers/constants/design-system';
import { BANNER_ALERT_SEVERITIES } from './banner-alert.constants';

export const BannerAlert = ({
  children,
  className,
  severity = SEVERITIES.INFO,
  ...props
}) => {
  const severityIcon = () => {
    switch (severity) {
      case SEVERITIES.DANGER:
        return {
          name: IconName.Danger,
          color: IconColor.errorDefault,
        };
      case SEVERITIES.WARNING:
        return {
          name: IconName.Warning,
          color: IconColor.warningDefault,
        };
      case SEVERITIES.SUCCESS:
        return {
          name: IconName.Confirmation,
          color: IconColor.successDefault,
        };
      // Defaults to SEVERITIES.INFO
      default:
        return {
          name: IconName.Info,
          color: IconColor.primaryDefault,
        };
    }
  };

  const severityBackground = () => {
    switch (severity) {
      case SEVERITIES.DANGER:
        return BackgroundColor.errorMuted;
      case SEVERITIES.WARNING:
        return BackgroundColor.warningMuted;
      case SEVERITIES.SUCCESS:
        return BackgroundColor.successMuted;
      // Defaults to SEVERITIES.INFO
      default:
        return BackgroundColor.primaryMuted;
    }
  };

  return (
    <BannerBase
      startAccessory={<Icon size={IconSize.Lg} {...severityIcon()} />}
      backgroundColor={severityBackground()}
      paddingLeft={2}
      className={classnames(
        'mm-banner-alert',
        {
          [`mm-banner-alert--severity-${severity}`]: Object.values(
            BANNER_ALERT_SEVERITIES,
          ).includes(severity),
        },
        className,
      )}
      {...props}
    >
      {children}
    </BannerBase>
  );
};

BannerAlert.propTypes = {
  /**
   * An additional className to apply to the Banner
   */
  className: PropTypes.string,
  /**
   * Use the `severity` prop and the `SEVERITIES` object from `./ui/helpers/constants/design-system.js` to change the context of `Banner`.
   * Possible options: `SEVERITIES.INFO`(Default), `SEVERITIES.WARNING`, `SEVERITIES.DANGER`, `SEVERITIES.SUCCESS`
   */
  severity: PropTypes.oneOf(Object.values(BANNER_ALERT_SEVERITIES)),
  /**
   * BannerAlert accepts all the props from BannerBase
   */
  ...BannerBase.propTypes,
};
