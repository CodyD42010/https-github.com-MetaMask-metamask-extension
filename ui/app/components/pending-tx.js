const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const actions = require('../actions')
const clone = require('clone')

const ethUtil = require('ethereumjs-util')
const BN = ethUtil.BN
const hexToBn = require('../../../app/scripts/lib/hex-to-bn')
const util = require('../util')

const MIN_GAS_PRICE_GWEI_BN = new BN(1)
const GWEI_FACTOR = new BN(1e9)
const MIN_GAS_PRICE_BN = MIN_GAS_PRICE_GWEI_BN.mul(GWEI_FACTOR)


// Faked, for Icon
const Identicon = require('./identicon')
const ARAGON = '960b236A07cf122663c4303350609A66A7B288C0'

// Next: create separate react components
// roughly 5 components:
//   heroIcon
//   numericDisplay (contains symbol + currency)
//   divider
//   contentBox
//   actionButtons
const sectionDivider = h('div', {
  style: {
    height: '1px',
    background: '#E7E7E7',
  },
})

const contentDivider = h('div', {
  style: {
    marginLeft: '16px',
    marginRight: '16px',
    height: '1px',
    background: '#E7E7E7',
  },
})

module.exports = PendingTx
inherits(PendingTx, Component)
function PendingTx () {
  Component.call(this)
  this.state = {
    valid: true,
    txData: null,
    submitting: false,
  }
}

PendingTx.prototype.render = function () {
  const props = this.props
  const { blockGasLimit } = props

  const txMeta = this.gatherTxMeta()
  const txParams = txMeta.txParams || {}

  // Account Details
  const address = txParams.from || props.selectedAddress
  const account = props.accounts[address]
  const balance = account ? account.balance : '0x0'

  // recipient check
  const isValidAddress = !txParams.to || util.isValidAddress(txParams.to)

  // Gas
  const gas = txParams.gas
  const gasBn = hexToBn(gas)

  // Gas Price
  const gasPrice = txParams.gasPrice || MIN_GAS_PRICE_BN.toString(16)
  const gasPriceBn = hexToBn(gasPrice)

  const txFeeBn = gasBn.mul(gasPriceBn)
  const valueBn = hexToBn(txParams.value)
  const maxCost = txFeeBn.add(valueBn)

  const balanceBn = hexToBn(balance)
  const insufficientBalance = balanceBn.lt(maxCost)

  this.inputs = []

  return (
    h('div.flex-column.flex-grow', {
      style: {
        // overflow: 'scroll',
        minWidth: '355px', // TODO: maxWidth TBD, use home.html
      },
    }, [

      // Main Send token Card
      h('div.send-screen.flex-column.flex-grow', {
        style: {
          marginLeft: '3.5%',
          marginRight: '3.5%',
          background: '#FFFFFF', // $background-white
          boxShadow: '0 2px 4px 0 rgba(0,0,0,0.08)',
        },
      }, [
        h('section.flex-center.flex-row', {
          style: {
            zIndex: 15, // $token-icon-z-index
            marginTop: '-35px',
          },
        }, [
          h(Identicon, {
            address: ARAGON,
            diameter: 76,
          }),
        ]),

        //
        // Required Fields
        //

        h('h3.flex-center', {
          style: {
            marginTop: '-18px',
            fontSize: '16px',
          },
        }, [
          'Confirm Transaction',
        ]),

        h('h3.flex-center', {
          style: {
            textAlign: 'center',
            fontSize: '12px',
          },
        }, [
          'You\'re sending to Recipient ...5924',
        ]),

        h('h3.flex-center', {
          style: {
            textAlign: 'center',
            fontSize: '36px',
            marginTop: '8px',
          },
        }, [
          '0.24',
        ]),

        h('h3.flex-center', {
          style: {
            textAlign: 'center',
            fontSize: '12px',
            marginTop: '4px',
          },
        }, [
          'ANT',
        ]),

        // error message
        props.error && h('span.error.flex-center', props.error),

        sectionDivider,

        h('section.flex-row.flex-center', {
        }, [
          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('span', {
              style: {
                textAlign: 'left',
                fontSize: '12px',
              },
            }, [
              'From',
            ]),
          ]),

          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '10px',
                marginBottom: '-10px',
              },
            }, 'Aragon Token'),

            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '8px',
              },
            }, 'Your Balance 2.34 ANT'),
          ]),
        ]),

        contentDivider,

        h('section.flex-row.flex-center', {
        }, [
          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('span', {
              style: {
                textAlign: 'left',
                fontSize: '12px',
              },
            }, [
              'To',
            ]),
          ]),

          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '10px',
                marginBottom: '-10px',
              },
            }, 'Ethereum Address'),

            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '8px',
              },
            }, '...5924'),
          ]),
        ]),

        contentDivider,

        h('section.flex-row.flex-center', {
        }, [
          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('span', {
              style: {
                textAlign: 'left',
                fontSize: '12px',
              },
            }, [
              'Gas Fee',
            ]),
          ]),

          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '10px',
                marginBottom: '-10px',
              },
            }, '$0.04 USD'),

            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '8px',
              },
            }, '0.001575 ETH'),
          ]),
        ]),

        contentDivider,

        h('section.flex-row.flex-center', {
          style: {
            backgroundColor: '#F6F6F6', // $wild-sand
            borderRadius: '8px',
            marginLeft: '10px',
            marginRight: '10px',
            paddingLeft: '6px',
            paddingRight: '6px',
            marginBottom: '10px',
          },
        }, [
          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '12px',
                marginBottom: '-10px',
              },
            }, [
              'Total Tokens',
            ]),

            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '8px',
              },
            }, [
              'Total Gas',
            ]),

          ]),

          h('div', {
            style: {
              width: '50%',
            },
          }, [
            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '10px',
                marginBottom: '-10px',
              },
            }, '0.24 ANT (127.00 USD)'),

            h('div', {
              style: {
                textAlign: 'left',
                fontSize: '8px',
              },
            }, '0.249 ETH'),
          ]),
        ]),

      ]), // end of container

      h('form#pending-tx-form.flex-column.flex-center', {
        onSubmit: this.onSubmit.bind(this),
      }, [
        // Reset Button
        // h('button', {
        //   onClick: (event) => {
        //     this.resetGasFields()
        //     event.preventDefault()
        //   },
        // }, 'Reset'),

        // Accept Button
        h('input.confirm.btn-green', {
          type: 'submit',
          value: 'CONFIRM',
          style: {
            marginTop: '8px',
            width: '8em',
            color: '#FFFFFF',
            borderRadius: '2px',
            fontSize: '12px',
            lineHeight: '20px',
            textAlign: 'center',
            borderStyle: 'none',
          },
          disabled: insufficientBalance || !this.state.valid || !isValidAddress || this.state.submitting,
        }),

        // Cancel Button
        h('button.cancel.btn-light', {
          style: {
            background: '#F7F7F7', // $alabaster
            border: 'none',
            opacity: 1,
            width: '8em',
          },
          onClick: props.cancelTransaction,
        }, 'CANCEL'),
      ]),
    ]) // end of minwidth wrapper
  )
}

// PendingTx.prototype.gasPriceChanged = function (newBN, valid) {
//   log.info(`Gas price changed to: ${newBN.toString(10)}`)
//   const txMeta = this.gatherTxMeta()
//   txMeta.txParams.gasPrice = '0x' + newBN.toString('hex')
//   this.setState({
//     txData: clone(txMeta),
//     valid,
//   })
// }

// PendingTx.prototype.gasLimitChanged = function (newBN, valid) {
//   log.info(`Gas limit changed to ${newBN.toString(10)}`)
//   const txMeta = this.gatherTxMeta()
//   txMeta.txParams.gas = '0x' + newBN.toString('hex')
//   this.setState({
//     txData: clone(txMeta),
//     valid,
//   })
// }

// PendingTx.prototype.resetGasFields = function () {
//   log.debug(`pending-tx resetGasFields`)

//   this.inputs.forEach((hexInput) => {
//     if (hexInput) {
//       hexInput.setValid()
//     }
//   })

//   this.setState({
//     txData: null,
//     valid: true,
//   })
// }

PendingTx.prototype.onSubmit = function (event) {
  event.preventDefault()
  const txMeta = this.gatherTxMeta()
  const valid = this.checkValidity()
  this.setState({ valid, submitting: true })
  if (valid && this.verifyGasParams()) {
    this.props.sendTransaction(txMeta, event)
  } else {
    this.props.dispatch(actions.displayWarning('Invalid Gas Parameters'))
    this.setState({ submitting: false })
  }
}

PendingTx.prototype.checkValidity = function () {
  const form = this.getFormEl()
  const valid = form.checkValidity()
  return valid
}

PendingTx.prototype.getFormEl = function () {
  const form = document.querySelector('form#pending-tx-form')
  // Stub out form for unit tests:
  if (!form) {
    return { checkValidity () { return true } }
  }
  return form
}

// After a customizable state value has been updated,
PendingTx.prototype.gatherTxMeta = function () {
  log.debug(`pending-tx gatherTxMeta`)
  const props = this.props
  const state = this.state
  const txData = clone(state.txData) || clone(props.txData)

  log.debug(`UI has defaulted to tx meta ${JSON.stringify(txData)}`)
  return txData
}

PendingTx.prototype.verifyGasParams = function () {
  // We call this in case the gas has not been modified at all
  if (!this.state) { return true }
  return (
    this._notZeroOrEmptyString(this.state.gas) &&
    this._notZeroOrEmptyString(this.state.gasPrice)
  )
}

PendingTx.prototype._notZeroOrEmptyString = function (obj) {
  return obj !== '' && obj !== '0x0'
}

PendingTx.prototype.bnMultiplyByFraction = function (targetBN, numerator, denominator) {
  const numBN = new BN(numerator)
  const denomBN = new BN(denominator)
  return targetBN.mul(numBN).div(denomBN)
}
