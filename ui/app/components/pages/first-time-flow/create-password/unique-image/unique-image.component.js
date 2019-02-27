import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import Button from '../../../../button'
import { INITIALIZE_SEED_PHRASE_ROUTE, INITIALIZE_END_OF_FLOW_ROUTE } from '../../../../../routes'

export default class UniqueImageScreen extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    history: PropTypes.object,
    isImportedKeyring: PropTypes.bool,
  }

  render () {
    const { t } = this.context
    const { history, isImportedKeyring } = this.props

    return (
      <div>
        <img
          src="/images/sleuth.svg"
          height={42}
          width={42}
        />
        <div className="first-time-flow__header">
          { t('protectYourKeys') }
        </div>
        <div className="first-time-flow__text-block">
          { t('protectYourKeysMessage1') }
        </div>
        <div className="first-time-flow__text-block">
          { t('protectYourKeysMessage2') }
        </div>
        <Button
          type="confirm"
          className="first-time-flow__button"
          onClick={() => {
            if (isImportedKeyring) {
              history.push(INITIALIZE_END_OF_FLOW_ROUTE)
            } else {
              history.push(INITIALIZE_SEED_PHRASE_ROUTE)
            }
          }}
        >
          { t('next') }
        </Button>
      </div>
    )
  }
}
