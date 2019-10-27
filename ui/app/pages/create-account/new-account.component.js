import React, { Component } from 'react'
import PropTypes from 'prop-types'
import h from 'react-hyperscript'
import { DEFAULT_ROUTE } from '../../helpers/constants/routes'
import Button from '../../components/ui/button'

export default class NewAccountCreateForm extends Component {
  constructor (props, context) {
    super(props)

    const { numberOfExistingAccounts = 0 } = props
    const newAccountNumber = numberOfExistingAccounts + 1

    this.state = {
      newAccountName: '',
      defaultAccountName: context.t('newAccountNumberName', [newAccountNumber]),
    }
  }

  render () {
    const { newAccountName, defaultAccountName } = this.state
    const { history, createAccount } = this.props

    return (
      <div className='new-account-create-form'>
        <div className='new-account-create-form__input-label'>
        {this.context.t('accountName')}
        </div>
        <div className='new-account-create-form__input-wrapper'>
          <input className='new-account-create-form__input'
            value={newAccountName}
            placeholder={defaultAccountName}
            onChange={event => this.setState({ newAccountName: event.target.value })}
          />
        </div>
        <div className='new-account-create-form__buttons'>
          <Button
            className='new-account-create-form__button'
          >{this.context.t('cancel')}</Button>
        </div>
      </div>
    )
    /* return h('div.new-account-create-form', [

      h('div.new-account-create-form__input-label', {}, [
        this.context.t('accountName'),
      ]),

      h('div.new-account-create-form__input-wrapper', {}, [
        h('input.new-account-create-form__input', {
          value: newAccountName,
          placeholder: defaultAccountName,
          onChange: event => this.setState({ newAccountName: event.target.value }),
        }, []),
      ]),

      h('div.new-account-create-form__buttons', {}, [

        h(Button, {
          type: 'default',
          large: true,
          className: 'new-account-create-form__button',
          onClick: () => history.push(DEFAULT_ROUTE),
        }, [this.context.t('cancel')]),

        h(Button, {
          type: 'secondary',
          large: true,
          className: 'new-account-create-form__button',
          onClick: () => {
            createAccount(newAccountName || defaultAccountName)
              .then(() => {
                this.context.metricsEvent({
                  eventOpts: {
                    category: 'Accounts',
                    action: 'Add New Account',
                    name: 'Added New Account',
                  },
                })
                history.push(DEFAULT_ROUTE)
              })
              .catch((e) => {
                this.context.metricsEvent({
                  eventOpts: {
                    category: 'Accounts',
                    action: 'Add New Account',
                    name: 'Error',
                  },
                  customVariables: {
                    errorMessage: e.message,
                  },
                })
              })
          },
        }, [this.context.t('create')]),

      ]),

    ]) */
  }
}

NewAccountCreateForm.propTypes = {
  hideModal: PropTypes.func,
  showImportPage: PropTypes.func,
  showConnectPage: PropTypes.func,
  createAccount: PropTypes.func,
  numberOfExistingAccounts: PropTypes.number,
  history: PropTypes.object,
  t: PropTypes.func,
}

NewAccountCreateForm.contextTypes = {
  t: PropTypes.func,
  metricsEvent: PropTypes.func,
}
