import { permissionRpcMethods } from '@metamask/snap-controllers';
import { ethErrors } from 'eth-rpc-errors';
import { UNSUPPORTED_RPC_METHODS } from '../../../../shared/constants/network';
import localHandlers from './handlers';

const allHandlers = [...localHandlers, ...permissionRpcMethods.handlers];

const handlerMap = allHandlers.reduce((map, handler) => {
  for (const methodName of handler.methodNames) {
    map.set(methodName, handler);
  }
  return map;
}, new Map());

/**
 * Creates a json-rpc-engine middleware of RPC method implementations.
 *
 * Handlers consume functions that hook into the background, and only depend
 * on their signatures, not e.g. controller internals.
 *
 * @param {Record<string, unknown>} hooks - Required "hooks" into our
 * controllers.
 * @returns {(req: Object, res: Object, next: Function, end: Function) => void}
 */
export default function createMethodMiddleware(hooks) {
  return async function methodMiddleware(req, res, next, end) {
    // Reject unsupported methods.
    if (UNSUPPORTED_RPC_METHODS.has(req.method)) {
      return end(ethErrors.rpc.methodNotSupported());
    }

    const handler = handlerMap.get(req.method);
    if (handler) {
      const { implementation, hookNames } = handler;
      try {
        // Implementations may or may not be async, so we must await them.
        return await implementation(
          req,
          res,
          next,
          end,
          selectHooks(hooks, hookNames),
        );
      } catch (error) {
        return end(error);
      }
    }

    return next();
  };
}

/**
 * Returns the subset of the specified `hooks` that are included in the
 * `hookNames` object. This is a Principle of Least Authority (POLA) measure
 * to ensure that each RPC method implementation only has access to the
 * API "hooks" it needs to do its job.
 *
 * @param {Record<string, unknown>} hooks - The hooks to select from.
 * @param {Record<string, true>} hookNames - The names of the hooks to select.
 * @returns {Record<string, unknown> | undefined} The selected hooks.
 */
function selectHooks(hooks, hookNames) {
  if (hookNames) {
    return Object.keys(hookNames).reduce((hookSubset, hookName) => {
      hookSubset[hookName] = hooks[hookName];
      return hookSubset;
    }, {});
  }
  return undefined;
}
