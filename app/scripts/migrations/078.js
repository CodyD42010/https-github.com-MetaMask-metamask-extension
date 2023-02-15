import { cloneDeep } from 'lodash';

const version = 78;

/**
 * Remove collectiblesDropdownState and collectiblesDetectionNoticeDismissed:.
 */
export default {
  version,
  async migrate(originalVersionedData) {
    const versionedData = cloneDeep(originalVersionedData);
    versionedData.meta.version = version;
    const state = versionedData.data;
    const newState = transformState(state);
    versionedData.data = newState;
    return versionedData;
  },
};

function transformState(state) {
  if (state?.metamask?.collectiblesDetectionNoticeDismissed) {
    delete state.metamask.collectiblesDetectionNoticeDismissed;
  }
  if (state?.metamask?.collectiblesDropdownState) {
    delete state.metamask.collectiblesDropdownState;
  }
  return state;
}
