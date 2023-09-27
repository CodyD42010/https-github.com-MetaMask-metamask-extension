/* eslint-disable @typescript-eslint/ban-ts-comment */

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NameControllerState,
  NameEntry,
  NameType,
} from '@metamask/name-controller';
import { useDispatch, useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import { toChecksumAddress } from 'ethereumjs-util';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  FormTextField,
  IconName,
  Label,
  Modal,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '../../../component-library';
import {
  AlignItems,
  BlockSize,
  Display,
  FlexDirection,
  IconColor,
  JustifyContent,
} from '../../../../helpers/constants/design-system';
import Name from '../name';
import FormComboField, {
  FormComboFieldOption,
} from '../../../ui/form-combo-field/form-combo-field';
import { getCurrentChainId, getNameSources } from '../../../../selectors';
import {
  setName as saveName,
  updateProposedNames,
} from '../../../../store/actions';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useName } from '../../../../hooks/useName';
import { I18nContext } from '../../../../contexts/i18n';
import { MetaMetricsContext } from '../../../../contexts/metametrics';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../../shared/constants/metametrics';

const UPDATE_DELAY = 1000 * 2; // 2 Seconds

export interface NameDetailsProps {
  onClose: () => void;
  type: NameType;
  value: string;
}

function formatValue(value: string, type: NameType): string {
  switch (type) {
    case NameType.ETHEREUM_ADDRESS:
      return toChecksumAddress(value);

    default:
      return value;
  }
}

function generateComboOptions(
  proposedNameEntries: NameEntry['proposedNames'],
  nameSources: NameControllerState['nameSources'],
): FormComboFieldOption[] {
  const sourceIds = Object.keys(proposedNameEntries);

  const sourceIdsWithProposedNames = sourceIds.filter(
    (sourceId) => proposedNameEntries[sourceId]?.proposedNames?.length,
  );

  const options = sourceIdsWithProposedNames
    .map((sourceId: string) => {
      const sourceProposedNames =
        proposedNameEntries[sourceId]?.proposedNames ?? [];

      return sourceProposedNames.map((proposedName: any) => ({
        primaryLabel: proposedName,
        secondaryLabel: nameSources[sourceId]?.label ?? sourceId,
        sourceId,
      }));
    })
    .flat();

  return options.sort((a, b) =>
    a.secondaryLabel
      .toLowerCase()
      .localeCompare(b.secondaryLabel.toLowerCase()),
  );
}

export default function NameDetails({
  onClose,
  type,
  value,
}: NameDetailsProps) {
  const {
    name: savedName,
    proposedNames,
    sourceId: savedSourceId,
  } = useName(value, type);

  const nameSources = useSelector(getNameSources, isEqual);
  const chainId = useSelector(getCurrentChainId);
  const [name, setName] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState<string>();
  const [selectedSourceName, setSelectedSourceName] = useState<string>();
  const dispatch = useDispatch();
  const t = useContext(I18nContext);
  const trackEvent = useContext(MetaMetricsContext);
  const hasSavedName = Boolean(savedName);
  const updateInterval = useRef<any>();
  const formattedValue = formatValue(value, type);

  const [copiedAddress, handleCopyAddress] = useCopyToClipboard() as [
    boolean,
    (value: string) => void,
  ];

  useEffect(() => {
    setName(savedName ?? '');
    setSelectedSourceId(savedSourceId ?? undefined);
    setSelectedSourceName(savedSourceId ? savedName ?? undefined : undefined);
  }, [savedName, savedSourceId, setName, setSelectedSourceId]);

  useEffect(() => {
    const reset = () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };

    const update = () => {
      dispatch(
        updateProposedNames({
          value,
          type,
          onlyUpdateAfterDelay: true,
          variation: chainId,
        }),
      );
    };

    reset();
    update();

    updateInterval.current = setInterval(update, UPDATE_DELAY);
    return reset;
  }, [value, type, chainId, dispatch]);

  const proposedNameOptions = useMemo(
    () => generateComboOptions(proposedNames, nameSources),
    [proposedNames, nameSources],
  );

  const trackPetnamesEvent = useCallback(
    async (
      event: MetaMetricsEventName,
      additionalProperties: Record<string, any>,
    ) => {
      const suggestedNameSources = [
        ...new Set(proposedNameOptions.map((option: any) => option.sourceId)),
      ];

      const properties: Record<string, any> = {
        petname_category: type,
        suggested_names_sources: suggestedNameSources,
        ...additionalProperties,
      };

      trackEvent({
        event,
        category: MetaMetricsEventCategory.Petnames,
        properties,
      });
    },
    [trackEvent, proposedNameOptions, type],
  );

  const trackPetnamesSaveEvent = useCallback(() => {
    const petnameSource = selectedSourceId ?? null;

    if (hasSavedName && !name?.length) {
      trackPetnamesEvent(MetaMetricsEventName.PetnameDeleted, {
        petname_previous_source: savedSourceId,
      });
      return;
    }

    if (hasSavedName && name?.length) {
      trackPetnamesEvent(MetaMetricsEventName.PetnameUpdated, {
        petname_previous_source: savedSourceId,
        petname_source: petnameSource,
      });
      return;
    }

    trackPetnamesEvent(MetaMetricsEventName.PetnameCreated, {
      petname_source: petnameSource,
    });
  }, [hasSavedName, name, savedSourceId, selectedSourceId, trackPetnamesEvent]);

  const trackPetnamesOpenEvent = useCallback(() => {
    trackPetnamesEvent(MetaMetricsEventName.PetnameModalOpened, {
      has_petname: hasSavedName,
    });
  }, [hasSavedName, trackPetnamesEvent]);

  useEffect(() => {
    trackPetnamesOpenEvent();
  }, []);

  const handleSaveClick = useCallback(async () => {
    trackPetnamesSaveEvent();

    await dispatch(
      saveName({
        value,
        type,
        name: name?.length ? name : null,
        sourceId: selectedSourceId,
        variation: chainId,
      }),
    );

    onClose();
  }, [name, selectedSourceId, onClose, trackPetnamesEvent, chainId]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose, trackPetnamesEvent]);

  const handleNameChange = useCallback(
    (newName: string) => {
      setName(newName);

      if (newName !== selectedSourceName) {
        setSelectedSourceId(undefined);
        setSelectedSourceName(undefined);
      }
    },
    [setName, selectedSourceId],
  );

  const handleProposedNameClick = useCallback(
    (option: any) => {
      setSelectedSourceId(option.sourceId);
      setSelectedSourceName(option.primaryLabel);
    },
    [setSelectedSourceId, setSelectedSourceName],
  );

  const handleCopyClick = useCallback(() => {
    handleCopyAddress(formattedValue);
  }, [handleCopyAddress, formattedValue]);

  return (
    <Box>
      <Modal isOpen onClose={handleClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader onClose={handleClose} onBack={handleClose}>
            {hasSavedName ? t('nameModalTitleSaved') : t('nameModalTitleNew')}
          </ModalHeader>
          <div style={{ textAlign: 'center', marginBottom: 16, marginTop: 8 }}>
            <Name value={value} type={NameType.ETHEREUM_ADDRESS} disableEdit />
          </div>
          <Text marginBottom={4} justifyContent={JustifyContent.spaceBetween}>
            {hasSavedName
              ? t('nameInstructionsSaved')
              : t('nameInstructionsNew')}
          </Text>
          <hr className="name-details__line" />
          {/* @ts-ignore */}
          <FormTextField
            id="address"
            className="name-details__address"
            label={t('nameAddressLabel')}
            value={formattedValue}
            marginBottom={4}
            disabled
            endAccessory={
              <ButtonIcon
                display={Display.Flex}
                iconName={copiedAddress ? IconName.CopySuccess : IconName.Copy}
                size={ButtonIconSize.Sm}
                onClick={handleCopyClick}
                color={IconColor.iconMuted}
                ariaLabel={t('copyAddress')}
              />
            }
          />
          <Label
            flexDirection={FlexDirection.Column}
            alignItems={AlignItems.flexStart}
            marginBottom={2}
            className="name-details__display-name"
          >
            {t('nameLabel')}
            <FormComboField
              value={name}
              options={proposedNameOptions}
              placeholder={t('nameSetPlaceholder')}
              noOptionsText={t('nameNoProposedNames')}
              onChange={handleNameChange}
              onOptionClick={handleProposedNameClick}
            />
          </Label>
          <hr className="name-details__line" />
          <Button
            variant={ButtonVariant.Primary}
            startIconName={hasSavedName ? undefined : IconName.Save}
            width={BlockSize.Full}
            onClick={handleSaveClick}
          >
            {hasSavedName ? t('ok') : t('save')}
          </Button>
        </ModalContent>
      </Modal>
    </Box>
  );
}
