const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits

const MiniAccountPanel = require('./mini-account-panel')
const EthBalance = require('./eth-balance')
const util = require('../util')
const addressSummary = util.addressSummary
const nameForAddress = require('../../lib/contract-namer')

module.exports = PendingTxDetails

inherits(PendingTxDetails, Component)
function PendingTxDetails () {
  Component.call(this)
}

const PTXP = PendingTxDetails.prototype

PTXP.render = function () {
  var props = this.props
  var txData = props.txData

  var txParams = txData.txParams || {}
  var address = txParams.from || props.selectedAccount
  var identity = props.identities[address] || { address: address }
  var account = props.accounts[address]
  var balance = account ? account.balance : '0x0'

  var txFee = txData.txFee || ''
  var maxCost = txData.maxCost || ''
  var dataLength = txParams.data ? (txParams.data.length - 2) / 2 : 0
  var imageify = props.imageifyIdenticons === undefined ? true : props.imageifyIdenticons

  return (
    h('div', [

      h('.flex-row.flex-center', {
        style: {
          maxWidth: '100%',
        },
      }, [

        h(MiniAccountPanel, {
          imageSeed: address,
          imageifyIdenticons: imageify,
          picOrder: 'right',
        }, [
          h('span.font-small', {
            style: {
              fontFamily: 'Montserrat Bold, Montserrat, sans-serif',
            },
          }, identity.name),
          h('span.font-small', {
            style: {
              fontFamily: 'Montserrat Light, Montserrat, sans-serif',
            },
          }, addressSummary(address, 6, 4, false)),

          h('span.font-small', {
            style: {
              fontFamily: 'Montserrat Light, Montserrat, sans-serif',
            },
          }, [
            h(EthBalance, {
              value: balance,
              inline: true,
              labelColor: '#F7861C',
            }),
          ]),

        ]),

        forwardCarrat(),

        this.miniAccountPanelForRecipient(),
      ]),

      h('style', `
        .table-box {
          margin: 7px 0px 0px 0px;
          width: 100%;
        }
        .table-box .row {
          margin: 0px;
          background: rgb(236,236,236);
          display: flex;
          justify-content: space-between;
          font-family: Montserrat Light, sans-serif;
          font-size: 13px;
          padding: 5px 25px;
        }
        .table-box .row .value {
          font-family: Montserrat Regular;
        }
      `),

      h('.table-box', [

        h('.row', [
          h('.cell.label', 'Amount'),
          h(EthBalance, { value: txParams.value }),
        ]),

        h('.cell.row', [
          h('.cell.label', 'Max Transaction Fee'),
          h(EthBalance, { value: txFee.toString(16) }),
        ]),

        h('.cell.row', {
          style: {
            fontFamily: 'Montserrat Regular',
            background: 'white',
            padding: '10px 25px',
          },
        }, [
          h('.cell.label', 'Max Total'),
          h('.cell.value', {
            style: {
              display: 'flex',
              alignItems: 'center',
            },
          }, [
            h(EthBalance, {
              value: maxCost.toString(16),
              inline: true,
              labelColor: 'black',
              fontSize: '16px',
            }),
          ]),
        ]),

        h('.cell.row', {
          style: {
            background: '#f7f7f7',
            paddingBottom: '0px',
          },
        }, [
          h('.cell.label'),
          h('.cell.value', {
            style: {
              fontFamily: 'Montserrat Light',
              fontSize: '11px',
            },
          }, `Data included: ${dataLength} bytes`),
        ]),
      ]), // End of Table

    ])
  )
}

PTXP.miniAccountPanelForRecipient = function () {
  var props = this.props
  var txData = props.txData
  var txParams = txData.txParams || {}
  var isContractDeploy = !('to' in txParams)
  var imageify = props.imageifyIdenticons === undefined ? true : props.imageifyIdenticons

  // If it's not a contract deploy, send to the account
  if (!isContractDeploy) {
    return h(MiniAccountPanel, {
      imageSeed: txParams.to,
      imageifyIdenticons: imageify,
      picOrder: 'left',
    }, [
      h('span.font-small', {
        style: {
          fontFamily: 'Montserrat Bold, Montserrat, sans-serif',
        },
      }, nameForAddress(txParams.to, props.identities)),
      h('span.font-small', {
        style: {
          fontFamily: 'Montserrat Light, Montserrat, sans-serif',
        },
      }, addressSummary(txParams.to, 6, 4, false)),
    ])
  } else {
    return h(MiniAccountPanel, {
      imageifyIdenticons: imageify,
      picOrder: 'left',
    }, [

      h('span.font-small', {
        style: {
          fontFamily: 'Montserrat Bold, Montserrat, sans-serif',
        },
      }, 'New Contract'),

    ])
  }
}

function forwardCarrat () {
  return (

    h('img', {
      src: 'images/forward-carrat.svg',
      style: {
        padding: '5px 6px 0px 10px',
        height: '37px',
      },
    })

  )
}
