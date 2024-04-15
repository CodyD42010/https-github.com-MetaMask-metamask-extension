import React from 'react';
import classnames from 'classnames';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
} from '../../../../../components/component-library';
import {
  AlignItems,
  BackgroundColor,
  BorderRadius,
  Display,
  Severity,
  TextColor,
  TextVariant,
} from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';

export type InlineAlertProps = {
  /** The onClick handler for the inline alerts */
  onClick?: () => void;
  /** The severity of the alert, e.g. Severity.Warning */
  severity?: Severity;
};

function getSeverityBackground(severity: Severity): BackgroundColor {
  switch (severity) {
    case Severity.Danger:
      return BackgroundColor.errorMuted;
    case Severity.Warning:
      return BackgroundColor.warningMuted;
    // Defaults to Severity.Info
    default:
      return BackgroundColor.primaryMuted;
  }
}

export default function InlineAlert({
  onClick,
  severity = Severity.Info,
}: InlineAlertProps) {
  const t = useI18nContext();

  return (
    <Box>
      <Box
        data-testid="inlineAlert"
        backgroundColor={getSeverityBackground(severity)}
        borderRadius={BorderRadius.SM}
        gap={1}
        display={Display.InlineFlex}
        alignItems={AlignItems.center}
        className={classnames({
          'inline-alert': true,
          'inline-alert__info': severity === Severity.Info,
          'inline-alert__warning': severity === Severity.Warning,
          'inline-alert__danger': severity === Severity.Danger,
        })}
        onClick={onClick}
      >
        <Icon
          name={severity === Severity.Info ? IconName.Info : IconName.Danger}
          size={IconSize.Sm}
        />
        <Text variant={TextVariant.bodySm} color={TextColor.inherit}>
          {t('inlineAlert')}
        </Text>
        <Icon name={IconName.ArrowRight} size={IconSize.Xs} />
      </Box>
    </Box>
  );
}
