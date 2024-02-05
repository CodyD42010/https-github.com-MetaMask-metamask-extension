import React from 'react';

import { Footer } from '../../components/app/confirm/footer';
import { Header } from '../../components/app/confirm/header';
///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
import { MMISignatureSection } from '../../components/app/confirm/mmi-signature-section';
///: END:ONLY_INCLUDE_IF
import { SenderInfo } from '../../components/app/confirm/sender-info';
import { SignatureMessage } from '../../components/app/confirm/signature-message';
import { ConfirmTitle } from '../../components/app/confirm/title';
import { Box } from '../../components/component-library';
import {
  BackgroundColor,
  BlockSize,
  Display,
  FlexDirection,
  JustifyContent,
} from '../../helpers/constants/design-system';
import setCurrentConfirmation from '../../hooks/confirm/setCurrentConfirmation';
import syncConfirmPath from '../../hooks/confirm/syncConfirmPath';

const Confirm = () => {
  setCurrentConfirmation();
  syncConfirmPath();

  return (
    <Box
      backgroundColor={BackgroundColor.backgroundAlternative}
      display={Display.Flex}
      flexDirection={FlexDirection.Column}
      justifyContent={JustifyContent.spaceBetween}
      height={BlockSize.Full}
      width={BlockSize.Full}
    >
      <Box>
        <Header />
        {
          ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
          <MMISignatureSection />
          ///: END:ONLY_INCLUDE_IF
        }
        <Box paddingInline={4}>
          <ConfirmTitle />
          <SenderInfo />
          <SignatureMessage />
        </Box>
      </Box>
      <Footer />
    </Box>
  );
};

export default Confirm;
