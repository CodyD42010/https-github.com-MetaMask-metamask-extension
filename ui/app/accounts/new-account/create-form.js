const { Component } = require('react')
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const { connect } = require('react-redux')
const actions = require('../../actions')

class NewAccountCreateForm extends Component {
  constructor (props) {
    super(props)

    const { numberOfExistingAccounts = 0 } = props
    const newAccountNumber = numberOfExistingAccounts + 1

    this.state = {
      newAccountName: '',
      defaultAccountName: `Account ${newAccountNumber}`,
    }
  }

  render () {
    const { newAccountName, defaultAccountName } = this.state
    

    return h('div.new-account-create-form', [

      h('div.new-account-create-form__input-label', {}, [
        'Account Name',
      ]),

      h('div.new-account-create-form__input-wrapper', {}, [
        h('input.new-account-create-form__input', {
          value: newAccountName,
          placeholder: defaultAccountName,
          onChange: event => this.setState({ newAccountName: event.target.value }),
        }, []),
      ]),

      h('div.new-account-create-form__buttons', {}, [

        h('button.new-account-create-form__button-cancel', {
          onClick: () => this.props.goHome(),
        }, [
          'CANCEL',
        ]),

        h('button.new-account-create-form__button-create', {
          onClick: () => this.props.createAccount(newAccountName || defaultAccountName),
        }, [
          'CREATE',
        ]),

      ]),

    ])
  }
}

NewAccountCreateForm.propTypes = {
  hideModal: PropTypes.func,
  showImportPage: PropTypes.func,
  createAccount: PropTypes.func,
  goHome: PropTypes.func,
  numberOfExistingAccounts: PropTypes.number,
}

const mapStateToProps = state => {
  const { metamask: { network, selectedAddress, identities = {} } } = state
  const numberOfExistingAccounts = Object.keys(identities).length

  return {
    network,
    address: selectedAddress,
    numberOfExistingAccounts,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    toCoinbase: (address) => {
      dispatch(actions.buyEth({ network: '1', address, amount: 0 }))
    },
    hideModal: () => {
      dispatch(actions.hideModal())
    },
    createAccount: (newAccountName) => {
      dispatch(actions.addNewAccount())
        .then((newAccountAddress) => {
          if (newAccountName) {
            dispatch(actions.saveAccountLabel(newAccountAddress, newAccountName))
          }
          dispatch(actions.goHome())
        })
    },
    showImportPage: () => dispatch(actions.showImportPage()),
    goHome: () => dispatch(actions.goHome()),
  }
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(NewAccountCreateForm)
