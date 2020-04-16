const inherits = require('util').inherits
const Component = require('react').Component
const connect = require('react-redux').connect
const h = require('react-hyperscript')
const actions = require('../../../../ui/app/actions')
const exportAsFile = require('../../util').exportAsFile

module.exports = connect(mapStateToProps)(CreateVaultCompleteScreen)

inherits(CreateVaultCompleteScreen, Component)
function CreateVaultCompleteScreen () {
  Component.call(this)
}

function mapStateToProps (state) {
  return {
    seed: state.appState.currentView.seedWords,
    cachedSeed: state.metamask.seedWords,
  }
}

CreateVaultCompleteScreen.prototype.render = function () {
  const state = this.props
  const seed = state.seed || state.cachedSeed || ''

  return (

    h('.initialize-screen.flex-column.flex-center.flex-grow', [

      // // subtitle and nav
      // h('.section-title.flex-row.flex-center', [
      //   h('h2.page-subtitle', 'Vault Created'),
      // ]),

      h('h3.flex-center.section-title', {
        style: {
          background: '#ffffff',
          color: '#333333',
          marginBottom: 8,
          width: '100%',
          padding: '30px 6px 6px 6px',
        },
      }, [
        'Vault Created',
      ]),

      h('div', {
        style: {
          fontSize: '1em',
          margin: '10px 30px',
          textAlign: 'center',
        },
      }, [
        h('div.error', 'These 12 words are the only way to restore your Nifty Wallet accounts.\nSave them somewhere safe and secret.'),
      ]),

      h('textarea.twelve-word-phrase', {
        readOnly: true,
        value: seed,
      }),

      h('button', {
        onClick: () => this.confirmSeedWords()
          .then(account => this.showAccountDetail(account)),
        style: {
          margin: '24px',
          fontSize: '0.9em',
          marginBottom: '10px',
        },
      }, 'I\'ve copied it somewhere safe'),

      h('button', {
        onClick: () => exportAsFile(`Nifty Wallet Seed Words`, seed),
        style: {
          margin: '10px',
          fontSize: '0.9em',
        },
      }, 'Save Seed Words As File'),
    ])
  )
}

CreateVaultCompleteScreen.prototype.confirmSeedWords = function () {
  return this.props.dispatch(actions.confirmSeedWords())
}

CreateVaultCompleteScreen.prototype.showAccountDetail = function (account) {
  return this.props.dispatch(actions.showAccountDetail(account))
}
