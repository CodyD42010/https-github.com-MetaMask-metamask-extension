import React from 'react';

import { Content, Page } from '../../../components/multichain/pages/page';
import { BackgroundColor } from '../../../helpers/constants/design-system';
import { Footer } from '../components/confirm/footer';
import { Header } from '../components/confirm/header';
///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
import { MMISignatureSection } from '../components/confirm/mmi-signature-section';
///: END:ONLY_INCLUDE_IF
import { Info } from '../components/confirm/info';
import { SignatureMessage } from '../components/confirm/signature-message';
import { Title } from '../components/confirm/title';
import setCurrentConfirmation from '../hooks/setCurrentConfirmation';
import syncConfirmPath from '../hooks/syncConfirmPath';

const Confirm = () => {
  setCurrentConfirmation();
  syncConfirmPath();

  return (
    <Page>
      <Header />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
        <MMISignatureSection />
        ///: END:ONLY_INCLUDE_IF
      }
      <Content backgroundColor={BackgroundColor.backgroundAlternative}>
        <Title />
        <Info />
        <SignatureMessage />
      </Content>
      <Footer />
    </Page>
  );
};

export default Confirm;
