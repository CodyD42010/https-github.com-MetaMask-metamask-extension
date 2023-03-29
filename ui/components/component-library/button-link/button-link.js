import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { ButtonBase } from '../button-base';
import {
  BackgroundColor,
  Color,
  Size,
} from '../../../helpers/constants/design-system';
import { BUTTON_LINK_SIZES } from './button-link.constants';

export const ButtonLink = ({
  className,
  danger,
  disabled,
  size = Size.auto,
  ...props
}) => {
  return (
    <ButtonBase
      className={classnames(className, 'mm-button-link', {
        'mm-button-link--type-danger': danger,
        'mm-button-link--disabled': disabled,
        'mm-button-link--size-inherit': size === BUTTON_LINK_SIZES.INHERIT,
        'mm-button-link--size-auto': size === BUTTON_LINK_SIZES.AUTO,
      })}
      paddingLeft={0}
      paddingRight={0}
      size={size === BUTTON_LINK_SIZES.INHERIT ? null : size}
      backgroundColor={BackgroundColor.transparent}
      color={danger ? Color.errorDefault : Color.primaryDefault}
      borderRadius={null}
      startIconProps={{
        size: size === BUTTON_LINK_SIZES.INHERIT ? Size.inherit : Size.SM,
      }}
      endIconProps={{
        size: size === BUTTON_LINK_SIZES.INHERIT ? Size.inherit : Size.SM,
      }}
      iconLoadingProps={{
        size: size === BUTTON_LINK_SIZES.INHERIT ? Size.inherit : Size.MD,
      }}
      {...{ disabled, ...props }}
    />
  );
};

ButtonLink.propTypes = {
  /**
   * An additional className to apply to the ButtonLink.
   */
  className: PropTypes.string,
  /**
   * Boolean to change button type to Danger when true
   */
  danger: PropTypes.bool,
  /**
   * Boolean to disable button
   */
  disabled: PropTypes.bool,
  /**
   * Possible size values: 'SIZES.AUTO'(auto), 'SIZES.SM'(32px), 'SIZES.MD'(40px), 'SIZES.LG'(48px), 'SIZES.INHERIT'(inherits parents font-size)
   * Default value is 'SIZES.AUTO'.
   */
  size: PropTypes.oneOf(Object.values(BUTTON_LINK_SIZES)),
  /**
   * ButtonLink accepts all the props from ButtonBase
   */
  ...ButtonBase.propTypes,
};
