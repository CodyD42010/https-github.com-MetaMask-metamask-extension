import { KeyringClass, Json } from '@metamask/utils';

/**
 * A transport bridge between the keyring and the hardware device.
 */
export type HardwareTransportBridge = {
  new (): HardwareTransportBridge;
  init(): Promise<void>;
};

/**
 * Get builder function for Hardware keyrings which require an additional `opts`
 * parameter, used to pass the transport bridge used by the keyring.
 *
 * Returns a builder function for `Keyring` with a `type` property.
 *
 * @param Keyring - The Keyring class for the builder.
 * @param Bridge - The transport bridge class to use for the given Keyring.
 * @returns A builder function for the given Keyring.
 */
export function hardwareKeyringBuilderFactory(
  Keyring: KeyringClass<Json>,
  Bridge: HardwareTransportBridge,
) {
  const builder = () => new Keyring({ bridge: new Bridge() });

  builder.type = Keyring.type;

  return builder;
}
