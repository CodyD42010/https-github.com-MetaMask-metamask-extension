export enum DelineatorType {
  Content = 'content',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Error = 'error',
  Insights = 'insights',
  Description = 'description',
  ///: BEGIN:ONLY_INCLUDE_IF(build-flask)
  Warning = 'warning',
  ///: END:ONLY_INCLUDE_IF
}

export const getDelineatorTitle = (type: DelineatorType) => {
  switch (type) {
    case DelineatorType.Error:
      return 'errorWithSnap';
    case DelineatorType.Insights:
      return 'insightsFromSnap';
    case DelineatorType.Description:
      return 'descriptionFromSnap';
    case DelineatorType.Warning:
      return 'warningFromSnap';
    default:
      return 'contentFromSnap';
  }
};
