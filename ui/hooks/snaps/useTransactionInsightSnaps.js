import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getTransactionOriginCaveat } from '@metamask/snaps-controllers';
import { handleSnapRequest } from '../../store/actions';
import { getPermissionSubjectsDeepEqual } from '../../selectors';

const INSIGHT_PERMISSION = 'endowment:transaction-insight';

export function useTransactionInsightSnaps({
  transaction,
  chainId,
  origin,
  insightSnaps,
  ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-mmi,build-beta)
  insightSnapId = '',
  ///: END:ONLY_INCLUDE_IN
}) {
  const subjects = useSelector(getPermissionSubjectsDeepEqual);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(undefined);
  ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
  const [hasFetchedV2Insight, setHasFetchedV2Insight] = useState(false);
  ///: END:ONLY_INCLUDE_IN
  useEffect(() => {
    let cancelled = false;

    async function fetchInsight() {
      ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
      if (hasFetchedV2Insight) {
        setLoading(false);
        return;
      }
      ///: END:ONLY_INCLUDE_IN
      setLoading(true);

      let snapIds = insightSnaps.map((snap) => snap.id);
      ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-mmi,build-beta)
      if (insightSnapId.length > 0) {
        snapIds = [insightSnapId];
      }
      ///: END:ONLY_INCLUDE_IN
      const newData = await Promise.allSettled(
        snapIds.map((snapId) => {
          const permission = subjects[snapId]?.permissions[INSIGHT_PERMISSION];
          if (!permission) {
            return Promise.reject(
              new Error(
                'This Snap does not have the transaction insight endowment.',
              ),
            );
          }

          const hasTransactionOriginCaveat =
            getTransactionOriginCaveat(permission);
          const transactionOrigin = hasTransactionOriginCaveat ? origin : null;
          return handleSnapRequest({
            snapId,
            origin: '',
            handler: 'onTransaction',
            request: {
              jsonrpc: '2.0',
              method: '',
              params: { transaction, chainId, transactionOrigin },
            },
          });
        }),
      );

      const reformattedData = newData.map((promise, idx) => {
        const snapId = snapIds[idx];
        if (promise.status === 'rejected') {
          return {
            error: promise.reason,
            snapId,
          };
        }
        return {
          snapId,
          response: promise.value,
        };
      });

      if (!cancelled) {
        setData(reformattedData);
        setLoading(false);
        ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
        setHasFetchedV2Insight(true);
        ///: END:ONLY_INCLUDE_IN
      }
    }
    if (transaction) {
      fetchInsight();
    }
    return () => {
      cancelled = true;
    };
  }, [
    transaction,
    chainId,
    origin,
    subjects,
    insightSnaps,
    ///: BEGIN:ONLY_INCLUDE_IN(build-main,build-mmi,build-beta)
    insightSnapId,
    ///: END:ONLY_INCLUDE_IN
    ///: BEGIN:ONLY_INCLUDE_IN(build-flask)
    hasFetchedV2Insight,
    ///: END:ONLY_INCLUDE_IN
  ]);

  return { data, loading };
}
