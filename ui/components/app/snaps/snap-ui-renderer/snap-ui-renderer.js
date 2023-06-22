import React from 'react';
import PropTypes from 'prop-types';
import { isComponent } from '@metamask/snaps-ui';
import { useSelector } from 'react-redux';
import MetaMaskTemplateRenderer from '../../metamask-template-renderer/metamask-template-renderer';
import {
  DISPLAY,
  FLEX_DIRECTION,
  TypographyVariant,
  OverflowWrap,
  FontWeight,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import { SnapDelineator } from '../snap-delineator';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import Box from '../../../ui/box';
import { getSnapName } from '../../../../helpers/utils/util';
import { getTargetSubjectMetadata } from '../../../../selectors';
import { Text } from '../../../component-library';
import { Copyable } from '../copyable';
import { DelineatorType } from '../../../../helpers/constants/snaps';

export const UI_MAPPING = {
  panel: (props, elementKey) => ({
    element: 'Box',
    children: props.children.map((element) =>
      // eslint-disable-next-line no-use-before-define
      mapToTemplate(element, elementKey),
    ),
    props: {
      display: DISPLAY.FLEX,
      flexDirection: FLEX_DIRECTION.COLUMN,
      className: 'snap-ui-renderer__panel',
    },
  }),
  heading: (props) => ({
    element: 'Typography',
    children: props.value,
    props: {
      variant: TypographyVariant.H4,
      fontWeight: FontWeight.Bold,
      overflowWrap: OverflowWrap.BreakWord,
    },
  }),
  text: (props) => ({
    element: 'SnapUIMarkdown',
    children: props.value,
  }),
  spinner: () => ({
    element: 'Spinner',
    props: {
      className: 'snap-ui-renderer__spinner',
    },
  }),
  divider: () => ({
    element: 'hr',
    props: {
      className: 'snap-ui-renderer__divider',
    },
  }),
  copyable: (props) => ({
    element: 'Copyable',
    props: {
      text: props.value,
    },
  }),
};

// TODO: Stop exporting this when we remove the mapToTemplate hack in confirmation templates.
export const mapToTemplate = (data, elementKeyIndex) => {
  const { type } = data;
  elementKeyIndex.value += 1;
  const indexKey = `snap_ui_element_${type}__${elementKeyIndex.value}`;
  const mapped = UI_MAPPING[type](data, elementKeyIndex);
  return { ...mapped, key: indexKey };
};

// Component that maps Snaps UI JSON format to MetaMask Template Renderer format
export const SnapUIRenderer = ({
  snapId,
  delineatorType = DelineatorType.Content,
  data,
}) => {
  const t = useI18nContext();
  const targetSubjectMetadata = useSelector((state) =>
    getTargetSubjectMetadata(state, snapId),
  );

  const snapName = getSnapName(snapId, targetSubjectMetadata);

  if (!isComponent(data)) {
    return (
      <SnapDelineator snapName={snapName} type={DelineatorType.Error}>
        <Text variant={TextVariant.bodySm} marginBottom={4}>
          {t('snapsUIError', [<b key="0">{snapName}</b>])}
        </Text>
        <Copyable text={t('snapsInvalidUIError')} />
      </SnapDelineator>
    );
  }

  const elementKeyIndex = { value: 0 };
  const sections = mapToTemplate(data, elementKeyIndex);

  return (
    <SnapDelineator snapName={snapName} type={delineatorType}>
      <Box className="snap-ui-renderer__content">
        <MetaMaskTemplateRenderer sections={sections} />
      </Box>
    </SnapDelineator>
  );
};

SnapUIRenderer.propTypes = {
  snapId: PropTypes.string,
  delineatorType: PropTypes.string,
  data: PropTypes.object,
};
