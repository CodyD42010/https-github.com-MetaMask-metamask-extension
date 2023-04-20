import React, { useContext, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import browser from 'webextension-polyfill';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import {
  CONNECTED_ACCOUNTS_ROUTE,
  DEFAULT_ROUTE,
} from '../../../helpers/constants/routes';

import {
  AlignItems,
  BackgroundColor,
  BLOCK_SIZES,
  DISPLAY,
  JustifyContent,
  Size,
} from '../../../helpers/constants/design-system';
import {
  AvatarNetwork,
  ButtonIcon,
  IconName,
  PickerNetwork,
} from '../../component-library';

import {
  getCurrentNetwork,
  getOnboardedInThisUISession,
  getOriginOfCurrentTab,
  getSelectedIdentity,
  getShowProductTour,
} from '../../../selectors';
import { GlobalMenu, ProductTour, AccountPicker } from '..';

import Box from '../../ui/box/box';
import {
  hideProductTour,
  toggleAccountMenu,
  toggleNetworkMenu,
} from '../../../store/actions';
import MetafoxLogo from '../../ui/metafox-logo';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import ConnectedStatusIndicator from '../../app/connected-status-indicator';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getCompletedOnboarding } from '../../../ducks/metamask/metamask';

export const AppHeader = ({ onClick }) => {
  const trackEvent = useContext(MetaMetricsContext);
  const [accountOptionsMenuOpen, setAccountOptionsMenuOpen] = useState(false);
  const [multichainProductTourStep, setMultichainProductTourStep] = useState(1);
  const menuRef = useRef(false);
  const origin = useSelector(getOriginOfCurrentTab);
  const history = useHistory();
  const isUnlocked = useSelector((state) => state.metamask.isUnlocked);
  const t = useI18nContext();
  // Used for account picker
  const identity = useSelector(getSelectedIdentity);
  const dispatch = useDispatch();
  const completedOnboarding = useSelector(getCompletedOnboarding);
  const onboardedInThisUISession = useSelector(getOnboardedInThisUISession);
  const showProductTourPopup = useSelector(getShowProductTour);

  // Used for network icon / dropdown
  const currentNetwork = useSelector(getCurrentNetwork);

  // used to get the environment and connection status
  const popupStatus = getEnvironmentType() === ENVIRONMENT_TYPE_POPUP;
  const showStatus =
    getEnvironmentType() === ENVIRONMENT_TYPE_POPUP &&
    origin &&
    origin !== browser.runtime.id;
  const showProductTour =
    completedOnboarding && !onboardedInThisUISession && showProductTourPopup;
  const productTourDirection = document
    .querySelector('[dir]')
    ?.getAttribute('dir');

  return (
    <>
      {isUnlocked && !popupStatus ? (
        <Box
          display={[DISPLAY.NONE, DISPLAY.FLEX]}
          alignItems={AlignItems.center}
          margin={2}
          className="multichain-app-header-logo"
          data-testid="app-header-logo"
          justifyContent={JustifyContent.center}
        >
          <MetafoxLogo
            unsetIconHeight
            onClick={async () => {
              if (onClick) {
                await onClick();
              }
              history.push(DEFAULT_ROUTE);
            }}
          />
        </Box>
      ) : null}
      <Box
        display={DISPLAY.FLEX}
        className={`multichain-app-header ${
          !isUnlocked || popupStatus ? 'multichain-app-header-shadow' : ''
        }`}
        alignItems={AlignItems.center}
        width={BLOCK_SIZES.FULL}
        backgroundColor={
          !isUnlocked || popupStatus
            ? BackgroundColor.backgroundDefault
            : BackgroundColor.backgroundAlternative
        }
      >
        <>
          {isUnlocked ? (
            <Box
              className={`multichain-app-header__contents ${
                isUnlocked && !popupStatus ? 'multichain-app-header-shadow' : ''
              }`}
              alignItems={AlignItems.center}
              width={BLOCK_SIZES.FULL}
              backgroundColor={BackgroundColor.backgroundDefault}
              padding={2}
              gap={2}
            >
              <AvatarNetwork
                margin={2}
                className="multichain-app-header__contents--avatar-network"
                ref={menuRef}
                as="button"
                aria-label="Network Menu" // TODO: needs locale
                padding={0}
                name={currentNetwork?.nickname}
                src={currentNetwork?.rpcPrefs?.imageUrl}
                size={Size.SM}
                onClick={() => dispatch(toggleNetworkMenu())}
                display={[DISPLAY.FLEX, DISPLAY.NONE]} // show on popover hide on desktop
              />
              <PickerNetwork
                margin={2}
                label={currentNetwork?.nickname}
                src={currentNetwork?.rpcPrefs?.imageUrl}
                onClick={() => dispatch(toggleNetworkMenu())}
                display={[DISPLAY.NONE, DISPLAY.FLEX]} // show on desktop hide on popover
              />
              {showProductTour &&
              popupStatus &&
              multichainProductTourStep === 1 ? (
                <ProductTour
                  className="multichain-app-header__product-tour"
                  anchorElement={menuRef.current}
                  title={t('switcherTitle')}
                  description={t('switcherTourDescription')}
                  currentStep="1"
                  totalSteps="3"
                  onClick={() =>
                    setMultichainProductTourStep(multichainProductTourStep + 1)
                  }
                  positionObj={productTourDirection === 'rtl' ? '0%' : '88%'}
                  productTourDirection={productTourDirection}
                />
              ) : null}

              <AccountPicker
                address={identity.address}
                name={identity.name}
                onClick={() => dispatch(toggleAccountMenu())}
              />
              <Box
                display={DISPLAY.FLEX}
                alignItems={AlignItems.center}
                justifyContent={JustifyContent.spaceBetween}
              >
                {showStatus ? (
                  <Box ref={menuRef}>
                    <ConnectedStatusIndicator
                      onClick={() => history.push(CONNECTED_ACCOUNTS_ROUTE)}
                    />
                  </Box>
                ) : null}{' '}
                {popupStatus && multichainProductTourStep === 2 ? (
                  <ProductTour
                    className="multichain-app-header__product-tour"
                    anchorElement={menuRef.current}
                    closeMenu={() => setAccountOptionsMenuOpen(false)}
                    prevIcon
                    title={t('permissionsTitle')}
                    description={t('permissionsTourDescription')}
                    currentStep="2"
                    totalSteps="3"
                    prevClick={() =>
                      setMultichainProductTourStep(
                        multichainProductTourStep - 1,
                      )
                    }
                    onClick={() =>
                      setMultichainProductTourStep(
                        multichainProductTourStep + 1,
                      )
                    }
                    positionObj={productTourDirection === 'rtl' ? '74%' : '12%'}
                    productTourDirection={productTourDirection}
                  />
                ) : null}
                <Box
                  ref={menuRef}
                  display={DISPLAY.FLEX}
                  justifyContent={JustifyContent.flexEnd}
                  width={BLOCK_SIZES.FULL}
                >
                  <ButtonIcon
                    iconName={IconName.MoreVertical}
                    data-testid="account-options-menu-button"
                    ariaLabel="NEEDS NEW TRANSLATED LABEL" // TODO: Update the label
                    onClick={() => {
                      trackEvent({
                        event: MetaMetricsEventName.NavAccountMenuOpened,
                        category: MetaMetricsEventCategory.Navigation,
                        properties: {
                          location: 'Home',
                        },
                      });
                      setAccountOptionsMenuOpen(true);
                    }}
                  />
                </Box>
              </Box>
              {accountOptionsMenuOpen ? (
                <GlobalMenu
                  anchorElement={menuRef.current}
                  closeMenu={() => setAccountOptionsMenuOpen(false)}
                />
              ) : null}
              {showProductTour &&
              popupStatus &&
              multichainProductTourStep === 3 ? (
                <ProductTour
                  className="multichain-app-header__product-tour"
                  anchorElement={menuRef.current}
                  closeMenu={() => setAccountOptionsMenuOpen(false)}
                  prevIcon
                  title={t('globalTitle')}
                  description={t('globalTourDescription')}
                  currentStep="3"
                  totalSteps="3"
                  prevClick={() =>
                    setMultichainProductTourStep(multichainProductTourStep - 1)
                  }
                  onClick={() => {
                    hideProductTour();
                  }}
                  positionObj={productTourDirection === 'rtl' ? '89%' : '0%'}
                  productTourDirection={productTourDirection}
                />
              ) : null}
            </Box>
          ) : (
            <Box
              display={DISPLAY.FLEX}
              className={`multichain-app-header__lock-contents ${
                isUnlocked && !popupStatus ? 'multichain-app-header-shadow' : ''
              }`}
              alignItems={AlignItems.center}
              width={BLOCK_SIZES.FULL}
              justifyContent={JustifyContent.spaceBetween}
              backgroundColor={BackgroundColor.backgroundDefault}
              padding={2}
              gap={2}
            >
              <PickerNetwork
                label={currentNetwork?.nickname}
                src={currentNetwork?.rpcPrefs?.imageUrl}
                onClick={() => dispatch(toggleNetworkMenu())}
              />
              <MetafoxLogo
                unsetIconHeight
                onClick={async () => {
                  if (onClick) {
                    await onClick();
                  }
                  history.push(DEFAULT_ROUTE);
                }}
              />
            </Box>
          )}
        </>
      </Box>
    </>
  );
};

AppHeader.propTypes = {
  /**
   * The onClick handler to be passed to the MetaMask Logo in the App Header
   */
  onClick: PropTypes.func,
};
