import { createSelector } from 'reselect';
import { mmiActionsFactory } from '../../store/institutional/institution-background';

// MMI
// Actions
const createComplianceActionType = (action) =>
  `metamask/institutional-features/compliance/${action}`;

const SET_HISTORICAL_REPORTS = createComplianceActionType(
  'SET_HISTORICAL_REPORTS',
);

// Initial state
const initState = {
  historicalReports: {},
  complianceProjectId: '',
  complianceClientId: '',
  reportsInProgress: {},
};

export default function reducer(state = initState, action = {}) {
  switch (action.type) {
    case SET_HISTORICAL_REPORTS:
      return {
        ...state,
        historicalReports: {
          [action.payload.address]: [...action.payload.reports],
        },
      };
    default:
      return state;
  }
}

// Selectors
export const getComplianceProjectId = (state) =>
  state.metamask.institutionalFeatures?.complianceProjectId;
export const getComplianceClientId = (state) =>
  state.metamask.institutionalFeatures?.complianceClientId;
export const getComplianceTenantSubdomain = (state) =>
  state.metamask.institutionalFeatures?.complianceTenantSubdomain;
export const getComplianceHistoricalReports = (state) =>
  state.institutionalFeatures?.historicalReports;
export const getComplianceReportsInProgress = (state) =>
  state.metamask.institutionalFeatures?.reportsInProgress;
export const getInstitutionalConnectRequests = (state) =>
  state.metamask.institutionalFeatures?.connectRequests;
export const complianceActivated = (state) =>
  Boolean(state.metamask.institutionalFeatures?.complianceProjectId);

export const getComplianceHistoricalReportsByAddress = (address) =>
  createSelector(getComplianceHistoricalReports, (reports) =>
    reports ? reports[address] : [undefined],
  );

export const getComplianceReportsInProgressByAddress = (address) =>
  createSelector(getComplianceReportsInProgress, (reports) =>
    reports ? reports[address.toLowerCase()] : undefined,
  );

export function fetchHistoricalReports(address, testProjectId = undefined) {
  return async (dispatch, getState) => {
    const state = getState();
    let projectId;

    // testProjectId is provided to make a test request, which checks if projectId is correct
    if (!testProjectId) {
      projectId = getComplianceProjectId(state);
      if (!projectId) {
        return;
      }
    }

    const mmiActions = mmiActionsFactory();

    const result = await dispatch(
      mmiActions.getComplianceHistoricalReportsByAddress(address, projectId),
    );

    dispatch(
      mmiActions.syncReportsInProgress({
        address,
        historicalReports: result.items ? result.items : [],
      }),
    );

    dispatch({
      type: SET_HISTORICAL_REPORTS,
      payload: {
        address,
        reports: result.items
          ? result.items.filter((report) => report.status !== 'inProgress')
          : [],
      },
    });
  };
}

export function generateComplianceReport(address) {
  const mmiActions = mmiActionsFactory();
  return async (dispatch, _getState) => {
    dispatch(mmiActions.generateComplianceReport(address));
  };
}
