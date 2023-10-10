import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import InfoTooltip from '../info-tooltip';
import InfoTooltipIcon from '../info-tooltip/info-tooltip-icon';

const CLASSNAME_WARNING = 'actionable-message--warning';
const CLASSNAME_DANGER = 'actionable-message--danger';
const CLASSNAME_INFO = 'actionable-message--info';
const CLASSNAME_WITH_RIGHT_BUTTON = 'actionable-message--with-right-button';

const typeHash = {
  warning: CLASSNAME_WARNING,
  danger: CLASSNAME_DANGER,
  info: CLASSNAME_INFO,
  default: '',
};

export default function ActionableMessage({
  message = '',
  primaryAction = null,
  secondaryAction = null,
  className = '',
  infoTooltipText = '',
  withRightButton = false,
  type = 'default',
  useIcon = false,
  iconFillColor = '',
}) {
  const actionableMessageClassName = classnames(
    'actionable-message',
    typeHash[type],
    withRightButton ? CLASSNAME_WITH_RIGHT_BUTTON : null,
    className,
    { 'actionable-message--with-icon': useIcon },
  );

  return (
    <div className={actionableMessageClassName}>
      {useIcon ? <InfoTooltipIcon fillColor={iconFillColor} /> : null}
      {infoTooltipText && (
        <InfoTooltip
          position="left"
          contentText={infoTooltipText}
          wrapperClassName="actionable-message__info-tooltip-wrapper"
        />
      )}
      <div className="actionable-message__message">{message}</div>
      {(primaryAction || secondaryAction) && (
        <div className="actionable-message__actions">
          {primaryAction && (
            <button
              className={classnames(
                'actionable-message__action',
                'actionable-message__action--primary',
              )}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              className={classnames(
                'actionable-message__action',
                'actionable-message__action--secondary',
              )}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

ActionableMessage.propTypes = {
  /**
   * text inside actionable message
   */
  message: PropTypes.node.isRequired,
  /**
   * first button props that have label and onClick props
   */
  primaryAction: PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  }),
  /**
   * second button props that have label and onClick props
   */
  secondaryAction: PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  }),
  /**
   * add css classname for the component based on the parent css
   */
  className: PropTypes.string,
  /**
   * change color theme for the component that already predefined in css
   */
  type: PropTypes.string,
  /**
   * change text align to left and button to bottom right
   */
  withRightButton: PropTypes.bool,
  /**
   * Add tooltip and custom message
   */
  infoTooltipText: PropTypes.string,
  /**
   * Add tooltip icon in the left component without message
   */
  useIcon: PropTypes.bool,
  /**
   * change tooltip icon color
   */
  iconFillColor: PropTypes.string,
};
