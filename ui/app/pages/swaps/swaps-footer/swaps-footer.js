import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import { I18nContext } from '../../../contexts/i18n'

import PageContainerFooter from '../../../components/ui/page-container/page-container-footer'

export default function SwapsFooter ({
  onCancel,
  hideCancel,
  onSubmit,
  submitTextKey,
  disabled,
  showTermsOfService,
  showTopBorder,
}) {
  const t = useContext(I18nContext)

  return (
    <div className="swaps-footer">
      <div
        className={classnames('swaps-footer__buttons', {
          'swaps-footer__buttons--border': showTopBorder,
        })}
      >
        <PageContainerFooter
          onCancel={onCancel}
          hideCancel={hideCancel}
          cancelText={t('back')}
          onSubmit={onSubmit}
          submitText={t(submitTextKey)}
          submitButtonType="confirm"
          footerClassName="swaps-footer__custom-page-container-footer-class"
          footerButtonClassName={classnames('swaps-footer__custom-page-container-footer-button-class', {
            'swaps-footer__custom-page-container-footer-button-class--single': hideCancel,
          })}
          disabled={disabled}
        />
      </div>
      {showTermsOfService && (
        <div
          className="swaps-footer__bottom-text"
          onClick={() => global.platform.openTab({ url: 'https://metamask.io/terms.html' })}
        >
          {t('termsOfService')}
        </div>
      )}
    </div>
  )
}

SwapsFooter.propTypes = {
  onCancel: PropTypes.func,
  hideCancel: PropTypes.bool,
  onSubmit: PropTypes.func,
  submitTextKey: PropTypes.string,
  disabled: PropTypes.bool,
  showTermsOfService: PropTypes.bool,
  showTopBorder: PropTypes.bool,
}
