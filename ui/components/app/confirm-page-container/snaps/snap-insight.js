import React, {
  ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
  useEffect,
  ///: END:ONLY_INCLUDE_IN
} from 'react';

import PropTypes from 'prop-types';

import {
  useSelector,
  ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
  useDispatch,
  ///: END:ONLY_INCLUDE_IN
} from 'react-redux';
import Preloader from '../../../ui/icon/preloader/preloader-icon.component';
import { Text } from '../../../component-library';
import {
  AlignItems,
  FLEX_DIRECTION,
  JustifyContent,
  TextAlign,
  TextColor,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import Box from '../../../ui/box/box';
import { SnapUIRenderer } from '../../snaps/snap-ui-renderer';
import { SnapDelineator } from '../../snaps/snap-delineator';
import { DelineatorType } from '../../../../helpers/constants/snaps';
import { getSnapName } from '../../../../helpers/utils/util';
import { Copyable } from '../../snaps/copyable';
import { getTargetSubjectMetadata } from '../../../../selectors';
///: BEGIN:ONLY_INCLUDE_IN(build-flask)
import { trackInsightSnapUsage } from '../../../../store/actions';
///: END:ONLY_INCLUDE_IN
///: BEGIN:ONLY_INCLUDE_IN(build-main,build-mmi,build-beta)
import { useTransactionInsightSnaps } from '../../../../hooks/snaps/useTransactionInsightSnaps';
///: END:ONLY_INCLUDE_IN

export const SnapInsight = ({
  data,
  loading,
  ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-mmi,build-beta)
  insightHookParams,
  ///: END:ONLY_INCLUDE_IN
}) => {
  const t = useI18nContext();
  let error, snapId, content;
  let isLoading = loading;
  ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
  error = data?.error;
  snapId = data?.snapId;
  content = data?.response?.content;
  const dispatch = useDispatch();
  useEffect(() => {
    const trackInsightUsage = async () => {
      try {
        await dispatch(trackInsightSnapUsage(snapId));
      } catch {
        /** no-op */
      }
    };
    trackInsightUsage();
  }, [snapId, dispatch]);
  ///: END:ONLY_INCLUDE_IN

  ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-mmi,build-beta)
  const insights = useTransactionInsightSnaps(insightHookParams);
  error = insights.data?.error;
  snapId = insights.data?.snapId;
  content = insights.data?.response?.content;
  isLoading = insights.loading;
  ///: END:ONLY_INCLUDE_IN

  const targetSubjectMetadata = useSelector((state) =>
    getTargetSubjectMetadata(state, snapId),
  );

  const snapName = getSnapName(snapId, targetSubjectMetadata);

  const hasNoData =
    !error &&
    (isLoading || !content || (content && Object.keys(content).length === 0));
  return (
    <Box
      flexDirection={FLEX_DIRECTION.COLUMN}
      height="full"
      marginTop={hasNoData && 12}
      marginBottom={hasNoData && 12}
      alignItems={hasNoData && AlignItems.center}
      justifyContent={hasNoData && JustifyContent.center}
      textAlign={hasNoData && TextAlign.Center}
      className="snap-insight"
    >
      {!isLoading && !error && (
        <Box
          height="full"
          flexDirection={FLEX_DIRECTION.COLUMN}
          className="snap-insight__container"
        >
          {data && Object.keys(data).length > 0 ? (
            <SnapUIRenderer
              snapId={snapId}
              data={content}
              delineatorType={DelineatorType.Insights}
            />
          ) : (
            <Text
              color={TextColor.textAlternative}
              variant={TextVariant.bodySm}
              as="h6"
            >
              {t('snapsNoInsight')}
            </Text>
          )}
        </Box>
      )}

      {!isLoading && error && (
        <Box padding={4} className="snap-insight__container__error">
          <SnapDelineator snapName={snapName} type={DelineatorType.Error}>
            <Text variant={TextVariant.bodySm} marginBottom={4}>
              {t('snapsUIError', [<b key="0">{snapName}</b>])}
            </Text>
            <Copyable text={error.message} />
          </SnapDelineator>
        </Box>
      )}

      {isLoading && (
        <>
          <Preloader size={40} />
          <Text
            marginTop={3}
            color={TextColor.textAlternative}
            variant={TextVariant.bodySm}
            as="h6"
          >
            {t('snapsInsightLoading')}
          </Text>
        </>
      )}
    </Box>
  );
};

SnapInsight.propTypes = {
  /*
   * The insight object
   */
  data: PropTypes.object,
  /*
   * Boolean as to whether or not the insights are loading
   */
  loading: PropTypes.bool,
  ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-mmi,build-beta)
  /**
   * Params object for the useTransactionInsightSnaps hook
   */
  insightHookParams: PropTypes.object,
  ///: END:ONLY_INCLUDE_IN
};
