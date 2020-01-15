import React, { Component } from 'react'
import { inherits } from 'util'
import { withRouter } from 'react-router-dom'
import { compose } from 'recompose'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import * as actions from '../../../store/actions'
import { DEFAULT_ROUTE } from '../../../helpers/constants/routes'
import { getMetaMaskAccounts } from '../../../selectors/selectors'
import Button from '../../../components/ui/button'

PrivateKeyImportView.contextTypes = {
  t: PropTypes.func,
  metricsEvent: PropTypes.func,
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(PrivateKeyImportView)

function mapStateToProps (state) {
  return {
    error: state.appState.warning,
    firstAddress: Object.keys(getMetaMaskAccounts(state))[0],
  }
}

function mapDispatchToProps (dispatch) {
  return {
    importNewAccount: (strategy, [privateKey]) => {
      return dispatch(actions.importNewAccount(strategy, [privateKey]))
    },
    displayWarning: message =>
      dispatch(actions.displayWarning(message || null)),
    setSelectedAddress: address =>
      dispatch(actions.setSelectedAddress(address)),
  }
}

inherits(PrivateKeyImportView, Component)
function PrivateKeyImportView () {
  this.createKeyringOnEnter = this.createKeyringOnEnter.bind(this)
  Component.call(this)
}

PrivateKeyImportView.prototype.render = function PrivateKeyImportView () {
  const { error, displayWarning } = this.props

  return (
    <div className="new-account-import-form__private-key">
      <span className="new-account-create-form__instruction">
        {this.context.t('pastePrivateKey')}
      </span>
      <div className="new-account-import-form__private-key-password-container">
        <input
          className="new-account-import-form__input-password"
          type="password"
          id="private-key-box"
          onKeyPress={e => this.createKeyringOnEnter(e)}
        />
      </div>
      <div className="new-account-import-form__buttons">
        <Button
          type="default"
          large
          className="new-account-create-form__button"
          onClick={() => {
            displayWarning(null)
            this.props.history.push(DEFAULT_ROUTE)
          }}
        >
          {this.context.t('cancel')}
        </Button>
        <Button
          type="secondary"
          large
          className="new-account-create-form__button"
          onClick={() => this.createNewKeychain()}
        >
          {this.context.t('import')}
        </Button>
      </div>
      {error ? <span className="error">{error}</span> : null}
    </div>
  )
}

PrivateKeyImportView.prototype.createKeyringOnEnter = function (event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    this.createNewKeychain()
  }
}

PrivateKeyImportView.prototype.createNewKeychain = function () {
  const input = document.getElementById('private-key-box')
  const privateKey = input.value
  const {
    importNewAccount,
    history,
    displayWarning,
    setSelectedAddress,
    firstAddress,
  } = this.props

  importNewAccount('Private Key', [privateKey])
    .then(({ selectedAddress }) => {
      if (selectedAddress) {
        this.context.metricsEvent({
          eventOpts: {
            category: 'Accounts',
            action: 'Import Account',
            name: 'Imported Account with Private Key',
          },
        })
        history.push(DEFAULT_ROUTE)
        displayWarning(null)
      } else {
        displayWarning('Error importing account.')
        this.context.metricsEvent({
          eventOpts: {
            category: 'Accounts',
            action: 'Import Account',
            name: 'Error importing with Private Key',
          },
        })
        setSelectedAddress(firstAddress)
      }
    })
    .catch(err => err && displayWarning(err.message || err))
}
