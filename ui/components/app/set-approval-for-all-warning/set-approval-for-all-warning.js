import React from 'react';
import PropTypes from 'prop-types';
import { useI18nContext } from '../../../hooks/useI18nContext';

import Popover from '../../ui/popover';
import Box from '../../ui/box';
import Button from '../../ui/button';
import Typography from '../../ui/typography';
import {
  DISPLAY,
  FLEX_DIRECTION,
  FONT_WEIGHT,
  JustifyContent,
  TextColor,
  TypographyVariant,
} from '../../../helpers/constants/design-system';
import Identicon from '../../ui/identicon';
import { shortenAddress } from '../../../helpers/utils/util';

const SetApproveForAllWarning = ({
  collectionName,
  senderAddress,
  name,
  total,
  isERC721,
  onSubmit,
  onCancel,
}) => {
  const t = useI18nContext();

  const footer = (
    <Box
      display={DISPLAY.FLEX}
      flexDirection={FLEX_DIRECTION.COLUMN}
      justifyContent={JustifyContent.SPACE_BETWEEN}
      className="set-approval-for-all-warning__footer"
    >
      <Button
        className="set-approval-for-all-warning__footer__approve-button"
        type="danger-primary"
        onClick={onSubmit}
      >
        {t('approveButtonText')}
      </Button>
      <Button
        className="set-approval-for-all-warning__footer__cancel-button"
        type="secondary"
        onClick={onCancel}
      >
        {t('reject')}
      </Button>
    </Box>
  );

  return (
    <Popover className="set-approval-for-all-warning__content" footer={footer}>
      <Box
        display={DISPLAY.FLEX}
        flexDirection={FLEX_DIRECTION.ROW}
        padding={4}
        className="set-approval-for-all-warning__content__header"
      >
        <i className="fa fa-exclamation-triangle set-approval-for-all-warning__content__header__warning-icon" />
        <Typography
          variant={TypographyVariant.H4}
          fontWeight={FONT_WEIGHT.BOLD}
        >
          {t('yourNFTmayBeAtRisk')}
        </Typography>
      </Box>
      <Box
        display={DISPLAY.FLEX}
        padding={4}
        justifyContent={JustifyContent.spaceBetween}
        className="set-approval-for-all-warning__content__account"
      >
        <Box display={DISPLAY.FLEX}>
          <Identicon address={senderAddress} diameter={32} />
          <Typography
            variant={TypographyVariant.H5}
            marginLeft={2}
            className="set-approval-for-all-warning__content__account-name"
          >
            <b>{name}</b> {` (${shortenAddress(senderAddress)})`}
          </Typography>
        </Box>
        {isERC721 && total && (
          <Typography>{`${t('total')}: ${total}`}</Typography>
        )}
      </Box>

      <Typography
        color={TextColor.textAlternative}
        margin={4}
        marginTop={4}
        marginBottom={4}
        variant={TypographyVariant.H6}
      >
        {t('nftWarningContent', [
          <strong
            key="non_custodial_bold"
            className="set-approval-for-all-warning__content__bold"
          >
            {t('nftWarningContentBold', [collectionName])}
          </strong>,
          <strong key="non_custodial_grey">
            {t('nftWarningContentGrey')}
          </strong>,
        ])}
      </Typography>
    </Popover>
  );
};

SetApproveForAllWarning.propTypes = {
  /**
   * NFT collection name that is being approved
   */
  collectionName: PropTypes.string,
  /**
   * Address of a current user that is approving collection
   */
  senderAddress: PropTypes.string,
  /**
   * Name of a current user that is approving collection
   */
  name: PropTypes.string,
  /**
   * Total number of items that are being approved
   */
  total: PropTypes.string,
  /**
   * Is asset standard ERC721
   */
  isERC721: PropTypes.bool,
  /**
   * Function that approves collection
   */
  onSubmit: PropTypes.func,
  /**
   * Function that rejects collection
   */
  onCancel: PropTypes.func,
};

export default SetApproveForAllWarning;
