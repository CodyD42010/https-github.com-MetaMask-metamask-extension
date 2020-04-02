import React, { PureComponent, useContext } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import { I18nContext } from '../../../contexts/i18n'

const Popover = ({ title, subtitle, children, footer, footerClassName, onBack, onClose }) => {
  const t = useContext(I18nContext)
  return (
    <div className="popover-container">
      <div className="popover-bg" onClick={onClose} />
      <section className="popover-wrap">
        <header className="popover-header">
          <div className="popover-header__title">
            <h2 title={title}>
              {
                onBack
                  ? (
                    <button
                      className="fas fa-chevron-left popover-header__button"
                      title={t('back')}
                      onClick={onBack}
                    />
                  )
                  : null
              }
              {title}
            </h2>
            <button
              className="fas fa-times popover-header__button"
              title={t('close')}
              onClick={onClose}
            />
          </div>
          <p className="popover-header__subtitle">{subtitle}</p>
        </header>
        {
          children
            ? (
              <div className="popover-content">
                {children}
              </div>
            )
            : null
        }
        {
          footer
            ? (
              <footer className={classnames('popover-footer', footerClassName)}>
                {footer}
              </footer>
            )
            : null
        }
      </section>
    </div>
  )
}

Popover.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  footerClassName: PropTypes.string,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
}

export default class PopoverPortal extends PureComponent {
  static propTypes = Popover.propTypes

  rootNode = document.getElementById('popover-content')

  instanceNode = document.createElement('div')

  componentDidMount () {
    if (!this.rootNode) {
      return
    }

    this.rootNode.appendChild(this.instanceNode)
  }

  componentWillUnmount () {
    if (!this.rootNode) {
      return
    }

    this.rootNode.removeChild(this.instanceNode)
  }

  render () {
    const children = <Popover {...this.props} />
    return this.rootNode
      ? ReactDOM.createPortal(children, this.instanceNode)
      : children
  }
}
