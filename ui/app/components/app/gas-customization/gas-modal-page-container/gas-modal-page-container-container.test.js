import assert from 'assert';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

let mapDispatchToProps;
let mergeProps;

const actionSpies = {
  hideModal: sinon.spy(),
  setGasLimit: sinon.spy(),
  setGasPrice: sinon.spy(),
};

const gasActionSpies = {
  setCustomGasPrice: sinon.spy(),
  setCustomGasLimit: sinon.spy(),
  resetCustomData: sinon.spy(),
};

const sendActionSpies = {
  hideGasButtonGroup: sinon.spy(),
};

proxyquire('./gas-modal-page-container.container.js', {
  'react-redux': {
    connect: (_, md, mp) => {
      mapDispatchToProps = md;
      mergeProps = mp;
      return () => ({});
    },
  },
  '../../../../selectors': {
    getBasicGasEstimateLoadingStatus: (s) =>
      `mockBasicGasEstimateLoadingStatus:${Object.keys(s).length}`,
    getRenderableBasicEstimateData: (s) =>
      `mockRenderableBasicEstimateData:${Object.keys(s).length}`,
    getDefaultActiveButtonIndex: (a, b) => a + b,
    getCurrentEthBalance: (state) => state.metamask.balance || '0x0',
    getSendToken: () => null,
    getTokenBalance: (state) => state.metamask.send.tokenBalance || '0x0',
  },
  '../../../../store/actions': actionSpies,
  '../../../../ducks/gas/gas.duck': gasActionSpies,
  '../../../../ducks/send/send.duck': sendActionSpies,
});

describe('gas-modal-page-container container', function () {
  describe('mapDispatchToProps()', function () {
    let dispatchSpy;
    let mapDispatchToPropsObject;

    beforeEach(function () {
      dispatchSpy = sinon.spy();
      mapDispatchToPropsObject = mapDispatchToProps(dispatchSpy);
    });

    afterEach(function () {
      actionSpies.hideModal.resetHistory();
      gasActionSpies.setCustomGasPrice.resetHistory();
      gasActionSpies.setCustomGasLimit.resetHistory();
    });

    describe('hideGasButtonGroup()', function () {
      it('should dispatch a hideGasButtonGroup action', function () {
        mapDispatchToPropsObject.hideGasButtonGroup();
        assert(dispatchSpy.calledOnce);
        assert(sendActionSpies.hideGasButtonGroup.calledOnce);
      });
    });

    describe('cancelAndClose()', function () {
      it('should dispatch a hideModal action', function () {
        mapDispatchToPropsObject.cancelAndClose();
        assert(dispatchSpy.calledTwice);
        assert(actionSpies.hideModal.calledOnce);
        assert(gasActionSpies.resetCustomData.calledOnce);
      });
    });

    describe('updateCustomGasPrice()', function () {
      it('should dispatch a setCustomGasPrice action with the arg passed to updateCustomGasPrice hex prefixed', function () {
        mapDispatchToPropsObject.updateCustomGasPrice('ffff');
        assert(dispatchSpy.calledOnce);
        assert(gasActionSpies.setCustomGasPrice.calledOnce);
        assert.strictEqual(
          gasActionSpies.setCustomGasPrice.getCall(0).args[0],
          '0xffff',
        );
      });

      it('should dispatch a setCustomGasPrice action', function () {
        mapDispatchToPropsObject.updateCustomGasPrice('0xffff');
        assert(dispatchSpy.calledOnce);
        assert(gasActionSpies.setCustomGasPrice.calledOnce);
        assert.strictEqual(
          gasActionSpies.setCustomGasPrice.getCall(0).args[0],
          '0xffff',
        );
      });
    });

    describe('updateCustomGasLimit()', function () {
      it('should dispatch a setCustomGasLimit action', function () {
        mapDispatchToPropsObject.updateCustomGasLimit('0x10');
        assert(dispatchSpy.calledOnce);
        assert(gasActionSpies.setCustomGasLimit.calledOnce);
        assert.strictEqual(
          gasActionSpies.setCustomGasLimit.getCall(0).args[0],
          '0x10',
        );
      });
    });

    describe('setGasData()', function () {
      it('should dispatch a setGasPrice and setGasLimit action with the correct props', function () {
        mapDispatchToPropsObject.setGasData('ffff', 'aaaa');
        assert(dispatchSpy.calledTwice);
        assert(actionSpies.setGasPrice.calledOnce);
        assert(actionSpies.setGasLimit.calledOnce);
        assert.strictEqual(actionSpies.setGasLimit.getCall(0).args[0], 'ffff');
        assert.strictEqual(actionSpies.setGasPrice.getCall(0).args[0], 'aaaa');
      });
    });

    describe('updateConfirmTxGasAndCalculate()', function () {
      it('should dispatch a updateGasAndCalculate action with the correct props', function () {
        mapDispatchToPropsObject.updateConfirmTxGasAndCalculate('ffff', 'aaaa');
        assert.strictEqual(dispatchSpy.callCount, 3);
        assert(actionSpies.setGasPrice.calledOnce);
        assert(actionSpies.setGasLimit.calledOnce);
        assert.strictEqual(actionSpies.setGasLimit.getCall(0).args[0], 'ffff');
        assert.strictEqual(actionSpies.setGasPrice.getCall(0).args[0], 'aaaa');
      });
    });
  });

  describe('mergeProps', function () {
    let stateProps;
    let dispatchProps;
    let ownProps;

    beforeEach(function () {
      stateProps = {
        gasPriceButtonGroupProps: {
          someGasPriceButtonGroupProp: 'foo',
          anotherGasPriceButtonGroupProp: 'bar',
        },
        isConfirm: true,
        someOtherStateProp: 'baz',
        transaction: {},
      };
      dispatchProps = {
        updateCustomGasPrice: sinon.spy(),
        hideGasButtonGroup: sinon.spy(),
        setGasData: sinon.spy(),
        updateConfirmTxGasAndCalculate: sinon.spy(),
        someOtherDispatchProp: sinon.spy(),
        createSpeedUpTransaction: sinon.spy(),
        hideSidebar: sinon.spy(),
        hideModal: sinon.spy(),
        cancelAndClose: sinon.spy(),
      };
      ownProps = { someOwnProp: 123 };
    });

    afterEach(function () {
      dispatchProps.updateCustomGasPrice.resetHistory();
      dispatchProps.hideGasButtonGroup.resetHistory();
      dispatchProps.setGasData.resetHistory();
      dispatchProps.updateConfirmTxGasAndCalculate.resetHistory();
      dispatchProps.someOtherDispatchProp.resetHistory();
      dispatchProps.createSpeedUpTransaction.resetHistory();
      dispatchProps.hideSidebar.resetHistory();
      dispatchProps.hideModal.resetHistory();
    });
    it('should return the expected props when isConfirm is true', function () {
      const result = mergeProps(stateProps, dispatchProps, ownProps);

      assert.strictEqual(result.isConfirm, true);
      assert.strictEqual(result.someOtherStateProp, 'baz');
      assert.strictEqual(
        result.gasPriceButtonGroupProps.someGasPriceButtonGroupProp,
        'foo',
      );
      assert.strictEqual(
        result.gasPriceButtonGroupProps.anotherGasPriceButtonGroupProp,
        'bar',
      );
      assert.strictEqual(result.someOwnProp, 123);

      assert.strictEqual(
        dispatchProps.updateConfirmTxGasAndCalculate.callCount,
        0,
      );
      assert.strictEqual(dispatchProps.setGasData.callCount, 0);
      assert.strictEqual(dispatchProps.hideGasButtonGroup.callCount, 0);
      assert.strictEqual(dispatchProps.hideModal.callCount, 0);

      result.onSubmit();

      assert.strictEqual(
        dispatchProps.updateConfirmTxGasAndCalculate.callCount,
        1,
      );
      assert.strictEqual(dispatchProps.setGasData.callCount, 0);
      assert.strictEqual(dispatchProps.hideGasButtonGroup.callCount, 0);
      assert.strictEqual(dispatchProps.hideModal.callCount, 1);

      assert.strictEqual(dispatchProps.updateCustomGasPrice.callCount, 0);
      result.gasPriceButtonGroupProps.handleGasPriceSelection({
        gasPrice: '0x0',
      });
      assert.strictEqual(dispatchProps.updateCustomGasPrice.callCount, 1);

      assert.strictEqual(dispatchProps.someOtherDispatchProp.callCount, 0);
      result.someOtherDispatchProp();
      assert.strictEqual(dispatchProps.someOtherDispatchProp.callCount, 1);
    });

    it('should return the expected props when isConfirm is false', function () {
      const result = mergeProps(
        { ...stateProps, isConfirm: false },
        dispatchProps,
        ownProps,
      );

      assert.strictEqual(result.isConfirm, false);
      assert.strictEqual(result.someOtherStateProp, 'baz');
      assert.strictEqual(
        result.gasPriceButtonGroupProps.someGasPriceButtonGroupProp,
        'foo',
      );
      assert.strictEqual(
        result.gasPriceButtonGroupProps.anotherGasPriceButtonGroupProp,
        'bar',
      );
      assert.strictEqual(result.someOwnProp, 123);

      assert.strictEqual(
        dispatchProps.updateConfirmTxGasAndCalculate.callCount,
        0,
      );
      assert.strictEqual(dispatchProps.setGasData.callCount, 0);
      assert.strictEqual(dispatchProps.hideGasButtonGroup.callCount, 0);
      assert.strictEqual(dispatchProps.cancelAndClose.callCount, 0);

      result.onSubmit('mockNewLimit', 'mockNewPrice');

      assert.strictEqual(
        dispatchProps.updateConfirmTxGasAndCalculate.callCount,
        0,
      );
      assert.strictEqual(dispatchProps.setGasData.callCount, 1);
      assert.deepStrictEqual(dispatchProps.setGasData.getCall(0).args, [
        'mockNewLimit',
        'mockNewPrice',
      ]);
      assert.strictEqual(dispatchProps.hideGasButtonGroup.callCount, 1);
      assert.strictEqual(dispatchProps.cancelAndClose.callCount, 1);

      assert.strictEqual(dispatchProps.updateCustomGasPrice.callCount, 0);
      result.gasPriceButtonGroupProps.handleGasPriceSelection({
        gasPrice: '0x0',
      });
      assert.strictEqual(dispatchProps.updateCustomGasPrice.callCount, 1);

      assert.strictEqual(dispatchProps.someOtherDispatchProp.callCount, 0);
      result.someOtherDispatchProp();
      assert.strictEqual(dispatchProps.someOtherDispatchProp.callCount, 1);
    });

    it('should dispatch the expected actions from obSubmit when isConfirm is false and isSpeedUp is true', function () {
      const result = mergeProps(
        { ...stateProps, isSpeedUp: true, isConfirm: false },
        dispatchProps,
        ownProps,
      );

      result.onSubmit();

      assert.strictEqual(
        dispatchProps.updateConfirmTxGasAndCalculate.callCount,
        0,
      );
      assert.strictEqual(dispatchProps.setGasData.callCount, 0);
      assert.strictEqual(dispatchProps.hideGasButtonGroup.callCount, 0);
      assert.strictEqual(dispatchProps.cancelAndClose.callCount, 1);

      assert.strictEqual(dispatchProps.createSpeedUpTransaction.callCount, 1);
      assert.strictEqual(dispatchProps.hideSidebar.callCount, 1);
    });
  });
});
