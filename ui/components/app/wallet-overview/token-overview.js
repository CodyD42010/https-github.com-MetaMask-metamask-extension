import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import CurrencyDisplay from '../../ui/currency-display';
import { I18nContext } from '../../../contexts/i18n';
import { isHardwareKeyring } from '../../../helpers/utils/hardware';
import {
  SEND_ROUTE,
  BUILD_QUOTE_ROUTE,
} from '../../../helpers/constants/routes';
import { useTokenTracker } from '../../../hooks/useTokenTracker';
import { useTokenFiatAmount } from '../../../hooks/useTokenFiatAmount';
import { startNewDraftTransaction } from '../../../ducks/send';
import { setSwapsFromToken } from '../../../ducks/swaps/swaps';
import {
  getCurrentKeyring,
  getIsSwapsChain,
  getIsBuyableChain,
  getIsBridgeToken,
  getCurrentChainId,
  getMetaMetricsId,
} from '../../../selectors';

import IconButton from '../../ui/icon-button';
import { INVALID_ASSET_TYPE } from '../../../helpers/constants/error-keys';
import { showModal } from '../../../store/actions';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsContextProp,
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  MetaMetricsSwapsEventSource,
} from '../../../../shared/constants/metametrics';
import { AssetType } from '../../../../shared/constants/transaction';
import useRamps from '../../../hooks/experiences/useRamps';

import {
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconName,
} from '../../component-library';
import { IconColor } from '../../../helpers/constants/design-system';

import { getPortfolioUrl } from '../../../helpers/utils/portfolio';
import WalletOverview from './wallet-overview';

const TokenOverview = ({ className, token }) => {
  const dispatch = useDispatch();
  const t = useContext(I18nContext);
  const trackEvent = useContext(MetaMetricsContext);
  const history = useHistory();
  const keyring = useSelector(getCurrentKeyring);
  const usingHardwareWallet = isHardwareKeyring(keyring.type);
  const { tokensWithBalances } = useTokenTracker([token]);
  const balanceToRender = tokensWithBalances[0]?.string;
  const balance = tokensWithBalances[0]?.balance;
  const formattedFiatBalance = useTokenFiatAmount(
    token.address,
    balanceToRender,
    token.symbol,
  );
  const chainId = useSelector(getCurrentChainId);
  const isSwapsChain = useSelector(getIsSwapsChain);
  const isBridgeToken = useSelector(getIsBridgeToken(token.address));
  const isBuyableChain = useSelector(getIsBuyableChain);
  const metaMetricsId = useSelector(getMetaMetricsId);

  const { openBuyCryptoInPdapp } = useRamps();

  useEffect(() => {
    if (token.isERC721) {
      dispatch(
        showModal({
          name: 'CONVERT_TOKEN_TO_NFT',
          tokenAddress: token.address,
        }),
      );
    }
  }, [token.isERC721, token.address, dispatch]);

  return (
    <WalletOverview
      balance={
        <div className="token-overview__balance">
          <div className="token-overview__primary-container">
            <CurrencyDisplay
              style={{ display: 'contents' }}
              className="token-overview__primary-balance"
              displayValue={balanceToRender}
              suffix={token.symbol}
            />
            <ButtonIcon
              className="token-overview__portfolio-button"
              data-testid="home__portfolio-site"
              color={IconColor.primaryDefault}
              iconName={IconName.Diagram}
              ariaLabel={t('portfolio')}
              size={ButtonIconSize.Lg}
              onClick={() => {
                const portfolioUrl = getPortfolioUrl('', 'ext', metaMetricsId);
                global.platform.openTab({
                  url: portfolioUrl,
                });
                trackEvent(
                  {
                    category: MetaMetricsEventCategory.Home,
                    event: MetaMetricsEventName.PortfolioLinkClicked,
                    properties: {
                      url: portfolioUrl,
                    },
                  },
                  {
                    contextPropsIntoEventProperties: [
                      MetaMetricsContextProp.PageTitle,
                    ],
                  },
                );
              }}
            />
          </div>
          {formattedFiatBalance ? (
            <CurrencyDisplay
              className="token-overview__secondary-balance"
              displayValue={formattedFiatBalance}
              hideLabel
            />
          ) : null}
        </div>
      }
      buttons={
        <>
          <IconButton
            className="token-overview__button"
            Icon={<Icon name={IconName.Add} color={IconColor.primaryInverse} />}
            label={t('buy')}
            data-testid="token-overview-buy"
            onClick={() => {
              openBuyCryptoInPdapp();
              trackEvent({
                event: MetaMetricsEventName.NavBuyButtonClicked,
                category: MetaMetricsEventCategory.Navigation,
                properties: {
                  location: 'Token Overview',
                  text: 'Buy',
                  chain_id: chainId,
                  token_symbol: token.symbol,
                },
              });
            }}
            disabled={token.isERC721 || !isBuyableChain}
          />
          <IconButton
            className="token-overview__button"
            onClick={async () => {
              trackEvent({
                event: MetaMetricsEventName.NavSendButtonClicked,
                category: MetaMetricsEventCategory.Navigation,
                properties: {
                  token_symbol: token.symbol,
                  location: MetaMetricsSwapsEventSource.TokenView,
                  text: 'Send',
                  chain_id: chainId,
                },
              });
              try {
                await dispatch(
                  startNewDraftTransaction({
                    type: AssetType.token,
                    details: token,
                  }),
                );
                history.push(SEND_ROUTE);
              } catch (err) {
                if (!err.message.includes(INVALID_ASSET_TYPE)) {
                  throw err;
                }
              }
            }}
            Icon={
              <Icon
                name={IconName.Arrow2UpRight}
                color={IconColor.primaryInverse}
              />
            }
            label={t('send')}
            data-testid="eth-overview-send"
            disabled={token.isERC721}
          />
          {isSwapsChain && (
            <IconButton
              className="token-overview__button"
              Icon={
                <Icon
                  name={IconName.SwapHorizontal}
                  color={IconColor.primaryInverse}
                />
              }
              onClick={() => {
                trackEvent({
                  event: MetaMetricsEventName.NavSwapButtonClicked,
                  category: MetaMetricsEventCategory.Swaps,
                  properties: {
                    token_symbol: token.symbol,
                    location: MetaMetricsSwapsEventSource.TokenView,
                    text: 'Swap',
                    chain_id: chainId,
                  },
                });
                dispatch(
                  setSwapsFromToken({
                    ...token,
                    address: token.address.toLowerCase(),
                    iconUrl: token.image,
                    balance,
                    string: balanceToRender,
                  }),
                );
                if (usingHardwareWallet) {
                  global.platform.openExtensionInBrowser(BUILD_QUOTE_ROUTE);
                } else {
                  history.push(BUILD_QUOTE_ROUTE);
                }
              }}
              label={t('swap')}
              tooltipRender={null}
            />
          )}
          {isBridgeToken && (
            <IconButton
              className="token-overview__button"
              data-testid="token-overview-bridge"
              Icon={
                <Icon name={IconName.Bridge} color={IconColor.primaryInverse} />
              }
              label={t('bridge')}
              onClick={() => {
                const portfolioUrl = getPortfolioUrl(
                  'bridge',
                  'ext_bridge_button',
                  metaMetricsId,
                );
                global.platform.openTab({
                  url: `${portfolioUrl}&token=${token.address}`,
                });
                trackEvent({
                  category: MetaMetricsEventCategory.Navigation,
                  event: MetaMetricsEventName.BridgeLinkClicked,
                  properties: {
                    location: 'Token Overview',
                    text: 'Bridge',
                    url: portfolioUrl,
                    chain_id: chainId,
                    token_symbol: token.symbol,
                  },
                });
              }}
              tooltipRender={null}
            />
          )}
        </>
      }
      className={className}
    />
  );
};

TokenOverview.propTypes = {
  className: PropTypes.string,
  token: PropTypes.shape({
    address: PropTypes.string.isRequired,
    decimals: PropTypes.number,
    symbol: PropTypes.string,
    image: PropTypes.string,
    isERC721: PropTypes.bool,
  }).isRequired,
};

TokenOverview.defaultProps = {
  className: undefined,
};

export default TokenOverview;
