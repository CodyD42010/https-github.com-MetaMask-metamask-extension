import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useI18nContext } from '../../../hooks/useI18nContext';
import Popover from '../../ui/popover/popover.component';
import { NetworkListItem } from '../network-list-item';
import {
  setActiveNetwork,
  showModal,
  setShowTestNetworks,
  setProviderType,
  toggleNetworkMenu,
} from '../../../store/actions';
import { CHAIN_IDS, TEST_CHAINS } from '../../../../shared/constants/network';
import {
  getShowTestNetworks,
  getAllEnabledNetworks,
  getCurrentChainId,
} from '../../../selectors';
import Box from '../../ui/box/box';
import ToggleButton from '../../ui/toggle-button';
import {
  DISPLAY,
  JustifyContent,
} from '../../../helpers/constants/design-system';
import { Button, BUTTON_VARIANT, Text } from '../../component-library';
import { ADD_POPULAR_CUSTOM_NETWORK } from '../../../helpers/constants/routes';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_FULLSCREEN } from '../../../../shared/constants/app';

const UNREMOVABLE_CHAIN_IDS = [CHAIN_IDS.MAINNET, ...TEST_CHAINS];

export const NetworkListMenu = ({ onClose }) => {
  const t = useI18nContext();
  const networks = useSelector(getAllEnabledNetworks);
  const showTestNetworks = useSelector(getShowTestNetworks);
  const currentChainId = useSelector(getCurrentChainId);
  const dispatch = useDispatch();
  const history = useHistory();

  const environmentType = getEnvironmentType();
  const isFullScreen = environmentType === ENVIRONMENT_TYPE_FULLSCREEN;

  return (
    <Popover onClose={onClose} centerTitle title={t('networkMenuHeading')}>
      <>
        <Box className="multichain-network-list-menu">
          {networks.map((network) => {
            const isCurrentNetwork = currentChainId === network.chainId;
            const canDeleteNetwork =
              !isCurrentNetwork &&
              !UNREMOVABLE_CHAIN_IDS.includes(network.chainId);

            return (
              <NetworkListItem
                name={network.nickname}
                iconSrc={network?.rpcPrefs?.imageUrl}
                key={network.id || network.chainId}
                selected={isCurrentNetwork}
                onClick={() => {
                  dispatch(toggleNetworkMenu());
                  if (network.providerType) {
                    dispatch(setProviderType(network.providerType));
                  } else {
                    dispatch(setActiveNetwork(network.id));
                  }
                }}
                onDeleteClick={
                  canDeleteNetwork
                    ? () => {
                        dispatch(toggleNetworkMenu());
                        dispatch(
                          showModal({
                            name: 'CONFIRM_DELETE_NETWORK',
                            target: network.id || network.chainId,
                            onConfirm: () => undefined,
                          }),
                        );
                      }
                    : null
                }
              />
            );
          })}
        </Box>
        <Box
          padding={4}
          display={DISPLAY.FLEX}
          justifyContent={JustifyContent.spaceBetween}
        >
          <Text>{t('showTestnetNetworks')}</Text>
          <ToggleButton
            value={showTestNetworks}
            onToggle={(value) => dispatch(setShowTestNetworks(!value))}
          />
        </Box>
        <Box padding={4}>
          <Button
            variant={BUTTON_VARIANT.SECONDARY}
            block
            onClick={() => {
              isFullScreen
                ? history.push(ADD_POPULAR_CUSTOM_NETWORK)
                : global.platform.openExtensionInBrowser(
                    ADD_POPULAR_CUSTOM_NETWORK,
                  );
              dispatch(toggleNetworkMenu());
            }}
          >
            {t('addNetwork')}
          </Button>
        </Box>
      </>
    </Popover>
  );
};

NetworkListMenu.propTypes = {
  /**
   * Executes when the menu should be closed
   */
  onClose: PropTypes.func.isRequired,
};
