import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import shuffle from 'lodash.shuffle'
import Button from '../../../../components/ui/button'
import {
  INITIALIZE_END_OF_FLOW_ROUTE,
  INITIALIZE_SEED_PHRASE_ROUTE,
} from '../../../../helpers/constants/routes'
import { exportAsFile } from '../../../../helpers/utils/util'
import { selectSeedWord, deselectSeedWord } from './confirm-seed-phrase.state'
import { DragDropContextProvider } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import DraggableSeed from './draggable-seed.component'

const EMPTY_SEEDS = Array(12).fill(null);

export default class ConfirmSeedPhrase extends PureComponent {
  static contextTypes = {
    metricsEvent: PropTypes.func,
    t: PropTypes.func,
  }

  static defaultProps = {
    seedPhrase: '',
  }

  static propTypes = {
    history: PropTypes.object,
    onSubmit: PropTypes.func,
    seedPhrase: PropTypes.string,
  }

  state = {
    selectedSeedWords: [],
    shuffledSeedWords: [],
    // Hash of shuffledSeedWords index {Number} to selectedSeedWords index {Number}
    selectedSeedWordsHash: {},
    isDragging: false,
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
    const { history } = this.props

    if (!this.isValid()) {
      return
    }

    try {
      this.context.metricsEvent({
        eventOpts: {
          category: 'Onboarding',
          action: 'Seed Phrase Setup',
          name: 'Verify Complete',
        },
      })
      history.push(INITIALIZE_END_OF_FLOW_ROUTE)
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
    const { history } = this.props
    const { selectedSeedWords, shuffledSeedWords, selectedSeedWordsHash } = this.state

    return (
      <DragDropContextProvider backend={HTML5Backend}>
        <div className="confirm-seed-phrase">
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
          <div className="first-time-flow__header">
            { t('confirmSecretBackupPhrase') }
          </div>
          <div className="first-time-flow__text-block">
            { t('selectEachPhrase') }
          </div>
          <div className="confirm-seed-phrase__selected-seed-words">
            {
              EMPTY_SEEDS.map((_, index) => {
                const word = selectedSeedWords[index]
                return (
                  <DraggableSeed
                    key={index}
                    index={index}
                    word={word}
                    droppable
                  />
                )
              })
            }
          </div>
          <div className="confirm-seed-phrase__shuffled-seed-words">
            {
              shuffledSeedWords.map((word, index) => {
                const isSelected = index in selectedSeedWordsHash

                return (
                  <DraggableSeed
                    key={index}
                    className={classnames(
                      'confirm-seed-phrase__seed-word--shuffled',
                    )}
                    selected={isSelected}
                    onClick={() => {
                      if (!isSelected) {
                        this.handleSelectSeedWord(word, index)
                      } else {
                        this.handleDeselectSeedWord(index)
                      }
                    }}
                    word={word}
                    index={index}
                  />
                )
              })
            }
          </div>
          <Button
            type="primary"
            className="first-time-flow__button"
            onClick={this.handleSubmit}
            disabled={!this.isValid()}
          >
            { t('confirm') }
          </Button>
        </div>
      </DragDropContextProvider>
    )
  }
}
