const { inherits } = require('util')
const PersistentForm = require('../lib/persistent-form')
const h = require('react-hyperscript')
const connect = require('react-redux').connect
const Identicon = require('./components/identicon')
const EnsInput = require('./components/ens-input')
const GasTooltip = require('./components/send/gas-tooltip')
const CurrencyToggle = require('./components/send/currency-toggle')
const GasFeeDisplay = require('./components/send/gas-fee-display')
const { getSelectedIdentity } = require('./selectors')

const {
  showAccountsPage,
  backToAccountDetail,
  displayWarning,
  hideWarning,
  addToAddressBook,
  signTx,
} = require('./actions')
const { stripHexPrefix, addHexPrefix } = require('ethereumjs-util')
const { isHex, numericBalance } = require('./util')
const { conversionUtil } = require('./conversion-util')
const BigNumber = require('bignumber.js')

const ARAGON = '960b236A07cf122663c4303350609A66A7B288C0'

module.exports = connect(mapStateToProps)(SendTransactionScreen)

function mapStateToProps (state) {
  const {
    selectedAddress: address,
    accounts,
    identities,
    network,
    addressBook,
    conversionRate,
    currentBlockGasLimit: blockGasLimit,
  } = state.metamask
  const { warning } = state.appState
  const selectedIdentity = getSelectedIdentity(state)
  const account = accounts[address]

  return {
    address,
    accounts,
    identities,
    network,
    addressBook,
    conversionRate,
    blockGasLimit,
    warning,
    selectedIdentity,
    error: warning && warning.split('.')[0],
    account,
    identity: identities[address],
    balance: account ? numericBalance(account.balance) : null,
  }
}

inherits(SendTransactionScreen, PersistentForm)
function SendTransactionScreen () {
  PersistentForm.call(this)

  // [WIP] These are the bare minimum of tx props needed to sign a transaction
  // We will need a few more for contract-related interactions
  this.state = {
    newTx: {
      from: '',
      to: '',
      // these values are hardcoded, so "Next" can be clicked
      amount: '0x0', // see L544
      gasPrice: '0x5d21dba00',
      gas: '0x7b0d',
      txData: null,
      memo: '',
    },
    activeCurrency: 'USD', 
    tooltipIsOpen: false,
  }

  this.back = this.back.bind(this)
  this.closeTooltip = this.closeTooltip.bind(this)
  this.onSubmit = this.onSubmit.bind(this)
  this.recipientDidChange = this.recipientDidChange.bind(this)
  this.setActiveCurrency = this.setActiveCurrency.bind(this)
  this.toggleTooltip = this.toggleTooltip.bind(this)
}

SendTransactionScreen.prototype.render = function () {
  this.persistentFormParentId = 'send-tx-form'

  const props = this.props
  const {
<<<<<<< HEAD
    // selectedIdentity,
    // network,
    // identities,
    // addressBook,
=======
    selectedIdentity,
    identities,
>>>>>>> ea2e98c7... Lint fix.
    conversionRate,
  } = props

  const { blockGasLimit, newTx, activeCurrency } = this.state
  const { gas, gasPrice } = newTx
  // console.log(`activeCurrency`, activeCurrency)
  // console.log({ selectedIdentity, identities })
  // console.log('SendTransactionScreen state:', this.state)

  return (

    h('div.send-screen-wrapper', [
      // Main Send token Card
      h('div.send-screen-card', [

        h('img.send-eth-icon', { src: '../images/eth_logo.svg' }),

        h('div.send-screen__title', 'Send'),

        h('div.send-screen__subtitle', 'Send Ethereum to anyone with an Ethereum account'),

        h('div.send-screen-input-wrapper', [

          h('div', 'From:'),

          h('input.large-input.send-screen-input', {
            list: 'accounts',
            placeholder: 'Account',
            value: this.state.newTx.from,
            onChange: (event) => {
              console.log('event', event.target.value)
              this.setState({
                newTx: {
                  ...this.state.newTx,
                  from: event.target.value,
                },
              })
            },
          }),

          h('datalist#accounts', [
            Object.keys(props.identities).map((key) => {
              const identity = props.identities[key]
              return h('option', {
                value: identity.address,
                label: identity.name,
                key: identity.address,
              })
            }),
          ]),

        ]),

        h('div.send-screen-input-wrapper', [

          h('div', 'To:'),

          h('input.large-input.send-screen-input', {
            name: 'address',
            list: 'addresses',
            placeholder: 'Address',
            value: this.state.newTx.to,
            onChange: (event) => {
              console.log('event', event.target.value)
              this.setState({
                newTx: {
                  ...this.state.newTx,
                  to: event.target.value,
                },
              })
            },
          }),

          h('datalist#addresses', [
            // Corresponds to the addresses owned.
            Object.entries(props.identities).map(([key, { address, name }]) => {
              return h('option', {
                value: address,
                label: name,
                key: address,
              })
            }),
            // Corresponds to previously sent-to addresses.
            props.addressBook.map(({ address, name }) => {
              return h('option', {
                value: address,
                label: name,
                key: address,
              })
            }),
          ]),

          // h(EnsInput, {
          //   name: 'address',
          //   placeholder: 'Recipient Address',
          //   value: this.state.newTx.to,
          //   onChange: (event) => {
          //     this.setState({
          //       newTx: Object.assign(
          //         this.state.newTx,
          //         {
          //           to: event.target.value,
          //         }
          //       ),
          //     })
          //   },
          //   network,
          //   identities,
          //   addressBook,
          // }),

        ]),

        h('div.send-screen-input-wrapper', [

          h('div.send-screen-amount-labels', [
            h('span', 'Amount'),
            h(CurrencyToggle, {
              activeCurrency,
              onClick: (newCurrency) => this.setActiveCurrency(newCurrency),
            }), // holding on icon from design
          ]),

          h('input.large-input.send-screen-input', {
            placeholder: `0 ${activeCurrency}`,
            type: 'number',
            onChange: (event) => {
              this.setState({
                newTx: Object.assign(
                  this.state.newTx,
                  {
                    amount: event.target.value,
                  }
                ),
              })
            },
          }),

        ]),

        h('div.send-screen-input-wrapper', [
          this.state.tooltipIsOpen && h(GasTooltip, {
            className: 'send-tooltip',
            gasPrice,
            gasLimit: gas,
            onClose: this.closeTooltip,
            onFeeChange: ({gasLimit, gasPrice}) => {
              this.setState({
                newTx: {
                  ...this.state.newTx,
                  gas: gasLimit,
                  gasPrice,
                },
              })
            },
          }),

          h('div.send-screen-gas-labels', [
            h('span', [
              h('i.fa.fa-bolt'),
              'Gas fee:',
            ]),
            h('span', 'What\'s this?'),
          ]),

          // TODO: handle loading time when switching to USD
          h('div.large-input.send-screen-gas-input', {}, [
            h(GasFeeDisplay, {
              activeCurrency,
              conversionRate,
              gas,
              gasPrice,
              blockGasLimit,
            }),
            h('div.send-screen-gas-input-customize', {
              onClick: this.toggleTooltip,
            }, [
              'Customize',
            ]),
          ]),
<<<<<<< HEAD
=======

        ]),

        h('div.send-screen-input-wrapper', {}, [
>>>>>>> ea2e98c7... Lint fix.

        ]),

        h('div.send-screen-input-wrapper', [
          h('div', 'Transaction memo (optional)'),
          h('input.large-input.send-screen-input', {
            onChange: () => {
              this.setState({
                newTx: Object.assign(
                  this.state.newTx,
                  {
                    memo: event.target.value,
                  }
                ),
              })
            },
          }),
        ]),

        h('div.send-screen-input-wrapper', {}, [
          h('div', {}, ['Data (optional)']),
          h('input.large-input.send-screen-input', {
            onChange: () => {
              this.setState({
                newTx: Object.assign(
                  this.state.newTx,
                  {
                    txData: event.target.value,
                  }
                ),
              })
            },
          }),
        ]),
      ]),

      // Buttons underneath card
      h('section.flex-column.flex-center', [
        h('button.btn-secondary.send-screen__send-button', {
          onClick: (event) => this.onSubmit(event),
        }, 'Next'),
        h('button.btn-tertiary.send-screen__cancel-button', {
          onClick: this.back,
        }, 'Cancel'),
      ]),
    ])

  )
}

SendTransactionScreen.prototype.toggleTooltip = function () {
  this.setState({ tooltipIsOpen: !this.state.tooltipIsOpen })
}

SendTransactionScreen.prototype.closeTooltip = function () {
  this.setState({ tooltipIsOpen: false })
}

SendTransactionScreen.prototype.setActiveCurrency = function (newCurrency) {
  this.setState({ activeCurrency: newCurrency })
}

SendTransactionScreen.prototype.navigateToAccounts = function (event) {
  event.stopPropagation()
  this.props.dispatch(showAccountsPage())
}

SendTransactionScreen.prototype.back = function () {
  var address = this.props.address
  this.props.dispatch(backToAccountDetail(address))
}

SendTransactionScreen.prototype.recipientDidChange = function (recipient, nickname) {
  this.setState({
    recipient: recipient,
    nickname: nickname,
  })
}

SendTransactionScreen.prototype.onSubmit = function (event) {
  event.preventDefault()
  const state = this.state || {}

  // const recipient = state.recipient || document.querySelector('input[name="address"]').value.replace(/^[.\s]+|[.\s]+$/g, '')
  const recipient = state.newTx.to

  const nickname = state.nickname || ' '

  // const input = document.querySelector('input[name="amount"]').value
  // const input = state.newTx.value
  // const value = util.normalizeEthStringToWei(input)

  // https://consensys.slack.com/archives/G1L7H42BT/p1503439134000169?thread_ts=1503438076.000411&cid=G1L7H42BT
  // From @kumavis: "not needed for MVP but we will end up adding it again so consider just adding it now"
  const txData = false
  // Must replace with memo data.
  // const txData = document.querySelector('input[name="txData"]').value

  let message

  // if (value.gt(balance)) {
  //   message = 'Insufficient funds.'
  //   return this.props.dispatch(actions.displayWarning(message))
  // }

  // if (input < 0) {
  //   message = 'Can not send negative amounts of ETH.'
  //   return this.props.dispatch(actions.displayWarning(message))
  // }

  if ((util.isInvalidChecksumAddress(recipient))) {
    message = 'Recipient address checksum is invalid.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if ((!util.isValidAddress(recipient) && !txData) || (!recipient && !txData)) {
    message = 'Recipient address is invalid.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (txData && !isHex(stripHexPrefix(txData))) {
    message = 'Transaction data must be hex string.'
    return this.props.dispatch(displayWarning(message))
  }

  this.props.dispatch(hideWarning())

  this.props.dispatch(addToAddressBook(recipient, nickname))

  // TODO: need a clean way to integrate this into conversionUtil
  const sendConversionRate = state.activeCurrency === 'ETH'
    ? this.props.conversionRate
    : new BigNumber(1.0).div(this.props.conversionRate)

  const sendAmount = conversionUtil(this.state.newTx.amount, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
    fromCurrency: state.activeCurrency,
    toCurrency: 'ETH',
    toDenomination: 'WEI',
    conversionRate: sendConversionRate,
  })

  var txParams = {
    from: this.state.newTx.from,
    to: this.state.newTx.to,

    value: sendAmount,

    // New: gas will now be specified on this step
    gas: this.state.newTx.gas,
    gasPrice: this.state.newTx.gasPrice,
  }

  if (recipient) txParams.to = addHexPrefix(recipient)
  if (txData) txParams.data = txData

  this.props.dispatch(signTx(txParams))
}
