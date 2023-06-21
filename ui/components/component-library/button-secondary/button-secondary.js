import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { ButtonBase } from '../button-base';
import { Color } from '../../../helpers/constants/design-system';
import { BUTTON_SECONDARY_SIZES } from './button-secondary.constants';

export const ButtonSecondary = ({
  className,
  danger,
  disabled,
  size = BUTTON_SECONDARY_SIZES.MD,
  ...props
}) => {
  const buttonColor = danger ? Color.errorDefault : Color.primaryDefault;
  return (
    <ButtonBase
      backgroundColor={Color.transparent}
      borderColor={buttonColor}
      color={buttonColor}
      className={classnames(className, 'mm-button-secondary', {
        'mm-button-secondary--type-danger': danger,
        'mm-button-secondary--disabled': disabled,
      })}
      size={size}
      {...{ disabled, ...props }}
    />
  );
};

ButtonSecondary.propTypes = {
  /**
   * An additional className to apply to the ButtonSecondary.
   */
  className: PropTypes.string,
  /**
   * When true, ButtonSecondary color becomes Danger.
   */
  danger: PropTypes.bool,
  /**
   * Boolean to disable button
   */
  disabled: PropTypes.bool,
  /**
   * Possible size values: 'SIZES.SM'(32px), 'SIZES.MD'(40px), 'SIZES.LG'(48px).
   * Default value is 'SIZES.MD'.
   */
  size: PropTypes.oneOf(Object.values(BUTTON_SECONDARY_SIZES)),
  /**
   * ButtonSecondary accepts all the props from ButtonBase
   */
  ...ButtonBase.propTypes,
};
