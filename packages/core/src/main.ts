import {
  ConnectedStarknetWindowObject,
  StarknetWindowObject,
} from "./StarknetWindowObject"
import discovery, { WalletProvider } from "./discovery"
import { IStorageWrapper, LocalStorageWrapper } from "./localStorageStore"
import { pipe, ssrSafeWindow } from "./utils"
import { FilterList, filterBy, filterByPreAuthorized } from "./wallet/filter"
import { isWalletObj } from "./wallet/isWalletObject"
import {
  // connectMetamaskBridge,
  injectMetamaskBridge,
} from "./wallet/metamaskBridge"
import { scanObjectForWallets } from "./wallet/scan"
import { Sort, sortBy } from "./wallet/sort"

export type {
  AccountChangeEventHandler,
  AddStarknetChainParameters,
  ConnectedStarknetWindowObject,
  NetworkChangeEventHandler,
  RpcMessage,
  StarknetWindowObject,
  SwitchStarknetChainParameter,
  WalletEvents,
  WatchAssetParameters,
  DisconnectedStarknetWindowObject,
  IStarknetWindowObject,
} from "./StarknetWindowObject"
export type {
  WalletProvider,
  BrowserStoreVersion,
  OperatingSystemStoreVersion,
} from "./discovery"

export interface GetStarknetOptions {
  windowObject: Record<string, any>
  isWalletObject: (wallet: any) => boolean
  storageFactoryImplementation: (name: string) => IStorageWrapper
}

const defaultOptions: GetStarknetOptions = {
  windowObject: ssrSafeWindow ?? {},
  isWalletObject: isWalletObj,
  storageFactoryImplementation: (name: string) => new LocalStorageWrapper(name),
}

export interface GetWalletOptions {
  sort?: Sort
  include?: FilterList
  exclude?: FilterList
}

export interface DisconnectOptions {
  clearLastWallet?: boolean
}
interface GetStarknetResult {
  getAvailableWallets: (
    options?: GetWalletOptions,
  ) => Promise<StarknetWindowObject[]> // Returns all wallets available in the window object
  getPreAuthorizedWallets: (
    options?: GetWalletOptions,
  ) => Promise<StarknetWindowObject[]> // Returns only preauthorized wallets available in the window object
  getDiscoveryWallets: (options?: GetWalletOptions) => Promise<WalletProvider[]> // Returns all wallets in existence (from discovery file)
  getLastConnectedWallet: () => Promise<StarknetWindowObject | null | undefined> // Returns the last wallet connected when it's still connected
  enable: (
    wallet: StarknetWindowObject,
    options?: {
      starknetVersion?: "v4" | "v5"
    },
  ) => Promise<ConnectedStarknetWindowObject> // Connects to a wallet
  disconnect: (options?: DisconnectOptions) => Promise<void> // Disconnects from a wallet
}

export function getStarknet(
  options: Partial<GetStarknetOptions> = {},
): GetStarknetResult {
  const { storageFactoryImplementation, windowObject, isWalletObject } = {
    ...defaultOptions,
    ...options,
  }
  const lastConnectedStore = storageFactoryImplementation("gsw-last")

  injectMetamaskBridge(windowObject)

  return {
    getAvailableWallets: async (options = {}) => {
      const availableWallets = scanObjectForWallets(
        windowObject,
        isWalletObject,
      )
      return pipe<StarknetWindowObject[]>(
        (_) => filterBy(_, options),
        (_) => sortBy(_, options.sort),
      )(availableWallets)
    },
    getPreAuthorizedWallets: async (options = {}) => {
      const availableWallets = scanObjectForWallets(
        windowObject,
        isWalletObject,
      )
      return pipe<StarknetWindowObject[]>(
        (_) => filterByPreAuthorized(_),
        (_) => filterBy(_, options),
        (_) => sortBy(_, options.sort),
      )(availableWallets)
    },
    getDiscoveryWallets: async (options = {}) => {
      return pipe<WalletProvider[]>(
        (_) => filterBy(_, options),
        (_) => sortBy(_, options.sort),
      )(discovery)
    },
    getLastConnectedWallet: async () => {
      const lastConnectedWalletId = lastConnectedStore.get()
      const allWallets = scanObjectForWallets(windowObject, isWalletObject)
      const lastConnectedWallet = allWallets.find(
        (w) => w.id === lastConnectedWalletId,
      )
      const [firstPreAuthorizedWallet] = await filterByPreAuthorized(
        lastConnectedWallet ? [lastConnectedWallet] : [],
      )

      if (!firstPreAuthorizedWallet) {
        lastConnectedStore.delete()
        return null
      }

      return firstPreAuthorizedWallet
    },
    enable: async (wallet, options) => {
      // if (wallet.id === "metamask" || wallet.id === "metamaskRosetta") {
      //   connectMetamaskBridge(windowObject, wallet.id)
      // }
      await wallet.enable(options ?? { starknetVersion: "v5" })
      if (!wallet.isConnected) {
        throw new Error("Failed to connect to wallet")
      }
      lastConnectedStore.set(wallet.id)
      return wallet
    },
    disconnect: async ({ clearLastWallet } = {}) => {
      if (clearLastWallet) {
        lastConnectedStore.delete()
      }
    },
  }
}

export { ssrSafeWindow } from "./utils"

export default getStarknet()
