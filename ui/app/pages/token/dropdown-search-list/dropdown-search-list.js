import React, { useState, useCallback, useEffect, useContext, useRef } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import { isEqual } from 'lodash'
import { I18nContext } from '../../../contexts/i18n'
import SearchableItemList from '../searchable-item-list'
import PulseLoader from '../../../components/ui/pulse-loader'
import UrlIcon from '../../../components/ui/url-icon'

export default function DropdownSearchList ({
  searchListClassName = '',
  itemsToSearch = [],
  selectPlaceHolderText,
  fuseSearchKeys = [],
  defaultToAll = false,
  maxListItems = undefined,
  onSelect = null,
  startingItem = null,
  onOpen = null,
  onClose = null,
  className = '',
  externallySelectedItem,
  selectorClosedClassName,
  loading,
  hideRightLabels,
  hideItemIf,
  listContainerClassName,
}) {
  const t = useContext(I18nContext)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(startingItem)
  const onClickItem = useCallback((item) => {
    onSelect && onSelect(item)
    setSelectedItem(item)
    setIsOpen(false)
    onClose && onClose()
  }, [onClose, onSelect])

  const onClickSelector = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true)
      onOpen && onOpen()
    }
  }, [isOpen, onOpen])

  const prevExternallySelectedItemRef = useRef()
  useEffect(() => {
    prevExternallySelectedItemRef.current = externallySelectedItem
  })
  const prevExternallySelectedItem = prevExternallySelectedItemRef.current

  useEffect(() => {
    if (externallySelectedItem && !isEqual(externallySelectedItem, selectedItem)) {
      setSelectedItem(externallySelectedItem)
    } else if (prevExternallySelectedItem && !externallySelectedItem) {
      setSelectedItem(null)
    }
  }, [externallySelectedItem, selectedItem, prevExternallySelectedItem])

  return (
    <div
      className={classnames('dropdown-search-list', className)}
      onClick={onClickSelector}
    >
      {!isOpen && (
        <div
          className={classnames('dropdown-search-list__selector-closed-container', selectorClosedClassName)}
        >
          <div className={classnames('dropdown-search-list__selector-closed')}>
            {selectedItem?.iconUrl && (<UrlIcon url={selectedItem.iconUrl} />)}
            {!selectedItem?.iconUrl && <div className="dropdown-search-list__default-dropdown-icon" />}
            <div className="dropdown-search-list__labels">
              <div className="dropdown-search-list__item-labels">
                <span
                  className={classnames('dropdown-search-list__closed-primary-label', {
                    'dropdown-search-list__select-default': !selectedItem?.symbol,
                  })}
                >{ selectedItem?.symbol || selectPlaceHolderText }
                </span>
              </div>
            </div>
          </div>
          <i className="fa fa-caret-down fa-lg dropdown-search-list__caret" />
        </div>
      )}
      {isOpen && (
        <>
          <SearchableItemList
            itemsToSearch={loading ? [] : itemsToSearch}
            Placeholder={({ searchQuery }) => (loading
              ? (
                <div className="dropdown-search-list__loading-item">
                  <PulseLoader />
                  <div className="dropdown-search-list__loading-item-text-container">
                    <span className="dropdown-search-list__loading-item-text">{t('swapFetchingTokens')}</span>
                  </div>
                </div>
              )
              : (
                <div className="dropdown-search-list__placeholder">
                  {t('swapBuildQuotePlaceHolderText', [searchQuery])}
                </div>
              )
            )}
            searchPlaceholderText={t('swapSearchForAToken')}
            fuseSearchKeys={fuseSearchKeys}
            defaultToAll={defaultToAll}
            onClickItem={onClickItem}
            maxListItems={maxListItems}
            className={classnames('dropdown-search-list__token-container', searchListClassName, {
              'dropdown-search-list--open': isOpen,
            })}
            hideRightLabels={hideRightLabels}
            hideItemIf={hideItemIf}
            listContainerClassName={listContainerClassName}
          />
          <div
            className="simple-dropdown__close-area"
            onClick={(event) => {
              event.stopPropagation()
              setIsOpen(false)
              onClose && onClose()
            }}
          />
        </>
      )}
    </div>
  )
}

DropdownSearchList.propTypes = {
  itemsToSearch: PropTypes.array,
  onSelect: PropTypes.func,
  searchListClassName: PropTypes.string,
  fuseSearchKeys: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    weight: PropTypes.number,
  })),
  defaultToAll: PropTypes.bool,
  maxListItems: PropTypes.number,
  startingItem: PropTypes.object,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  className: PropTypes.string,
  externallySelectedItem: PropTypes.object,
  loading: PropTypes.bool,
  selectPlaceHolderText: PropTypes.string,
  selectorClosedClassName: PropTypes.string,
  hideRightLabels: PropTypes.bool,
  hideItemIf: PropTypes.string,
  listContainerClassName: PropTypes.string,
}
