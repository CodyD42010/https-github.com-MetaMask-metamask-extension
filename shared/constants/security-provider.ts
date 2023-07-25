export enum SecurityProvider {
  Blockaid = 'blockaid',
}

type SecurityProviderConfig = Record<
  SecurityProvider,
  {
    /** translation key for security provider name */
    readonly tKeyName: string;
    /** URL to securty provider website */
    readonly url: string;
  }
>;

export const SECURITY_PROVIDER_CONFIG: Readonly<SecurityProviderConfig> = {
  [SecurityProvider.Blockaid]: {
    tKeyName: 'blockaid',
    url: 'https://blockaid.io/',
  },
};

/** The reason, also referred to as the attack type, provided in the PPOM Response  */
export enum BlockaidReason {
  /** Approval for a malicious spender  */
  approvalFarming = 'approval_farming',
  /** Malicious signature on Blur order  */
  blurFarming = 'blur_farming',
  /** A known malicous site invoked that transaction  */
  maliciousDomain = 'malicious_domain',
  /** Malicious signature on a Permit order  */
  permitFarming = 'permit_farming',
  /** Direct theft of native assets (ETH/MATIC/AVAX/ etc …)  */
  rawNativeTokenTransfer = 'raw_native_token_transfer',
  /** Malicious raw signature from the user   */
  rawSignatureFarming = 'raw_signature_farming',
  /** Malicious signature on a Seaport order  */
  seaportFarming = 'seaport_farming',
  /** setApprovalForAll for a malicious operator  */
  setApprovalForAll = 'set_approval_for_all',
  /** Malicious signature on other type of trade order (Zero-X / Rarible / etc..)   */
  tradeOrderFarming = 'trade_order_farming',
  /** Direct theft of assets using transfer  */
  transferFarming = 'transfer_farming',
  /** Direct theft of assets using transferFrom  */
  transferFromFarming = 'transfer_from_farming',
  /** Malicious trade that results in the victim being rained  */
  unfairTrade = 'unfair_trade',

  other = 'other',
}

export enum BlockaidResultType {
  Malicious = 'Malicious',
  Warning = 'Warning',
  Benign = 'Benign',
}

/**
 * @typedef {object} SecurityProviderMessageSeverity
 * @property {0} NOT_MALICIOUS - Indicates message is not malicious
 * @property {1} MALICIOUS - Indicates message is malicious
 * @property {2} NOT_SAFE - Indicates message is not safe
 */

/** @type {SecurityProviderMessageSeverity} */
export const SECURITY_PROVIDER_MESSAGE_SEVERITY = {
  NOT_MALICIOUS: 0,
  MALICIOUS: 1,
  NOT_SAFE: 2,
};
