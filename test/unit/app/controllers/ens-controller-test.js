const assert = require('assert')
const sinon = require('sinon')
const ObservableStore = require('obs-store')
const HttpProvider = require('ethjs-provider-http')
const EnsController = require('../../../../app/scripts/controllers/ens')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_X_ERROR_ADDRESS = '0x'

describe('EnsController', function () {
  describe('#constructor', function () {
    it('should construct the controller given a provider and a network', async () => {
      const provider = new HttpProvider('https://ropsten.infura.io')
      const currentNetworkId = '3'
      const networkStore = new ObservableStore(currentNetworkId)
      const ens = new EnsController({
        provider,
        networkStore,
      })

      assert.ok(ens._ens)
    })

    it('should construct the controller given an existing ENS instance', async () => {
      const ens = new EnsController({
        ens: {},
      })

      assert.ok(ens._ens)
    })
  })

  describe('#reverseResolveName', function () {
    it('should resolve to an ENS name', async () => {
      const address = '0x8e5d75d60224ea0c33d0041e75de68b1c3cb6dd5'
      const ens = new EnsController({
        ens: {
          reverse: sinon.stub().withArgs(address).returns('peaksignal.eth'),
          lookup: sinon.stub().withArgs('peaksignal.eth').returns(address),
        },
      })

      const name = await ens.reverseResolveAddress(address)
      assert.equal(name, 'peaksignal.eth')
    })

    it('should fail if the name is registered to a different address than the reverse-resolved', async () => {
      const address = '0x8e5d75d60224ea0c33d0041e75de68b1c3cb6dd5'
      const ens = new EnsController({
        ens: {
          reverse: sinon.stub().withArgs(address).returns('peaksignal.eth'),
          lookup: sinon.stub().withArgs('peaksignal.eth').returns('0xfoo'),
        },
      })

      const name = await ens.reverseResolveAddress(address)
      assert.strictEqual(name, undefined)
    })

    it('should throw an error when the lookup resolves to the zero address', async () => {
      const address = '0x8e5d75d60224ea0c33d0041e75de68b1c3cb6dd5'
      const ens = new EnsController({
        ens: {
          reverse: sinon.stub().withArgs(address).returns('peaksignal.eth'),
          lookup: sinon.stub().withArgs('peaksignal.eth').returns(ZERO_ADDRESS),
        },
      })

      try {
        await ens.reverseResolveAddress(address)
        assert.fail('#reverseResolveAddress did not throw')
      } catch (e) {
        assert.ok(e)
      }
    })

    it('should throw an error the lookup resolves to the zero x address', async () => {
      const address = '0x8e5d75d60224ea0c33d0041e75de68b1c3cb6dd5'
      const ens = new EnsController({
        ens: {
          reverse: sinon.stub().withArgs(address).returns('peaksignal.eth'),
          lookup: sinon.stub().withArgs('peaksignal.eth').returns(ZERO_X_ERROR_ADDRESS),
        },
      })

      try {
        await ens.reverseResolveAddress(address)
        assert.fail('#reverseResolveAddress did not throw')
      } catch (e) {
        assert.ok(e)
      }
    })
  })
})
