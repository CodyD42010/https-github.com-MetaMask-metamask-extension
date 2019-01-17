import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import shuffle from 'lodash.shuffle'
import Identicon from '../../../../identicon'
import Button from '../../../../button'
import Breadcrumbs from '../../../../breadcrumbs'
import { DEFAULT_ROUTE, INITIALIZE_SEED_PHRASE_ROUTE } from '../../../../../routes'
import { exportAsFile } from '../../../../../../app/util'
import { selectSeedWord, deselectSeedWord } from './confirm-seed-phrase.state'

export default class ConfirmSeedPhrase extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static defaultProps = {
    seedPhrase: '',
  }

  static propTypes = {
    address: PropTypes.string,
    completeOnboarding: PropTypes.func,
    history: PropTypes.object,
    onSubmit: PropTypes.func,
    openBuyEtherModal: PropTypes.func,
    seedPhrase: PropTypes.string,
  }

  state = {
    selectedSeedWords: [],
    shuffledSeedWords: [],
    // Hash of shuffledSeedWords index {Number} to selectedSeedWords index {Number}
    selectedSeedWordsHash: {},
  }

  componentDidMount () {
    const { seedPhrase = '' } = this.props
    const shuffledSeedWords = shuffle(seedPhrase.split(' ')) || []
    this.setState({ shuffledSeedWords })
  }

  handleExport = () => {
    exportAsFile('MetaMask Secret Backup Phrase', this.props.seedPhrase, 'text/plain')
  }

  handleSubmit = async () => {
    const { completeOnboarding, history, openBuyEtherModal } = this.props

    if (!this.isValid()) {
      return
    }

    try {
      await completeOnboarding()
      history.push(DEFAULT_ROUTE)
      openBuyEtherModal()
    } catch (error) {
      console.error(error.message)
    }
  }

  handleSelectSeedWord = (word, shuffledIndex) => {
    this.setState(selectSeedWord(word, shuffledIndex))
  }

  handleDeselectSeedWord = shuffledIndex => {
    this.setState(deselectSeedWord(shuffledIndex))
  }

  isValid () {
    const { seedPhrase } = this.props
    const { selectedSeedWords } = this.state
    return seedPhrase === selectedSeedWords.join(' ')
  }

  render () {
    const { t } = this.context
    const { address, history } = this.props
    const { selectedSeedWords, shuffledSeedWords, selectedSeedWordsHash } = this.state

    return (
      <div>
        <div className="confirm-seed-phrase__back-button">
          <a
            onClick={e => {
              e.preventDefault()
              history.push(INITIALIZE_SEED_PHRASE_ROUTE)
            }}
            href="#"
          >
            {`< Back`}
          </a>
        </div>
        <Identicon
          className="first-time-flow__unique-image"
          address={address}
          diameter={70}
        />
        <div className="first-time-flow__header">
          { t('confirmSecretBackupPhrase') }
        </div>
        <div className="first-time-flow__text-block">
          { t('selectEachPhrase') }
        </div>
        <div className="confirm-seed-phrase__selected-seed-words">
          {
            selectedSeedWords.map((word, index) => (
              <div
                key={index}
                className="confirm-seed-phrase__seed-word"
              >
                { word }
              </div>
            ))
          }
        </div>
        <div className="confirm-seed-phrase__shuffled-seed-words">
          {
            shuffledSeedWords.map((word, index) => {
              const isSelected = index in selectedSeedWordsHash

              return (
                <div
                  key={index}
                  className={classnames(
                    'confirm-seed-phrase__seed-word',
                    'confirm-seed-phrase__seed-word--shuffled',
                    { 'confirm-seed-phrase__seed-word--selected': isSelected }
                  )}
                  onClick={() => {
                    if (!isSelected) {
                      this.handleSelectSeedWord(word, index)
                    } else {
                      this.handleDeselectSeedWord(index)
                    }
                  }}
                >
                  { word }
                </div>
              )
            })
          }
        </div>
        <Button
          type="first-time"
          className="first-time-flow__button"
          onClick={this.handleSubmit}
          disabled={!this.isValid()}
        >
          { t('confirm') }
        </Button>
        <Breadcrumbs
          className="first-time-flow__breadcrumbs"
          total={3}
          currentIndex={2}
        />
      </div>
    )
  }
}
