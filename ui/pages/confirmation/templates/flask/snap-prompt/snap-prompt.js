import { TYPOGRAPHY } from '../../../../../helpers/constants/design-system';
import { MESSAGE_TYPE } from '../../../../../../shared/constants/app';

function getValues(pendingApproval, t, actions, _history, setInputState) {
  const { title, description } = pendingApproval.requestData;

  return {
    content: [
      {
        element: 'Typography',
        key: 'title',
        children: title,
        props: {
          variant: TYPOGRAPHY.H3,
          align: 'center',
          fontWeight: 'bold',
          boxProps: {
            margin: [0, 0, 4],
          },
        },
      },
      ...(description
        ? [
            {
              element: 'Typography',
              key: 'subtitle',
              children: description,
              props: {
                variant: TYPOGRAPHY.H6,
                align: 'center',
                boxProps: {
                  margin: [0, 0, 4],
                },
              },
            },
          ]
        : []),
      {
        element: 'div',
        key: 'snap-prompt-container',
        children: {
          element: 'TextField',
          key: 'snap-prompt-input',
          props: {
            className: 'snap-prompt-input',
            max: 300,
            onChange: (event) => {
              const inputValue = event.target.value ?? '';
              setInputState(MESSAGE_TYPE.SNAP_DIALOG_PROMPT, inputValue);
            },
            theme: 'bordered',
          },
        },
        props: {
          className: 'snap-prompt',
        },
      },
    ],
    cancelText: t('cancel'),
    submitText: t('submit'),
    onSubmit: (inputValue) =>
      actions.resolvePendingApproval(pendingApproval.id, inputValue),
    onCancel: () => actions.rejectPendingApproval(pendingApproval.id),
  };
}

const snapConfirm = {
  getValues,
};

export default snapConfirm;
