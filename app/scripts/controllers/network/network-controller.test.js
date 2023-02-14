import { inspect, isDeepStrictEqual, promisify } from 'util';
import { isMatch } from 'lodash';
import nock from 'nock';
import sinon from 'sinon';
import * as ethJsonRpcMiddlewareModule from 'eth-json-rpc-middleware';
import NetworkController from './network-controller';

jest.mock('eth-json-rpc-middleware', () => {
  return {
    __esModule: true,
    ...jest.requireActual('eth-json-rpc-middleware'),
  };
});

// Store this up front so it doesn't get lost when it is stubbed
const originalSetTimeout = global.setTimeout;

/**
 * @typedef {import('nock').Scope} NockScope
 *
 * A object returned by the `nock` function which holds all of the request mocks
 * for a network.
 */

/**
 * @typedef {{request: MockJsonResponseBody, response: { httpStatus?: number } & MockJsonResponseBody, error?: unknown, delay?: number; times?: number, beforeCompleting: () => void | Promise<void>}} RpcMock
 *
 * Arguments to `mockRpcCall` which allow for specifying a canned response for a
 * particular RPC request.
 */

/**
 * @typedef {{id?: number; jsonrpc?: string, method: string, params?: unknown[]}} MockJsonRpcRequestBody
 *
 * A partial form of a prototypical JSON-RPC request body.
 */

/**
 * @typedef {{id?: number; jsonrpc?: string; result?: string; error?: string}} MockJsonResponseBody
 *
 * A partial form of a prototypical JSON-RPC response body.
 */

/**
 * A dummy block that matches the pre-EIP-1559 format (i.e. it doesn't have the
 * `baseFeePerGas` property).
 */
const PRE_1559_BLOCK = {
  difficulty: '0x0',
  extraData: '0x',
  gasLimit: '0x1c9c380',
  gasUsed: '0x598c9b',
  hash: '0xfb2086eb924ffce4061f94c3b65f303e0351f8e7deff185fe1f5e9001ff96f63',
  logsBloom:
    '0x7034820113921800018e8070900006316040002225c04a0624110010841018a2109040401004112a4c120f00220a2119020000714b143a04004106120130a8450080433129401068ed22000a54a48221a1020202524204045421b883882530009a1800b08a1309408008828403010d530440001a40003c0006240291008c0404c211610c690b00f1985e000009c02503240040010989c01cf2806840043815498e90012103e06084051542c0094002494008044c24a0a13281e0009601481073010800130402464202212202a8088210442a8ec81b080430075629e60a00a082005a3988400940a4009012a204011a0018a00903222a60420428888144210802',
  miner: '0xffee087852cb4898e6c3532e776e68bc68b1143b',
  mixHash: '0xb17ba50cd7261e77a213fb75704dcfd8a28fbcd78d100691a112b7cc2893efa2',
  nonce: '0x0000000000000000',
  number: '0x2', // number set to "2" to simplify tests
  parentHash:
    '0x31406d1bf1a2ca12371ce5b3ecb20568d6a8b9bf05b49b71b93ba33f317d5a82',
  receiptsRoot:
    '0x5ba97ece1afbac2a8fe0344f9022fe808342179b26ea3ecc2e0b8c4b46b7f8cd',
  sha3Uncles:
    '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  size: '0x70f4',
  stateRoot:
    '0x36bfb7ca106d41c4458292669126e091011031c5af612dee1c2e6424ef92b080',
  timestamp: '0x639b6d9b',
  totalDifficulty: '0xc70d815d562d3cfa955',
  transactions: [
    // reduced to a single transaction to make fixture less verbose
    '0x2761e939dc822f64141bd00bc7ef8cee16201af10e862469212396664cee81ce',
  ],
  transactionsRoot:
    '0x98bbdfbe1074bc3aa72a77a281f16d6ba7e723d68f15937d80954fb34d323369',
  uncles: [],
};

/**
 * A dummy block that matches the pre-EIP-1559 format (i.e. it has the
 * `baseFeePerGas` property).
 */
const POST_1559_BLOCK = {
  ...PRE_1559_BLOCK,
  baseFeePerGas: '0x63c498a46',
};

/**
 * An alias for `POST_1559_BLOCK`, for tests that don't care about which kind of
 * block they're looking for.
 */
const BLOCK = POST_1559_BLOCK;

/**
 * A dummy value for the `projectId` option that `createInfuraClient` needs.
 * (Infura should not be hit during tests, but just in case, this should not
 * refer to a real project ID.)
 */
const DEFAULT_INFURA_PROJECT_ID = 'fake-infura-project-id';

/**
 * Despite the signature of its constructor, NetworkController must take an
 * Infura project ID. This object is mixed into the options first when a
 * NetworkController is instantiated in tests.
 */
const DEFAULT_CONTROLLER_OPTIONS = {
  infuraProjectId: DEFAULT_INFURA_PROJECT_ID,
};

/**
 * The set of properties allowed in a valid JSON-RPC response object.
 */
const JSONRPC_RESPONSE_BODY_PROPERTIES = ['id', 'jsonrpc', 'result', 'error'];

/**
 * The set of networks that, when specified, create an Infura provider as
 * opposed to a "standard" provider (one suited for a custom RPC endpoint).
 */
const INFURA_NETWORKS = [
  {
    networkName: 'Mainnet',
    networkType: 'mainnet',
    chainId: '0x1',
    networkVersion: '1',
    ticker: 'ETH',
  },
  {
    networkName: 'Goerli',
    networkType: 'goerli',
    chainId: '0x5',
    networkVersion: '5',
    ticker: 'GoerliETH',
  },
  {
    networkName: 'Sepolia',
    networkType: 'sepolia',
    chainId: '0xaa36a7',
    networkVersion: '11155111',
    ticker: 'SepoliaETH',
  },
];

/**
 * Handles mocking provider requests for a particular network.
 */
class NetworkCommunications {
  #networkClientOptions;

  /**
   * Builds an object for mocking provider requests.
   *
   * @param {object} args - The arguments.
   * @param {"infura" | "custom"} args.networkClientType - Specifies the
   * expected middleware stack that will represent the provider: "infura" for an
   * Infura network; "custom" for a custom RPC endpoint.
   * @param {object} args.networkClientOptions - Details about the network
   * client used to determine the base URL or URL path to mock.
   * @param {string} [args.networkClientOptions.infuraNetwork] - The name of the
   * Infura network being tested, assuming that `networkClientType` is "infura".
   * @param {string} [args.networkClientOptions.infuraProjectId] - The project
   * ID of the Infura network being tested, assuming that `networkClientType` is
   * "infura".
   * @param {string} [args.networkClientOptions.customRpcUrl] - The URL of the
   * custom RPC endpoint, assuming that `networkClientType` is "custom".
   * @returns {NockScope} The nock scope.
   */
  constructor({
    networkClientType,
    networkClientOptions: {
      infuraNetwork,
      infuraProjectId = DEFAULT_INFURA_PROJECT_ID,
      customRpcUrl,
    } = {},
  }) {
    const networkClientOptions = {
      infuraNetwork,
      infuraProjectId,
      customRpcUrl,
    };
    this.networkClientType = networkClientType;
    this.#networkClientOptions = networkClientOptions;
    this.infuraProjectId = infuraProjectId;
    const rpcUrl =
      networkClientType === 'infura'
        ? `https://${infuraNetwork}.infura.io`
        : customRpcUrl;
    this.nockScope = nock(rpcUrl);
  }

  /**
   * Constructs a new NetworkCommunications object using a different set of
   * options, using the options from this instance as a base.
   *
   * @param args - The same arguments that NetworkCommunications takes.
   */
  with(args) {
    return new NetworkCommunications({
      networkClientType: this.networkClientType,
      networkClientOptions: this.#networkClientOptions,
      ...args,
    });
  }

  /**
   * Mocks the RPC calls that NetworkController makes internally.
   *
   * @param {object} args - The arguments.
   * @param {{number: string, baseFeePerGas?: string} | null} [args.latestBlock] - The
   * block object that will be used to mock `eth_blockNumber` and
   * `eth_getBlockByNumber`. If null, then both `eth_blockNumber` and
   * `eth_getBlockByNumber` will respond with null.
   * @param {RpcMock | Partial<RpcMock>[] | null} [args.eth_blockNumber] -
   * Options for mocking the `eth_blockNumber` RPC method (see `mockRpcCall` for
   * valid properties). By default, the number from the `latestBlock` will be
   * used as the result. Use `null` to prevent this method from being mocked.
   * @param {RpcMock | Partial<RpcMock>[] | null} [args.eth_getBlockByNumber] -
   * Options for mocking the `eth_getBlockByNumber` RPC method (see
   * `mockRpcCall` for valid properties). By default, the `latestBlock` will be
   * used as the result. Use `null` to prevent this method from being mocked.
   * @param {RpcMock | Partial<RpcMock>[] | null} [args.net_version] - Options
   * for mocking the `net_version` RPC method (see `mockRpcCall` for valid
   * properties). By default, "1" will be used as the result. Use `null` to
   * prevent this method from being mocked.
   */
  mockEssentialRpcCalls({
    latestBlock = BLOCK,
    eth_blockNumber: ethBlockNumberMocks = [],
    eth_getBlockByNumber: ethGetBlockByNumberMocks = [],
    net_version: netVersionMocks = [],
  } = {}) {
    const latestBlockNumber = latestBlock === null ? null : latestBlock.number;
    if (latestBlock && latestBlock.number === undefined) {
      throw new Error('The latest block must have a `number`.');
    }

    const defaultMocksByRpcMethod = {
      eth_blockNumber: {
        request: {
          method: 'eth_blockNumber',
          params: [],
        },
        response: {
          result: latestBlockNumber,
        },
        // When the provider is configured for an Infura network,
        // NetworkController makes a sentinel request for `eth_blockNumber`, so
        // we ensure that it is mocked by default. Conversely, when the provider
        // is configured for a custom RPC endpoint, we don't mock
        // `eth_blockNumber` at all unless specified. Admittedly, this is a bit
        // magical, but it saves us from having to think about this in tests
        // if we don't have to.
        times: this.networkClientType === 'infura' ? 1 : 0,
      },
      eth_getBlockByNumber: {
        request: {
          method: 'eth_getBlockByNumber',
          params: [latestBlockNumber, false],
        },
        response: {
          result: latestBlock,
        },
      },
      net_version: {
        request: {
          method: 'net_version',
          params: [],
        },
        response: {
          result: '1',
        },
      },
    };
    const providedMocksByRpcMethod = {
      eth_blockNumber: ethBlockNumberMocks,
      eth_getBlockByNumber: ethGetBlockByNumberMocks,
      net_version: netVersionMocks,
    };

    const allMocks = [];

    Object.keys(defaultMocksByRpcMethod).forEach((rpcMethod) => {
      const defaultMock = defaultMocksByRpcMethod[rpcMethod];
      const providedMockOrMocks = providedMocksByRpcMethod[rpcMethod];
      const providedMocks = Array.isArray(providedMockOrMocks)
        ? providedMockOrMocks
        : [providedMockOrMocks];
      if (providedMocks.length > 0) {
        providedMocks.forEach((providedMock) => {
          allMocks.push({ ...defaultMock, ...providedMock });
        });
      } else {
        allMocks.push(defaultMock);
      }
    });

    // The request that the block tracker makes always occurs after any request
    // that the network controller makes (because such a request goes through
    // the block cache middleware and that is what spawns the block tracker). We
    // don't need to customize the block tracker request; we just need to ensure
    // that the block number it returns matches the same block number that
    // `eth_getBlockByNumber` uses.
    allMocks.push({
      request: {
        method: 'eth_blockNumber',
        params: [],
      },
      response: {
        result: latestBlockNumber,
      },
      times: latestBlock === null ? 2 : 1,
    });

    allMocks.forEach((mock) => {
      this.mockRpcCall(mock);
    });
  }

  /**
   * Mocks a JSON-RPC request sent to the provider with the given response.
   *
   * @param {RpcMock} args - The arguments.
   * @param {MockJsonRpcRequestBody} args.request - The request data. Must
   * include a `method`. Note that EthQuery's `sendAsync` method implicitly uses
   * an empty array for `params` if it is not provided in the original request,
   * so make sure to include this.
   * @param {MockJsonResponseBody & { httpStatus?: number }} [args.response] - Information
   * concerning the response that the request should have. Takes one of two
   * forms. The simplest form is an object that represents the response body;
   * the second form allows you to specify the HTTP status, as well as a
   * potentially async function to generate the response body.
   * @param {unknown} [args.error] - An error to throw while
   * making the request. Takes precedence over `response`.
   * @param {number} [args.delay] - The amount of time that should
   * pass before the request resolves with the response.
   * @param {number} [args.times] - The number of times that the
   * request is expected to be made.
   * @param {() => void | Promise<void>} [args.beforeCompleting] - Sometimes it is useful to do
   * something after the request is kicked off but before it ends (or, in terms
   * of a `fetch` promise, when the promise is initiated but before it is
   * resolved). You can pass an (async) function for this option to do this.
   * @returns {NockScope | null} The nock scope object that represents all of
   * the mocks for the network, or null if `times` is 0.
   */
  mockRpcCall({ request, response, error, delay, times, beforeCompleting }) {
    if (times === 0) {
      return null;
    }

    const url =
      this.networkClientType === 'infura' ? `/v3/${this.infuraProjectId}` : '/';

    const httpStatus = response?.httpStatus ?? 200;
    this.#validateMockResponseBody(response);
    const partialResponseBody = { jsonrpc: '2.0' };
    JSONRPC_RESPONSE_BODY_PROPERTIES.forEach((prop) => {
      if (response[prop] !== undefined) {
        partialResponseBody[prop] = response[prop];
      }
    });

    let nockInterceptor = this.nockScope.post(url, (actualBody) => {
      const expectedPartialBody = { jsonrpc: '2.0', ...request };
      return isMatch(actualBody, expectedPartialBody);
    });

    if (delay !== undefined) {
      nockInterceptor = nockInterceptor.delay(delay);
    }

    if (times !== undefined) {
      nockInterceptor = nockInterceptor.times(times);
    }

    if (error !== undefined) {
      return nockInterceptor.replyWithError(error);
    }
    if (response !== undefined) {
      return nockInterceptor.reply(async (_uri, requestBody) => {
        if (beforeCompleting !== undefined) {
          await beforeCompleting();
        }

        const completeResponseBody = {
          jsonrpc: '2.0',
          ...(requestBody.id === undefined ? {} : { id: requestBody.id }),
          ...partialResponseBody,
        };

        return [httpStatus, completeResponseBody];
      });
    }
    throw new Error(
      'Neither `response` nor `error` was given. Please specify one of them.',
    );
  }

  #validateMockResponseBody(mockResponseBody) {
    const invalidProperties = Object.keys(mockResponseBody).filter(
      (key) =>
        key !== 'httpStatus' && !JSONRPC_RESPONSE_BODY_PROPERTIES.includes(key),
    );
    if (invalidProperties.length > 0) {
      throw new Error(
        `Mock response object ${inspect(
          mockResponseBody,
        )} has invalid properties: ${inspect(invalidProperties)}.`,
      );
    }
  }
}

describe('NetworkController', () => {
  let clock;

  beforeEach(() => {
    // Disable all requests, even those to localhost
    nock.disableNetConnect();
    // Faking timers ends up doing two things:
    // 1. Halting the block tracker (which depends on `setTimeout` to
    // periodically request the latest block) set up in
    // `eth-json-rpc-middleware`
    // 2. Halting the retry logic in `@metamask/eth-json-rpc-infura` (which
    // also depends on `setTimeout`)
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    nock.enableNetConnect('localhost');
    clock.restore();
    nock.cleanAll();
  });

  describe('constructor', () => {
    const invalidInfuraIds = [undefined, null, {}, 1];
    invalidInfuraIds.forEach((invalidId) => {
      it(`throws if an invalid Infura ID of "${inspect(
        invalidId,
      )}" is provided`, () => {
        expect(() => new NetworkController({ infuraId: invalidId })).toThrow(
          'Invalid Infura project ID',
        );
      });
    });

    it('accepts initial state', async () => {
      const exampleInitialState = {
        provider: {
          type: 'rpc',
          rpcUrl: 'http://example-custom-rpc.metamask.io',
          chainId: '0x9999',
          nickname: 'Test initial state',
        },
        networkDetails: {
          EIPS: {
            1559: false,
          },
        },
      };

      await withController(
        {
          state: exampleInitialState,
        },
        ({ controller }) => {
          expect(controller.store.getState()).toMatchInlineSnapshot(`
            {
              "network": "loading",
              "networkDetails": {
                "EIPS": {
                  "1559": false,
                },
              },
              "previousProviderStore": {
                "chainId": "0x9999",
                "nickname": "Test initial state",
                "rpcUrl": "http://example-custom-rpc.metamask.io",
                "type": "rpc",
              },
              "provider": {
                "chainId": "0x9999",
                "nickname": "Test initial state",
                "rpcUrl": "http://example-custom-rpc.metamask.io",
                "type": "rpc",
              },
            }
          `);
        },
      );
    });

    it('sets default state without initial state', async () => {
      await withController(({ controller }) => {
        expect(controller.store.getState()).toMatchInlineSnapshot(`
          {
            "network": "loading",
            "networkDetails": {
              "EIPS": {
                "1559": undefined,
              },
            },
            "previousProviderStore": {
              "chainId": "0x539",
              "nickname": "Localhost 8545",
              "rpcUrl": "http://localhost:8545",
              "ticker": "ETH",
              "type": "rpc",
            },
            "provider": {
              "chainId": "0x539",
              "nickname": "Localhost 8545",
              "rpcUrl": "http://localhost:8545",
              "ticker": "ETH",
              "type": "rpc",
            },
          }
        `);
      });
    });
  });

  describe('destroy', () => {
    it('does not throw if called before the provider is initialized', async () => {
      const controller = new NetworkController(DEFAULT_CONTROLLER_OPTIONS);

      expect(await controller.destroy()).toBeUndefined();
    });

    it('stops the block tracker for the currently selected network as long as the provider has been initialized', async () => {
      await withController(async ({ controller, network }) => {
        network.mockEssentialRpcCalls({
          eth_blockNumber: {
            times: 1,
          },
        });
        await controller.initializeProvider();
        const { blockTracker } = controller.getProviderAndBlockTracker();
        // The block tracker starts running after a listener is attached
        blockTracker.addListener('latest', () => {
          // do nothing
        });
        expect(blockTracker.isRunning()).toBe(true);

        await controller.destroy();

        expect(blockTracker.isRunning()).toBe(false);
      });
    });
  });

  describe('initializeProvider', () => {
    it('throws if the provider configuration is invalid', async () => {
      const invalidProviderConfig = {};
      await withController(
        {
          state: {
            provider: invalidProviderConfig,
          },
        },
        async ({ controller }) => {
          await expect(async () => {
            await controller.initializeProvider();
          }).rejects.toThrow(
            'NetworkController - _configureProvider - unknown type "undefined"',
          );
        },
      );
    });

    for (const {
      networkName,
      networkType,
      chainId,
      networkVersion,
    } of INFURA_NETWORKS) {
      describe(`when the type in the provider configuration is "${networkType}"`, () => {
        it(`initializes a provider pointed to the ${networkName} Infura network (chainId: ${chainId})`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              await controller.initializeProvider();

              const { provider } = controller.getProviderAndBlockTracker();
              const promisifiedSendAsync = promisify(provider.sendAsync).bind(
                provider,
              );
              const { result: chainIdResult } = await promisifiedSendAsync({
                method: 'eth_chainId',
              });
              expect(chainIdResult).toBe(chainId);
            },
          );
        });

        it('emits infuraIsUnblocked (assuming that the request to eth_blockNumber responds successfully)', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              const infuraIsUnblocked = await waitForEvent({
                controller,
                eventName: 'infuraIsUnblocked',
                operation: async () => {
                  await controller.initializeProvider();
                },
              });

              expect(infuraIsUnblocked).toBe(true);
            },
          );
        });

        it(`persists "${networkVersion}" to state as the network version of ${networkName}`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              await controller.initializeProvider();

              expect(controller.store.getState().network).toBe(networkVersion);
            },
          );
        });

        it(`persists to state whether the network supports EIP-1559 (assuming that the request for eth_getBlockByNumber responds successfully)`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
              networkDetails: {
                EIPS: {},
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
              });

              await controller.initializeProvider();

              expect(
                controller.store.getState().networkDetails.EIPS['1559'],
              ).toBe(true);
            },
          );
        });
      });
    }

    describe(`when the type in the provider configuration is "rpc"`, () => {
      it('initializes a provider pointed to the given RPC URL whose chain ID matches the configured chain ID', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();
            network.mockRpcCall({
              request: {
                method: 'test',
                params: [],
              },
              response: {
                result: 'test response',
              },
            });

            await controller.initializeProvider();

            const { provider } = controller.getProviderAndBlockTracker();
            const promisifiedSendAsync = promisify(provider.sendAsync).bind(
              provider,
            );
            const { result: testResult } = await promisifiedSendAsync({
              id: 99999,
              jsonrpc: '2.0',
              method: 'test',
              params: [],
            });
            expect(testResult).toBe('test response');
            const { result: chainIdResult } = await promisifiedSendAsync({
              method: 'eth_chainId',
            });
            expect(chainIdResult).toBe('0x1337');
          },
        );
      });

      it('emits infuraIsUnblocked', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();

            const infuraIsUnblocked = await waitForEvent({
              controller,
              eventName: 'infuraIsUnblocked',
              operation: async () => {
                await controller.initializeProvider();
              },
            });

            expect(infuraIsUnblocked).toBe(true);
          },
        );
      });

      it('persists the network version to state (assuming that the request for net_version responds successfully)', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              net_version: {
                response: {
                  result: '42',
                },
              },
            });

            await controller.initializeProvider();

            expect(controller.store.getState().network).toBe('42');
          },
        );
      });

      it('persists to state whether the network supports EIP-1559 (assuming that the request for eth_getBlockByNumber responds successfully)', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
              networkDetails: {
                EIPS: {},
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              latestBlock: POST_1559_BLOCK,
            });

            await controller.initializeProvider();

            expect(
              controller.store.getState().networkDetails.EIPS['1559'],
            ).toBe(true);
          },
        );
      });
    });
  });

  describe('getProviderAndBlockTracker', () => {
    it('returns objects that proxy to the provider and block tracker as long as the provider has been initialized', async () => {
      await withController(async ({ controller, network }) => {
        network.mockEssentialRpcCalls();
        await controller.initializeProvider();

        const { provider, blockTracker } =
          controller.getProviderAndBlockTracker();

        expect(provider).toHaveProperty('sendAsync');
        expect(blockTracker).toHaveProperty('checkForLatestBlock');
      });
    });

    it("returns null for both the provider and block tracker if the provider hasn't been initialized yet", async () => {
      await withController(async ({ controller }) => {
        const { provider, blockTracker } =
          controller.getProviderAndBlockTracker();

        expect(provider).toBeNull();
        expect(blockTracker).toBeNull();
      });
    });

    for (const { networkName, networkType, chainId } of INFURA_NETWORKS) {
      describe(`when the type in the provider configuration is changed to "${networkType}"`, () => {
        it(`returns a provider object that was pointed to another network before the switch and is pointed to ${networkName} afterward`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'https://mock-rpc-url',
                  chainId: '0x1337',
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();
              await controller.initializeProvider();
              const { provider } = controller.getProviderAndBlockTracker();

              const promisifiedSendAsync1 = promisify(provider.sendAsync).bind(
                provider,
              );
              const { result: oldChainIdResult } = await promisifiedSendAsync1({
                method: 'eth_chainId',
              });
              expect(oldChainIdResult).toBe('0x1337');

              controller.setProviderType(networkType);
              const promisifiedSendAsync2 = promisify(provider.sendAsync).bind(
                provider,
              );
              const { result: newChainIdResult } = await promisifiedSendAsync2({
                method: 'eth_chainId',
              });
              expect(newChainIdResult).toBe(chainId);
            },
          );
        });
      });
    }

    describe('when the type in the provider configuration is changed to "rpc"', () => {
      it('returns a provider object that was pointed to another network before the switch and is pointed to the new network', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'goerli',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();
            await controller.initializeProvider();
            const { provider } = controller.getProviderAndBlockTracker();

            const promisifiedSendAsync1 = promisify(provider.sendAsync).bind(
              provider,
            );
            const { result: oldChainIdResult } = await promisifiedSendAsync1({
              method: 'eth_chainId',
            });
            expect(oldChainIdResult).toBe('0x5');

            controller.setRpcTarget('https://mock-rpc-url', '0x1337');
            const promisifiedSendAsync2 = promisify(provider.sendAsync).bind(
              provider,
            );
            const { result: newChainIdResult } = await promisifiedSendAsync2({
              method: 'eth_chainId',
            });
            expect(newChainIdResult).toBe('0x1337');
          },
        );
      });
    });
  });

  describe('getEIP1559Compatibility', () => {
    describe('when the latest block has a baseFeePerGas property', () => {
      it('persists to state that the network supports EIP-1559', async () => {
        await withController(
          {
            state: {
              networkDetails: {
                EIPS: {},
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              latestBlock: POST_1559_BLOCK,
            });
            await controller.initializeProvider();

            await controller.getEIP1559Compatibility();

            expect(controller.store.getState().networkDetails.EIPS[1559]).toBe(
              true,
            );
          },
        );
      });

      it('returns true', async () => {
        await withController(async ({ controller, network }) => {
          network.mockEssentialRpcCalls({
            latestBlock: POST_1559_BLOCK,
          });
          await controller.initializeProvider();

          const supportsEIP1559 = await controller.getEIP1559Compatibility();

          expect(supportsEIP1559).toBe(true);
        });
      });
    });

    describe('when the latest block does not have a baseFeePerGas property', () => {
      it('persists to state that the network does not support EIP-1559', async () => {
        await withController(
          {
            state: {
              networkDetails: {
                EIPS: {},
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              latestBlock: PRE_1559_BLOCK,
            });
            await controller.initializeProvider();

            await controller.getEIP1559Compatibility();

            expect(controller.store.getState().networkDetails.EIPS[1559]).toBe(
              false,
            );
          },
        );
      });

      it('returns false', async () => {
        await withController(async ({ controller, network }) => {
          network.mockEssentialRpcCalls({
            latestBlock: PRE_1559_BLOCK,
          });
          await controller.initializeProvider();

          const supportsEIP1559 = await controller.getEIP1559Compatibility();

          expect(supportsEIP1559).toBe(false);
        });
      });
    });

    describe('when the request for the latest block responds with null', () => {
      it('persists null to state as whether the network supports EIP-1559', async () => {
        await withController(
          {
            state: {
              networkDetails: {
                EIPS: {},
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              latestBlock: null,
            });
            await controller.initializeProvider();

            await controller.getEIP1559Compatibility();

            expect(controller.store.getState().networkDetails.EIPS[1559]).toBe(
              null,
            );
          },
        );
      });

      it('returns null', async () => {
        await withController(async ({ controller, network }) => {
          network.mockEssentialRpcCalls({
            latestBlock: null,
          });
          await controller.initializeProvider();

          const supportsEIP1559 = await controller.getEIP1559Compatibility();

          expect(supportsEIP1559).toBe(null);
        });
      });
    });

    it('does not make multiple requests to eth_getBlockByNumber when called multiple times and the request to eth_getBlockByNumber succeeded the first time', async () => {
      await withController(async ({ controller, network }) => {
        // This mocks eth_getBlockByNumber once by default
        network.mockEssentialRpcCalls();
        await withoutCallingGetEIP1559Compatibility({
          controller,
          operation: async () => {
            await controller.initializeProvider();
          },
        });

        await controller.getEIP1559Compatibility();
        await controller.getEIP1559Compatibility();

        expect(network.nockScope.isDone()).toBe(true);
      });
    });
  });

  describe('lookupNetwork', () => {
    describe('if the provider has not been initialized', () => {
      it('does not update state in any way', async () => {
        const providerConfig = {
          type: 'rpc',
          rpcUrl: 'http://example-custom-rpc.metamask.io',
          chainId: '0x9999',
          nickname: 'Test initial state',
        };
        const initialState = {
          provider: providerConfig,
          networkDetails: {
            EIPS: {
              1559: true,
            },
          },
        };

        await withController(
          {
            state: initialState,
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();
            const stateAfterConstruction = controller.store.getState();

            await controller.lookupNetwork();

            expect(controller.store.getState()).toStrictEqual(
              stateAfterConstruction,
            );
          },
        );
      });

      it('does not emit infuraIsUnblocked', async () => {
        await withController(async ({ controller, network }) => {
          network.mockEssentialRpcCalls();

          const promiseForInfuraIsUnblocked = waitForEvent({
            controller,
            eventName: 'infuraIsUnblocked',
            operation: async () => {
              await controller.lookupNetwork();
            },
          });

          await expect(promiseForInfuraIsUnblocked).toNeverResolve();
        });
      });

      it('does not emit infuraIsBlocked', async () => {
        await withController(async ({ controller, network }) => {
          network.mockEssentialRpcCalls();

          const promiseForInfuraIsBlocked = waitForEvent({
            controller,
            eventName: 'infuraIsBlocked',
            operation: async () => {
              await controller.lookupNetwork();
            },
          });

          await expect(promiseForInfuraIsBlocked).toNeverResolve();
        });
      });
    });

    for (const {
      networkName,
      networkType,
      networkVersion,
    } of INFURA_NETWORKS) {
      describe(`when the type in the provider configuration is "${networkType}"`, () => {
        describe('if the request for eth_blockNumber responds successfully', () => {
          it('emits infuraIsUnblocked as long as the network has not changed by the time the request ends', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  eth_blockNumber: {
                    response: {
                      result: '0x42',
                    },
                  },
                });
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                const infuraIsUnblocked = await waitForEvent({
                  controller,
                  eventName: 'infuraIsUnblocked',
                  operation: async () => {
                    await controller.lookupNetwork();
                  },
                });

                expect(infuraIsUnblocked).toBe(true);
              },
            );
          });

          it('does not emit infuraIsUnblocked if the network has changed by the time the request ends', async () => {
            const anotherNetwork = INFURA_NETWORKS.find(
              (network) => network.networkType !== networkType,
            );
            /* eslint-disable-next-line jest/no-if */
            if (!anotherNetwork) {
              throw new Error(
                "Could not find another network to use. You've probably commented out all INFURA_NETWORKS but one. Please uncomment another one.",
              );
            }

            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                },
              },
              async ({ controller, network: network1 }) => {
                network1.mockEssentialRpcCalls({
                  eth_blockNumber: {
                    response: {
                      result: '0x42',
                    },
                    beforeCompleting: async () => {
                      await waitForEvent({
                        controller,
                        eventName: 'networkDidChange',
                        operation: async () => {
                          await withoutCallingLookupNetwork({
                            controller,
                            operation: () => {
                              controller.setProviderType(
                                anotherNetwork.networkType,
                              );
                            },
                          });
                        },
                      });
                    },
                  },
                });
                const network2 = network1.with({
                  networkClientOptions: {
                    infuraNetwork: anotherNetwork.networkType,
                  },
                });
                network2.mockEssentialRpcCalls();
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                const promiseForInfuraIsUnblocked = waitForEvent({
                  controller,
                  eventName: 'infuraIsUnblocked',
                  operation: async () => {
                    await controller.lookupNetwork();
                  },
                });

                await expect(promiseForInfuraIsUnblocked).toNeverResolve();
              },
            );
          });
        });

        describe('if the request for eth_blockNumber responds with a "countryBlocked" error', () => {
          it('emits infuraIsBlocked as long as the network has not changed by the time the request ends', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  eth_blockNumber: {
                    response: {
                      httpStatus: 500,
                      error: 'countryBlocked',
                    },
                  },
                });
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                const infuraIsBlocked = await waitForEvent({
                  controller,
                  eventName: 'infuraIsBlocked',
                  operation: async () => {
                    await controller.lookupNetwork();
                  },
                });

                expect(infuraIsBlocked).toBe(true);
              },
            );
          });

          it('does not emit infuraIsBlocked if the network has changed by the time the request ends', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                },
              },
              async ({ controller, network: network1 }) => {
                network1.mockEssentialRpcCalls({
                  eth_blockNumber: {
                    response: {
                      httpStatus: 500,
                      error: 'countryBlocked',
                    },
                    beforeCompleting: async () => {
                      await withoutCallingLookupNetwork({
                        controller,
                        operation: async () => {
                          await waitForEvent({
                            controller,
                            eventName: 'networkDidChange',
                            operation: () => {
                              controller.setRpcTarget(
                                'http://some-rpc-url',
                                '0x1337',
                              );
                            },
                          });
                        },
                      });
                    },
                  },
                });
                const network2 = new NetworkCommunications({
                  networkClientType: 'rpc',
                  networkClientOptions: {
                    customRpcUrl: 'http://some-rpc-url',
                  },
                });
                network2.mockEssentialRpcCalls();
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                const promiseForInfuraIsBlocked = waitForEvent({
                  controller,
                  eventName: 'infuraIsBlocked',
                  operation: async () => {
                    await controller.lookupNetwork();
                  },
                });

                await expect(promiseForInfuraIsBlocked).toNeverResolve();
              },
            );
          });
        });

        describe('if the request for eth_blockNumber responds with a generic error', () => {
          it('does not emit infuraIsUnblocked', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  eth_blockNumber: {
                    response: {
                      httpStatus: 500,
                      error: 'oops',
                    },
                  },
                });
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                const promiseForInfuraIsUnblocked = waitForEvent({
                  controller,
                  eventName: 'infuraIsUnblocked',
                  operation: async () => {
                    await controller.lookupNetwork();
                  },
                });

                await expect(promiseForInfuraIsUnblocked).toNeverResolve();
              },
            );
          });
        });

        it(`persists "${networkVersion}" to state as the network version of ${networkName}`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();
              await withoutCallingLookupNetwork({
                controller,
                operation: async () => {
                  await controller.initializeProvider();
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              expect(controller.store.getState().network).toBe(networkVersion);
            },
          );
        });

        it(`does not update the network state if it is already set to "${networkVersion}"`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                eth_blockNumber: {
                  times: 2,
                },
              });
              await withoutCallingLookupNetwork({
                controller,
                operation: async () => {
                  await controller.initializeProvider();
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              const promiseForStateChanges = waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              await expect(promiseForStateChanges).toNeverResolve();
            },
          );
        });

        describe('if the request for eth_getBlockByNumber responds successfully', () => {
          it('persists to state that the network supports EIP-1559 when baseFeePerGas is in the block header', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                  networkDetails: {
                    EIPS: {},
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  latestBlock: POST_1559_BLOCK,
                });
                await controller.initializeProvider();

                await controller.getEIP1559Compatibility();

                expect(
                  controller.store.getState().networkDetails.EIPS[1559],
                ).toBe(true);
              },
            );
          });

          it('persists to state that the network does not support EIP-1559 when baseFeePerGas is not in the block header', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                  networkDetails: {
                    EIPS: {},
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  latestBlock: PRE_1559_BLOCK,
                });
                await controller.initializeProvider();

                await controller.getEIP1559Compatibility();

                expect(
                  controller.store.getState().networkDetails.EIPS[1559],
                ).toBe(false);
              },
            );
          });
        });

        describe('if the request for eth_getBlockByNumber responds with an error', () => {
          it('does not update the network details in any way', async () => {
            const intentionalErrorMessage =
              'intentional error from eth_getBlockByNumber';

            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                  networkDetails: {
                    EIPS: {},
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  eth_getBlockByNumber: {
                    response: {
                      error: intentionalErrorMessage,
                    },
                  },
                });
                await withoutCallingGetEIP1559Compatibility({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });
                expect(
                  controller.store.getState().networkDetails.EIPS['1559'],
                ).toBeUndefined();

                await waitForStateChanges({
                  controller,
                  propertyPath: ['networkDetails'],
                  count: 0,
                  operation: async () => {
                    try {
                      await controller.getEIP1559Compatibility();
                    } catch (error) {
                      if (error !== intentionalErrorMessage) {
                        console.error(error);
                      }
                    }
                  },
                });
                expect(
                  controller.store.getState().networkDetails.EIPS['1559'],
                ).toBeUndefined();
              },
            );
          });
        });

        describe('if the network was switched after the net_version request started but before it completed', () => {
          it(`persists to state the network version of the newly switched network, not the initial one for ${networkName}`, async () => {
            const oldNetworkVersion = networkVersion;
            const newNetworkName = 'goerli';
            const newNetworkVersion = '5';

            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                },
              },
              async ({ controller }) => {
                let netVersionCallCount = 0;

                const fakeProviders = [
                  {
                    sendAsync(request, callback) {
                      if (request.method === 'net_version') {
                        netVersionCallCount += 1;
                        if (netVersionCallCount === 1) {
                          waitForStateChanges({
                            controller,
                            propertyPath: ['network'],
                            operation: () => {
                              controller.setProviderType(newNetworkName);
                            },
                          })
                            .then(() => {
                              callback(null, {
                                id: request.id,
                                jsonrpc: '2.0',
                                result: oldNetworkVersion,
                              });
                            })
                            .catch((error) => {
                              throw error;
                            });
                          return;
                        }

                        throw new Error(
                          "net_version shouldn't be called more than once",
                        );
                      }

                      if (request.method === 'eth_getBlockByNumber') {
                        callback(null, {
                          id: request.id,
                          jsonrpc: '2.0',
                          result: BLOCK,
                        });
                        return;
                      }

                      throw new Error(
                        `Mock not found for method ${request.method}`,
                      );
                    },
                  },
                  {
                    sendAsync(request, callback) {
                      if (request.method === 'net_version') {
                        callback(null, {
                          id: request.id,
                          jsonrpc: '2.0',
                          result: newNetworkVersion,
                        });
                        return;
                      }

                      if (request.method === 'eth_getBlockByNumber') {
                        callback(null, {
                          id: request.id,
                          jsonrpc: '2.0',
                          result: BLOCK,
                        });
                        return;
                      }

                      throw new Error(
                        `Mock not found for method ${request.method}`,
                      );
                    },
                  },
                ];
                jest
                  .spyOn(ethJsonRpcMiddlewareModule, 'providerFromEngine')
                  .mockImplementationOnce(() => fakeProviders[0])
                  .mockImplementationOnce(() => fakeProviders[1]);
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                await waitForStateChanges({
                  controller,
                  propertyPath: ['network'],
                  operation: async () => {
                    await controller.lookupNetwork();
                  },
                });

                expect(controller.store.getState().network).toBe(
                  newNetworkVersion,
                );
              },
            );
          });

          it(`persists to state the EIP-1559 support for the newly switched network, not the initial one for ${networkName}`, async () => {
            const oldNetworkVersion = networkVersion;
            const newNetworkName = 'goerli';
            const newNetworkVersion = '5';

            await withController(
              {
                state: {
                  provider: {
                    type: networkType,
                  },
                },
              },
              async ({ controller }) => {
                let netVersionCallCount = 0;

                const fakeProviders = [
                  {
                    sendAsync(request, callback) {
                      if (request.method === 'net_version') {
                        netVersionCallCount += 1;
                        if (netVersionCallCount === 1) {
                          waitForStateChanges({
                            controller,
                            propertyPath: ['network'],
                            operation: () => {
                              controller.setProviderType(newNetworkName);
                            },
                          })
                            .then(() => {
                              callback(null, {
                                id: request.id,
                                jsonrpc: '2.0',
                                result: oldNetworkVersion,
                              });
                            })
                            .catch((error) => {
                              throw error;
                            });
                          return;
                        }

                        throw new Error(
                          "net_version shouldn't be called more than once",
                        );
                      }

                      if (request.method === 'eth_getBlockByNumber') {
                        callback(null, {
                          id: request.id,
                          jsonrpc: '2.0',
                          result: POST_1559_BLOCK,
                        });
                        return;
                      }

                      throw new Error(
                        `Mock not found for method ${request.method}`,
                      );
                    },
                  },
                  {
                    sendAsync(request, callback) {
                      if (request.method === 'net_version') {
                        callback(null, {
                          id: request.id,
                          jsonrpc: '2.0',
                          result: newNetworkVersion,
                        });
                        return;
                      }

                      if (request.method === 'eth_getBlockByNumber') {
                        callback(null, {
                          id: request.id,
                          jsonrpc: '2.0',
                          result: PRE_1559_BLOCK,
                        });
                        return;
                      }

                      throw new Error(
                        `Mock not found for method ${request.method}`,
                      );
                    },
                  },
                ];
                jest
                  .spyOn(ethJsonRpcMiddlewareModule, 'providerFromEngine')
                  .mockImplementationOnce(() => fakeProviders[0])
                  .mockImplementationOnce(() => fakeProviders[1]);
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                await waitForStateChanges({
                  controller,
                  propertyPath: ['networkDetails'],
                  operation: async () => {
                    await controller.lookupNetwork();
                  },
                });

                expect(
                  controller.store.getState().networkDetails.EIPS['1559'],
                ).toBe(false);
              },
            );
          });
        });
      });
    }

    describe(`when the type in the provider configuration is "rpc"`, () => {
      it('emits infuraIsUnblocked', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();
            await withoutCallingLookupNetwork({
              controller,
              operation: async () => {
                await controller.initializeProvider();
              },
            });

            const infuraIsUnblocked = await waitForEvent({
              controller,
              eventName: 'infuraIsUnblocked',
              operation: async () => {
                await controller.lookupNetwork();
              },
            });

            expect(infuraIsUnblocked).toBe(true);
          },
        );
      });

      describe('if the request for net_version responds successfully', () => {
        it('persists the network version to state', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'https://mock-rpc-url',
                  chainId: '0x1337',
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '42',
                  },
                },
              });
              await withoutCallingLookupNetwork({
                controller,
                operation: async () => {
                  await controller.initializeProvider();
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              expect(controller.store.getState().network).toBe('42');
            },
          );
        });

        it('does not persist the result of net_version if it matches what is already in state', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'https://mock-rpc-url',
                  chainId: '0x1337',
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                net_version: {
                  times: 2,
                },
                eth_blockNumber: {
                  times: 2,
                },
              });
              await withoutCallingLookupNetwork({
                controller,
                operation: async () => {
                  await controller.initializeProvider();
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              const promiseForStateChanges = waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              await expect(promiseForStateChanges).toNeverResolve();
            },
          );
        });

        describe('if the request for eth_getBlockByNumber responds successfully', () => {
          it('persists to state that the network supports EIP-1559 when baseFeePerGas is in the block header', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: 'rpc',
                    rpcUrl: 'https://mock-rpc-url',
                    chainId: '0x1337',
                  },
                  networkDetails: {
                    EIPS: {},
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  latestBlock: POST_1559_BLOCK,
                });
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                await controller.lookupNetwork();

                expect(
                  controller.store.getState().networkDetails.EIPS[1559],
                ).toBe(true);
              },
            );
          });

          it('persists to state that the network does not support EIP-1559 when baseFeePerGas is not in the block header', async () => {
            await withController(
              {
                state: {
                  provider: {
                    type: 'rpc',
                    rpcUrl: 'https://mock-rpc-url',
                    chainId: '0x1337',
                  },
                  networkDetails: {
                    EIPS: {},
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  latestBlock: PRE_1559_BLOCK,
                });
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });

                await controller.lookupNetwork();

                expect(
                  controller.store.getState().networkDetails.EIPS[1559],
                ).toBe(false);
              },
            );
          });
        });

        describe('if the request for eth_getBlockByNumber responds with an error', () => {
          it('does not update the network details in any way', async () => {
            const intentionalErrorMessage =
              'intentional error from eth_getBlockByNumber';

            await withController(
              {
                state: {
                  provider: {
                    type: 'rpc',
                    rpcUrl: 'https://mock-rpc-url',
                    chainId: '0x1337',
                  },
                  networkDetails: {
                    EIPS: {},
                  },
                },
              },
              async ({ controller, network }) => {
                network.mockEssentialRpcCalls({
                  eth_getBlockByNumber: {
                    response: {
                      error: intentionalErrorMessage,
                    },
                  },
                });
                await withoutCallingLookupNetwork({
                  controller,
                  operation: async () => {
                    await controller.initializeProvider();
                  },
                });
                expect(
                  controller.store.getState().networkDetails.EIPS['1559'],
                ).toBeUndefined();

                await waitForStateChanges({
                  controller,
                  propertyPath: ['networkDetails'],
                  count: 0,
                  operation: async () => {
                    try {
                      await controller.lookupNetwork();
                    } catch (error) {
                      if (
                        !('data' in error) ||
                        error.data !== intentionalErrorMessage
                      ) {
                        console.error(error);
                      }
                    }
                  },
                });
                expect(
                  controller.store.getState().networkDetails.EIPS['1559'],
                ).toBeUndefined();
              },
            );
          });
        });
      });

      describe('if the request for net_version responds with an error', () => {
        it('resets the network status to "loading"', async () => {
          const intentionalErrorMessage = 'intentional error from net_version';

          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'https://mock-rpc-url',
                  chainId: '0x1337',
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                net_version: [
                  {
                    response: {
                      result: '42',
                    },
                  },
                  {
                    response: {
                      error: intentionalErrorMessage,
                    },
                  },
                ],
              });
              await controller.initializeProvider();
              expect(controller.store.getState().network).toBe('42');

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  try {
                    await controller.lookupNetwork();
                  } catch (error) {
                    if (error !== intentionalErrorMessage) {
                      console.error(error);
                    }
                  }
                },
              });

              expect(controller.store.getState().network).toBe('loading');
            },
          );
        });

        it('removes from state whether the network supports EIP-1559', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'https://mock-rpc-url',
                  chainId: '0x1337',
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
                net_version: [
                  {
                    response: {
                      result: '42',
                    },
                  },
                  {
                    response: {
                      error: 'oops',
                    },
                  },
                ],
              });
              await controller.initializeProvider();
              expect(controller.store.getState().networkDetails).toStrictEqual({
                EIPS: {
                  1559: true,
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['networkDetails'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              expect(controller.store.getState().networkDetails).toStrictEqual({
                EIPS: {
                  1559: undefined,
                },
              });
            },
          );
        });
      });

      describe('if the network was switched after the net_version request started but before it completed', () => {
        it('persists to state the network version of the newly switched network, not the initial network', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'https://mock-rpc-url-1',
                  chainId: '0x1337',
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '111',
                  },
                  beforeCompleting: async () => {
                    await waitForStateChanges({
                      controller,
                      propertyPath: ['network'],
                      operation: () => {
                        controller.setRpcTarget(
                          'https://mock-rpc-url-2',
                          '0x9999',
                        );
                      },
                    });
                  },
                },
              });
              const network2 = network1.with({
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url-2',
                },
              });
              network2.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '222',
                  },
                },
              });
              await withoutCallingLookupNetwork({
                controller,
                operation: async () => {
                  await controller.initializeProvider();
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              expect(controller.store.getState().network).toBe('222');
            },
          );
        });

        it('persists to state the EIP-1559 support for the newly switched network, not the initial one', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'https://mock-rpc-url-1',
                  chainId: '0x1337',
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '111',
                  },
                  beforeCompleting: async () => {
                    await waitForStateChanges({
                      controller,
                      propertyPath: ['network'],
                      operation: () => {
                        controller.setRpcTarget(
                          'https://mock-rpc-url-2',
                          '0x9999',
                        );
                      },
                    });
                  },
                },
                eth_getBlockByNumber: {
                  response: {
                    result: POST_1559_BLOCK,
                  },
                },
              });
              const network2 = network1.with({
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url-2',
                },
              });
              network2.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '222',
                  },
                },
                eth_getBlockByNumber: {
                  response: {
                    result: PRE_1559_BLOCK,
                  },
                },
              });
              await withoutCallingLookupNetwork({
                controller,
                operation: async () => {
                  await controller.initializeProvider();
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['networkDetails'],
                operation: async () => {
                  await controller.lookupNetwork();
                },
              });

              expect(
                controller.store.getState().networkDetails.EIPS['1559'],
              ).toBe(false);
            },
          );
        });
      });
    });
  });

  describe('setRpcTarget', () => {
    it('throws if the given chain ID is not a 0x-prefixed hex number', async () => {
      await withController(async ({ controller, network }) => {
        network.mockEssentialRpcCalls();

        expect(() =>
          controller.setRpcTarget('http://some.url', 'not a chain id'),
        ).toThrow(
          new Error('Invalid chain ID "not a chain id": invalid hex string.'),
        );
      });
    });

    it('throws if the given chain ID is greater than the maximum allowed ID', async () => {
      await withController(async ({ controller, network }) => {
        network.mockEssentialRpcCalls();

        expect(() =>
          controller.setRpcTarget('http://some.url', '0xFFFFFFFFFFFFFFFF'),
        ).toThrow(
          new Error(
            'Invalid chain ID "0xFFFFFFFFFFFFFFFF": numerical value greater than max safe value.',
          ),
        );
      });
    });

    it('captures the current provider configuration before overwriting it', async () => {
      await withController(
        {
          state: {
            provider: {
              type: 'rpc',
              rpcUrl: 'http://example-custom-rpc.metamask.io',
              chainId: '0x9999',
              nickname: 'Test initial state',
            },
          },
        },
        async ({ controller }) => {
          const network = new NetworkCommunications({
            networkClientType: 'custom',
            networkClientOptions: {
              customRpcUrl: 'https://mock-rpc-url',
            },
          });
          network.mockEssentialRpcCalls();

          controller.setRpcTarget('https://mock-rpc-url', '0x1337');

          expect(
            controller.store.getState().previousProviderStore,
          ).toStrictEqual({
            type: 'rpc',
            rpcUrl: 'http://example-custom-rpc.metamask.io',
            chainId: '0x9999',
            nickname: 'Test initial state',
          });
        },
      );
    });

    it('overwrites the provider configuration given a minimal set of arguments, filling in ticker, nickname, and rpcPrefs with default values', async () => {
      await withController(
        {
          state: {
            provider: {
              type: 'rpc',
              rpcUrl: 'http://example-custom-rpc.metamask.io',
              chainId: '0x9999',
              nickname: 'Test initial state',
            },
          },
        },
        async ({ controller }) => {
          const network = new NetworkCommunications({
            networkClientType: 'custom',
            networkClientOptions: {
              customRpcUrl: 'https://mock-rpc-url',
            },
          });
          network.mockEssentialRpcCalls();

          controller.setRpcTarget('https://mock-rpc-url', '0x1337');

          expect(controller.store.getState().provider).toStrictEqual({
            type: 'rpc',
            rpcUrl: 'https://mock-rpc-url',
            chainId: '0x1337',
            ticker: 'ETH',
            nickname: '',
            rpcPrefs: undefined,
          });
        },
      );
    });

    it('overwrites the provider configuration completely given a maximal set of arguments', async () => {
      await withController(
        {
          state: {
            provider: {
              type: 'rpc',
              rpcUrl: 'http://example-custom-rpc.metamask.io',
              chainId: '0x9999',
              nickname: 'Test initial state',
            },
          },
        },
        async ({ controller }) => {
          const network = new NetworkCommunications({
            networkClientType: 'custom',
            networkClientOptions: {
              customRpcUrl: 'https://mock-rpc-url',
            },
          });
          network.mockEssentialRpcCalls();

          controller.setRpcTarget(
            'https://mock-rpc-url',
            '0x1337',
            'DAI',
            'Cool network',
            'RPC prefs',
          );

          expect(controller.store.getState().provider).toStrictEqual({
            type: 'rpc',
            rpcUrl: 'https://mock-rpc-url',
            chainId: '0x1337',
            ticker: 'DAI',
            nickname: 'Cool network',
            rpcPrefs: 'RPC prefs',
          });
        },
      );
    });

    it('emits networkWillChange before making any changes to the network store', async () => {
      await withController(
        {
          state: {
            provider: {
              type: 'rpc',
              rpcUrl: 'http://example-custom-rpc.metamask.io',
              chainId: '0x9999',
              nickname: 'Test initial state',
            },
          },
        },
        async ({ controller, network: network1 }) => {
          network1.mockEssentialRpcCalls({
            net_version: {
              response: {
                result: '42',
              },
            },
          });
          const network2 = network1.with({
            networkClientOptions: {
              customRpcUrl: 'https://mock-rpc-url',
            },
          });
          network2.mockEssentialRpcCalls({
            net_version: {
              response: {
                result: '99',
              },
            },
          });
          await waitForLookupNetworkToComplete({
            controller,
            operation: async () => {
              await controller.initializeProvider();
            },
          });
          const initialNetwork = controller.store.getState().network;
          expect(initialNetwork).toBe('42');

          const networkWillChange = await waitForEvent({
            controller,
            eventName: 'networkWillChange',
            operation: () => {
              controller.setRpcTarget('https://mock-rpc-url', '0x1337');
            },
            beforeResolving: () => {
              expect(controller.store.getState().network).toBe(initialNetwork);
            },
          });
          expect(networkWillChange).toBe(true);
        },
      );
    });

    it('resets the network state to "loading" before emitting networkDidChange', async () => {
      await withController(
        {
          state: {
            provider: {
              type: 'rpc',
              rpcUrl: 'http://mock-rpc-url-1',
              chainId: '0xFF',
            },
          },
        },
        async ({ controller, network: network1 }) => {
          network1.mockEssentialRpcCalls({
            net_version: {
              response: {
                result: '255',
              },
            },
          });
          const network2 = network1.with({
            networkClientType: 'custom',
            networkClientOptions: {
              customRpcUrl: 'https://mock-rpc-url-2',
            },
          });
          network2.mockEssentialRpcCalls({
            net_version: {
              response: {
                result: "this got used when it shouldn't",
              },
            },
          });

          await controller.initializeProvider();
          expect(controller.store.getState().network).toBe('255');

          await waitForStateChanges({
            controller,
            propertyPath: ['network'],
            // We only care about the first state change, because it happens
            // before networkDidChange
            count: 1,
            operation: () => {
              controller.setRpcTarget('https://mock-rpc-url-2', '0xCC');
            },
          });
          expect(controller.store.getState().network).toBe('loading');
        },
      );
    });

    it('resets EIP support for the network before emitting networkDidChange', async () => {
      await withController(
        {
          state: {
            provider: {
              type: 'rpc',
              rpcUrl: 'http://mock-rpc-url-1',
              chainId: '0xFF',
            },
          },
        },
        async ({ controller, network: network1 }) => {
          network1.mockEssentialRpcCalls({
            latestBlock: POST_1559_BLOCK,
          });
          const network2 = network1.with({
            networkClientType: 'custom',
            networkClientOptions: {
              customRpcUrl: 'https://mock-rpc-url-2',
            },
          });
          network2.mockEssentialRpcCalls({
            latestBlock: PRE_1559_BLOCK,
          });

          await controller.initializeProvider();
          expect(controller.store.getState().networkDetails).toStrictEqual({
            EIPS: {
              1559: true,
            },
          });

          await waitForStateChanges({
            controller,
            propertyPath: ['networkDetails'],
            // We only care about the first state change, because it happens
            // before networkDidChange
            count: 1,
            operation: () => {
              controller.setRpcTarget('https://mock-rpc-url-2', '0xCC');
            },
          });
          expect(controller.store.getState().networkDetails).toStrictEqual({
            EIPS: {
              1559: undefined,
            },
          });
        },
      );
    });

    it('initializes a provider pointed to the given RPC URL whose chain ID matches the configured chain ID', async () => {
      await withController(async ({ controller }) => {
        const network = new NetworkCommunications({
          networkClientType: 'custom',
          networkClientOptions: {
            customRpcUrl: 'https://mock-rpc-url',
          },
        });
        network.mockEssentialRpcCalls();
        network.mockRpcCall({
          request: {
            method: 'test',
            params: [],
          },
          response: {
            result: 'test response',
          },
        });

        controller.setRpcTarget('https://mock-rpc-url', '0x1337');

        const { provider } = controller.getProviderAndBlockTracker();
        const promisifiedSendAsync = promisify(provider.sendAsync).bind(
          provider,
        );
        const { result: testResult } = await promisifiedSendAsync({
          id: 99999,
          jsonrpc: '2.0',
          method: 'test',
          params: [],
        });
        expect(testResult).toBe('test response');
        const { result: chainIdResult } = await promisifiedSendAsync({
          method: 'eth_chainId',
        });
        expect(chainIdResult).toBe('0x1337');
      });
    });

    it('replaces the provider object underlying the provider proxy without creating a new instance of the proxy itself', async () => {
      await withController(async ({ controller }) => {
        const network = new NetworkCommunications({
          networkClientType: 'custom',
          networkClientOptions: {
            customRpcUrl: 'https://mock-rpc-url',
          },
        });
        network.mockEssentialRpcCalls();
        await controller.initializeProvider();

        const { provider: providerBefore } =
          controller.getProviderAndBlockTracker();
        controller.setRpcTarget('https://mock-rpc-url', '0x1337');
        const { provider: providerAfter } =
          controller.getProviderAndBlockTracker();

        expect(providerBefore).toBe(providerAfter);
      });
    });

    it('emits networkDidChange', async () => {
      await withController(async ({ controller }) => {
        const network = new NetworkCommunications({
          networkClientType: 'custom',
          networkClientOptions: {
            customRpcUrl: 'https://mock-rpc-url',
          },
        });
        network.mockEssentialRpcCalls();

        const networkDidChange = await waitForEvent({
          controller,
          eventName: 'networkDidChange',
          operation: () => {
            controller.setRpcTarget('https://mock-rpc-url', '0x1337');
          },
        });

        expect(networkDidChange).toBe(true);
      });
    });

    it('emits infuraIsUnblocked', async () => {
      await withController(async ({ controller }) => {
        const network = new NetworkCommunications({
          networkClientType: 'custom',
          networkClientOptions: {
            customRpcUrl: 'https://mock-rpc-url',
          },
        });
        network.mockEssentialRpcCalls();

        const infuraIsUnblocked = await waitForEvent({
          controller,
          eventName: 'infuraIsUnblocked',
          operation: () => {
            controller.setRpcTarget('https://mock-rpc-url', '0x1337');
          },
        });

        expect(infuraIsUnblocked).toBe(true);
      });
    });

    it('persists the network version to state (assuming that the request for net_version responds successfully)', async () => {
      await withController(async ({ controller }) => {
        const network = new NetworkCommunications({
          networkClientType: 'custom',
          networkClientOptions: {
            customRpcUrl: 'https://mock-rpc-url',
          },
        });
        network.mockEssentialRpcCalls({
          net_version: {
            response: {
              result: '42',
            },
          },
        });

        await waitForStateChanges({
          controller,
          propertyPath: ['network'],
          operation: () => {
            controller.setRpcTarget('https://mock-rpc-url', '0x1337');
          },
        });

        expect(controller.store.getState().network).toBe('42');
      });
    });

    it('persists to state whether the network supports EIP-1559 (assuming that the request for eth_getBlockByNumber responds successfully)', async () => {
      await withController(
        {
          state: {
            networkDetails: {
              EIPS: {},
            },
          },
        },
        async ({ controller }) => {
          const network = new NetworkCommunications({
            networkClientType: 'custom',
            networkClientOptions: {
              customRpcUrl: 'https://mock-rpc-url',
            },
          });
          network.mockEssentialRpcCalls({
            latestBlock: POST_1559_BLOCK,
          });

          await waitForStateChanges({
            controller,
            propertyPath: ['networkDetails'],
            count: 2,
            operation: () => {
              controller.setRpcTarget('https://mock-rpc-url', '0x1337');
            },
          });

          expect(controller.store.getState().networkDetails.EIPS['1559']).toBe(
            true,
          );
        },
      );
    });
  });

  describe('setProviderType', () => {
    for (const {
      networkName,
      networkType,
      chainId,
      networkVersion,
      ticker,
    } of INFURA_NETWORKS) {
      describe(`given a type of "${networkType}"`, () => {
        it('captures the current provider configuration before overwriting it', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'http://example-custom-rpc.metamask.io',
                  chainId: '0x9999',
                  nickname: 'Test initial state',
                },
              },
            },
            async ({ controller }) => {
              const network = new NetworkCommunications({
                networkClientType: 'infura',
                networkClientOptions: {
                  infuraNetwork: networkType,
                },
              });
              network.mockEssentialRpcCalls();

              controller.setProviderType(networkType);

              expect(
                controller.store.getState().previousProviderStore,
              ).toStrictEqual({
                type: 'rpc',
                rpcUrl: 'http://example-custom-rpc.metamask.io',
                chainId: '0x9999',
                nickname: 'Test initial state',
              });
            },
          );
        });

        it(`overwrites the provider configuration using type: "${networkType}", chainId: "${chainId}", and ticker "${ticker}", clearing rpcUrl and nickname, and removing rpcPrefs`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'http://example-custom-rpc.metamask.io',
                  chainId: '0x9999',
                  nickname: 'Test initial state',
                },
              },
            },
            async ({ controller }) => {
              const network = new NetworkCommunications({
                networkClientType: 'infura',
                networkClientOptions: {
                  infuraNetwork: networkType,
                },
              });
              network.mockEssentialRpcCalls();

              controller.setProviderType(networkType);

              expect(controller.store.getState().provider).toStrictEqual({
                type: networkType,
                rpcUrl: '',
                chainId,
                ticker,
                nickname: '',
              });
            },
          );
        });

        it('emits networkWillChange', async () => {
          await withController(async ({ controller }) => {
            const network = new NetworkCommunications({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: networkType,
              },
            });
            network.mockEssentialRpcCalls();

            const networkWillChange = await waitForEvent({
              controller,
              eventName: 'networkWillChange',
              operation: () => {
                controller.setProviderType(networkType);
              },
            });

            expect(networkWillChange).toBe(true);
          });
        });

        it('resets the network state to "loading" before emitting networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'http://mock-rpc-url',
                  chainId: '0xFF',
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '255',
                  },
                },
              });
              const network2 = network1.with({
                networkClientType: 'infura',
                networkClientOptions: {
                  infuraNetwork: networkType,
                },
              });
              network2.mockEssentialRpcCalls();

              await controller.initializeProvider();
              expect(controller.store.getState().network).toBe('255');

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                // We only care about the first state change, because it
                // happens before networkDidChange
                count: 1,
                operation: () => {
                  controller.setProviderType(networkType);
                },
              });
              expect(controller.store.getState().network).toBe('loading');
            },
          );
        });

        it('resets EIP support for the network before emitting networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: 'rpc',
                  rpcUrl: 'http://mock-rpc-url-1',
                  chainId: '0xFF',
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
              });
              const network2 = network1.with({
                networkClientType: 'infura',
                networkClientOptions: {
                  infuraNetwork: networkType,
                },
              });
              network2.mockEssentialRpcCalls({
                latestBlock: PRE_1559_BLOCK,
              });

              await controller.initializeProvider();
              expect(controller.store.getState().networkDetails).toStrictEqual({
                EIPS: {
                  1559: true,
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['networkDetails'],
                // We only care about the first state change, because it
                // happens before networkDidChange
                count: 1,
                operation: () => {
                  controller.setProviderType(networkType);
                },
              });
              expect(controller.store.getState().networkDetails).toStrictEqual({
                EIPS: {
                  1559: undefined,
                },
              });
            },
          );
        });

        it(`initializes a provider pointed to the ${networkName} Infura network (chainId: ${chainId})`, async () => {
          await withController(async ({ controller }) => {
            const network = new NetworkCommunications({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: networkType,
              },
            });
            network.mockEssentialRpcCalls();

            controller.setProviderType(networkType);

            const { provider } = controller.getProviderAndBlockTracker();
            const promisifiedSendAsync = promisify(provider.sendAsync).bind(
              provider,
            );
            const { result: chainIdResult } = await promisifiedSendAsync({
              method: 'eth_chainId',
            });
            expect(chainIdResult).toBe(chainId);
          });
        });

        it('replaces the provider object underlying the provider proxy without creating a new instance of the proxy itself', async () => {
          await withController(async ({ controller }) => {
            const network = new NetworkCommunications({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: networkType,
              },
            });
            network.mockEssentialRpcCalls();
            await controller.initializeProvider();

            const { provider: providerBefore } =
              controller.getProviderAndBlockTracker();
            controller.setProviderType(networkType);
            const { provider: providerAfter } =
              controller.getProviderAndBlockTracker();

            expect(providerBefore).toBe(providerAfter);
          });
        });

        it('emits networkDidChange', async () => {
          await withController(async ({ controller }) => {
            const network = new NetworkCommunications({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: networkType,
              },
            });
            network.mockEssentialRpcCalls();

            const networkDidChange = await waitForEvent({
              controller,
              eventName: 'networkDidChange',
              operation: () => {
                controller.setProviderType(networkType);
              },
            });

            expect(networkDidChange).toBe(true);
          });
        });

        it('emits infuraIsUnblocked (assuming that the request for eth_blockNumber responds successfully)', async () => {
          await withController(async ({ controller }) => {
            const network = new NetworkCommunications({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: networkType,
              },
            });
            network.mockEssentialRpcCalls();

            const infuraIsUnblocked = await waitForEvent({
              controller,
              eventName: 'infuraIsUnblocked',
              operation: () => {
                controller.setProviderType(networkType);
              },
            });

            expect(infuraIsUnblocked).toBe(true);
          });
        });

        it(`persists "${networkVersion}" to state as the network version of ${networkName}`, async () => {
          await withController(async ({ controller }) => {
            const network = new NetworkCommunications({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: networkType,
              },
            });
            network.mockEssentialRpcCalls();

            await waitForStateChanges({
              controller,
              propertyPath: ['network'],
              operation: () => {
                controller.setProviderType(networkType);
              },
            });

            expect(controller.store.getState().network).toBe(networkVersion);
          });
        });

        it('persists to state whether the network supports EIP-1559 (assuming that the request for eth_getBlockByNumber responds successfully)', async () => {
          await withController(
            {
              state: {
                networkDetails: {
                  EIPS: {},
                },
              },
            },
            async ({ controller }) => {
              const network = new NetworkCommunications({
                networkClientType: 'infura',
                networkClientOptions: {
                  infuraNetwork: networkType,
                },
              });
              network.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['networkDetails'],
                count: 2,
                operation: () => {
                  controller.setProviderType(networkType);
                },
              });

              expect(
                controller.store.getState().networkDetails.EIPS['1559'],
              ).toBe(true);
            },
          );
        });
      });
    }

    describe('given a type of "rpc"', () => {
      it('throws', async () => {
        await withController(async ({ controller }) => {
          expect(() => controller.setProviderType('rpc')).toThrow(
            new Error(
              'NetworkController - cannot call "setProviderType" with type "rpc". Use "setRpcTarget"',
            ),
          );
        });
      });
    });

    describe('given an invalid Infura network name', () => {
      it('throws', async () => {
        await withController(async ({ controller }) => {
          expect(() => controller.setProviderType('sadlflaksdj')).toThrow(
            new Error('Unknown Infura provider type "sadlflaksdj".'),
          );
        });
      });
    });
  });

  describe('resetConnection', () => {
    for (const {
      networkName,
      networkType,
      chainId,
      networkVersion,
    } of INFURA_NETWORKS) {
      describe(`when the type in the provider configuration is "${networkType}"`, () => {
        it('emits networkWillChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              const networkWillChange = await waitForEvent({
                controller,
                eventName: 'networkWillChange',
                operation: () => {
                  controller.resetConnection();
                },
              });

              expect(networkWillChange).toBe(true);
            },
          );
        });

        it('resets the network state to "loading" before emitting networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                eth_blockNumber: {
                  times: 2,
                },
              });

              await controller.initializeProvider();
              expect(controller.store.getState().network).toBe(networkVersion);

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                // We only care about the first state change, because it
                // happens before networkDidChange
                count: 1,
                operation: () => {
                  controller.resetConnection();
                },
              });
              expect(controller.store.getState().network).toBe('loading');
            },
          );
        });

        it('resets EIP support for the network before emitting networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
                eth_blockNumber: {
                  times: 2,
                },
              });

              await controller.initializeProvider();
              expect(controller.store.getState().networkDetails).toStrictEqual({
                EIPS: {
                  1559: true,
                },
              });

              await waitForStateChanges({
                controller,
                propertyPath: ['networkDetails'],
                // We only care about the first state change, because it
                // happens before networkDidChange
                count: 1,
                operation: () => {
                  controller.resetConnection();
                },
              });
              expect(controller.store.getState().networkDetails).toStrictEqual({
                EIPS: {
                  1559: undefined,
                },
              });
            },
          );
        });

        it(`initializes a new provider object pointed to the current Infura network (name: ${networkName}, chain ID: ${chainId})`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              controller.resetConnection();

              const { provider } = controller.getProviderAndBlockTracker();
              const promisifiedSendAsync = promisify(provider.sendAsync).bind(
                provider,
              );
              const { result: chainIdResult } = await promisifiedSendAsync({
                method: 'eth_chainId',
              });
              expect(chainIdResult).toBe(chainId);
            },
          );
        });

        it('replaces the provider object underlying the provider proxy without creating a new instance of the proxy itself', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();
              await controller.initializeProvider();

              const { provider: providerBefore } =
                controller.getProviderAndBlockTracker();
              controller.resetConnection();
              const { provider: providerAfter } =
                controller.getProviderAndBlockTracker();

              expect(providerBefore).toBe(providerAfter);
            },
          );
        });

        it('emits networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              const networkDidChange = await waitForEvent({
                controller,
                eventName: 'networkDidChange',
                operation: () => {
                  controller.resetConnection();
                },
              });

              expect(networkDidChange).toBe(true);
            },
          );
        });

        it('emits infuraIsUnblocked (assuming that the request for eth_blockNumber responds successfully)', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              const infuraIsUnblocked = await waitForEvent({
                controller,
                eventName: 'infuraIsUnblocked',
                operation: () => {
                  controller.resetConnection();
                },
              });

              expect(infuraIsUnblocked).toBe(true);
            },
          );
        });

        it(`ensures that the network version in state is set to "${networkVersion}"`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls();

              await waitForStateChanges({
                controller,
                propertyPath: ['network'],
                operation: () => {
                  controller.resetConnection();
                },
              });

              expect(controller.store.getState().network).toBe(networkVersion);
            },
          );
        });

        it('does not ensure that EIP-1559 support for the current network is up to date', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network }) => {
              network.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
              });

              expect(
                controller.store.getState().networkDetails.EIPS['1559'],
              ).toBeUndefined();

              controller.resetConnection();

              expect(
                controller.store.getState().networkDetails.EIPS['1559'],
              ).toBeUndefined();
            },
          );
        });
      });
    }

    describe(`when the type in the provider configuration is "rpc"`, () => {
      it('emits networkWillChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();

            const networkWillChange = await waitForEvent({
              controller,
              eventName: 'networkWillChange',
              operation: () => {
                controller.resetConnection();
              },
            });

            expect(networkWillChange).toBe(true);
          },
        );
      });

      it('resets the network state to "loading" before emitting networkDidChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0xFF',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              eth_blockNumber: {
                times: 2,
              },
              net_version: {
                response: {
                  result: '255',
                },
              },
            });

            await controller.initializeProvider();
            expect(controller.store.getState().network).toBe('255');

            await waitForStateChanges({
              controller,
              propertyPath: ['network'],
              // We only care about the first state change, because it happens
              // before networkDidChange
              count: 1,
              operation: () => {
                controller.resetConnection();
              },
            });
            expect(controller.store.getState().network).toBe('loading');
          },
        );
      });

      it('resets EIP support for the network before emitting networkDidChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0xFF',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              latestBlock: POST_1559_BLOCK,
              eth_blockNumber: {
                times: 2,
              },
            });

            await controller.initializeProvider();
            expect(controller.store.getState().networkDetails).toStrictEqual({
              EIPS: {
                1559: true,
              },
            });

            await waitForStateChanges({
              controller,
              propertyPath: ['networkDetails'],
              // We only care about the first state change, because it happens
              // before networkDidChange
              count: 1,
              operation: () => {
                controller.resetConnection();
              },
            });
            expect(controller.store.getState().networkDetails).toStrictEqual({
              EIPS: {
                1559: undefined,
              },
            });
          },
        );
      });

      it('initializes a new provider object pointed to the same RPC URL as the current network and using the same chain ID', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();

            controller.resetConnection();

            const { provider } = controller.getProviderAndBlockTracker();
            const promisifiedSendAsync = promisify(provider.sendAsync).bind(
              provider,
            );
            const { result: chainIdResult } = await promisifiedSendAsync({
              method: 'eth_chainId',
            });
            expect(chainIdResult).toBe('0x1337');
          },
        );
      });

      it('replaces the provider object underlying the provider proxy without creating a new instance of the proxy itself', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();
            await controller.initializeProvider();

            const { provider: providerBefore } =
              controller.getProviderAndBlockTracker();
            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.resetConnection();
              },
            });
            const { provider: providerAfter } =
              controller.getProviderAndBlockTracker();

            expect(providerBefore).toBe(providerAfter);
          },
        );
      });

      it('emits networkDidChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();

            const networkDidChange = await waitForEvent({
              controller,
              eventName: 'networkDidChange',
              operation: () => {
                controller.resetConnection();
              },
            });

            expect(networkDidChange).toBe(true);
          },
        );
      });

      it('emits infuraIsUnblocked', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls();

            const infuraIsUnblocked = await waitForEvent({
              controller,
              eventName: 'infuraIsUnblocked',
              operation: () => {
                controller.resetConnection();
              },
            });

            expect(infuraIsUnblocked).toBe(true);
          },
        );
      });

      it('ensures that the network version in state is up to date', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              net_version: {
                response: {
                  result: '42',
                },
              },
            });

            await waitForStateChanges({
              controller,
              propertyPath: ['network'],
              operation: () => {
                controller.resetConnection();
              },
            });

            expect(controller.store.getState().network).toBe('42');
          },
        );
      });

      it('does not ensure that EIP-1559 support for the current network is up to date', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network }) => {
            network.mockEssentialRpcCalls({
              latestBlock: POST_1559_BLOCK,
            });

            expect(
              controller.store.getState().networkDetails.EIPS['1559'],
            ).toBeUndefined();

            controller.resetConnection();

            expect(
              controller.store.getState().networkDetails.EIPS['1559'],
            ).toBeUndefined();
          },
        );
      });
    });
  });

  describe('rollbackToPreviousProvider', () => {
    for (const {
      networkName,
      networkType,
      chainId,
      networkVersion,
    } of INFURA_NETWORKS) {
      describe(`if the previous provider configuration had a type of "${networkType}"`, () => {
        it('merges the previous configuration into the current provider configuration', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls();

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });
              expect(controller.store.getState().provider).toStrictEqual({
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
                ticker: 'ETH',
                nickname: '',
                rpcPrefs: undefined,
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.rollbackToPreviousProvider();
                },
              });
              expect(controller.store.getState().provider).toStrictEqual({
                type: networkType,
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
                ticker: 'ETH',
                nickname: '',
                rpcPrefs: undefined,
              });
            },
          );
        });

        it('emits networkWillChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls();
              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: async () => {
                  const networkWillChange = await waitForEvent({
                    controller,
                    eventName: 'networkWillChange',
                    operation: () => {
                      controller.rollbackToPreviousProvider();
                    },
                  });

                  expect(networkWillChange).toBe(true);
                },
              });
            },
          );
        });

        it('resets the network state to "loading" before emitting networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '255',
                  },
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });
              expect(controller.store.getState().network).toBe('255');

              await waitForLookupNetworkToComplete({
                controller,
                operation: async () => {
                  await waitForStateChanges({
                    controller,
                    propertyPath: ['network'],
                    // We only care about the first state change, because it
                    // happens before networkDidChange
                    count: 1,
                    operation: () => {
                      controller.rollbackToPreviousProvider();
                    },
                  });
                  expect(controller.store.getState().network).toBe('loading');
                },
              });
            },
          );
        });

        it('resets EIP support for the network before emitting networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });
              expect(controller.store.getState().networkDetails).toStrictEqual({
                EIPS: {
                  1559: true,
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: async () => {
                  await waitForStateChanges({
                    controller,
                    propertyPath: ['networkDetails'],
                    // We only care about the first state change, because it
                    // happens before networkDidChange
                    count: 1,
                    operation: () => {
                      controller.rollbackToPreviousProvider();
                    },
                  });
                  expect(
                    controller.store.getState().networkDetails,
                  ).toStrictEqual({
                    EIPS: {
                      1559: undefined,
                    },
                  });
                },
              });
            },
          );
        });

        it(`initializes a provider pointed to the ${networkName} Infura network (chainId: ${chainId})`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls();
              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.rollbackToPreviousProvider();
                },
              });

              const { provider } = controller.getProviderAndBlockTracker();
              const promisifiedSendAsync = promisify(provider.sendAsync).bind(
                provider,
              );
              const { result: chainIdResult } = await promisifiedSendAsync({
                method: 'eth_chainId',
              });
              expect(chainIdResult).toBe(chainId);
            },
          );
        });

        it('replaces the provider object underlying the provider proxy without creating a new instance of the proxy itself', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls();
              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });

              const { provider: providerBefore } =
                controller.getProviderAndBlockTracker();
              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.rollbackToPreviousProvider();
                },
              });
              const { provider: providerAfter } =
                controller.getProviderAndBlockTracker();

              expect(providerBefore).toBe(providerAfter);
            },
          );
        });

        it('emits networkDidChange', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls();

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: async () => {
                  const networkDidChange = await waitForEvent({
                    controller,
                    eventName: 'networkDidChange',
                    operation: () => {
                      controller.rollbackToPreviousProvider();
                    },
                  });
                  expect(networkDidChange).toBe(true);
                },
              });
            },
          );
        });

        it('emits infuraIsUnblocked (assuming that the request for eth_blockNumber responds successfully)', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls();

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: async () => {
                  const infuraIsUnblocked = await waitForEvent({
                    controller,
                    eventName: 'infuraIsUnblocked',
                    operation: () => {
                      controller.rollbackToPreviousProvider();
                    },
                  });

                  expect(infuraIsUnblocked).toBe(true);
                },
              });
            },
          );
        });

        it(`persists "${networkVersion}" to state as the network version of ${networkName}`, async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls();
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls({
                net_version: {
                  response: {
                    result: '255',
                  },
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });
              expect(controller.store.getState().network).toBe('255');

              await waitForLookupNetworkToComplete({
                controller,
                numberOfNetworkDetailsChanges: 2,
                operation: () => {
                  controller.rollbackToPreviousProvider();
                },
              });
              expect(controller.store.getState().network).toBe(networkVersion);
            },
          );
        });

        it('persists to state whether the network supports EIP-1559 (assuming that the request for eth_getBlockByNumber responds successfully)', async () => {
          await withController(
            {
              state: {
                provider: {
                  type: networkType,
                },
              },
            },
            async ({ controller, network: network1 }) => {
              network1.mockEssentialRpcCalls({
                latestBlock: POST_1559_BLOCK,
              });
              const network2 = network1.with({
                networkClientType: 'custom',
                networkClientOptions: {
                  customRpcUrl: 'https://mock-rpc-url',
                },
              });
              network2.mockEssentialRpcCalls({
                latestBlock: PRE_1559_BLOCK,
                net_version: {
                  response: {
                    result: '99999',
                  },
                },
              });

              await waitForLookupNetworkToComplete({
                controller,
                operation: () => {
                  controller.setRpcTarget('https://mock-rpc-url', '0x1337');
                },
              });
              expect(
                controller.store.getState().networkDetails.EIPS['1559'],
              ).toBe(false);

              await waitForLookupNetworkToComplete({
                controller,
                numberOfNetworkDetailsChanges: 2,
                operation: () => {
                  controller.rollbackToPreviousProvider();
                },
              });
              expect(
                controller.store.getState().networkDetails.EIPS['1559'],
              ).toBe(true);
            },
          );
        });
      });
    }

    describe(`if the previous provider configuration had a type of "rpc"`, () => {
      it('merges the previous configuration into the current provider configuration', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });
            expect(controller.store.getState().provider).toStrictEqual({
              type: 'goerli',
              rpcUrl: '',
              chainId: '0x5',
              ticker: 'GoerliETH',
              nickname: '',
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.rollbackToPreviousProvider();
              },
            });
            expect(controller.store.getState().provider).toStrictEqual({
              type: 'rpc',
              rpcUrl: 'https://mock-rpc-url',
              chainId: '0x1337',
              ticker: 'GoerliETH',
              nickname: '',
            });
          },
        );
      });

      it('emits networkWillChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();
            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: async () => {
                const networkWillChange = await waitForEvent({
                  controller,
                  eventName: 'networkWillChange',
                  operation: () => {
                    controller.rollbackToPreviousProvider();
                  },
                });

                expect(networkWillChange).toBe(true);
              },
            });
          },
        );
      });

      it('resets the network state to "loading" before emitting networkDidChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });
            expect(controller.store.getState().network).toBe('5');

            await waitForLookupNetworkToComplete({
              controller,
              operation: async () => {
                await waitForStateChanges({
                  controller,
                  propertyPath: ['network'],
                  // We only care about the first state change, because it
                  // happens before networkDidChange
                  count: 1,
                  operation: () => {
                    controller.rollbackToPreviousProvider();
                  },
                });
                expect(controller.store.getState().network).toBe('loading');
              },
            });
          },
        );
      });

      it('resets EIP support for the network before emitting networkDidChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls({
              latestBlock: POST_1559_BLOCK,
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });
            expect(controller.store.getState().networkDetails).toStrictEqual({
              EIPS: {
                1559: true,
              },
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: async () => {
                await waitForStateChanges({
                  controller,
                  propertyPath: ['networkDetails'],
                  // We only care about the first state change, because it
                  // happens before networkDidChange
                  count: 1,
                  operation: () => {
                    controller.rollbackToPreviousProvider();
                  },
                });
                expect(
                  controller.store.getState().networkDetails,
                ).toStrictEqual({
                  EIPS: {
                    1559: undefined,
                  },
                });
              },
            });
          },
        );
      });

      it('initializes a provider pointed to the given RPC URL whose chain ID matches the previously configured chain ID', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();
            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.rollbackToPreviousProvider();
              },
            });

            const { provider } = controller.getProviderAndBlockTracker();
            const promisifiedSendAsync = promisify(provider.sendAsync).bind(
              provider,
            );
            const { result: chainIdResult } = await promisifiedSendAsync({
              method: 'eth_chainId',
            });
            expect(chainIdResult).toBe('0x1337');
          },
        );
      });

      it('replaces the provider object underlying the provider proxy without creating a new instance of the proxy itself', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();
            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });

            const { provider: providerBefore } =
              controller.getProviderAndBlockTracker();
            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.rollbackToPreviousProvider();
              },
            });
            const { provider: providerAfter } =
              controller.getProviderAndBlockTracker();

            expect(providerBefore).toBe(providerAfter);
          },
        );
      });

      it('emits networkDidChange', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: async () => {
                const networkDidChange = await waitForEvent({
                  controller,
                  eventName: 'networkDidChange',
                  operation: () => {
                    controller.rollbackToPreviousProvider();
                  },
                });
                expect(networkDidChange).toBe(true);
              },
            });
          },
        );
      });

      it('emits infuraIsUnblocked', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls();
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: async () => {
                const infuraIsUnblocked = await waitForEvent({
                  controller,
                  eventName: 'infuraIsUnblocked',
                  operation: () => {
                    controller.rollbackToPreviousProvider();
                  },
                });

                expect(infuraIsUnblocked).toBe(true);
              },
            });
          },
        );
      });

      it('persists the network version to state (assuming that the request for net_version responds successfully)', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls({
              net_version: {
                response: {
                  result: '42',
                },
              },
            });
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls();

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });
            expect(controller.store.getState().network).toBe('5');

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.rollbackToPreviousProvider();
              },
            });
            expect(controller.store.getState().network).toBe('42');
          },
        );
      });

      it('persists to state whether the network supports EIP-1559 (assuming that the request for eth_getBlockByNumber responds successfully)', async () => {
        await withController(
          {
            state: {
              provider: {
                type: 'rpc',
                rpcUrl: 'https://mock-rpc-url',
                chainId: '0x1337',
              },
            },
          },
          async ({ controller, network: network1 }) => {
            network1.mockEssentialRpcCalls({
              latestBlock: POST_1559_BLOCK,
              net_version: {
                response: {
                  result: '99999',
                },
              },
            });
            const network2 = network1.with({
              networkClientType: 'infura',
              networkClientOptions: {
                infuraNetwork: 'goerli',
              },
            });
            network2.mockEssentialRpcCalls({
              latestBlock: PRE_1559_BLOCK,
            });

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.setProviderType('goerli');
              },
            });
            expect(
              controller.store.getState().networkDetails.EIPS['1559'],
            ).toBe(false);

            await waitForLookupNetworkToComplete({
              controller,
              operation: () => {
                controller.rollbackToPreviousProvider();
              },
            });
            expect(
              controller.store.getState().networkDetails.EIPS['1559'],
            ).toBe(true);
          },
        );
      });
    });
  });
});

/**
 * Builds a controller based on the given options, and calls the given function
 * with that controller.
 *
 * @param args - Either a function, or an options bag + a function. The options
 * bag is the same that NetworkController takes; the function will be called
 * with the built controller as well as an object that can be used to mock
 * requests.
 * @returns Whatever the callback returns.
 */
async function withController(...args) {
  const [givenConstructorOptions, fn] =
    args.length === 2 ? args : [{}, args[0]];
  const constructorOptions = {
    ...DEFAULT_CONTROLLER_OPTIONS,
    ...givenConstructorOptions,
  };
  const controller = new NetworkController(constructorOptions);

  const providerConfig = controller.store.getState().provider;
  const networkClientType = providerConfig.type === 'rpc' ? 'custom' : 'infura';
  const { infuraProjectId } = constructorOptions;
  const infuraNetwork =
    networkClientType === 'infura' ? providerConfig.type : undefined;
  const customRpcUrl =
    networkClientType === 'custom' ? providerConfig.rpcUrl : undefined;
  const network = new NetworkCommunications({
    networkClientType,
    networkClientOptions: { infuraProjectId, infuraNetwork, customRpcUrl },
  });

  try {
    return await fn({ controller, network });
  } finally {
    await controller.destroy();
  }
}

/**
 * For each kind of way that the provider can be set, `lookupNetwork` is always
 * called. This can cause difficulty when testing the behavior of
 * `lookupNetwork` itself, as extra requests then have to be mocked.
 * This function takes a function that presumably sets the provider,
 * stubbing `lookupNetwork` before the function and releasing the stub
 * afterward.
 *
 * @param {object} args - The arguments.
 * @param {NetworkController} args.controller - The network controller.
 * @param {() => void | Promise<void>} args.operation - The function that
 * presumably involves `lookupNetwork`.
 */
async function withoutCallingLookupNetwork({ controller, operation }) {
  const spy = jest
    .spyOn(controller, 'lookupNetwork')
    .mockResolvedValue(undefined);
  await operation();
  spy.mockRestore();
}

/**
 * For each kind of way that the provider can be set, `getEIP1559Compatibility`
 * is always called. This can cause difficulty when testing the behavior of
 * `getEIP1559Compatibility` itself, as extra requests then have to be
 * mocked. This function takes a function that presumably sets the provider,
 * stubbing `getEIP1559Compatibility` before the function and releasing the stub
 * afterward.
 *
 * @param {object} args - The arguments.
 * @param {NetworkController} args.controller - The network controller.
 * @param {() => void | Promise<void>} args.operation - The function that
 * presumably involves `getEIP1559Compatibility`.
 */
async function withoutCallingGetEIP1559Compatibility({
  controller,
  operation,
}) {
  const spy = jest
    .spyOn(controller, 'getEIP1559Compatibility')
    .mockResolvedValue(undefined);
  await operation();
  spy.mockRestore();
}

/**
 * Waits for changes to the primary observable store of a controller to occur
 * before proceeding. May be called with a function, in which case waiting will
 * occur after the function is called; or may be called standalone if you want
 * to assert that no state changes occurred.
 *
 * @param {object} [args] - The arguments.
 * @param {NetworkController} args.controller - The network controller.
 * @param {string[]} [args.propertyPath] - The path of the property you
 * expect the state changes to concern.
 * @param {number | null} [args.count] - The number of events you expect to
 * occur. If null, this function will wait until no events have occurred in
 * `wait` number of milliseconds. Default: 1.
 * @param {number} [args.duration] - The amount of time in milliseconds to
 * wait for the expected number of filtered state changes to occur before
 * resolving the promise that this function returns (default: 150).
 * @param {() => void | Promise<void>} [args.operation] - A function to run
 * that will presumably produce the state changes in question.
 * @returns A promise that resolves to an array of state objects (that is, the
 * contents of the store) when the specified number of filtered state changes
 * have occurred, or all of them if no number has been specified.
 */
async function waitForStateChanges({
  controller,
  propertyPath,
  count: expectedInterestingStateCount = 1,
  duration: timeBeforeAssumingNoMoreStateChanges = 150,
  operation = () => {
    // do nothing
  },
}) {
  const initialState = { ...controller.store.getState() };
  let isTimerRunning = false;

  const getPropertyFrom = (state) => {
    return propertyPath === undefined
      ? state
      : propertyPath.reduce((finalValue, part) => finalValue[part], state);
  };

  const isStateChangeInteresting = (newState, prevState) => {
    return !isDeepStrictEqual(
      getPropertyFrom(newState, propertyPath),
      getPropertyFrom(prevState, propertyPath),
    );
  };

  const promiseForStateChanges = new Promise((resolve, reject) => {
    // We need to declare this variable first, then assign it later, so that
    // ESLint won't complain that resetTimer is referring to this variable
    // before it's declared. And we need to use let so that we can assign it
    // below.
    /* eslint-disable-next-line prefer-const */
    let eventListener;
    let timer;
    const allStates = [];
    const interestingStates = [];

    const stopTimer = () => {
      if (timer) {
        clearTimeout(timer);
      }
      isTimerRunning = false;
    };

    const end = () => {
      stopTimer();

      controller.store.unsubscribe(eventListener);

      const shouldEnd =
        expectedInterestingStateCount === null
          ? interestingStates.length > 0
          : interestingStates.length === expectedInterestingStateCount;

      if (shouldEnd) {
        resolve(interestingStates);
      } else {
        // Using a string instead of an Error leads to better backtraces.
        /* eslint-disable-next-line prefer-promise-reject-errors */
        const expectedInterestingStateCountFragment =
          expectedInterestingStateCount === null
            ? 'any number of'
            : expectedInterestingStateCount;
        const propertyPathFragment =
          propertyPath === undefined ? '' : ` on \`${propertyPath.join('.')}\``;
        const actualInterestingStateCountFragment =
          expectedInterestingStateCount === null
            ? 'none'
            : interestingStates.length;
        const primaryMessage = `Expected to receive ${expectedInterestingStateCountFragment} state change(s)${propertyPathFragment}, but received ${actualInterestingStateCountFragment} after ${timeBeforeAssumingNoMoreStateChanges}ms.`;
        reject(
          [
            primaryMessage,
            'Initial state:',
            inspect(initialState, { depth: null }),
            'All state changes (without filtering):',
            inspect(allStates, { depth: null }),
            'Filtered state changes:',
            inspect(interestingStates, { depth: null }),
          ].join('\n\n'),
        );
      }
    };

    const resetTimer = () => {
      stopTimer();
      timer = originalSetTimeout(() => {
        if (isTimerRunning) {
          end();
        }
      }, timeBeforeAssumingNoMoreStateChanges);
      isTimerRunning = true;
    };

    eventListener = (newState) => {
      const isInteresting = isStateChangeInteresting(
        newState,
        allStates.length > 0 ? allStates[allStates.length - 1] : initialState,
      );

      allStates.push({ ...newState });

      if (isInteresting) {
        interestingStates.push(newState);
        if (interestingStates.length === expectedInterestingStateCount) {
          end();
        } else {
          resetTimer();
        }
      }
    };

    controller.store.subscribe(eventListener);
    resetTimer();
  });

  await operation();

  return await promiseForStateChanges;
}

/**
 * Waits for an event to occur on the controller before proceeding.
 *
 * @param {{controller: NetworkController, eventName: string, operation: (() => void | Promise<void>), beforeResolving?: (() => void | Promise<void>)}} args - The arguments.
 * @param {NetworkController} args.controller - The network controller
 * @param {string} args.eventName - The name of the event.
 * @param {() => void | Promise<void>} args.operation - A function that will
 * presumably produce the event in question.
 * @param {() => void | Promise<void>} [args.beforeResolving] - In some tests,
 * state updates happen so fast, we need to make an assertion immediately after
 * the event in question occurs. However, if we wait until the promise this
 * function returns resolves to do so, some other state update to the same
 * property may have happened. This option allows you to make an assertion
 * _before_ the promise resolves. This has the added benefit of allowing you to
 * maintain the "arrange, act, assert" ordering in your test, meaning that
 * you can still call the method that kicks off the event and then make the
 * assertion afterward instead of the other way around.
 * @returns {Promise<true>}
 */
async function waitForEvent({
  controller,
  eventName,
  operation,
  beforeResolving = async () => {
    // do nothing
  },
}) {
  const promise = new Promise((resolve) => {
    controller.once(eventName, () => {
      Promise.resolve(beforeResolving()).then(() => {
        resolve(true);
      });
    });
  });

  await operation();

  return await promise;
}

/**
 * `lookupNetwork` is a method in NetworkController which is called internally
 * by a few methods. `lookupNetwork` is asynchronous as it makes network
 * requests under the hood, but unfortunately, the method is not awaited after
 * being called. Hence, if it is called during a test, even if the network
 * requests are initiated within the test, they may complete after that test
 * ends. This is a problem because it may cause Nock mocks set up in a later
 * test to get used up prematurely, causing failures.
 *
 * To fix this, we need to wait for `lookupNetwork` to fully finish before
 * continuing. Since the latest thing that happens in `lookupNetwork` is to
 * update EIP-1559 compatibility in state, we can wait for the `networkDetails`
 * state to get updated specifically. Unfortunately, we don't know how many
 * times this will happen, so this function does incur some time when it's used.
 * To speed up tests, you can pass `numberOfNetworkDetailsChanges`.
 *
 *
 * @param {object} args - The arguments.
 * @param {NetworkController} args.controller - The network controller.
 * @param {count} [args.numberOfNetworkDetailsChanges] - The number of times
 * that `networkDetails` is expected to be updated.
 * @param {() => void | Promise<void>} [args.operation] - The function that
 * presumably involves `lookupNetwork`.
 */
async function waitForLookupNetworkToComplete({
  controller,
  numberOfNetworkDetailsChanges = null,
  operation,
}) {
  await waitForStateChanges({
    controller,
    propertyPath: ['networkDetails'],
    operation,
    count: numberOfNetworkDetailsChanges,
  });
}
