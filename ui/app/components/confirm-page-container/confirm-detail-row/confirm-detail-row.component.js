import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import UserPreferencedCurrencyDisplay from '../../user-preferenced-currency-display'
import { PRIMARY, SECONDARY } from '../../../constants/common'

const ConfirmDetailRow = props => {
  const {
    label,
    primaryText,
    secondaryText,
    onHeaderClick,
    primaryValueTextColor,
    headerText,
    headerTextClassName,
    value,
  } = props

  return (
    <div className="confirm-detail-row">
      <div className="confirm-detail-row__label">
        { label }
      </div>
      <div className="confirm-detail-row__details">
        <div
          className={classnames('confirm-detail-row__header-text', headerTextClassName)}
          onClick={() => onHeaderClick && onHeaderClick()}
        >
          { headerText }
        </div>
        {
          primaryText
            ? (
              <div
                className="confirm-detail-row__primary"
                style={{ color: primaryValueTextColor }}
              >
                { primaryText }
              </div>
            ) : (
              <UserPreferencedCurrencyDisplay
                className="confirm-detail-row__primary"
                type={PRIMARY}
                value={value}
                ethPrefix={'\u2666 '}
                style={{ color: primaryValueTextColor }}
                hideLabel
              />
            )
        }
        {
          secondaryText
            ? (
              <div className="confirm-detail-row__secondary">
                { secondaryText }
              </div>
            ) : (
              <UserPreferencedCurrencyDisplay
                className="confirm-detail-row__secondary"
                type={SECONDARY}
                value={value}
                ethPrefix={'\u2666 '}
                hideLabel
              />
            )
        }
      </div>
    </div>
  )
}

ConfirmDetailRow.propTypes = {
  headerText: PropTypes.string,
  headerTextClassName: PropTypes.string,
  label: PropTypes.string,
  onHeaderClick: PropTypes.func,
  primaryValueTextColor: PropTypes.string,
  primaryText: PropTypes.string,
  secondaryText: PropTypes.string,
  value: PropTypes.string,
}

export default ConfirmDetailRow
